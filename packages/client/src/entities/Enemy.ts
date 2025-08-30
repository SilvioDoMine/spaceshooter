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
    
    super(eventBus, id, initialPosition, { x: 0, y: -config.speed });
    
    this.enemyType = enemyType;
    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;
    
    // Now create visual after all properties are set
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

    this.checkBoundsAndDestroy();
    this.checkPlayerCollision();
  }

  private checkBoundsAndDestroy(): void {
    const bounds = { minX: -10, maxX: 10, minY: -6, maxY: 10 };
    
    if (!this.checkBounds(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)) {
      if (this.position.y < bounds.minY) {
        this.handleEscape();
      } else {
        this.destroy();
      }
    }
  }

  private handleEscape(): void {
    const escapePenalty = this.getEscapePenalty();
    
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
    
    // Emit enemy death event - other systems will handle score/rewards
    this.eventBus.emit('enemy:destroyed', { 
      points: scorePoints,
      enemyType: this.enemyType,
      enemyId: this.id
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
    
    const spawnPosition: Position = {
      x: (Math.random() - 0.5) * 8, // Random X between -4 and 4
      y: 6  // Top of screen
    };
    
    const enemy = new Enemy(eventBus, enemyId, enemyType, spawnPosition);
    
    console.log(`Enemy spawned: ${enemyType} at (${spawnPosition.x.toFixed(1)}, ${spawnPosition.y})`);
    
    return enemy;
  }
}