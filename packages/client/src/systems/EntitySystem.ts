import { EventBus } from '../core/EventBus';
import { Player, PlayerStats } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { PowerUp } from '../entities/PowerUp';
import { ProjectileSystem } from './ProjectileSystem';
import { RenderingSystem } from './RenderingSystem';
import { CollisionUtils } from '../utils/CollisionUtils';
import { ENEMY_CONFIG, POWERUP_CONFIG } from '@spaceshooter/shared';

export class EntitySystem {
  private eventBus: EventBus;
  private renderingSystem: RenderingSystem;
  private projectileSystem: ProjectileSystem;
  private player: Player | null = null;
  private enemies: Map<string, Enemy> = new Map();
  private powerUps: Map<string, PowerUp> = new Map();
  private enemySpawnTimer: number = 0;
  private powerUpSpawnTimer: number = 0;
  private isActive: boolean = false;

  constructor(eventBus: EventBus, renderingSystem?: RenderingSystem) {
    this.eventBus = eventBus;
    this.renderingSystem = renderingSystem!; // Will be injected later if not provided
    this.projectileSystem = new ProjectileSystem(eventBus, renderingSystem);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.eventBus.on('game:started', () => {
      console.log('🎮 EntitySystem received game:started event');
      this.startGame();
    });

    this.eventBus.on('game:over', (data) => {
      console.log('🔚 EntitySystem received game:over event with stats:', data.stats);
      this.endGame();
    });

    this.eventBus.on('game:paused', () => {
      console.log('⏸️ EntitySystem received game:paused event');
      this.isActive = false;
    });

    this.eventBus.on('game:resumed', () => {
      console.log('▶️ EntitySystem received game:resumed event');
      this.isActive = true;
    });

    // Listen to enemy events and forward to player
    this.eventBus.on('enemy:escaped', (data) => {
      this.handleEnemyEscape(data);
    });

    this.eventBus.on('enemy:destroyed', (data) => {
      this.handleEnemyDestroyed(data);
    });

    this.eventBus.on('collision:check', (data) => {
      this.handleCollisionCheck(data);
    });

    this.eventBus.on('collision:projectile-enemy', (data) => {
      this.handleProjectileEnemyCollision(data);
    });

    this.eventBus.on('collision:powerup-player', (data) => {
      this.handlePowerUpPlayerCollision(data);
    });
  }

  private startGame(): void {
    console.log('🚀 EntitySystem.startGame called');
    this.isActive = true;
    // Reset spawn timers
    this.enemySpawnTimer = 0;
    this.powerUpSpawnTimer = 0;
    
    console.log('👤 Creating player...');
    this.createPlayer();
    
    // Reset player stats to initial values
    console.log('🔄 Resetting player stats...');
    this.resetPlayer();
    
    console.log('🧹 Clearing existing entities...');
    this.clearAllEnemies();
    this.clearAllPowerUps();
    
    console.log('✅ EntitySystem game started successfully');
  }

  private endGame(): void {
    this.isActive = false;
    
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    this.clearAllEnemies();
    this.clearAllPowerUps();
    this.projectileSystem.clearAllProjectiles();
  }

  private createPlayer(initialStats?: PlayerStats): void {
    if (this.player) {
      this.player.destroy();
    }

    this.player = new Player(
      this.eventBus,
      this.renderingSystem,
      this.projectileSystem,
      { x: 0, y: 0 },
      initialStats
    );
  }

  public setRenderingSystem(renderingSystem: RenderingSystem): void {
    this.renderingSystem = renderingSystem;
    this.projectileSystem.setRenderingSystem(renderingSystem);
  }

  private handleEnemyEscape(data: { damage: number; enemyType: string; enemyId: string }): void {
    console.log(`🎯 EntitySystem: Enemy ${data.enemyType} escaped, emitting player:damage with ${data.damage} damage`);
    
    // Emit damage event for Player to handle
    this.eventBus.emit('player:damage', { 
      damage: data.damage,
      reason: 'enemy_escape',
      enemyType: data.enemyType 
    });
    
    // Remove the escaped enemy
    this.enemies.delete(data.enemyId);
  }

  private handleEnemyDestroyed(data: { points: number; enemyType: string; enemyId: string }): void {
    // Emit score event for Player to handle
    this.eventBus.emit('player:score', { 
      points: data.points 
    });
    
    // Enemy is already destroyed, just clean up references
    this.enemies.delete(data.enemyId);
  }

  private handleCollisionCheck(data: any): void {
    if (!this.player || data.entityType !== 'enemy') return;

    const playerPos = this.player.getPosition();
    const playerCollisionShape = this.player.getCollisionShape();
    
    // Use compound-circle collision detection (player as compound shape, enemy as circle)
    const hasCollision = CollisionUtils.checkCompoundCircleCollision(
      playerPos,
      playerCollisionShape,
      data.position,
      data.radius
    );

    if (hasCollision) {
      // Apply damage directly to player
      if (this.player) {
        const isDead = this.player.takeDamage(data.damage);
        if (isDead) {
          console.log('💀 Player died from collision, EntitySystem deactivating...');
          this.isActive = false;
        }
      }
      
      const enemy = this.enemies.get(data.entityId);
      if (enemy) {
        enemy.destroy();
        this.enemies.delete(data.entityId);
      }
    }
  }

  private handleProjectileEnemyCollision(data: any): void {
    // Use collision utility to find closest enemy that collides with projectile
    const collision = CollisionUtils.findClosestCollision(
      data.position,
      data.radius,
      this.enemies,
      (enemy) => enemy.getRadius()
    );

    if (collision) {
      const hitEnemy = collision.target;
      const hitEnemyId = collision.id!;
      const isDead = hitEnemy.takeDamage(data.damage);
      this.projectileSystem.removeProjectile(data.projectileId);
      
      if (isDead) {
        this.enemies.delete(hitEnemyId);
      }
    }
  }

  private handlePowerUpPlayerCollision(data: any): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();
    const playerCollisionShape = this.player.getCollisionShape();
    
    // Use compound-circle collision detection (player as compound shape, powerup as circle)
    const hasCollision = CollisionUtils.checkCompoundCircleCollision(
      playerPos,
      playerCollisionShape,
      data.position,
      data.radius
    );

    if (hasCollision) {
      switch (data.type) {
        case 'ammo':
          this.player.addAmmo(data.effect || 10);
          break;
        case 'health':
          this.player.heal(data.effect || 25);
          break;
        case 'shield':
          console.log('Shield power-up collected (not implemented yet)');
          break;
      }

      this.eventBus.emit('particles:hit', {
        position: { x: data.position.x, y: data.position.y, z: 0 }
      });
      
      this.eventBus.emit('audio:play', { soundId: 'powerup', options: { volume: 0.4 } });

      const powerUp = this.powerUps.get(data.powerUpId);
      if (powerUp) {
        powerUp.destroy();
        this.powerUps.delete(data.powerUpId);
      }
    }
  }

  public update(deltaTime: number): void {
    if (!this.isActive) {
      console.log('⚠️ EntitySystem.update called but system is not active. Enemies count:', this.enemies.size);
      return;
    }

    if (this.player) {
      this.player.update(deltaTime);
    }

    this.enemies.forEach((enemy, id) => {
      enemy.update(deltaTime);
      if (!enemy.isEntityActive()) {
        console.log('🗑️ Removing inactive enemy:', id);
        this.enemies.delete(id);
      }
    });

    this.powerUps.forEach((powerUp, id) => {
      powerUp.update(deltaTime);
      if (!powerUp.isEntityActive()) {
        this.powerUps.delete(id);
      }
    });

    this.projectileSystem.update(deltaTime);
    
    this.trySpawnEnemy(deltaTime);
    this.trySpawnPowerUp(deltaTime);
  }

  private trySpawnEnemy(deltaTime: number): void {
    this.enemySpawnTimer += deltaTime;
    const spawnRate = ENEMY_CONFIG.basic.spawnRate / 1000; // Convert milliseconds to seconds
    
    if (this.enemySpawnTimer >= spawnRate) {
      try {
        const enemy = Enemy.spawnEnemy(this.eventBus);
        this.enemies.set(enemy.getId(), enemy);
        this.enemySpawnTimer = 0; // Reset timer
      } catch (error) {
        console.error('❌ Error spawning enemy:', error);
      }
    }
  }

  private trySpawnPowerUp(deltaTime: number): void {
    this.powerUpSpawnTimer += deltaTime;
    const spawnRate = POWERUP_CONFIG.ammo.spawnRate / 1000; // Convert milliseconds to seconds
    
    if (this.powerUpSpawnTimer >= spawnRate) {
      try {
        const powerUp = PowerUp.spawnPowerUp(this.eventBus);
        this.powerUps.set(powerUp.getId(), powerUp);
        this.powerUpSpawnTimer = 0; // Reset timer
      } catch (error) {
        console.error('Error spawning power-up:', error);
      }
    }
  }

  private clearAllEnemies(): void {
    this.enemies.forEach(enemy => {
      enemy.destroy();
    });
    this.enemies.clear();
  }

  private clearAllPowerUps(): void {
    this.powerUps.forEach(powerUp => {
      powerUp.destroy();
    });
    this.powerUps.clear();
  }

  public getPlayer(): Player | null {
    return this.player;
  }

  public getEnemies(): Map<string, Enemy> {
    return new Map(this.enemies);
  }

  public getPowerUps(): Map<string, PowerUp> {
    return new Map(this.powerUps);
  }

  public getProjectileSystem(): ProjectileSystem {
    return this.projectileSystem;
  }

  public resetPlayer(): void {
    if (this.player) {
      this.player.reset();
    }
  }

  public dispose(): void {
    this.endGame();
    this.projectileSystem.dispose();
  }
}