import * as THREE from 'three';
import { ENEMY_CONFIG, POWERUP_CONFIG, PROJECTILE_CONFIG } from '@spaceshooter/shared';
import { AssetLoader } from '../assets/AssetLoader';

/**
 * AssetManager - Centralized asset management service
 * 
 * Pre-loads and manages all game assets (materials, models, textures)
 * providing synchronous access to pre-loaded resources.
 * 
 * Phase 1 Implementation:
 * - Pre-load all materials needed for projectiles, enemies, and power-ups
 * - Pre-load player ship model with fallback
 * - Provide synchronous getter methods
 * - Initialize during game startup
 */
export class AssetManager {
  private assetLoader: AssetLoader;
  private isInitialized: boolean = false;
  
  // Pre-loaded materials
  private materials: Map<string, THREE.Material> = new Map();
  
  // Pre-loaded models
  private models: Map<string, THREE.Group> = new Map();
  
  constructor() {
    this.assetLoader = new AssetLoader();
  }
  
  /**
   * Initialize and pre-load all game assets
   */
  async initialize(): Promise<void> {
    console.log('🎮 AssetManager: Starting asset pre-loading...');
    
    await this.preloadMaterials();
    await this.preloadModels();
    
    this.isInitialized = true;
    console.log('✅ AssetManager: All assets pre-loaded successfully');
  }
  
  /**
   * Pre-load all materials used in the game
   */
  private async preloadMaterials(): Promise<void> {
    // Projectile materials
    const projectileMaterial = this.assetLoader.createMaterial({
      color: 0x00ffff // Cyan
    });
    this.materials.set('projectile', projectileMaterial);
    
    // Enemy materials
    Object.entries(ENEMY_CONFIG).forEach(([type, config]) => {
      const material = this.assetLoader.createMaterial({
        color: config.color
      });
      this.materials.set(`enemy_${type}`, material);
    });
    
    // Power-up materials
    Object.entries(POWERUP_CONFIG).forEach(([type, config]) => {
      const material = this.assetLoader.createMaterial({
        color: config.color,
        roughness: 0.1,
        metalness: 0.8
      });
      this.materials.set(`powerup_${type}`, material);
    });
    
    // Player ship fallback material
    const playerFallbackMaterial = this.assetLoader.createMaterial({
      color: 0x00ff00,
      roughness: 0.3,
      metalness: 0.7
    });
    this.materials.set('player_fallback', playerFallbackMaterial);
    
    console.log('📦 AssetManager: Materials pre-loaded');
  }
  
  /**
   * Test if asset URLs are accessible
   */
  private async testAssetUrls(shipModels: any[]): Promise<void> {
    console.log('🔍 AssetManager: Testing asset URL accessibility...');
    
    for (const ship of shipModels) {
      try {
        const response = await fetch(ship.path, { method: 'HEAD' });
        console.log(`${response.ok ? '✅' : '❌'} ${ship.name}: ${ship.path} (${response.status})`);
        if (!response.ok) {
          console.error(`   Response: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`❌ ${ship.name}: ${ship.path} - Network error:`, error);
      }
    }
  }

  /**
   * Pre-load all models used in the game
   */
  private async preloadModels(): Promise<void> {
    // Try to load player ship models (multiple options)
    const shipModels = [
      { name: 'ship', path: '/assets/models/ship.glb', priority: 1 }
    ];

    // Test if URLs are accessible first
    await this.testAssetUrls(shipModels);

    let loadedShip = false;

    // Try loading ships in order of priority
    for (const ship of shipModels) {
      try {
        console.log(`🚀 AssetManager: Trying to load ${ship.name} from ${ship.path}`);
        const playerShip = await this.assetLoader.loadModel(ship.name, ship.path);
        this.models.set('player_ship', playerShip);
        this.models.set(ship.name, playerShip); // Store with original name too
        console.log(`✅ AssetManager: Player ship loaded successfully (${ship.name})`);
        console.log(`📊 AssetManager: Ship has ${playerShip.children.length} children`);
        loadedShip = true;
        break;
      } catch (error) {
        console.error(`❌ AssetManager: Failed to load ${ship.name} from ${ship.path}:`, error);
        if (error instanceof Error) {
          console.error(`   Error message: ${error.message}`);
          console.error(`   Stack trace:`, error.stack);
        }
        continue;
      }
    }

    if (!loadedShip) {
      console.warn('⚠️ AssetManager: All ship models failed to load, will use fallback cube');
    }
    
    console.log('🎯 AssetManager: Models pre-loaded');
  }
  
  /**
   * Get material for projectiles
   */
  getProjectileMaterial(): THREE.Material {
    this.ensureInitialized();
    return this.materials.get('projectile')!.clone();
  }
  
  /**
   * Get material for specific enemy type
   */
  getEnemyMaterial(enemyType: keyof typeof ENEMY_CONFIG): THREE.Material {
    this.ensureInitialized();
    return this.materials.get(`enemy_${enemyType}`)!.clone();
  }
  
  /**
   * Get material for specific power-up type
   */
  getPowerUpMaterial(powerUpType: keyof typeof POWERUP_CONFIG): THREE.Material {
    this.ensureInitialized();
    return this.materials.get(`powerup_${powerUpType}`)!.clone();
  }
  
  /**
   * Get player ship model (with fallback)
   */
  getPlayerShip(): THREE.Group {
    this.ensureInitialized();
    
    // Try to get pre-loaded model first
    const preloadedShip = this.models.get('player_ship');
    if (preloadedShip) {
      return preloadedShip.clone();
    }

    // Fallback: create cube
    console.log('🔧 AssetManager: Using fallback cube for player ship');
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = this.materials.get('player_fallback')!.clone();
    
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    
    const shipGroup = new THREE.Group();
    shipGroup.add(cube);
    
    return shipGroup;
  }
  
  /**
   * Create a generic material with the given configuration
   */
  createMaterial(config: {
    color?: number;
    roughness?: number;
    metalness?: number;
  }): THREE.Material {
    this.ensureInitialized();
    return this.assetLoader.createMaterial(config);
  }
  
  /**
   * Get specific ship model by name (for testing different ships)
   */
  getShipModel(shipName: string): THREE.Group | null {
    this.ensureInitialized();
    
    const ship = this.models.get(shipName);
    if (ship) {
      return ship.clone();
    }
    
    console.warn(`AssetManager: Ship model '${shipName}' not found`);
    return null;
  }
  
  /**
   * Get list of available ship models
   */
  getAvailableShips(): string[] {
    const ships = [];
    for (const [key] of this.models) {
      if (key.startsWith('ship')) {
        ships.push(key);
      }
    }
    return ships;
  }
  
  /**
   * Check if AssetManager has been initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AssetManager not initialized. Call initialize() first.');
    }
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    // Dispose all materials
    this.materials.forEach(material => {
      material.dispose();
    });
    this.materials.clear();
    
    // Dispose all models
    this.models.forEach(model => {
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.models.clear();
    
    // Dispose asset loader
    this.assetLoader.dispose();
    
    this.isInitialized = false;
    console.log('🧹 AssetManager: Resources disposed');
  }
}

// Singleton instance
export const assetManager = new AssetManager();