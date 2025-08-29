import * as THREE from 'three';
import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { RenderingSystem } from '../systems/RenderingSystem';
import { assetManager } from '../services/AssetManager';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { PLAYER_CONFIG } from '@spaceshooter/shared';
import { CompoundCollisionShape, CollisionUtils } from '../utils/CollisionUtils';

export interface PlayerStats {
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  score: number;
  shotsFired: number;
  enemiesDestroyed: number;
  enemiesEscaped: number;
  timeAlive: number;
  accuracy: number;
}

export class Player extends Entity {
  private stats: PlayerStats;
  private inputState: any = {};
  private shotTimer: number = 0;
  private shotCooldown: number = 0.2; // 200ms converted to seconds
  private speed: number = PLAYER_CONFIG.speed;
  private renderingSystem: RenderingSystem;
  private projectileSystem: ProjectileSystem;
  private gameStartTime: number;
  private godModeEnabled: boolean = false;
  private boundingBox: THREE.Box3 = new THREE.Box3();
  private playerShipModel?: THREE.Group;
  private collisionShape: CompoundCollisionShape;
  private collisionVisualizers: THREE.LineLoop[] = [];

  constructor(
    eventBus: EventBus,
    renderingSystem: RenderingSystem,
    projectileSystem: ProjectileSystem,
    initialPosition: Position = { x: 0, y: 0 },
    initialStats: PlayerStats = {
      health: PLAYER_CONFIG.health,
      maxHealth: PLAYER_CONFIG.maxHealth,
      ammo: PLAYER_CONFIG.ammo,
      maxAmmo: PLAYER_CONFIG.maxAmmo,
      score: 0,
      shotsFired: 0,
      enemiesDestroyed: 0,
      enemiesEscaped: 0,
      timeAlive: 0,
      accuracy: 0
    }
  ) {
    super(eventBus, 'player', initialPosition);
    this.stats = { ...initialStats };
    this.renderingSystem = renderingSystem;
    this.projectileSystem = projectileSystem;
    this.gameStartTime = Date.now();
    
    // Create collision shape from config, scaled by player size
    this.collisionShape = this.createScaledCollisionShape();
    
    // Create visual after all properties are set
    this.createVisual();
  }

  protected setupEventHandlers(): void {
    const unsubscribeInput = this.eventBus.on('input:action', (data) => {
      this.handleInputAction(data.action, data.pressed);
    });

    const unsubscribeShot = this.eventBus.on('player:shot', () => {
      this.tryShoot();
    });

    const unsubscribeScore = this.eventBus.on('player:score', (data) => {
      this.addScore(data.points);
      this.stats.enemiesDestroyed++;
      this.updateAccuracy();
    });

    const unsubscribeDamage = this.eventBus.on('player:damage', (data) => {
      if (data.reason === 'enemy_escape') {
        this.stats.enemiesEscaped++;
      }
    });

    const unsubscribeGodMode = this.eventBus.on('debug:god-mode-toggle', (data: { enabled: boolean }) => {
      this.godModeEnabled = data.enabled;
    });

    const unsubscribeSizeChange = this.eventBus.on('player:size-changed', (data) => {
      console.log('Player received size change event:', data);
      this.handleSizeChange(data.newSize);
    });

    this.addCleanupFunction(unsubscribeInput);
    this.addCleanupFunction(unsubscribeShot);
    this.addCleanupFunction(unsubscribeScore);
    this.addCleanupFunction(unsubscribeDamage);
    this.addCleanupFunction(unsubscribeGodMode);
    this.addCleanupFunction(unsubscribeSizeChange);
  }

  protected createVisual(): void {
    const playerShip = assetManager.getPlayerShip();
    playerShip.scale.setScalar(PLAYER_CONFIG.size);
    playerShip.rotation.x = -Math.PI / 2;
    playerShip.rotation.z = Math.PI / 2;
    
    this.playerShipModel = playerShip;
    this.object.add(playerShip);

    // Create collision visualizers for compound shape
    this.createCompoundCollisionVisualizers();

    this.renderingSystem.addToScene(this.object);
  }

  private createCompoundCollisionVisualizers(): void {
    // Clear any existing visualizers
    this.collisionVisualizers.forEach(visualizer => {
      this.object.remove(visualizer);
      visualizer.geometry.dispose();
      (visualizer.material as THREE.Material).dispose();
    });
    this.collisionVisualizers = [];

    // Create a circular visualizer for each collision circle
    this.collisionShape.circles.forEach((circle, index) => {
      const geometry = new THREE.BufferGeometry();
      const segments = 32;
      const vertices = [];
      
      // Create circle vertices
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(
          Math.cos(theta) * circle.radius + circle.offset.x,
          Math.sin(theta) * circle.radius + circle.offset.y,
          0
        );
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      // Different colors for different circles (for debugging)
      const colors = [0x00ff00, 0xff0000, 0x0000ff, 0xffff00, 0xff00ff];
      const material = new THREE.LineBasicMaterial({ 
        color: colors[index % colors.length], 
        transparent: true, 
        opacity: 0.8 
      });
      
      const visualizer = new THREE.LineLoop(geometry, material);
      
      // Set initial visibility based on current debug state
      const game = (window as any).game;
      if (game) {
        try {
          const isVisible = game.getDebugSystem().isCollisionDebugEnabled();
          visualizer.visible = isVisible;
        } catch (error) {
          visualizer.visible = false;
        }
      } else {
        visualizer.visible = false;
      }
      
      this.collisionVisualizers.push(visualizer);
      this.object.add(visualizer);
    });
  }

  public getCollisionShape(): CompoundCollisionShape {
    return this.collisionShape;
  }

  public getAbsoluteCollisionCircles() {
    return CollisionUtils.getAbsoluteCollisionCircles(this.position, this.collisionShape);
  }

  /**
   * Creates a collision shape scaled by the current player size configuration
   */
  private createScaledCollisionShape(): CompoundCollisionShape {
    const baseShape = PLAYER_CONFIG.collisionShape;
    const scale = PLAYER_CONFIG.size;
    
    return {
      circles: baseShape.circles.map(circle => ({
        offset: {
          x: circle.offset.x * scale,
          y: circle.offset.y * scale
        },
        radius: circle.radius * scale,
        name: circle.name
      }))
    };
  }

  /**
   * Updates collision shape when player size changes
   * Call this if PLAYER_CONFIG.size changes dynamically
   */
  public updateCollisionShape(): void {
    this.collisionShape = this.createScaledCollisionShape();
    this.createCompoundCollisionVisualizers(); // Recreate visualizers
  }

  /**
   * Handle size changes dynamically
   */
  private handleSizeChange(newSize: number): void {
    // Update visual model scale
    if (this.playerShipModel) {
      this.playerShipModel.scale.setScalar(newSize);
    }
    
    // Update collision shape
    this.updateCollisionShape();
    
    console.log(`Player visual and collision updated for size: ${newSize}`);
  }

  // Override the collision visibility method to handle multiple visualizers
  protected setCollisionVisibility(visible: boolean): void {
    this.collisionVisualizers.forEach(visualizer => {
      visualizer.visible = visible;
    });
  }

  // Override the update collision visibility method
  protected updateCollisionVisibility(): void {
    const game = (window as any).game;
    if (game && this.collisionVisualizers.length > 0) {
      try {
        const isVisible = game.getDebugSystem().isCollisionDebugEnabled();
        this.setCollisionVisibility(isVisible);
      } catch (error) {
        // DebugSystem not ready yet, default to false
        this.setCollisionVisibility(false);
      }
    }
  }

  private handleInputAction(action: string, pressed: boolean): void {
    this.inputState[action] = pressed;
  }

  protected onUpdate(deltaTime: number): void {
    if (!this.isActive) return;

    this.handleMovement(deltaTime);
    this.constrainToScreen();
    
    // Update shot cooldown timer
    if (this.shotTimer > 0) {
      this.shotTimer -= deltaTime;
    }
  }

  private handleMovement(deltaTime: number): void {
    const moveDistance = this.speed * deltaTime;
    
    if (this.inputState.left) {
      this.position.x -= moveDistance;
    }
    if (this.inputState.right) {
      this.position.x += moveDistance;
    }
    if (this.inputState.up) {
      this.position.y += moveDistance;
    }
    if (this.inputState.down) {
      this.position.y -= moveDistance;
    }
  }

  private constrainToScreen(): void {
    const bounds = PLAYER_CONFIG.bounds;
    this.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.position.x));
    this.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.position.y));
  }

  private tryShoot(): void {
    if (this.shotTimer > 0) {
      return; // Still on cooldown
    }

    if (this.stats.ammo <= 0) {
      console.log('No ammo!');
      return;
    }

    this.shotTimer = this.shotCooldown; // Reset cooldown timer
    this.stats.ammo--;
    this.stats.shotsFired++;
    
    this.updateUI();
    
    // Calculate projectile spawn position based on ship scale
    const shipScale = PLAYER_CONFIG.size;
    const projectilePosition = {
      x: this.position.x + (-0.17 * shipScale), // Offset from center of ship
      y: this.position.y + (2.0 * shipScale)    // Spawn in front of nose
    };
    
    this.projectileSystem.createProjectile('player', projectilePosition, { x: 0, y: 15 });
    
    this.eventBus.emit('audio:play', { soundId: 'shoot', options: { volume: 0.3 } });
    
    console.log(`Player shot! Ammo: ${this.stats.ammo}`);
  }

  public takeDamage(damage: number): boolean {
    // God mode prevents damage
    if (this.godModeEnabled) {
      return false;
    }
    
    this.stats.health = Math.max(0, this.stats.health - damage);
    this.updateUI();
    
    this.eventBus.emit('audio:play', { soundId: 'hit', options: { volume: 0.5 } });
    
    this.eventBus.emit('particles:hit', {
      position: { x: this.position.x, y: this.position.y, z: 0 }
    });

    if (this.stats.health <= 0) {
      this.onDeath();
      return true;
    }
    
    return false;
  }

  public addAmmo(amount: number): void {
    this.stats.ammo = Math.min(this.stats.maxAmmo, this.stats.ammo + amount);
    this.updateUI();
    console.log(`Ammo restored! +${amount} (Total: ${this.stats.ammo})`);
  }

  public heal(amount: number): void {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
    this.updateUI();
    console.log(`Health restored! +${amount} (Total: ${this.stats.health})`);
  }

  public addScore(points: number): void {
    this.stats.score += points;
    this.updateUI();
  }

  private updateAccuracy(): void {
    if (this.stats.shotsFired > 0) {
      this.stats.accuracy = Math.round((this.stats.enemiesDestroyed / this.stats.shotsFired) * 100);
    } else {
      this.stats.accuracy = 0;
    }
  }

  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  public reset(): void {
    console.log('🔄 Player reset called');
    this.stats = {
      health: PLAYER_CONFIG.health,
      maxHealth: PLAYER_CONFIG.maxHealth,
      ammo: PLAYER_CONFIG.ammo,
      maxAmmo: PLAYER_CONFIG.maxAmmo,
      score: 0,
      shotsFired: 0,
      enemiesDestroyed: 0,
      enemiesEscaped: 0,
      timeAlive: 0,
      accuracy: 0
    };
    
    this.setPosition({ x: 0, y: 0 });
    this.setVelocity({ x: 0, y: 0 });
    this.shotTimer = 0;
    this.inputState = {};
    this.gameStartTime = Date.now();
    
    console.log('📊 Player stats after reset:', this.stats);
    this.updateUI();
  }

  private updateUI(): void {
    this.eventBus.emit('ui:update-health', { 
      current: this.stats.health, 
      max: this.stats.maxHealth 
    });
    this.eventBus.emit('ui:update-ammo', { 
      current: this.stats.ammo, 
      max: this.stats.maxAmmo 
    });
    this.eventBus.emit('ui:update-score', { 
      score: this.stats.score 
    });
  }

  private onDeath(): void {
    console.log('Player died!');
    this.isActive = false;
    
    // Calculate final time alive
    const currentTime = Date.now();
    this.stats.timeAlive = currentTime - this.gameStartTime;
    
    // Final accuracy calculation
    this.updateAccuracy();
    
    console.log('💀 Final player stats:', this.stats);
    
    this.eventBus.emit('game:over', { 
      finalScore: this.stats.score, 
      stats: {
        score: this.stats.score,
        shotsFired: this.stats.shotsFired, 
        enemiesDestroyed: this.stats.enemiesDestroyed,
        enemiesEscaped: this.stats.enemiesEscaped,
        timeAlive: this.stats.timeAlive,
        accuracy: this.stats.accuracy
      }
    });
  }

  protected onDestroy(): void {
    this.renderingSystem.removeFromScene(this.object);
  }
}