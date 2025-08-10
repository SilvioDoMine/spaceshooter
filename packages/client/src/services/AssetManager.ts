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
   * Pre-load all models used in the game
   */
  private async preloadModels(): Promise<void> {
    // Try to load player ship model
    try {
      const playerShip = await this.assetLoader.loadModel('ship', '/assets/models/ship.glb');
      this.models.set('player_ship', playerShip);
      console.log('🚀 AssetManager: Player ship model loaded');
    } catch (error) {
      console.warn('⚠️ AssetManager: Failed to load player ship model, will use fallback', error);
      // Fallback will be created on-demand in getPlayerShip()
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