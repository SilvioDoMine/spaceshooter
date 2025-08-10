import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';
import { Observer, Subject } from '@spaceshooter/shared';
import { GameStateEnum, GameStateManager } from './GameStateManager';
import { EventBus } from '../core/EventBus';

/**
 * Sistema de Renderização do Space Shooter
 * 
 * Responsável por gerenciar toda a renderização 3D do jogo usando Three.js.
 * Inclui configuração de scene, camera, renderer, iluminação e integração com AssetLoader.
 * 
 * @example
 * ```typescript
 * const renderingSystem = new RenderingSystem();
 * renderingSystem.attachToDOM('game-container');
 * 
 * // Carregar assets
 * await renderingSystem.loadAssets((progress) => {
 *   console.log(`Loading: ${progress}%`);
 * });
 * 
 * // Adicionar objetos à cena
 * const cube = new THREE.Mesh(geometry, material);
 * renderingSystem.addToScene(cube);
 * 
 * // Loop de renderização
 * function animate() {
 *   requestAnimationFrame(animate);
 *   renderingSystem.render();
 * }
 * ```
 * 
 * @features
 * - Scene 3D com background espacial
 * - Camera perspectiva configurável
 * - WebGL renderer com shadows e antialias
 * - Sistema de iluminação (ambiente, direcional, pontual)
 * - Integração com AssetLoader para texturas e modelos
 * - Responsivo (redimensionamento automático)
 * - Factory de materiais texturizados
 */
export class RenderingSystem implements Observer {
  public assetLoader: AssetLoader;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  private onAssetsLoaded?: () => void;
  private eventBus: EventBus;
  
  // UI Scene management
  private uiScene?: THREE.Scene;
  private uiCamera?: THREE.Camera;
  
  // Request tracking for async operations
  private pendingRequests: Map<string, Function> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();

    this.assetLoader = new AssetLoader();
    this.init();
  }

  private setupEventListeners(): void {
    // Initialization events
    this.eventBus.on('kernel:init', () => this.attachToDOM('game-container'));
    this.eventBus.on('renderer:ready', () => this.loadAssets());
    
    // DOM attachment
    this.eventBus.on('renderer:attach-dom', (data) => {
      this.attachToDOM(data.containerId);
    });
    
    // Render coordination
    this.eventBus.on('renderer:render-frame', () => {
      this.render();
    });
    
    // Scene management
    this.eventBus.on('scene:add-object', (data) => {
      this.addToScene(data.object);
    });
    
    this.eventBus.on('scene:remove-object', (data) => {
      this.removeFromScene(data.object);
    });
    
    // Material factory
    this.eventBus.on('materials:create-textured', (data) => {
      const material = this.createTexturedMaterial(data.config);
      this.eventBus.emit('materials:textured-response', { 
        material, 
        requestId: data.requestId 
      });
    });
    
    // Asset loading
    this.eventBus.on('assets:load-model', async (data) => {
      try {
        const model = await this.assetLoader.loadModel(data.name, data.path);
        this.eventBus.emit('assets:model-response', { 
          model, 
          requestId: data.requestId 
        });
      } catch (error) {
        this.eventBus.emit('assets:model-response', { 
          model: null, 
          requestId: data.requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // Scene queries
    this.eventBus.on('renderer:get-scene', (data) => {
      this.eventBus.emit('renderer:scene-response', {
        scene: this.scene,
        requestId: data.requestId
      });
    });
    
    // UI scene registration
    this.eventBus.on('renderer:register-ui-scene', (data) => {
      this.uiScene = data.scene;
      this.uiCamera = data.camera;
    });
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private init(): void {
    // Criar scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);

    // Criar camera
    this.camera = new THREE.PerspectiveCamera(
      75, // field of view
      window.innerWidth / window.innerHeight, // aspect ratio
      0.1, // near plane
      1000 // far plane
    );
    this.camera.position.z = 5;

    // Criar renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Garantir que o canvas ocupe toda a tela
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    // Configurar iluminação básica
    this.setupLighting();

    // Handler para resize da janela
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private setupLighting(): void {
    // Luz ambiente
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Luz direcional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Luz pontual para destaque
    const pointLight = new THREE.PointLight(0x00aaff, 0.5, 100);
    pointLight.position.set(0, 0, 10);
    this.scene.add(pointLight);
  }

  public attachToDOM(containerId: string): void {
    const gameContainer = document.getElementById(containerId);

    if (gameContainer) {
      gameContainer.appendChild(this.renderer.domElement);
      this.eventBus.emit('renderer:ready', { 
        scene: this.scene, 
        renderer: this.renderer 
      });
    }
  }

  public onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Garantir que o canvas ocupe toda a tela após resize
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
  }

  public render(): void {
    // Render main 3D scene
    this.renderer.render(this.scene, this.camera);
    
    // Render UI overlay if registered
    if (this.uiScene && this.uiCamera) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.uiScene, this.uiCamera);
      this.renderer.autoClear = true; // Reset for next frame
    }
  }

  public addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
    
    // Dispose recursos para evitar memory leaks
    if (object instanceof THREE.Mesh) {
      // Dispose geometry
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      // Dispose materials
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => {
            if (material instanceof THREE.Material) {
              material.dispose();
            }
          });
        } else if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    }
    
    // Recursively dispose children
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              if (material instanceof THREE.Material) {
                material.dispose();
              }
            });
          } else if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      }
    });
  }

  public async loadAssets(onProgress?: (progress: number) => void): Promise<void> {
    if (onProgress) {
      this.assetLoader.onProgress = onProgress;
    }
    
    // Carregar assets básicos primeiro
    const { CORE_ASSETS } = await import('../assets/gameAssets');
    await this.assetLoader.loadAssetManifest(CORE_ASSETS);

    this.eventBus.emit('assets:ready', {});
  }

  public createTexturedMaterial(options: {
    color?: number;
    map?: string;
    normalMap?: string;
    roughness?: number;
    metalness?: number;
  }): THREE.MeshStandardMaterial {
    return this.assetLoader.createMaterial(options);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.assetLoader.dispose();
    this.renderer.dispose();
  }

  public update(subject: Subject): void {
    console.log('RenderingSystem update called with subject:', subject);
    if (!(subject instanceof GameStateManager)) {
      console.warn('RenderingSystem only updates with GameStateManager');
      return;
    }

    const gameStateManager = subject as GameStateManager;

    switch (gameStateManager.getState()) {
      case GameStateEnum.INIT:
        this.attachToDOM('game-container');
        break;
      case GameStateEnum.LOADING_ASSETS:
        this.loadAssets((progress) => {
          console.log(`Loading progress: ${progress.toFixed(1)}%`);
        }).then(async () => {
          // Carregar assets do jogo
          const { GAME_ASSETS } = await import('../assets/gameAssets');
          await this.assetLoader.loadAssetManifest(GAME_ASSETS)
            .catch((error) => {
              console.warn('Alguns assets do jogo não puderam ser carregados:', error.message);
            });
          
          console.log('Assets carregados!');
          if (this.onAssetsLoaded) {
            this.onAssetsLoaded();
          }
        }).catch(error => {
          console.error('Error loading assets:', error);
        });
        break;
      default:
        console.log(`Game state changed to: ${gameStateManager.getState()}`);
        break;
    }
  }

  public setOnAssetsLoadedCallback(callback: () => void): void {
    this.onAssetsLoaded = callback;
  }
}
