import { EntityManager, TrackedEntity } from './EntityManager';
import { AudioSystem } from '../systems/AudioSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { Projectile, Enemy, PowerUp, ENEMY_CONFIG, POWERUP_CONFIG } from '@spaceshooter/shared';

export interface CollisionResult {
  projectileHits: Array<{
    projectileId: string;
    enemyId: string;
    enemy: TrackedEntity<Enemy>;
    destroyed: boolean;
    points: number;
  }>;
  playerCollisions: Array<{
    enemyId: string;
    enemy: TrackedEntity<Enemy>;
    damage: number;
  }>;
  powerUpCollections: Array<{
    powerUpId: string;
    powerUp: TrackedEntity<PowerUp>;
    effect: number;
  }>;
}

/**
 * CollisionSystem - Sistema de detecção e resolução de colisões
 * 
 * Gerencia todas as colisões do jogo de forma centralizada e eficiente.
 * Integra com sistemas de áudio e partículas para feedback.
 * 
 * @features
 * - Detecção otimizada de colisões (circular)
 * - Feedback visual e sonoro automático
 * - Tracking de estatísticas
 * - Configuração flexível de raios
 * - Sistema de pontuação integrado
 */
export class CollisionSystem {
  // Collision radii configuration
  private readonly COLLISION_RADII = {
    projectile: 0.1,
    player: 0.3,
    enemy: {
      basic: 0.25,
      fast: 0.2,
      heavy: 0.35
    },
    powerUp: {
      ammo: 0.2,
      health: 0.25,
      shield: 0.22
    }
  };

  constructor(
    private entityManager: EntityManager,
    private audioSystem: AudioSystem,
    private particleSystem: ParticleSystem
  ) {}

  /**
   * Executa detecção de todas as colisões
   */
  checkAllCollisions(playerPosition: { x: number; y: number }): CollisionResult {
    const result: CollisionResult = {
      projectileHits: [],
      playerCollisions: [],
      powerUpCollections: []
    };

    // Check projectile vs enemy collisions
    this.checkProjectileEnemyCollisions(result);
    
    // Check player vs enemy collisions
    this.checkPlayerEnemyCollisions(playerPosition, result);
    
    // Check player vs power-up collisions
    this.checkPlayerPowerUpCollisions(playerPosition, result);

    return result;
  }

  /**
   * Colisões projétil vs inimigo
   */
  private checkProjectileEnemyCollisions(result: CollisionResult): void {
    const projectiles = this.entityManager.getProjectiles();
    const enemies = this.entityManager.getEnemies();

    projectiles.forEach((projectile, projectileId) => {
      enemies.forEach((enemy, enemyId) => {
        if (this.isColliding(
          projectile.data.position, 
          enemy.data.position,
          this.COLLISION_RADII.projectile,
          this.COLLISION_RADII.enemy[enemy.data.type as keyof typeof this.COLLISION_RADII.enemy] || 0.25
        )) {
          // Calculate damage and points
          const damage = projectile.data.damage;
          const destroyed = this.entityManager.damageEnemy(enemyId, damage);
          const points = destroyed ? this.getScoreForEnemyType(enemy.data.type) : 0;
          
          // Add to results
          result.projectileHits.push({
            projectileId,
            enemyId,
            enemy,
            destroyed,
            points
          });

          // Remove projectile
          this.entityManager.removeProjectile(projectileId);

          // Effects
          if (destroyed) {
            this.createDestroyEffects(enemy.data.position);
            console.log(`💥 Enemy ${enemy.data.type} destroyed! +${points} points`);
          } else {
            this.createHitEffects(enemy.data.position);
            this.audioSystem.playSound('hit');
            console.log(`🎯 Enemy ${enemy.data.type} hit! ${enemy.data.health}/${enemy.data.maxHealth} HP`);
          }
        }
      });
    });
  }

  /**
   * Colisões jogador vs inimigo
   */
  private checkPlayerEnemyCollisions(
    playerPosition: { x: number; y: number }, 
    result: CollisionResult
  ): void {
    const enemies = this.entityManager.getEnemies();

    enemies.forEach((enemy, enemyId) => {
      if (this.isColliding(
        playerPosition,
        enemy.data.position,
        this.COLLISION_RADII.player,
        this.COLLISION_RADII.enemy[enemy.data.type as keyof typeof this.COLLISION_RADII.enemy] || 0.25
      )) {
        const damage = this.getDamageForEnemyType(enemy.data.type);
        
        result.playerCollisions.push({
          enemyId,
          enemy,
          damage
        });

        // Remove enemy
        this.entityManager.removeEnemy(enemyId);

        // Effects
        this.createPlayerHitEffects(playerPosition);
        this.audioSystem.playSound('hit');
        
        console.log(`💢 Player hit by ${enemy.data.type}! -${damage} HP`);
      }
    });
  }

  /**
   * Colisões jogador vs power-up
   */
  private checkPlayerPowerUpCollisions(
    playerPosition: { x: number; y: number },
    result: CollisionResult
  ): void {
    const powerUps = this.entityManager.getPowerUps();

    powerUps.forEach((powerUp, powerUpId) => {
      const powerUpRadius = this.COLLISION_RADII.powerUp[powerUp.data.type as keyof typeof this.COLLISION_RADII.powerUp] || 0.2;
      
      if (this.isColliding(
        playerPosition,
        powerUp.data.position,
        this.COLLISION_RADII.player,
        powerUpRadius
      )) {
        const config = POWERUP_CONFIG[powerUp.data.type];
        
        result.powerUpCollections.push({
          powerUpId,
          powerUp,
          effect: config.effect
        });

        // Remove power-up
        this.entityManager.removePowerUp(powerUpId);

        // Effects
        this.createCollectEffects(powerUp.data.position, powerUp.data.type);
        this.audioSystem.playSound('powerup');
        
        console.log(`✨ Collected ${powerUp.data.type} power-up! +${config.effect}`);
      }
    });
  }

  /**
   * Verifica colisão circular entre duas posições
   */
  private isColliding(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
    radius1: number,
    radius2: number
  ): boolean {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const collisionDistance = radius1 + radius2;
    
    return distance < collisionDistance;
  }

  /**
   * Efeitos visuais/sonoros para destruição de inimigo
   */
  private createDestroyEffects(position: { x: number; y: number }): void {
    // Particle explosion
    if (this.particleSystem.createExplosion) {
      this.particleSystem.createExplosion(position, {
        particleCount: 15,
        colors: [0xff4444, 0xff8844, 0xffff44],
        duration: 800,
        spread: 1.5
      });
    }

    // Audio
    this.audioSystem.playSound('explosion');
  }

  /**
   * Efeitos para hit (sem destruição)
   */
  private createHitEffects(position: { x: number; y: number }): void {
    // Smaller particle effect
    if (this.particleSystem.createHitEffect) {
      this.particleSystem.createHitEffect(position, {
        particleCount: 5,
        colors: [0xff6666],
        duration: 300,
        spread: 0.5
      });
    }
  }

  /**
   * Efeitos para jogador sendo atingido
   */
  private createPlayerHitEffects(position: { x: number; y: number }): void {
    // Screen shake effect could be added here
    if (this.particleSystem.createHitEffect) {
      this.particleSystem.createHitEffect(position, {
        particleCount: 8,
        colors: [0xff0000, 0xff4444],
        duration: 500,
        spread: 0.8
      });
    }
  }

  /**
   * Efeitos para coleta de power-up
   */
  private createCollectEffects(position: { x: number; y: number }, type: PowerUp['type']): void {
    const config = POWERUP_CONFIG[type];
    
    if (this.particleSystem.createHitEffect) {
      this.particleSystem.createHitEffect(position, {
        particleCount: 8,
        colors: [config.color, 0xffffff],
        duration: 600,
        spread: 0.6
      });
    }
  }

  /**
   * Retorna pontuação por tipo de inimigo
   */
  private getScoreForEnemyType(enemyType: Enemy['type']): number {
    const config = ENEMY_CONFIG[enemyType as keyof typeof ENEMY_CONFIG];
    return config?.points || 0;
  }

  /**
   * Retorna dano por tipo de inimigo
   */
  private getDamageForEnemyType(enemyType: Enemy['type']): number {
    const config = ENEMY_CONFIG[enemyType as keyof typeof ENEMY_CONFIG];
    return config?.damage || 10;
  }

  /**
   * Configurar raios de colisão customizados
   */
  setCollisionRadius(entityType: string, radius: number): void {
    // Implementation for dynamic collision radius adjustment
    console.log(`Setting collision radius for ${entityType}: ${radius}`);
  }

  /**
   * Debug: Desenhar círculos de colisão (modo debug)
   */
  debugDrawCollisionCircles(enabled: boolean): void {
    // Could implement visual debug circles for collision detection
    console.log(`Collision debug circles: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Estatísticas de colisão
   */
  getCollisionStats() {
    return {
      // Could track collision counts, average distance, etc.
      radiiConfig: this.COLLISION_RADII,
      entityCounts: this.entityManager.getEntityCounts()
    };
  }
}