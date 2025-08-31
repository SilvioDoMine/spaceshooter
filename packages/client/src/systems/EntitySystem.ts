import { EventBus } from '../core/EventBus';
import { Player, PlayerStats } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { PowerUp } from '../entities/PowerUp';
import { ProjectileSystem } from './ProjectileSystem';
import { RenderingSystem } from './RenderingSystem';
import { CollisionUtils } from '../utils/CollisionUtils';
import { POWERUP_CONFIG, PROJECTILE_CONFIG } from '@spaceshooter/shared';
import { WaveSystem } from './WaveSystem';

export class EntitySystem {
  private eventBus: EventBus;
  private renderingSystem: RenderingSystem;
  private projectileSystem: ProjectileSystem;
  private waveSystem: WaveSystem;
  private player: Player | null = null;
  private enemies: Map<string, Enemy> = new Map();
  private powerUps: Map<string, PowerUp> = new Map();
  private powerUpSpawnTimer: number = 0;
  private isActive: boolean = false;

  constructor(eventBus: EventBus, renderingSystem?: RenderingSystem) {
    this.eventBus = eventBus;
    this.renderingSystem = renderingSystem!; // Will be injected later if not provided
    this.projectileSystem = new ProjectileSystem(eventBus, renderingSystem);
    this.waveSystem = new WaveSystem(eventBus);
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

    this.eventBus.on('collision:projectile-enemy', (data: { projectileId: string; position: { x: number; y: number }; damage: number; radius: number; noSkillTrigger?: boolean }) => {
      this.handleProjectileEnemyCollision(data);
    });

    this.eventBus.on('collision:powerup-player', (data) => {
      this.handlePowerUpPlayerCollision(data);
    });

    this.eventBus.on('entity:shoot', (data) => {
      this.handleEntityShoot(data);
    });

    this.eventBus.on('collision:projectile-player', (data) => {
      this.handleProjectilePlayerCollision(data);
    });

    // Wave system handlers
    this.eventBus.on('wave:clear-enemies', () => {
      console.log('🌊 EntitySystem: Clearing all enemies for boss spawn');
      this.clearAllEnemies();
    });

    this.eventBus.on('wave:enemy-spawned', (data) => {
      // Add enemy to tracking
      this.enemies.set(data.enemy.getId(), data.enemy);
      console.log(`🌊 EntitySystem: Tracking wave enemy ${data.enemy.getId()}`);
    });

    this.eventBus.on('boss:spawned', (data) => {
      // Add boss to tracking
      this.enemies.set(data.boss.getId(), data.boss);
      console.log(`👹 EntitySystem: Tracking boss ${data.boss.getId()}`);
    });
  }

  private startGame(): void {
    console.log('🚀 EntitySystem.startGame called');
    this.isActive = true;
    // Reset power-up spawn timer
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

  private handleEnemyDestroyed(data: { points: number; xp: number; enemyType: string; enemyId: string }): void {
    // Emit score event for Player to handle
    this.eventBus.emit('player:score', { 
      points: data.points 
    });
    
    // XP agora vem apenas dos orbes coletados
    // this.eventBus.emit('player:xp-gain', {
    //   xp: data.xp
    // });
    
    // Emit boss defeated event (WaveSystem handles boss tracking)
    this.eventBus.emit('boss:defeated', { enemyId: data.enemyId });
    
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
        // Usa a propriedade diesOnPlayerCollision para decidir se morre
        if (data.diesOnPlayerCollision === false) {
          // Não morre ao colidir (ex: fast enemy)
          // Apenas causa dano ao player
        } else {
          // Morre ao colidir
          enemy.destroy();
          this.enemies.delete(data.entityId);
        }
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

      // --- Skill: Tri Shot ---
      if (
        this.player &&
        this.player.getSkillLevel &&
        this.player.getSkillLevel('tri_shot') > 0 &&
        !data.noSkillTrigger // só ativa se não for ricochete/triangular
      ) {
        const enemyPos = hitEnemy.getPosition();
        const dx = enemyPos.x - data.position.x;
        const dy = enemyPos.y - data.position.y;
        const baseAngle = Math.atan2(dy, dx);
        const projectileSpeed = PROJECTILE_CONFIG.speed;
        const angles = [0, Math.PI / 3, -Math.PI / 3];
        angles.forEach(offset => {
          const angle = baseAngle + offset;
          const velocity = {
            x: Math.cos(angle) * projectileSpeed,
            y: Math.sin(angle) * projectileSpeed
          };
          this.projectileSystem.createProjectile(
            'player',
            { x: enemyPos.x, y: enemyPos.y },
            velocity,
            PROJECTILE_CONFIG.damage,
            0, // ricochetCount
            0, // maxRicochets
            false,
            0,
            true // noSkillTrigger: não ativa ricochete nem tri_shot
          );
        });
        this.eventBus.emit('audio:play', { soundId: 'shoot', options: { volume: 0.25 } });
      }

      // Call handleProjectileHit instead of removeProjectile directly
      // This triggers ricochet logic if the projectile has ricochet enabled
      this.projectileSystem.handleProjectileHit(data.projectileId, hitEnemyId);

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
    
    // Update wave system (handles enemy and boss spawning)
    this.waveSystem.update(deltaTime);
    
    // Keep power-ups spawning as before
    this.trySpawnPowerUp(deltaTime);
    
    // Update debug system with entity counts
    this.updateDebugInfo();
  }


  private trySpawnPowerUp(deltaTime: number): void {
    this.powerUpSpawnTimer += deltaTime;
    const spawnRate = POWERUP_CONFIG.ammo.spawnRate / 1000; // Convert milliseconds to seconds

    // Limite de 5 power-ups ativos
    if (this.powerUps.size >= 5) {
      return;
    }

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

  private updateDebugInfo(): void {
    const totalEntities = 1 + this.enemies.size + this.powerUps.size; // 1 for player
    const projectileCount = this.projectileSystem.getProjectileCount();
    
    this.eventBus.emit('debug:update', {
      entities: totalEntities.toString(),
      enemies: this.enemies.size.toString(),
      powerups: this.powerUps.size.toString(),
      projectiles: projectileCount.toString(),
      // particles: ParticleSystem provides this separately
    });
  }

  public resetPlayer(): void {
    if (this.player) {
      this.player.reset();
    }
  }


  private handleEntityShoot(data: any): void {
    const { ownerId, position, velocity, damage, config } = data;
    
    this.projectileSystem.createProjectile(
      ownerId,
      position,
      velocity,
      damage,
      0, // ricochetCount
      0, // maxRicochets
      false, // isRicochet
      0, // ricochetLevel
      false, // noSkillTrigger
      config // projectileConfig
    );
  }

  private handleProjectilePlayerCollision(data: any): void {
    if (!this.player) return;

    const playerPos = this.player.getPosition();
    const playerCollisionShape = this.player.getCollisionShape();
    
    // Use compound-circle collision detection (player as compound shape, projectile as circle)
    const hasCollision = CollisionUtils.checkCompoundCircleCollision(
      playerPos,
      playerCollisionShape,
      data.position,
      data.radius
    );

    if (hasCollision) {
      // Remove o projétil
      this.projectileSystem.removeProjectile(data.projectileId);
      
      // Apply damage to player
      const isDead = this.player.takeDamage(data.damage);
      if (isDead) {
        console.log('💀 Player died from enemy projectile, EntitySystem deactivating...');
        this.isActive = false;
      }
      
      console.log(`🎯 Player hit by projectile from ${data.ownerId} for ${data.damage} damage`);
    }
  }

  public getActiveBoss(): Enemy | null {
    return this.waveSystem.getActiveBoss();
  }

  public dispose(): void {
    this.endGame();
    this.projectileSystem.dispose();
  }
}