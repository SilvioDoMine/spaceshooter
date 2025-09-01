import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { RenderingSystem } from './RenderingSystem';
import { assetManager } from '../services/AssetManager';
import { PROJECTILE_CONFIG } from '@spaceshooter/shared';
import type { Projectile } from '@spaceshooter/shared';
import { Position, Velocity } from '../entities/Entity';
import { CollisionDebugHelper } from '../utils/CollisionDebugHelper';

export interface ProjectileData {
  id: string;
  object: THREE.Mesh;
  data: Projectile;
  collisionVisualizer?: THREE.LineLoop;
  lifetime: number; // Time remaining in seconds
  // Ricochet properties
  ricochetCount?: number;
  maxRicochets?: number;
  isRicochet?: boolean;
  hitEnemies?: Set<string>; // Anti-loop protection
  ricochetLevel?: number; // Skill level for damage calculation
}

export class ProjectileSystem {
  private eventBus: EventBus;
  private renderingSystem?: RenderingSystem;
  private projectiles: Map<string, ProjectileData> = new Map();
  private isActive: boolean = false;
  private collisionDebugEnabled: boolean = false;
  private lastRicochetTime: number = 0;
  private ricochetCooldown: number = 200; // 200ms between different ricochet salvos
  private cachedRicochetTarget: { id: string; position: Position } | null = null; // Store target for multi-shot

  constructor(eventBus: EventBus, renderingSystem?: RenderingSystem) {
    this.eventBus = eventBus;
    this.renderingSystem = renderingSystem;
    this.setupEventHandlers();
  }

  public setRenderingSystem(renderingSystem: RenderingSystem): void {
    this.renderingSystem = renderingSystem;
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

    this.eventBus.on('debug:collision-visibility-toggle', (data: { visible: boolean }) => {
      this.collisionDebugEnabled = data.visible;
      this.updateAllCollisionVisibility();
    });
  }

  public createProjectile(
    ownerId: string, 
    position: Position, 
    velocity: Velocity,
    damage: number = PROJECTILE_CONFIG.damage,
    ricochetCount: number = 0,
    maxRicochets: number = 0,
    isRicochet: boolean = false,
    ricochetLevel: number = 0,
    noSkillTrigger: boolean = false,
    projectileConfig?: {
      size?: number;
      radius?: number;
      color?: number;
      lifetime?: number;
    }
  ): string {
    const currentTime = Date.now();
    const projectileId = `projectile_${currentTime}_${Math.random()}`;

    // Use configurações customizadas ou padrão
    const config = {
      size: projectileConfig?.size ?? PROJECTILE_CONFIG.size,
      radius: projectileConfig?.radius ?? PROJECTILE_CONFIG.radius,
      color: projectileConfig?.color ?? 0x00ffff, // Azul padrão
      lifetime: projectileConfig?.lifetime ?? PROJECTILE_CONFIG.lifetime
    };

    const projectileData: Projectile = {
      id: projectileId,
      position: { ...position },
      velocity: { ...velocity },
      damage,
      ownerId,
      createdAt: currentTime,
      noSkillTrigger
    };

    const geometry = new THREE.SphereGeometry(config.size);

    let material: THREE.Material;
    if (projectileConfig?.color !== undefined) {
      // Criar material com cor customizada
      material = new THREE.MeshBasicMaterial({ 
        color: config.color,
        transparent: noSkillTrigger,
        opacity: noSkillTrigger ? 0.35 : 1.0
      });
    } else {
      // Usar material padrão do jogador
      material = assetManager.getProjectileMaterial();
      // Se for projétil fantasma, deixar translúcido
      if (noSkillTrigger) {
        material = material.clone();
        if ('opacity' in material) {
          (material as any).transparent = true;
          (material as any).opacity = 0.35;
        }
      }
    }
    
    const projectileMesh = new THREE.Mesh(geometry, material);
    projectileMesh.position.set(position.x, position.y, 0);

    // Create collision visualizer for projectile
    const collisionVisualizer = CollisionDebugHelper.createCollisionVisualizer(
      config.radius // Usar radius para colisão, não size
    );
    collisionVisualizer.position.set(position.x, position.y, 0);
    // Set initial visibility based on current debug state
    const game = (window as any).game;
    if (game) {
      try {
        const isVisible = game.getDebugSystem().isCollisionDebugEnabled();
        collisionVisualizer.visible = isVisible;
        this.collisionDebugEnabled = isVisible; // Sync internal state
      } catch (error) {
        collisionVisualizer.visible = false;
      }
    } else {
      collisionVisualizer.visible = this.collisionDebugEnabled;
    }

    if (this.renderingSystem) {
      this.renderingSystem.addToScene(projectileMesh);
      this.renderingSystem.addToScene(collisionVisualizer);
    } else {
      this.eventBus.emit('scene:add-object', { object: projectileMesh });
      this.eventBus.emit('scene:add-object', { object: collisionVisualizer });
    }

    this.projectiles.set(projectileId, {
      id: projectileId,
      object: projectileMesh,
      data: projectileData,
      collisionVisualizer: collisionVisualizer,
      lifetime: config.lifetime / 1000, // Convert milliseconds to seconds
      ricochetCount,
      maxRicochets,
      isRicochet,
      hitEnemies: new Set<string>(),
      ricochetLevel
    });

    if (maxRicochets > 0) {
      console.log(`🟡 Projectile created with ricochet: ${projectileId} (${ricochetCount}/${maxRicochets} bounces, isRicochet: ${isRicochet})`);
    } else {
      console.log(`🔵 Projectile created: ${projectileId} by ${ownerId}`);
    }
    
    return projectileId;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    const toRemove: string[] = [];

    this.projectiles.forEach((projectile, id) => {
      const { object, data } = projectile;

      // Update lifetime
      projectile.lifetime -= deltaTime;
      if (projectile.lifetime <= 0) {
        toRemove.push(id);
        return;
      }

      // Store previous position for continuous collision detection
      const previousPosition = { ...data.position };

      // Update position
      data.position.x += data.velocity.x * deltaTime;
      data.position.y += data.velocity.y * deltaTime;

      object.position.set(data.position.x, data.position.y, 0);
      
      // Update collision visualizer position
      if (projectile.collisionVisualizer) {
        projectile.collisionVisualizer.position.set(data.position.x, data.position.y, 0);
      }

      if (this.isOutOfBounds(data.position)) {
        toRemove.push(id);
        return;
      }

      // Use continuous collision detection to prevent tunneling
      this.checkContinuousCollisions(projectile, previousPosition);
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
    } else {
      // Projétil de inimigo - verifica colisão com jogador
      this.checkPlayerCollisions(projectile);
    }
  }

  private checkContinuousCollisions(projectile: ProjectileData, previousPosition: Position): void {
    if (projectile.data.ownerId === 'player') {
      this.checkEnemyContinuousCollisions(projectile, previousPosition);
    } else {
      this.checkPlayerContinuousCollisions(projectile, previousPosition);
    }
  }

  private checkEnemyCollisions(projectile: ProjectileData): void {
    this.eventBus.emit('collision:projectile-enemy', {
      projectileId: projectile.id,
      position: projectile.data.position,
      damage: projectile.data.damage,
      radius: PROJECTILE_CONFIG.size,
      noSkillTrigger: projectile.data.noSkillTrigger || false
    });
  }

  private checkPlayerCollisions(projectile: ProjectileData): void {
    this.eventBus.emit('collision:projectile-player', {
      projectileId: projectile.id,
      position: projectile.data.position,
      damage: projectile.data.damage,
      radius: projectile.object.geometry.parameters?.radius || 0.1,
      ownerId: projectile.data.ownerId
    });
  }

  private checkEnemyContinuousCollisions(projectile: ProjectileData, previousPosition: Position): void {
    // Emit continuous collision event with both positions
    this.eventBus.emit('collision:projectile-enemy-continuous', {
      projectileId: projectile.id,
      startPosition: previousPosition,
      endPosition: projectile.data.position,
      damage: projectile.data.damage,
      radius: PROJECTILE_CONFIG.size,
      noSkillTrigger: projectile.data.noSkillTrigger || false
    });
  }

  private checkPlayerContinuousCollisions(projectile: ProjectileData, previousPosition: Position): void {
    // Emit continuous collision event with both positions for enemy projectiles
    this.eventBus.emit('collision:projectile-player-continuous', {
      projectileId: projectile.id,
      startPosition: previousPosition,
      endPosition: projectile.data.position,
      damage: projectile.data.damage,
      radius: projectile.object.geometry.parameters?.radius || 0.1,
      ownerId: projectile.data.ownerId
    });
  }

  public removeProjectile(projectileId: string): void {
    const projectile = this.projectiles.get(projectileId);
    if (projectile) {
      if (this.renderingSystem) {
        this.renderingSystem.removeFromScene(projectile.object);
        if (projectile.collisionVisualizer) {
          this.renderingSystem.removeFromScene(projectile.collisionVisualizer);
        }
      } else {
        this.eventBus.emit('scene:remove-object', { object: projectile.object });
        if (projectile.collisionVisualizer) {
          this.eventBus.emit('scene:remove-object', { object: projectile.collisionVisualizer });
        }
      }
      this.projectiles.delete(projectileId);
      console.log(`Projectile removed: ${projectileId}`);
    }
  }

  public handleProjectileHit(projectileId: string, targetId: string): void {
    const projectile = this.projectiles.get(projectileId);
    if (projectile) {
      console.log(`🎯 Projectile ${projectileId} hit ${targetId} (isRicochet: ${projectile.isRicochet}, maxRicochets: ${projectile.maxRicochets}, noSkillTrigger: ${projectile.data.noSkillTrigger})`);

      // Add to hit enemies for anti-loop protection
      if (projectile.hitEnemies) {
        projectile.hitEnemies.add(targetId);
      }

      this.eventBus.emit('projectile:hit', {
        targetId,
        damage: projectile.data.damage
      });


      // Se for projétil fantasma, só atravessa após o primeiro hit: triga skills, depois vira noSkillTrigger
      if (projectile.data.noSkillTrigger && !projectile.data["_ghostFirstHitDone"]) {
        // Primeira colisão: triga skills normalmente, depois marca para atravessar
        projectile.data["_ghostFirstHitDone"] = true;
        // Reemite o mesmo projétil, mas agora com noSkillTrigger true
        // (mantém mesh e posição, só muda flag)
        // Não remove, deixa seguir
        return;
      } else if (projectile.data.noSkillTrigger && projectile.data["_ghostFirstHitDone"]) {
        // Após o primeiro hit, só atravessa
        return;
      }

      // Só ativa ricochete se não for ricochete nem tri_shot
      if (!projectile.data.noSkillTrigger && !projectile.isRicochet && projectile.maxRicochets && projectile.maxRicochets > 0 && (projectile.ricochetCount || 0) === 0) {
        if (this.canRicochet(projectile.data.ownerId, projectile.data.position, projectile.hitEnemies)) {
          console.log(`🔄 Attempting ricochet for projectile ${projectileId}`);
          this.handleRicochet(projectile, targetId);
        } else {
          console.log(`⏱️ Ricochet blocked - no valid target or cooldown`);
        }
      }

      this.removeProjectile(projectileId);
    }
  }

  public clearAllProjectiles(): void {
    this.projectiles.forEach((projectile) => {
      if (this.renderingSystem) {
        this.renderingSystem.removeFromScene(projectile.object);
      } else {
        this.eventBus.emit('scene:remove-object', { object: projectile.object });
      }
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

  private updateAllCollisionVisibility(): void {
    this.projectiles.forEach(projectile => {
      if (projectile.collisionVisualizer) {
        projectile.collisionVisualizer.visible = this.collisionDebugEnabled;
      }
    });
    // Forçar renderização se necessário
    if (this.renderingSystem) {
      this.renderingSystem.requestRender();
    }
  }

  private handleRicochet(originalProjectile: ProjectileData, hitTargetId: string): void {
    const ricochetPosition = { ...originalProjectile.data.position };
    
    // Use cached ricochet target instead of searching again
    // This ensures all projectiles in a multi-shot ricochet to the same enemy
    let nearestEnemy = this.cachedRicochetTarget;
    
    // Validate that the cached target still exists
    if (nearestEnemy) {
      const stillExists = this.validateEnemyExists(nearestEnemy.id);
      if (!stillExists) {
        console.log(`⚠️ Cached target ${nearestEnemy.id} no longer exists, finding new target`);
        nearestEnemy = this.findNearestEnemy(ricochetPosition, originalProjectile.hitEnemies);
        this.cachedRicochetTarget = nearestEnemy;
      }
    }
    
    if (!nearestEnemy) {
      console.log('🎯 No valid ricochet target available');
      return;
    }
    
    // Calculate direction to nearest enemy
    // NOTE: This aims at the enemy's CURRENT position, not predicted position
    // The enemy may move and dodge the ricochet - this is intentional for balance
    const dx = nearestEnemy.position.x - ricochetPosition.x;
    const dy = nearestEnemy.position.y - ricochetPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    // Create ricochet projectile with normalized direction
    const ricochetSpeed = Math.sqrt(
      originalProjectile.data.velocity.x * originalProjectile.data.velocity.x +
      originalProjectile.data.velocity.y * originalProjectile.data.velocity.y
    );
    
    const ricochetVelocity = {
      x: (dx / distance) * ricochetSpeed,
      y: (dy / distance) * ricochetSpeed
    };
    
    console.log(`🏁 Ricochet velocity: original speed ${ricochetSpeed.toFixed(2)}, new direction (${ricochetVelocity.x.toFixed(2)}, ${ricochetVelocity.y.toFixed(2)})`);
    
    // Calculate ricochet damage based on skill level
    const ricochetLevel = originalProjectile.ricochetLevel || 0;
    let damageMultiplier = 1.0;
    if (ricochetLevel === 1) {
      damageMultiplier = 0.5; // 50% damage
    } else if (ricochetLevel >= 2) {
      damageMultiplier = 1.0; // 100% damage
    }
    
    const ricochetDamage = Math.round(originalProjectile.data.damage * damageMultiplier);
    
    console.log(`🎯 Creating ricochet projectile to enemy ${nearestEnemy.id} with ${Math.round(damageMultiplier * 100)}% damage (${ricochetDamage})`);
    
    this.createProjectile(
      originalProjectile.data.ownerId,
      ricochetPosition,
      ricochetVelocity,
      ricochetDamage,
      (originalProjectile.ricochetCount || 0) + 1,
      originalProjectile.maxRicochets,
      true, // Mark as ricochet projectile
      ricochetLevel,
      true // noSkillTrigger: ricochet projéteis não ativam skills
    );
  }
  
  private findNearestEnemy(position: Position, excludeEnemies?: Set<string>): { id: string; position: Position } | null {
    // Get all enemies from EntitySystem via global game reference
    const game = (window as any).game;
    if (!game || typeof game.getEntitySystem !== 'function') {
      return null;
    }
    
    const entitySystem = game.getEntitySystem();
    if (!entitySystem || typeof entitySystem.getEnemies !== 'function') {
      return null;
    }
    
    const enemies = entitySystem.getEnemies();
    let nearestEnemy: { id: string; position: Position } | null = null;
    let nearestDistance = Infinity;
    
  enemies.forEach((enemy: any) => {
      // // Skip enemies that have already been hit by this projectile chain
      // if (excludeEnemies && excludeEnemies.has(enemy.getId())) {
      //   return;
      // }
      
      const enemyPos = enemy.getPosition();
      const dx = enemyPos.x - position.x;
      const dy = enemyPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = {
          id: enemy.getId(),
          position: enemyPos
        };
      }
    });
    
    return nearestEnemy;
  }
  
  private validateEnemyExists(enemyId: string): boolean {
    const game = (window as any).game;
    if (!game || typeof game.getEntitySystem !== 'function') {
      return false;
    }
    
    const entitySystem = game.getEntitySystem();
    if (!entitySystem || typeof entitySystem.getEnemies !== 'function') {
      return false;
    }
    
    const enemies = entitySystem.getEnemies();
    return enemies.has(enemyId);
  }
  
  private canRicochet(ownerId: string, impactPosition: Position, hitEnemies?: Set<string>): boolean {
    const currentTime = Date.now();
    if (currentTime - this.lastRicochetTime >= this.ricochetCooldown) {
      // Clear old cache and find new target based on impact position
      this.cachedRicochetTarget = null;
      this.cachedRicochetTarget = this.findNearestEnemy(impactPosition, hitEnemies);
      this.lastRicochetTime = currentTime;
      
      if (this.cachedRicochetTarget) {
        console.log(`🎨 New ricochet target cached: ${this.cachedRicochetTarget.id} (nearest to impact at ${impactPosition.x.toFixed(2)}, ${impactPosition.y.toFixed(2)})`);
      }
      
      return this.cachedRicochetTarget !== null;
    }
    // If within cooldown, we can still ricochet if we have a cached target
    const canUseCache = this.cachedRicochetTarget !== null;
    if (canUseCache) {
      console.log(`📄 Using cached ricochet target: ${this.cachedRicochetTarget!.id} (from cache)`);
    }
    return canUseCache;
  }

  public dispose(): void {
    this.clearAllProjectiles();
  }
}