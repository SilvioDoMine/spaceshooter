import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';

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
export class RenderingSystem {
  public assetLoader: AssetLoader;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  
  constructor() {
    this.assetLoader = new AssetLoader();
    this.init();
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
    this.renderer.render(this.scene, this.camera);
  }

  public addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  public async loadAssets(onProgress?: (progress: number) => void): Promise<void> {
    if (onProgress) {
      this.assetLoader.onProgress = onProgress;
    }
    
    // Carregar assets básicos primeiro
    const { CORE_ASSETS } = await import('../assets/gameAssets');
    await this.assetLoader.loadAssetManifest(CORE_ASSETS);
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
}