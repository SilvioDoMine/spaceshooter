import * as THREE from 'three';
import { Projectile, Enemy, PowerUp, PROJECTILE_CONFIG, ENEMY_CONFIG, POWERUP_CONFIG } from '@spaceshooter/shared';
import { RenderingSystem } from '../systems/RenderingSystem';

export interface TrackedEntity<T> {
  object: THREE.Mesh | THREE.Group;
  data: T;
}

/**
 * EntityManager - Gerencia todas as entidades do jogo
 * 
 * Responsável por criar, atualizar, remover e rastrear todas as entidades
 * do jogo (projéteis, inimigos, power-ups, jogador).
 * 
 * @features
 * - Criação centralizada de entidades
 * - Tracking automático com Maps
 * - Cleanup automático de recursos
 * - Visual + data synchronization
 * - Asset loading integration
 */
export class EntityManager {
  private projectiles: Map<string, TrackedEntity<Projectile>> = new Map();
  private enemies: Map<string, TrackedEntity<Enemy>> = new Map();
  private powerUps: Map<string, TrackedEntity<PowerUp>> = new Map();
  
  constructor(private renderingSystem: RenderingSystem) {}

  // ==================== PROJECTILE MANAGEMENT ====================

  /**
   * Cria um projétil com configuração específica
   */
  createProjectile(config: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number };
    damage?: number;
  }): TrackedEntity<Projectile> {
    const projectileId = `projectile_${Date.now()}_${Math.random()}`;
    
    // Create visual
    const geometry = new THREE.SphereGeometry(0.05);
    const material = this.renderingSystem.createTexturedMaterial({
      color: 0x00ff00,
      roughness: 0.1,
      metalness: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.set(config.position.x, config.position.y, config.position.z);
    
    // Create data
    const projectileData: Projectile = {
      id: projectileId,
      position: { x: config.position.x, y: config.position.y },
      velocity: config.velocity,
      damage: config.damage || PROJECTILE_CONFIG.damage,
      ownerId: 'player',
      createdAt: Date.now()
    };

    const trackedEntity = { object: mesh, data: projectileData };
    this.projectiles.set(projectileId, trackedEntity);
    this.renderingSystem.addToScene(mesh);
    
    return trackedEntity;
  }

  /**
   * Remove projétil por ID
   */
  removeProjectile(id: string): void {
    const projectile = this.projectiles.get(id);
    if (projectile) {
      this.renderingSystem.removeFromScene(projectile.object);
      this.projectiles.delete(id);
    }
  }

  /**
   * Atualiza todos os projéteis
   */
  updateProjectiles(deltaTime: number = 1/60): void {
    this.projectiles.forEach((projectile, projectileId) => {
      // Update data position
      projectile.data.position.y += projectile.data.velocity.y * deltaTime;
      projectile.data.position.x += projectile.data.velocity.x * deltaTime;
      
      // Sync visual position
      projectile.object.position.x = projectile.data.position.x;
      projectile.object.position.y = projectile.data.position.y;

      // Check bounds and lifetime
      const shouldRemove = projectile.data.position.y > 8 || 
                          projectile.data.position.x < -5 || 
                          projectile.data.position.x > 5 ||
                          Date.now() - projectile.data.createdAt > 5000;

      if (shouldRemove) {
        this.removeProjectile(projectileId);
      }
    });
  }

  // ==================== ENEMY MANAGEMENT ====================

  /**
   * Cria inimigo com tipo específico
   */
  createEnemy(type: keyof typeof ENEMY_CONFIG): TrackedEntity<Enemy> {
    const config = ENEMY_CONFIG[type];
    const enemyId = `enemy_${Date.now()}_${Math.random()}`;
    
    // Create visual
    const geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
    const material = this.renderingSystem.createTexturedMaterial({
      color: config.color,
      roughness: 0.3,
      metalness: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Random position at top
    const x = (Math.random() - 0.5) * 6;
    mesh.position.set(x, 6, 0);
    
    // Create data
    const enemyData: Enemy = {
      id: enemyId,
      position: { x, y: 6 },
      velocity: { x: 0, y: config.speed },
      health: config.health,
      maxHealth: config.health,
      type: type,
      createdAt: Date.now()
    };

    const trackedEntity = { object: mesh, data: enemyData };
    this.enemies.set(enemyId, trackedEntity);
    this.renderingSystem.addToScene(mesh);
    
    return trackedEntity;
  }

  /**
   * Remove inimigo por ID
   */
  removeEnemy(id: string): void {
    const enemy = this.enemies.get(id);
    if (enemy) {
      this.renderingSystem.removeFromScene(enemy.object);
      this.enemies.delete(id);
    }
  }

  /**
   * Atualiza todos os inimigos
   */
  updateEnemies(deltaTime: number = 1/60): { escaped: TrackedEntity<Enemy>[] } {
    const escaped: TrackedEntity<Enemy>[] = [];
    
    this.enemies.forEach((enemy, enemyId) => {
      // Update data position
      enemy.data.position.y -= enemy.data.velocity.y * deltaTime;
      enemy.data.position.x += enemy.data.velocity.x * deltaTime;
      
      // Sync visual position
      enemy.object.position.x = enemy.data.position.x;
      enemy.object.position.y = enemy.data.position.y;

      // Check if escaped screen
      if (enemy.data.position.y < -4) {
        escaped.push(enemy);
        this.removeEnemy(enemyId);
      }
    });
    
    return { escaped };
  }

  /**
   * Aplica dano a inimigo
   */
  damageEnemy(enemyId: string, damage: number): boolean {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return false;
    
    enemy.data.health -= damage;
    
    // Visual feedback for damage (flash red)
    const originalColor = (enemy.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const flashColor = originalColor.color.clone();
    originalColor.color.setHex(0xff0000);
    
    setTimeout(() => {
      originalColor.color.copy(flashColor);
    }, 100);
    
    // Check if enemy is destroyed
    if (enemy.data.health <= 0) {
      this.removeEnemy(enemyId);
      return true; // Enemy destroyed
    }
    
    return false; // Enemy damaged but alive
  }

  // ==================== POWER-UP MANAGEMENT ====================

  /**
   * Cria power-up com tipo específico
   */
  createPowerUp(type: keyof typeof POWERUP_CONFIG): TrackedEntity<PowerUp> {
    const config = POWERUP_CONFIG[type];
    const powerUpId = `powerup_${Date.now()}_${Math.random()}`;
    
    // Create geometry based on type
    let geometry: THREE.BufferGeometry;
    switch (type) {
      case 'ammo':
        geometry = new THREE.ConeGeometry(config.size, config.size * 1.5, 3);
        break;
      case 'health':
        geometry = new THREE.SphereGeometry(config.size);
        break;
      case 'shield':
        geometry = new THREE.OctahedronGeometry(config.size);
        break;
      default:
        geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
    }
    
    const material = this.renderingSystem.createTexturedMaterial({
      color: config.color,
      roughness: 0.1,
      metalness: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    
    // Random position at top
    const x = (Math.random() - 0.5) * 6;
    mesh.position.set(x, 6, 0);
    
    // Create data
    const powerUpData: PowerUp = {
      id: powerUpId,
      position: { x, y: 6 },
      velocity: { x: 0, y: config.speed },
      type: type,
      createdAt: Date.now()
    };

    const trackedEntity = { object: mesh, data: powerUpData };
    this.powerUps.set(powerUpId, trackedEntity);
    this.renderingSystem.addToScene(mesh);
    
    return trackedEntity;
  }

  /**
   * Remove power-up por ID
   */
  removePowerUp(id: string): void {
    const powerUp = this.powerUps.get(id);
    if (powerUp) {
      this.renderingSystem.removeFromScene(powerUp.object);
      this.powerUps.delete(id);
    }
  }

  /**
   * Atualiza todos os power-ups
   */
  updatePowerUps(deltaTime: number = 1/60): void {
    this.powerUps.forEach((powerUp, powerUpId) => {
      // Update data position
      powerUp.data.position.y -= powerUp.data.velocity.y * deltaTime;
      
      // Sync visual position
      powerUp.object.position.y = powerUp.data.position.y;
      
      // Rotation animation
      powerUp.object.rotation.x += 0.02;
      powerUp.object.rotation.y += 0.03;
      
      // Pulsing scale animation
      const config = POWERUP_CONFIG[powerUp.data.type];
      const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      powerUp.object.scale.setScalar(pulseScale);

      // Check bounds and lifetime
      const shouldRemove = powerUp.data.position.y < -4 || 
                          Date.now() - powerUp.data.createdAt > config.lifetime;

      if (shouldRemove) {
        this.removePowerUp(powerUpId);
      }
    });
  }

  // ==================== PLAYER MANAGEMENT ====================

  /**
   * Cria nave do jogador
   */
  async createPlayer(): Promise<THREE.Group> {
    const playerShip = new THREE.Group();
    
    try {
      // Try to load ship model
      const shipModel = this.renderingSystem.assetLoader.getModel('ship');
      if (shipModel) {
        const clonedShip = shipModel.clone();
        clonedShip.scale.setScalar(0.3);
        
        // Configure shadows for all meshes in the model
        clonedShip.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        playerShip.add(clonedShip);
        console.log('✅ Player ship loaded from model');
      } else {
        throw new Error('Ship model not found');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load ship model, using fallback:', error);
      
      // Create fallback ship (green cube)
      const geometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
      const material = this.renderingSystem.createTexturedMaterial({
        color: 0x00ff00,
        roughness: 0.3,
        metalness: 0.7
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.castShadow = true;
      cube.receiveShadow = true;
      
      playerShip.add(cube);
      console.log('✅ Player ship created as fallback cube');
    }

    // Position player at bottom center
    playerShip.position.set(0, -2, 0);
    
    this.renderingSystem.addToScene(playerShip);
    return playerShip;
  }

  // ==================== GETTERS ====================

  getProjectiles(): ReadonlyMap<string, TrackedEntity<Projectile>> {
    return this.projectiles;
  }

  getEnemies(): ReadonlyMap<string, TrackedEntity<Enemy>> {
    return this.enemies;
  }

  getPowerUps(): ReadonlyMap<string, TrackedEntity<PowerUp>> {
    return this.powerUps;
  }

  // ==================== UTILITY ====================

  /**
   * Limpa todas as entidades
   */
  clearAll(): void {
    // Clear all tracked entities
    this.projectiles.forEach((_, id) => this.removeProjectile(id));
    this.enemies.forEach((_, id) => this.removeEnemy(id));
    this.powerUps.forEach((_, id) => this.removePowerUp(id));
    
    console.log('🧹 All entities cleared');
  }

  /**
   * Retorna contagem de entidades ativas
   */
  getEntityCounts() {
    return {
      projectiles: this.projectiles.size,
      enemies: this.enemies.size,
      powerUps: this.powerUps.size,
      total: this.projectiles.size + this.enemies.size + this.powerUps.size
    };
  }

  /**
   * Debug info para desenvolvimento
   */
  getDebugInfo() {
    const counts = this.getEntityCounts();
    return {
      ...counts,
      memoryUsage: {
        projectileIds: Array.from(this.projectiles.keys()).slice(0, 3),
        enemyIds: Array.from(this.enemies.keys()).slice(0, 3),
        powerUpIds: Array.from(this.powerUps.keys()).slice(0, 3)
      }
    };
  }
}