import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { assetManager } from '../services/AssetManager';
import { ProjectileSystem } from '../systems/ProjectileSystem';

export interface PlayerStats {
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  score: number;
}

export class Player extends Entity {
  private stats: PlayerStats;
  private inputState: any = {};
  private lastShotTime: number = 0;
  private shotCooldown: number = 200;
  private speed: number = 5;
  private projectileSystem: ProjectileSystem;

  constructor(
    eventBus: EventBus,
    projectileSystem: ProjectileSystem,
    initialPosition: Position = { x: 0, y: 0 },
    initialStats: PlayerStats = {
      health: 100,
      maxHealth: 100,
      ammo: 30,
      maxAmmo: 30,
      score: 0
    }
  ) {
    super(eventBus, 'player', initialPosition);
    this.stats = { ...initialStats };
    this.projectileSystem = projectileSystem;
    
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

    this.addCleanupFunction(unsubscribeInput);
    this.addCleanupFunction(unsubscribeShot);
  }

  protected createVisual(): void {
    const playerShip = assetManager.getPlayerShip();
    playerShip.scale.setScalar(0.3);
    playerShip.rotation.x = -Math.PI / 2;
    playerShip.rotation.z = Math.PI / 2;
    
    this.object.add(playerShip);
    
    this.eventBus.emit('scene:add-object', { object: this.object });
  }

  private handleInputAction(action: string, pressed: boolean): void {
    this.inputState[action] = pressed;
  }

  protected onUpdate(deltaTime: number): void {
    if (!this.isActive) return;

    this.handleMovement(deltaTime);
    this.constrainToScreen();
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
    const bounds = { minX: -5, maxX: 5, minY: -4, maxY: 4 };
    this.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.position.x));
    this.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.position.y));
  }

  private tryShoot(): void {
    const currentTime = Date.now();
    if (currentTime - this.lastShotTime < this.shotCooldown) {
      return;
    }

    if (this.stats.ammo <= 0) {
      console.log('No ammo!');
      return;
    }

    this.lastShotTime = currentTime;
    this.stats.ammo--;
    
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

  public getStats(): PlayerStats {
    return { ...this.stats };
  }

  public reset(): void {
    console.log('🔄 Player reset called');
    this.stats = {
      health: this.stats.maxHealth,
      maxHealth: this.stats.maxHealth,
      ammo: this.stats.maxAmmo,
      maxAmmo: this.stats.maxAmmo,
      score: 0
    };
    
    this.setPosition({ x: 0, y: 0 });
    this.setVelocity({ x: 0, y: 0 });
    this.lastShotTime = 0;
    this.inputState = {};
    
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
    
    this.eventBus.emit('game:over', { 
      finalScore: this.stats.score, 
      stats: {
        score: this.stats.score,
        shotsFired: 0, 
        enemiesDestroyed: 0,
        enemiesEscaped: 0,
        timeAlive: Date.now(),
        accuracy: 0
      }
    });
  }

  protected onDestroy(): void {
    this.eventBus.emit('scene:remove-object', { object: this.object });
  }
}