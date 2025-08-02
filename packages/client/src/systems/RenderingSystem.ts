import * as THREE from 'three';

export class RenderingSystem {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  
  constructor() {
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
  }
}