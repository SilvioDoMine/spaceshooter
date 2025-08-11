import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { assetManager } from '../services/AssetManager';
import { PROJECTILE_CONFIG } from '@spaceshooter/shared';
import type { Projectile } from '@spaceshooter/shared';
import { Position, Velocity } from '../entities/Entity';

export interface ProjectileData {
  id: string;
  object: THREE.Mesh;
  data: Projectile;
}

export class ProjectileSystem {
  private eventBus: EventBus;
  private projectiles: Map<string, ProjectileData> = new Map();
  private isActive: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.eventBus.on('game:started', () => {
      this.isActive = true;
    });

    this.eventBus.on('game:over', () => {
      this.isActive = false;
      this.clearAllProjectiles();
    });

    this.eventBus.on('game:paused', () => {
      this.isActive = false;
    });

    this.eventBus.on('game:resumed', () => {
      this.isActive = true;
    });
  }

  public createProjectile(
    ownerId: string, 
    position: Position, 
    velocity: Velocity,
    damage: number = PROJECTILE_CONFIG.damage
  ): string {
    const currentTime = Date.now();
    const projectileId = `projectile_${currentTime}_${Math.random()}`;

    const projectileData: Projectile = {
      id: projectileId,
      position: { ...position },
      velocity: { ...velocity },
      damage,
      ownerId,
      createdAt: currentTime
    };

    const geometry = new THREE.SphereGeometry(PROJECTILE_CONFIG.size);
    const material = assetManager.getProjectileMaterial();
    const projectileMesh = new THREE.Mesh(geometry, material);
    
    projectileMesh.position.set(position.x, position.y, 0);
    
    this.eventBus.emit('scene:add-object', { object: projectileMesh });

    this.projectiles.set(projectileId, {
      id: projectileId,
      object: projectileMesh,
      data: projectileData
    });

    console.log(`Projectile created: ${projectileId} by ${ownerId}`);
    
    return projectileId;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    const currentTime = Date.now();
    const toRemove: string[] = [];

    this.projectiles.forEach((projectile, id) => {
      const { object, data } = projectile;

      if (currentTime - data.createdAt > PROJECTILE_CONFIG.lifetime) {
        toRemove.push(id);
        return;
      }

      data.position.x += data.velocity.x * deltaTime;
      data.position.y += data.velocity.y * deltaTime;

      object.position.set(data.position.x, data.position.y, 0);

      if (this.isOutOfBounds(data.position)) {
        toRemove.push(id);
        return;
      }

      this.checkCollisions(projectile);
    });

    toRemove.forEach(id => this.removeProjectile(id));
  }

  private isOutOfBounds(position: Position): boolean {
    return position.y > 10 || position.y < -10 || 
           position.x > 10 || position.x < -10;
  }

  private checkCollisions(projectile: ProjectileData): void {
    if (projectile.data.ownerId === 'player') {
      this.checkEnemyCollisions(projectile);
    }
  }

  private checkEnemyCollisions(projectile: ProjectileData): void {
    this.eventBus.emit('collision:projectile-enemy', {
      projectileId: projectile.id,
      position: projectile.data.position,
      damage: projectile.data.damage,
      radius: PROJECTILE_CONFIG.size
    });
  }

  public removeProjectile(projectileId: string): void {
    const projectile = this.projectiles.get(projectileId);
    if (projectile) {
      this.eventBus.emit('scene:remove-object', { object: projectile.object });
      this.projectiles.delete(projectileId);
      console.log(`Projectile removed: ${projectileId}`);
    }
  }

  public handleProjectileHit(projectileId: string, targetId: string): void {
    const projectile = this.projectiles.get(projectileId);
    if (projectile) {
      this.eventBus.emit('projectile:hit', {
        projectileId,
        targetId,
        damage: projectile.data.damage,
        position: projectile.data.position
      });
      
      this.removeProjectile(projectileId);
    }
  }

  public clearAllProjectiles(): void {
    this.projectiles.forEach((projectile) => {
      this.eventBus.emit('scene:remove-object', { object: projectile.object });
    });
    this.projectiles.clear();
    console.log('All projectiles cleared');
  }

  public getActiveProjectiles(): Map<string, ProjectileData> {
    return new Map(this.projectiles);
  }

  public getProjectileCount(): number {
    return this.projectiles.size;
  }

  public dispose(): void {
    this.clearAllProjectiles();
  }
}