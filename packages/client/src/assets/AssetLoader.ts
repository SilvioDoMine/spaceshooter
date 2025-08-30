import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AssetManifest {
  textures: Record<string, string>;
  models: Record<string, string>;
  sounds: Record<string, string>;
}

/**
 * Sistema de Carregamento de Assets do Space Shooter
 * 
 * Gerencia carregamento, cache e disponibilização de assets (texturas, modelos 3D, sons).
 * Suporte a carregamento assíncrono com progress tracking e sistema de cache eficiente.
 * 
 * @example
 * ```typescript
 * const assetLoader = new AssetLoader();
 * 
 * // Carregar assets individuais
 * const texture = await assetLoader.loadTexture('metal', '/textures/metal.jpg');
 * const model = await assetLoader.loadModel('ship', '/models/ship.glb');
 * 
 * // Carregar manifest completo
 * const manifest = {
 *   textures: { 'metal': '/textures/metal.jpg' },
 *   models: { 'ship': '/models/ship.glb' },
 *   sounds: { 'laser': '/sounds/laser.wav' }
 * };
 * 
 * assetLoader.onProgress = (progress) => console.log(`${progress}%`);
 * await assetLoader.loadAssetManifest(manifest);
 * 
 * // Usar assets carregados
 * const cachedTexture = assetLoader.getTexture('metal');
 * const cachedModel = assetLoader.getModel('ship'); // retorna clone
 * 
 * // Criar materiais facilmente
 * const material = assetLoader.createMaterial({
 *   color: 0xff0000,
 *   map: 'metal',
 *   roughness: 0.5
 * });
 * ```
 * 
 * @features
 * - Cache inteligente com Map para performance
 * - Loading assíncrono com Promises
 * - Progress tracking configurável
 * - Clonagem automática de modelos para reutilização
 * - Factory de materiais com texturas
 * - Configuração automática de sombras
 * - Dispose para limpeza de memória
 * - Suporte a texturas (jpg, png) e modelos GLTF/GLB
 * 
 * @cache_behavior
 * - Texturas: Cached como referência (compartilhadas)
 * - Modelos: Clonados a cada getModel() (instâncias únicas)
 * - Loading promises: Evita carregamentos duplicados
 */
export class AssetLoader {
  private textureLoader: THREE.TextureLoader;
  private gltfLoader: GLTFLoader;
  private loadingManager: THREE.LoadingManager;
  
  private textureCache: Map<string, THREE.Texture> = new Map();
  private modelCache: Map<string, THREE.Group> = new Map();
  private animationsCache: Map<string, THREE.AnimationClip[]> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  public onProgress: ((progress: number) => void) | null = null;
  public onComplete: (() => void) | null = null;
  public onError: ((error: Error) => void) | null = null;

  constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    
    this.setupLoadingManager();
  }

  private setupLoadingManager(): void {
    this.loadingManager.onProgress = (url, loaded, total) => {
      const progress = (loaded / total) * 100;
      this.onProgress?.(progress);
    };

    this.loadingManager.onLoad = () => {
      this.onComplete?.();
    };

    this.loadingManager.onError = (url) => {
      const error = new Error(`Failed to load asset: ${url}`);
      this.onError?.(error);
    };
  }

  public async loadTexture(name: string, url: string): Promise<THREE.Texture> {
    // Verificar cache primeiro
    if (this.textureCache.has(name)) {
      return this.textureCache.get(name)!;
    }

    // Verificar se já está carregando
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Configurações padrão para texturas
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          
          this.textureCache.set(name, texture);
          this.loadingPromises.delete(name);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(name);
          reject(new Error(`Failed to load texture ${name}: ${error}`));
        }
      );
    });

    this.loadingPromises.set(name, promise);
    return promise;
  }

  public async loadModel(name: string, url: string): Promise<THREE.Group> {
    // Verificar cache primeiro
    if (this.modelCache.has(name)) {
      // Retornar clone para evitar conflitos
      return this.modelCache.get(name)!.clone();
    }

    // Verificar se já está carregando
    if (this.loadingPromises.has(name)) {
      const model = await this.loadingPromises.get(name)!;
      return model.clone();
    }

    const promise = new Promise<THREE.Group>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          
          // Configurar sombras para todos os meshes
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Armazenar animações separadamente
          if (gltf.animations && gltf.animations.length > 0) {
            this.animationsCache.set(name, gltf.animations);
            console.log(`🎬 AssetLoader: Found ${gltf.animations.length} animations for ${name}:`);
            gltf.animations.forEach((anim, i) => {
              console.log(`  ${i + 1}. "${anim.name}" (duration: ${anim.duration}s, tracks: ${anim.tracks.length})`);
            });
          }

          this.modelCache.set(name, model);
          this.loadingPromises.delete(name);
          resolve(model.clone());
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(name);
          reject(new Error(`Failed to load model ${name}: ${error}`));
        }
      );
    });

    this.loadingPromises.set(name, promise);
    return promise;
  }

  public async loadAssetManifest(manifest: AssetManifest): Promise<void> {
    const loadPromises: Promise<any>[] = [];

    // Carregar todas as texturas
    for (const [name, url] of Object.entries(manifest.textures)) {
      loadPromises.push(this.loadTexture(name, url));
    }

    // Carregar todos os modelos
    for (const [name, url] of Object.entries(manifest.models)) {
      loadPromises.push(this.loadModel(name, url));
    }

    await Promise.all(loadPromises);
  }

  public getTexture(name: string): THREE.Texture | null {
    return this.textureCache.get(name) || null;
  }

  public getModel(name: string): THREE.Group | null {
    const cached = this.modelCache.get(name);
    return cached ? cached.clone() : null;
  }

  public getAnimations(name: string): THREE.AnimationClip[] | null {
    return this.animationsCache.get(name) || null;
  }

  public getModelWithAnimations(name: string): { model: THREE.Group; animations: THREE.AnimationClip[] } | null {
    const model = this.getModel(name);
    const animations = this.getAnimations(name);
    
    if (!model) return null;
    
    return {
      model,
      animations: animations || []
    };
  }

  public createMaterial(options: {
    color?: number;
    map?: string;
    normalMap?: string;
    roughness?: number;
    metalness?: number;
  }): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: options.color || 0xffffff,
      roughness: options.roughness ?? 0.5,
      metalness: options.metalness ?? 0.1
    });

    if (options.map) {
      const texture = this.getTexture(options.map);
      if (texture) material.map = texture;
    }

    if (options.normalMap) {
      const normalTexture = this.getTexture(options.normalMap);
      if (normalTexture) material.normalMap = normalTexture;
    }

    return material;
  }

  public dispose(): void {
    // Limpar texturas
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();

    // Limpar modelos
    this.modelCache.forEach(model => {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.modelCache.clear();

    // Limpar animações
    this.animationsCache.clear();

    this.loadingPromises.clear();
  }
}