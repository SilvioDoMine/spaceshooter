import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';
import { EventBus } from '../core/EventBus';

/**
 * Sistema de Renderização do Space Shooter
 * 
 * Responsável por gerenciar toda a renderização 3D do jogo usando Three.js.
 * Inclui configuração de scene, camera, renderer, iluminação e integração com AssetLoader.
 */
export class RenderingSystem {
  public readonly assetLoader: AssetLoader;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  private eventBus: EventBus;
  
  // UI Scene management
  private uiScene?: THREE.Scene;
  private uiCamera?: THREE.Camera;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.assetLoader = new AssetLoader();
    
    // Initialize Three.js components
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    
    this.setupLighting();
    this.setupEventListeners();
    this.setupWindowResize();
  }

  private setupEventListeners(): void {
    // UI scene registration
    this.eventBus.on('renderer:register-ui-scene', (data) => {
      this.uiScene = data.scene;
      this.uiCamera = data.camera;
    });
    
    // Scene management - for entities that still use events
    this.eventBus.on('scene:add-object', (data) => {
      this.addToScene(data.object);
    });
    
    this.eventBus.on('scene:remove-object', (data) => {
      this.removeFromScene(data.object);
    });
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      75, // field of view
      window.innerWidth / window.innerHeight, // aspect ratio
      0.1, // near plane
      1000 // far plane
    );
    camera.position.z = 5;
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Garantir que o canvas ocupe toda a tela
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    
    return renderer;
  }

  private setupWindowResize(): void {
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
      console.log('✅ RenderingSystem attached to DOM');
      
      // Emit renderer:ready for systems that still depend on it
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

    // Carregar assets do jogo também
    const { GAME_ASSETS } = await import('../assets/gameAssets');
    await this.assetLoader.loadAssetManifest(GAME_ASSETS)
      .catch((error) => {
        console.warn('Alguns assets do jogo não puderam ser carregados:', error.message);
      });

    console.log('✅ Assets loaded');
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

  public registerUIScene(scene: THREE.Scene, camera: THREE.Camera): void {
    this.uiScene = scene;
    this.uiCamera = camera;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.assetLoader.dispose();
    this.renderer.dispose();
  }
}
