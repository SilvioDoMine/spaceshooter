import * as THREE from 'three';
import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { RenderingSystem } from '../systems/RenderingSystem';
import { assetManager } from '../services/AssetManager';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { PLAYER_CONFIG, DEFAULT_WORLD_BOUNDS, WorldBounds, PROJECTILE_CONFIG, calculateLevelFromXP, getXPToNextLevel, getLevelProgress } from '@spaceshooter/shared';
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
  level: number;
  currentXP: number;
}

export class Player extends Entity {
  private stats: PlayerStats;
  private inputState: any = {};
  private shotTimer: number = 0;
  private shotCooldown: number = PLAYER_CONFIG.shotCooldown; // Usar valor do shared
  private speed: number = PLAYER_CONFIG.speed;
  private renderingSystem: RenderingSystem;
  private projectileSystem: ProjectileSystem;
  private gameStartTime: number;
  private godModeEnabled: boolean = false;
  private boundingBox: THREE.Box3 = new THREE.Box3();
  private playerShipModel?: THREE.Group;
  private collisionShape: CompoundCollisionShape;
  private collisionVisualizers: THREE.LineLoop[] = [];
  private animationController?: ReturnType<typeof assetManager.createShipAnimationController>;
  private isMoving: boolean = false;
  private thrusterAnimationName?: string;
  private worldBounds: WorldBounds;
  private targetRotation: number = 0;
  private currentRotation: number = 0;
  private rotationSmoothness: number = 8.0; // Higher = faster rotation

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
      accuracy: 0,
      level: PLAYER_CONFIG.level,
      currentXP: PLAYER_CONFIG.currentXP
    }
  ) {
    super(eventBus, 'player', initialPosition);
    this.stats = { ...initialStats };
    this.renderingSystem = renderingSystem;
    this.projectileSystem = projectileSystem;
    this.gameStartTime = Date.now();
    this.worldBounds = { ...DEFAULT_WORLD_BOUNDS };
    
    // Create collision shape from config, scaled by player size
    this.collisionShape = this.createScaledCollisionShape();
    
    // Create visual after all properties are set
    this.createVisual();
  }

  protected setupEventHandlers(): void {
    const unsubscribeInput = this.eventBus.on('input:action', (data) => {
      this.handleInputAction(data.action, data.pressed);
    });


    const unsubscribeScore = this.eventBus.on('player:score', (data) => {
      this.addScore(data.points);
      this.stats.enemiesDestroyed++;
      this.updateAccuracy();
    });

    const unsubscribeXPGain = this.eventBus.on('player:xp-gain', (data) => {
      this.gainXP(data.xp);
    });

    const unsubscribeDamage = this.eventBus.on('player:damage', (data) => {
      console.log(`💥 Player: Received damage event:`, data);
      this.takeDamage(data.damage);
      
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
    this.addCleanupFunction(unsubscribeScore);
    this.addCleanupFunction(unsubscribeXPGain);
    this.addCleanupFunction(unsubscribeDamage);
    this.addCleanupFunction(unsubscribeGodMode);
    this.addCleanupFunction(unsubscribeSizeChange);
  }

  protected createVisual(): void {
    const shipData = assetManager.getPlayerShip();
    const playerShip = shipData.model;
    playerShip.scale.setScalar(PLAYER_CONFIG.size);
    playerShip.rotation.x = -Math.PI / 2;
    playerShip.rotation.z = Math.PI / 2;
    
    this.playerShipModel = playerShip;
    this.object.add(playerShip);

    // Setup animation controller if animations are available
    if (shipData.animations && shipData.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(playerShip);
      const actions = new Map<string, THREE.AnimationAction>();
      
      // Create actions for all animations
      shipData.animations.forEach(clip => {
        const action = mixer.clipAction(clip);
        actions.set(clip.name, action);
      });

      // Store the first animation as thruster animation
      this.thrusterAnimationName = shipData.animations[0]?.name;

      this.animationController = {
        mixer,
        actions,
        playAnimation: (name: string, loop: boolean = true) => {
          const action = actions.get(name);
          if (action) {
            action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
            action.reset().play();
          }
        },
        stopAnimation: (name: string) => {
          const action = actions.get(name);
          if (action) {
            action.stop();
          }
        },
        update: (deltaTime: number) => {
          mixer.update(deltaTime);
        }
      };
    }

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
    return CollisionUtils.getAbsoluteCollisionCircles(this.position, this.collisionShape, this.currentRotation);
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

  private updateCollisionVisualizersRotation(): void {
    // Get the rotated collision circles and update the visualizer positions
    const rotatedCircles = CollisionUtils.getAbsoluteCollisionCircles(
      { x: 0, y: 0 }, // Use origin since visualizers are children of player object
      this.collisionShape, 
      this.currentRotation
    );
    
    this.collisionVisualizers.forEach((visualizer, index) => {
      if (index < rotatedCircles.length) {
        const circle = rotatedCircles[index];
        visualizer.position.x = circle.pos.x;
        visualizer.position.y = circle.pos.y;
      }
    });
  }

  private handleInputAction(action: string, pressed: boolean): void {
    this.inputState[action] = pressed;
    
    // Handle shooting
    if (action === 'shoot' && pressed) {
      this.tryShoot();
    }
  }

  protected onUpdate(deltaTime: number): void {
    if (!this.isActive) return;

    this.handleMovement(deltaTime);
    this.constrainToWorld();

    // Update shot cooldown timer
    if (this.shotTimer > 0) {
      this.shotTimer -= deltaTime;
    }

    // TIRO AUTOMÁTICO AO PARAR
    if (!this.isMoving && this.stats.ammo > 0 && this.shotTimer <= 0) {
      // Tenta acessar o sistema de entidades pelo window.game
      const game = (window as any).game;
      if (game && typeof game.getEntitySystem === 'function') {
        const entitySystem = game.getEntitySystem();
        if (entitySystem && typeof entitySystem.getEnemies === 'function') {
          const enemiesMap = entitySystem.getEnemies();
          let closestEnemy: any = null;
          let minDist = Infinity;
          const playerPos = this.getPosition();
          enemiesMap.forEach((enemy: any) => {
            if (!enemy.isEntityActive || !enemy.isEntityActive()) return;
            const enemyPos = enemy.getPosition();
            const dx = enemyPos.x - playerPos.x;
            const dy = enemyPos.y - playerPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              closestEnemy = enemy;
            }
          });
          if (closestEnemy && typeof closestEnemy.getPosition === 'function') {
            // Rotaciona para o inimigo mais próximo de forma suave
            const enemyPos = closestEnemy.getPosition();
            const dx = enemyPos.x - playerPos.x;
            const dy = enemyPos.y - playerPos.y;
            // Calcula o ângulo para mirar
            const desiredRotation = Math.atan2(-dx, dy);
            // Suaviza a rotação usando o mesmo método do updateRotation
            let rotationDifference = desiredRotation - this.currentRotation;
            if (rotationDifference > Math.PI) {
              rotationDifference -= 2 * Math.PI;
            } else if (rotationDifference < -Math.PI) {
              rotationDifference += 2 * Math.PI;
            }
            this.currentRotation += rotationDifference * this.rotationSmoothness * deltaTime;
            if (this.currentRotation > Math.PI) {
              this.currentRotation -= 2 * Math.PI;
            } else if (this.currentRotation < -Math.PI) {
              this.currentRotation += 2 * Math.PI;
            }
            this.targetRotation = desiredRotation;
            this.object.rotation.z = this.currentRotation;
            this.updateCollisionVisualizersRotation();
            // Só atira se a rotação estiver próxima do alvo
            if (Math.abs(rotationDifference) < 0.1) {
              this.tryShoot();
            }
          }
        }
      }
    }

    // Update animations if available
    if (this.animationController) {
      this.animationController.update(deltaTime);
    }
  }

  private handleMovement(deltaTime: number): void {
    const moveDistance = this.speed * deltaTime;
    let currentlyMoving = false;
    let movementVector = { x: 0, y: 0 };
    
    if (this.inputState.left) {
      this.position.x -= moveDistance;
      movementVector.x -= 1;
      currentlyMoving = true;
    }
    if (this.inputState.right) {
      this.position.x += moveDistance;
      movementVector.x += 1;
      currentlyMoving = true;
    }
    if (this.inputState.up) {
      this.position.y += moveDistance;
      movementVector.y += 1;
      currentlyMoving = true;
    }
    if (this.inputState.down) {
      this.position.y -= moveDistance;
      movementVector.y -= 1;
      currentlyMoving = true;
    }

    // Update rotation based on movement direction
    this.updateRotation(movementVector, deltaTime);

    // Handle thruster animation based on movement
    this.updateThrusterAnimation(currentlyMoving);

    // Update Three.js object position
    this.object.position.x = this.position.x;
    this.object.position.y = this.position.y;

    // Update debug system with current position
    this.eventBus.emit('debug:update', { 
      playerPos: `(${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, 0.0)`
    });
  }

  private updateThrusterAnimation(currentlyMoving: boolean): void {
    if (!this.animationController || !this.thrusterAnimationName) return;

    // If movement state changed
    if (currentlyMoving !== this.isMoving) {
      this.isMoving = currentlyMoving;
      
      if (this.isMoving) {
        // Start thruster animation
        this.animationController.playAnimation(this.thrusterAnimationName, true);
      } else {
        // Stop thruster animation
        this.animationController.stopAnimation(this.thrusterAnimationName);
      }
    }
  }

  private updateRotation(movementVector: { x: number, y: number }, deltaTime: number): void {
    // Only update rotation if there's movement
    if (movementVector.x !== 0 || movementVector.y !== 0) {
      // Calculate the angle based on movement direction
      // Inverting X to fix left/right orientation
      this.targetRotation = Math.atan2(-movementVector.x, movementVector.y);
    }
    
    // Smoothly interpolate current rotation towards target rotation
    const rotationDifference = this.targetRotation - this.currentRotation;
    
    // Handle angle wrapping (shortest rotation path)
    let adjustedDifference = rotationDifference;
    if (adjustedDifference > Math.PI) {
      adjustedDifference -= 2 * Math.PI;
    } else if (adjustedDifference < -Math.PI) {
      adjustedDifference += 2 * Math.PI;
    }
    
    // Apply smooth rotation
    this.currentRotation += adjustedDifference * this.rotationSmoothness * deltaTime;
    
    // Normalize current rotation to [-PI, PI] range
    if (this.currentRotation > Math.PI) {
      this.currentRotation -= 2 * Math.PI;
    } else if (this.currentRotation < -Math.PI) {
      this.currentRotation += 2 * Math.PI;
    }
    
    // Apply rotation to the Three.js object
    this.object.rotation.z = this.currentRotation;
    
    // Update collision visualizers rotation
    this.updateCollisionVisualizersRotation();
  }

  private constrainToWorld(): void {
    this.position.x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX, this.position.x));
    this.position.y = Math.max(this.worldBounds.minY, Math.min(this.worldBounds.maxY, this.position.y));
  }

  /**
   * Atualiza os limites do mundo para o jogador
   */
  public setWorldBounds(bounds: WorldBounds): void {
    this.worldBounds = { ...bounds };
  }

  /**
   * Obtém os limites atuais do mundo
   */
  public getWorldBounds(): WorldBounds {
    return { ...this.worldBounds };
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
    
    // Calculate projectile spawn position based on ship scale and rotation
    const shipScale = PLAYER_CONFIG.size;
    const baseOffsetX = -0.17 * shipScale; // Offset from center of ship
    const baseOffsetY = 2.0 * shipScale;   // Spawn in front of nose
    
    // Apply rotation to the spawn offset
    const cos = Math.cos(this.currentRotation);
    const sin = Math.sin(this.currentRotation);
    const rotatedOffsetX = baseOffsetX * cos - baseOffsetY * sin;
    const rotatedOffsetY = baseOffsetX * sin + baseOffsetY * cos;
    
    const projectilePosition = {
      x: this.position.x + rotatedOffsetX,
      y: this.position.y + rotatedOffsetY
    };
    
    // Calculate projectile velocity baseado no PROJECTILE_CONFIG
    const projectileSpeed = PROJECTILE_CONFIG.speed;
    const projectileVelocity = {
      x: -sin * projectileSpeed, // Negative because we want to move in the direction the ship is facing
      y: cos * projectileSpeed
    };
    
    this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity);
    
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

  public gainXP(xpAmount: number): void {
    const oldLevel = this.stats.level;
    this.stats.currentXP += xpAmount;
    
    // Recalcular nível baseado no XP total
    const newLevel = calculateLevelFromXP(this.stats.currentXP);
    
    if (newLevel > oldLevel) {
      this.stats.level = newLevel;
      console.log(`🎉 Level Up! Nível ${oldLevel} → ${newLevel}`);
      
      this.eventBus.emit('player:level-up', {
        oldLevel,
        newLevel: this.stats.level,
        currentXP: this.stats.currentXP
      });
      
      this.eventBus.emit('audio:play', { soundId: 'level-up', options: { volume: 0.7 } });
    }
    
    console.log(`💎 Gained ${xpAmount} XP! Total: ${this.stats.currentXP} (Level ${this.stats.level})`);
    this.updateUI();
  }

  public getLevelInfo(): { level: number, currentXP: number, xpToNext: number, progress: number } {
    return {
      level: this.stats.level,
      currentXP: this.stats.currentXP,
      xpToNext: getXPToNextLevel(this.stats.currentXP, this.stats.level),
      progress: getLevelProgress(this.stats.currentXP, this.stats.level)
    };
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
      accuracy: 0,
      level: PLAYER_CONFIG.level,
      currentXP: PLAYER_CONFIG.currentXP
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
    // Emit player state changes - UIManager will handle UI updates
    this.eventBus.emit('player:health-changed', { 
      current: this.stats.health, 
      max: this.stats.maxHealth 
    });
    this.eventBus.emit('player:ammo-changed', { 
      current: this.stats.ammo, 
      max: this.stats.maxAmmo 
    });
    this.eventBus.emit('player:score-changed', { 
      score: this.stats.score 
    });
    this.eventBus.emit('player:level-changed', {
      level: this.stats.level,
      currentXP: this.stats.currentXP,
      xpToNext: getXPToNextLevel(this.stats.currentXP, this.stats.level),
      progress: getLevelProgress(this.stats.currentXP, this.stats.level)
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