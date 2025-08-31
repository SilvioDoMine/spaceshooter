import * as THREE from 'three';
import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { RenderingSystem } from '../systems/RenderingSystem';
import { assetManager } from '../services/AssetManager';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { PLAYER_CONFIG, DEFAULT_WORLD_BOUNDS, WorldBounds, PROJECTILE_CONFIG, calculateLevelFromXP, getXPToNextLevel, getLevelProgress, PlayerSkill, SkillType, generateSkillOptions, calculateDamageMultiplier, calculateAttackSpeedMultiplier, hasMultiShot, calculateMaxHealthBonus, calculateAmmoCapacityBonus } from '@spaceshooter/shared';
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
  skills: PlayerSkill[];
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
  private infiniteAmmoEnabled: boolean = false;
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
  private healthRegenTimer: number = 0;
  private healthRegenInterval: number = 10; // Default 10 seconds
  private invulnerabilityTimer: number = 0;
  private isInvulnerable: boolean = false;
  private pendingSkillOptions?: any[]; // Store skill options until slow motion ends
  private skillSelectionQueue: Array<{ fromLevel: number; toLevel: number; skillOptions: any[] }> = []; // Queue for multiple level ups

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
      currentXP: PLAYER_CONFIG.currentXP,
      skills: [...PLAYER_CONFIG.skills]
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
    
    // Apply initial skill effects
    this.applySkillEffects();
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
    
    const unsubscribeGainXP = this.eventBus.on('player:gain-xp', (data) => {
      this.gainXP(data.amount);
    });

    const unsubscribeSkillSelected = this.eventBus.on('player:skill-selected', (data) => {
      this.selectSkill(data.skillType as SkillType);
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

    const unsubscribeInfiniteAmmo = this.eventBus.on('debug:infinite-ammo-toggle', (data: { enabled: boolean }) => {
      this.infiniteAmmoEnabled = data.enabled;
      console.log(`🔫 Infinite ammo ${data.enabled ? 'enabled' : 'disabled'}`);
    });

    const unsubscribeSizeChange = this.eventBus.on('player:size-changed', (data) => {
      console.log('Player received size change event:', data);
      this.handleSizeChange(data.newSize);
    });

    const unsubscribeInvulnerability = this.eventBus.on('player:set-invulnerable', (data) => {
      this.setInvulnerable(data.duration);
    });

    const unsubscribeSlowMotionComplete = this.eventBus.on('game:slow-motion-complete', () => {
      this.onSlowMotionComplete();
    });

    this.addCleanupFunction(unsubscribeInput);
    this.addCleanupFunction(unsubscribeScore);
    this.addCleanupFunction(unsubscribeXPGain);
    this.addCleanupFunction(unsubscribeGainXP);
    this.addCleanupFunction(unsubscribeSkillSelected);
    this.addCleanupFunction(unsubscribeDamage);
    this.addCleanupFunction(unsubscribeGodMode);
    this.addCleanupFunction(unsubscribeInfiniteAmmo);
    this.addCleanupFunction(unsubscribeSizeChange);
    this.addCleanupFunction(unsubscribeInvulnerability);
    this.addCleanupFunction(unsubscribeSlowMotionComplete);
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

    // Corrigir slow motion: usar deltaTime "real" para mira e tiro
    let realDelta = deltaTime;
    const game = (window as any).game;
    if (game && typeof game.getDebugSystem === 'function') {
      const debugSystem = game.getDebugSystem();
      if (typeof debugSystem.getTimeScale === 'function') {
        const timeScale = debugSystem.getTimeScale();
        if (timeScale && timeScale < 0.99) {
          realDelta = deltaTime / timeScale;
        }
      }
    }

    this.handleMovement(deltaTime);
    this.constrainToWorld();

    // Update shot cooldown timer (usar realDelta)
    if (this.shotTimer > 0) {
      this.shotTimer -= realDelta;
    }

    // Update health regeneration timer
    this.healthRegenTimer += deltaTime;
    if (this.healthRegenTimer >= this.healthRegenInterval) {
      this.processHealthRegeneration();
      this.healthRegenTimer = 0;
    }

    // Update invulnerability timer
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= deltaTime;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        console.log('🛡️ Invulnerability ended');
      }
    }

    // TIRO AUTOMÁTICO AO PARAR (usar realDelta para rotação)
    if (!this.isMoving && (this.infiniteAmmoEnabled || this.stats.ammo > 0) && this.shotTimer <= 0) {
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
            this.currentRotation += rotationDifference * this.rotationSmoothness * realDelta;
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

    // Emit position change for XP orb collection
    this.eventBus.emit('player:position-changed', {
      position: { x: this.position.x, y: this.position.y, z: 0 }
    });

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

    // Check ammo only if infinite ammo is not enabled
    if (!this.infiniteAmmoEnabled && this.stats.ammo <= 0) {
      console.log('No ammo!');
      return;
    }

    this.shotTimer = this.shotCooldown; // Reset cooldown timer
    
    // Only consume ammo if infinite ammo is not enabled
    if (!this.infiniteAmmoEnabled) {
      this.stats.ammo--;
    }
    
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
    
    // Apply damage multiplier from skills
    const damageMultiplier = calculateDamageMultiplier(this.stats.skills);
    const projectileDamage = Math.round(PROJECTILE_CONFIG.damage * damageMultiplier);
    
    // Check for ricochet skill
    const ricochetSkill = this.stats.skills.find(skill => skill.type === 'ricochet');
    const maxRicochets = ricochetSkill ? this.getRicochetCount(ricochetSkill.level) : 0;
    const ricochetLevel = ricochetSkill ? ricochetSkill.level : 0;
    
    if (maxRicochets > 0) {
      const damagePercent = ricochetLevel === 1 ? 50 : 100;
      console.log(`🎯 Creating projectile with ricochet: ${maxRicochets} bounces (level ${ricochetLevel}, ${damagePercent}% dano)`);
    }
    

    // Verifica se o player tem a skill de projéteis fantasmas
    const hasGhost = this.stats.skills.some(skill => skill.type === 'ghost_projectiles');

    // Se tiver, projétil atravessa inimigos e é translúcido
    if (hasGhost) {
      // Projétil principal
      this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity, projectileDamage, 0, 0, false, 0, true);
      // Multi-shot também é fantasma
      if (hasMultiShot(this.stats.skills)) {
        setTimeout(() => {
          if (this.isActive) {
            this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity, projectileDamage, 0, 0, false, 0, true);
          }
        }, 50);
      }
    } else {
      // Projétil normal
      this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity, projectileDamage, 0, maxRicochets, false, ricochetLevel);
      // Multi-shot normal
      if (hasMultiShot(this.stats.skills)) {
        setTimeout(() => {
          if (this.isActive) {
            this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity, projectileDamage, 0, maxRicochets, false, ricochetLevel);
          }
        }, 50);
      }
    }
    // Se tiver projéteis fantasmas, não há ricochet nem tri_shot
    const ghostSkill = this.stats.skills.find(skill => skill.type === 'ghost_projectiles');
    if (ghostSkill) {
      // Nenhum efeito passivo, só afeta disparo
      console.log('👻 Projéteis fantasmas ativos!');
    }
    
    this.eventBus.emit('audio:play', { soundId: 'shoot', options: { volume: 0.3 } });
    
    console.log(`Player shot! Ammo: ${this.stats.ammo}`);
  }

  public takeDamage(damage: number): boolean {
    // God mode prevents damage
    if (this.godModeEnabled) {
      return false;
    }
    
    // Invulnerability prevents damage
    if (this.isInvulnerable) {
      console.log('🛡️ Damage blocked by invulnerability');
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
      
      // Para múltiplos level ups, adicionar cada um na fila
      for (let level = oldLevel + 1; level <= newLevel; level++) {
        const skillOptions = generateSkillOptions(this.stats.skills);
        this.skillSelectionQueue.push({
          fromLevel: level - 1,
          toLevel: level,
          skillOptions
        });
        
        console.log(`🎉 Queued Level Up! Nível ${level - 1} → ${level}`);
      }
      
      // Create level up particle effect at player position
      this.eventBus.emit('particles:level-up', {
        position: { x: this.position.x, y: this.position.y, z: 0 }
      });
      
      this.eventBus.emit('audio:play', { soundId: 'level-up', options: { volume: 0.7 } });
      
      // Start slow motion effect apenas no primeiro level up
      this.eventBus.emit('game:slow-motion', {
        duration: 1.0,
        targetScale: 0.0
      });
      
      console.log('🎯 Skill options generated, waiting for slow motion to complete...');
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

  public selectSkill(skillType: SkillType): void {
    const existingSkillIndex = this.stats.skills.findIndex(skill => skill.type === skillType);
    
    if (existingSkillIndex >= 0) {
      // Upgrade existing skill
      this.stats.skills[existingSkillIndex].level++;
    } else {
      // Add new skill
      this.stats.skills.push({
        type: skillType,
        level: 1
      });
    }
    
    console.log(`🎯 Skill selected: ${skillType} (Level ${this.getSkillLevel(skillType)})`);
    
    // Apply skill effects immediately
    this.applySkillEffects();
    
    // Clear current pending options
    this.pendingSkillOptions = undefined;
    
    // Se há mais skills na fila, processar imediatamente
    if (this.skillSelectionQueue.length > 0) {
      console.log(`🎯 ${this.skillSelectionQueue.length} more level ups in queue, showing next immediately`);
      // Pequeno delay para suavizar a transição entre modals
      setTimeout(() => {
        this.processNextSkillSelection();
      }, 100);
    }
    
    // Update UI
    this.updateUI();
  }

  public getSkillLevel(skillType: SkillType): number {
    const skill = this.stats.skills.find(s => s.type === skillType);
    return skill ? skill.level : 0;
  }

  public getSkills(): PlayerSkill[] {
    return [...this.stats.skills];
  }

  private applySkillEffects(): void {
    // Apply max health bonus with intelligent healing
    const oldMaxHealth = this.stats.maxHealth;
    const healthBonus = calculateMaxHealthBonus(this.stats.skills);
    const newMaxHealth = PLAYER_CONFIG.maxHealth + healthBonus;
    
    // Calculate how much max health increased
    const maxHealthIncrease = newMaxHealth - oldMaxHealth;
    
    if (maxHealthIncrease > 0) {
      // If max health increased, heal the player by the increase amount
      // This ensures they get the "free heal" when picking max health skills
      this.stats.health = Math.min(this.stats.health + maxHealthIncrease, newMaxHealth);
      console.log(`💚 Max health increased by ${maxHealthIncrease}, healed to ${this.stats.health}/${newMaxHealth}`);
    }
    
    this.stats.maxHealth = newMaxHealth;
    
    // Ensure current health doesn't exceed new max (safety check)
    this.stats.health = Math.min(this.stats.health, this.stats.maxHealth);
    
    // Apply ammo capacity bonus with intelligent ammo refill
    const oldMaxAmmo = this.stats.maxAmmo;
    const ammoBonus = calculateAmmoCapacityBonus(this.stats.skills);
    const newMaxAmmo = PLAYER_CONFIG.maxAmmo + ammoBonus;
    
    // Calculate how much max ammo increased
    const maxAmmoIncrease = newMaxAmmo - oldMaxAmmo;
    
    if (maxAmmoIncrease > 0) {
      // If max ammo increased, give the player the increase amount immediately
      // This ensures they get the "free ammo" when picking ammo capacity skills
      this.stats.ammo = Math.min(this.stats.ammo + maxAmmoIncrease, newMaxAmmo);
      console.log(`📦 Max ammo increased by ${maxAmmoIncrease}, ammo refilled to ${this.stats.ammo}/${newMaxAmmo}`);
    }
    
    this.stats.maxAmmo = newMaxAmmo;
    
    // Ensure current ammo doesn't exceed new max (safety check)
    this.stats.ammo = Math.min(this.stats.ammo, this.stats.maxAmmo);
    
    // Update shot cooldown based on attack speed
    const attackSpeedMultiplier = calculateAttackSpeedMultiplier(this.stats.skills);
    this.shotCooldown = PLAYER_CONFIG.shotCooldown * attackSpeedMultiplier;
    
    // Apply move speed bonus
    const moveSpeedSkill = this.stats.skills.find(skill => skill.type === 'move_speed');
    const moveSpeedMultiplier = moveSpeedSkill ? this.getMoveSpeedMultiplier(moveSpeedSkill.level) : 1.0;
    this.speed = PLAYER_CONFIG.speed * moveSpeedMultiplier;
    
    // Check ricochet skill
    const ricochetSkill = this.stats.skills.find(skill => skill.type === 'ricochet');
    if (ricochetSkill) {
      const ricochetCount = this.getRicochetCount(ricochetSkill.level);
      console.log(`🎯 Player has ricochet skill: level ${ricochetSkill.level} (${ricochetCount} bounces)`);
    }
    
    // Update health regeneration interval
    this.updateHealthRegeneration();
    
    console.log(`🔧 Skills applied: MaxHP=${this.stats.maxHealth}, MaxAmmo=${this.stats.maxAmmo}, ShotCooldown=${this.shotCooldown.toFixed(2)}s, Speed=${this.speed.toFixed(2)}`);
    console.log(`📊 Current skills:`, this.stats.skills.map(s => `${s.type}:${s.level}`));
  }

  private processHealthRegeneration(): void {
    const regenSkill = this.stats.skills.find(skill => skill.type === 'health_regeneration');
    if (!regenSkill || this.stats.health >= this.stats.maxHealth) return;
    
    const regenAmount = this.getHealthRegenAmount(regenSkill.level);
    this.heal(regenAmount);
    
    console.log(`💚 Health regenerated: +${regenAmount} HP`);
  }

  private getHealthRegenAmount(level: number): number {
    switch (level) {
      case 1: return 5;
      case 2: return 8;
      case 3: return 12;
      default: return 0;
    }
  }
  
  private getRicochetCount(level: number): number {
    // Apenas 1 ricochet em ambos os níveis, diferença está no dano
    return level > 0 ? 1 : 0;
  }
  
  private getMoveSpeedMultiplier(level: number): number {
    switch (level) {
      case 1: return 1.15;
      case 2: return 1.3;
      case 3: return 1.5;
      case 4: return 1.7;
      case 5: return 1.9;
      case 6: return 2.15;
      case 7: return 2.4;
      case 8: return 2.7;
      case 9: return 3.0;
      case 10: return 3.5;
      default: return 1.0;
    }
  }

  private updateHealthRegeneration(): void {
    const regenSkill = this.stats.skills.find(skill => skill.type === 'health_regeneration');
    if (!regenSkill) {
      this.healthRegenInterval = 10; // Default
      return;
    }
    
    // Different intervals based on skill level
    switch (regenSkill.level) {
      case 1: this.healthRegenInterval = 10; break; // 10 seconds
      case 2: this.healthRegenInterval = 8; break;  // 8 seconds
      case 3: this.healthRegenInterval = 6; break;  // 6 seconds
      default: this.healthRegenInterval = 10;
    }
  }

  private updateAccuracy(): void {
    if (this.stats.shotsFired > 0) {
      this.stats.accuracy = Math.round((this.stats.enemiesDestroyed / this.stats.shotsFired) * 100);
    } else {
      this.stats.accuracy = 0;
    }
  }

  private processNextSkillSelection(isFirstLevelUp: boolean = false): void {
    if (this.skillSelectionQueue.length === 0) return;
    
    const nextSelection = this.skillSelectionQueue.shift()!;
    this.pendingSkillOptions = nextSelection.skillOptions;
    
    console.log(`🎯 Processing skill selection for level ${nextSelection.fromLevel} → ${nextSelection.toLevel} (first: ${isFirstLevelUp})`);
    
    if (isFirstLevelUp) {
      // Para o primeiro level up, mostrar após slow motion
      this.eventBus.emit('player:level-up', {
        oldLevel: nextSelection.fromLevel,
        newLevel: nextSelection.toLevel,
        currentXP: this.stats.currentXP,
        skillOptions: this.pendingSkillOptions
      });
      return;
    }
    
    // Para level ups subsequentes, mostrar imediatamente
    this.eventBus.emit('player:level-up', {
      oldLevel: nextSelection.fromLevel,
      newLevel: nextSelection.toLevel,
      currentXP: this.stats.currentXP,
      skillOptions: this.pendingSkillOptions
    });
  }

  private onSlowMotionComplete(): void {
    console.log('🎯 Slow motion complete, showing skill selection modal');
    
    // Primeiro level up após slow motion
    this.processNextSkillSelection(true);
  }

  public setInvulnerable(duration: number): void {
    this.isInvulnerable = true;
    this.invulnerabilityTimer = duration;
    console.log(`🛡️ Player is now invulnerable for ${duration}s`);
  }

  public isPlayerInvulnerable(): boolean {
    return this.isInvulnerable;
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
      currentXP: PLAYER_CONFIG.currentXP,
      skills: [...PLAYER_CONFIG.skills]
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