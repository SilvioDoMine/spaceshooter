import { EventBus } from '../core/EventBus';
import { Player, PlayerStats } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { PowerUp } from '../entities/PowerUp';
import { ProjectileSystem } from './ProjectileSystem';
import { Position } from '../entities/Entity';
import { ENEMY_CONFIG, POWERUP_CONFIG } from '@spaceshooter/shared';
import { GameStateManager, GameStateEnum } from './GameStateManager';

export class EntitySystem {
  private eventBus: EventBus;
  private projectileSystem: ProjectileSystem;
  private gameStateManager: GameStateManager;
  private player: Player | null = null;
  private enemies: Map<string, Enemy> = new Map();
  private powerUps: Map<string, PowerUp> = new Map();
  private lastEnemySpawnTime: number = 0;
  private lastPowerUpSpawnTime: number = 0;
  private isActive: boolean = false;

  constructor(eventBus: EventBus, gameStateManager: GameStateManager) {
    this.eventBus = eventBus;
    this.gameStateManager = gameStateManager;
    this.projectileSystem = new ProjectileSystem(eventBus);
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

    this.eventBus.on('player:damage', (data) => {
      this.handlePlayerDamage(data.damage);
    });

    this.eventBus.on('player:score', (data) => {
      this.handlePlayerScore(data.points);
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
    // Set normal spawn timing like main2.ts
    this.lastEnemySpawnTime = Date.now();
    this.lastPowerUpSpawnTime = Date.now();
    
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
      this.projectileSystem,
      { x: 0, y: 0 },
      initialStats
    );
  }

  private handlePlayerDamage(damage: number): void {
    if (!this.player) return;

    const isDead = this.player!.takeDamage(damage);
    if (isDead) {
      console.log('💀 Player died, triggering game over...');
      this.isActive = false;
      this.gameStateManager.setState(GameStateEnum.GAME_OVER);
    }
  }

  private handlePlayerScore(points: number): void {
    if (!this.player) return;
    this.player.addScore(points);
  }

  private handleCollisionCheck(data: any): void {
    if (!this.player || data.entityType !== 'enemy') return;

    const playerPos = this.player.getPosition();
    const dx = data.position.x - playerPos.x;
    const dy = data.position.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const playerRadius = 0.3;
    const collisionDistance = playerRadius + data.radius;

    if (distance < collisionDistance) {
      this.handlePlayerDamage(data.damage);
      
      const enemy = this.enemies.get(data.entityId);
      if (enemy) {
        enemy.destroy();
        this.enemies.delete(data.entityId);
      }
    }
  }

  private handleProjectileEnemyCollision(data: any): void {
    let hitEnemy: Enemy | null = null;
    let hitEnemyId: string | null = null;

    this.enemies.forEach((enemy, id) => {
      const enemyPos = enemy.getPosition();
      const dx = data.position.x - enemyPos.x;
      const dy = data.position.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const collisionDistance = data.radius + 0.5;

      if (distance < collisionDistance && !hitEnemy) {
        hitEnemy = enemy;
        hitEnemyId = id;
      }
    });

    if (hitEnemy && hitEnemyId) {
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
    const dx = data.position.x - playerPos.x;
    const dy = data.position.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const playerRadius = 0.3;
    const collisionDistance = playerRadius + data.radius;

    if (distance < collisionDistance) {
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
    
    this.trySpawnEnemy();
    this.trySpawnPowerUp();
  }

  private trySpawnEnemy(): void {
    const currentTime = Date.now();
    const timeSinceLastSpawn = currentTime - this.lastEnemySpawnTime;
    const spawnRate = ENEMY_CONFIG.basic.spawnRate;
    
    // console.log(`Enemy spawn check: time since last=${timeSinceLastSpawn}ms, required=${spawnRate}ms, should spawn=${timeSinceLastSpawn > spawnRate}`);
    
    if (timeSinceLastSpawn > spawnRate) {
      try {
        const enemy = Enemy.spawnEnemy(this.eventBus);
        this.enemies.set(enemy.getId(), enemy);
        this.lastEnemySpawnTime = currentTime;
      } catch (error) {
        console.error('❌ Error spawning enemy:', error);
      }
    }
  }

  private trySpawnPowerUp(): void {
    const currentTime = Date.now();
    
    // Spawn de power-up usando a mesma lógica do main2.ts
    if (currentTime - this.lastPowerUpSpawnTime > POWERUP_CONFIG.ammo.spawnRate) {
      try {
        const powerUp = PowerUp.spawnPowerUp(this.eventBus);
        this.powerUps.set(powerUp.getId(), powerUp);
        this.lastPowerUpSpawnTime = currentTime;
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