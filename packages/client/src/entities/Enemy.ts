import * as THREE from 'three';
import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { assetManager } from '../services/AssetManager';
import { ENEMY_CONFIG } from '@spaceshooter/shared';
import type { Enemy as EnemyData } from '@spaceshooter/shared';

export class Enemy extends Entity {
  private enemyType: EnemyData['type'];
  private health: number;
  private maxHealth: number;
  private config: typeof ENEMY_CONFIG[keyof typeof ENEMY_CONFIG];

  constructor(
    eventBus: EventBus,
    id: string,
    enemyType: EnemyData['type'],
    initialPosition: Position
  ) {
    const config = ENEMY_CONFIG[enemyType];
    if (!config) {
      console.error(`❌ Enemy config not found for type: ${enemyType}`);
      throw new Error(`Enemy config not found for type: ${enemyType}`);
    }
    // Inicializa com velocidade zero, será calculada no update
    super(eventBus, id, initialPosition, { x: 0, y: 0 });
    this.enemyType = enemyType;
    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;
    this.createVisual();
  }

  protected setupEventHandlers(): void {
    const unsubscribeProjectileHit = this.eventBus.on('projectile:hit', (data) => {
      if (data.targetId === this.id) {
        this.takeDamage(data.damage);
      }
    });

    this.addCleanupFunction(unsubscribeProjectileHit);
  }

  protected createVisual(): void {
    if (!this.config) {
      console.error('❌ Enemy config not found for type:', this.enemyType);
      return;
    }
    
    const size = this.config.size || 0.3;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = assetManager.getEnemyMaterial(this.enemyType);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.object.add(mesh);
    
    // Create collision visualizer for enemy
    const radius = this.config.radius || (this.config.size || 0.3);
    this.createCollisionVisualizer(radius);
    
    this.eventBus.emit('scene:add-object', { object: this.object });
  }

  protected onUpdate(deltaTime: number): void {
    if (!this.isActive) return;

    // Persegue o jogador
    const game = (window as any).game;
    if (game && typeof game.getEntitySystem === 'function') {
      const entitySystem = game.getEntitySystem();
      if (entitySystem && typeof entitySystem.getPlayer === 'function') {
        const player = entitySystem.getPlayer();
        if (player && typeof player.getPosition === 'function') {
          const playerPos = player.getPosition();
          const dx = playerPos.x - this.position.x;
          const dy = playerPos.y - this.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.01) {
            this.velocity.x = (dx / dist) * this.config.speed;
            this.velocity.y = (dy / dist) * this.config.speed;
          }
        }
      }
    }
    // Move
    this.setPosition({
      x: this.position.x + this.velocity.x * deltaTime,
      y: this.position.y + this.velocity.y * deltaTime
    });

    this.checkPlayerCollision();
  }

  private checkBoundsAndDestroy(): void {
    // Remove inimigo se sair muito longe do mapa
    const bounds = { minX: -15, maxX: 15, minY: -12, maxY: 12 };
    if (!this.checkBounds(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)) {
      this.destroy();
    }
  }

  private handleEscape(): void {
    const escapePenalty = this.getEscapePenalty();
    
    console.log(`🏃 Enemy ${this.enemyType} escaping! Damage: ${escapePenalty}`);
    
    // Emit enemy escape event - other systems will handle the consequences
    this.eventBus.emit('enemy:escaped', { 
      damage: escapePenalty,
      enemyType: this.enemyType,
      enemyId: this.id
    });

    this.eventBus.emit('audio:play', { soundId: 'hit', options: { volume: 0.3 } });
    
    this.eventBus.emit('particles:hit', {
      position: { x: 0, y: -3, z: 0 }
    });
    
    console.log(`Enemy ${this.enemyType} escaped! -${escapePenalty} HP`);
    
    this.destroy();
  }

  private getEscapePenalty(): number {
    switch (this.enemyType) {
      case 'basic': return 5;
      case 'fast': return 8;
      case 'heavy': return 15;
      default: return 5;
    }
  }

  private checkPlayerCollision(): void {
    this.eventBus.emit('collision:check', {
      entityId: this.id,
      entityType: 'enemy',
      position: this.position,
      radius: this.config.radius,
      damage: this.getCollisionDamage()
    });
  }

  private getCollisionDamage(): number {
    switch (this.enemyType) {
      case 'basic': return 10;
      case 'fast': return 15;
      case 'heavy': return 25;
      default: return 10;
    }
  }

  public takeDamage(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);
    
    if (this.health <= 0) {
      this.onDeath();
      return true;
    }
    
    return false;
  }

  public getEnemyType(): EnemyData['type'] {
    return this.enemyType;
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  private onDeath(): void {
    const scorePoints = this.getScoreValue();
    const xpReward = this.config.xpDrop;
    
    // Emit enemy death event - other systems will handle score/rewards
    this.eventBus.emit('enemy:destroyed', { 
      points: scorePoints,
      xp: xpReward,
      xpOrbCount: this.config.xpOrbCount,
      enemyType: this.enemyType,
      enemyId: this.id,
      position: { x: this.position.x, y: this.position.y, z: 0 }
    });
    
    this.eventBus.emit('audio:play', { soundId: 'explosion', options: { volume: 0.4 } });
    
    this.eventBus.emit('particles:explosion', {
      position: { x: this.position.x, y: this.position.y, z: 0 }
    });

    console.log(`Enemy ${this.enemyType} destroyed! +${scorePoints} points`);
    
    this.destroy();
  }

  private getScoreValue(): number {
    switch (this.enemyType) {
      case 'basic': return 10;
      case 'fast': return 25;
      case 'heavy': return 50;
      default: return 10;
    }
  }

  protected onDestroy(): void {
    this.eventBus.emit('scene:remove-object', { object: this.object });
  }

  public static spawnEnemy(eventBus: EventBus): Enemy {
    const currentTime = Date.now();
    const enemyId = `enemy_${currentTime}_${Math.random()}`;
    const rand = Math.random();
    let enemyType: EnemyData['type'];
    if (rand < 0.7) {
      enemyType = 'basic';
    } else if (rand < 0.9) {
      enemyType = 'fast';
    } else {
      enemyType = 'heavy';
    }
    // Spawn em uma borda aleatória do mapa
    const edge = Math.floor(Math.random() * 4); // 0:top, 1:bottom, 2:left, 3:right
    let x = 0, y = 0;
    const bounds = { minX: -10, maxX: 10, minY: -7.5, maxY: 7.5 };
    if (edge === 0) { // topo
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      y = bounds.maxY;
    } else if (edge === 1) { // baixo
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      y = bounds.minY;
    } else if (edge === 2) { // esquerda
      x = bounds.minX;
      y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    } else { // direita
      x = bounds.maxX;
      y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    }
    const spawnPosition: Position = { x, y };
    const enemy = new Enemy(eventBus, enemyId, enemyType, spawnPosition);
    console.log(`Enemy spawned: ${enemyType} at (${spawnPosition.x.toFixed(1)}, ${spawnPosition.y.toFixed(1)})`);
    return enemy;
  }
}