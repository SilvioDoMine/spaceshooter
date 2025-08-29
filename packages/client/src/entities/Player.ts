import * as THREE from 'three';
import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { RenderingSystem } from '../systems/RenderingSystem';
import { assetManager } from '../services/AssetManager';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { PLAYER_CONFIG } from '@spaceshooter/shared';

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

    this.addCleanupFunction(unsubscribeInput);
    this.addCleanupFunction(unsubscribeShot);
    this.addCleanupFunction(unsubscribeScore);
    this.addCleanupFunction(unsubscribeDamage);
    this.addCleanupFunction(unsubscribeGodMode);
  }

  protected createVisual(): void {
    const playerShip = assetManager.getPlayerShip();
    playerShip.scale.setScalar(PLAYER_CONFIG.size);
    playerShip.rotation.x = -Math.PI / 2;
    playerShip.rotation.z = Math.PI / 2;
    
    this.object.add(playerShip);

    // Create collision visualizer for player (using PLAYER_CONFIG radius)
    this.createCollisionVisualizer(PLAYER_CONFIG.radius);

    this.renderingSystem.addToScene(this.object);
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
    
    const projectilePosition = {
      x: this.position.x,
      y: this.position.y + 1
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