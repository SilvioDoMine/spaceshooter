import * as THREE from 'three';
import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { RenderingSystem } from '../systems/RenderingSystem';
import { assetManager } from '../services/AssetManager';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { PLAYER_CONFIG, DEFAULT_WORLD_BOUNDS, WorldBounds, PROJECTILE_CONFIG, calculateLevelFromXP, getXPToNextLevel, getLevelProgress, PlayerSkill, SkillType, generateSkillOptions, calculateDamageMultiplier, calculateAttackSpeedMultiplier, hasMultiShot, calculateMaxHealthBonus, calculateAmmoCapacityBonus, calculateProjectileLifetime } from '@spaceshooter/shared';
import { CompoundCollisionShape, CollisionUtils } from '../utils/CollisionUtils';
import { RangeIndicator } from '../effects/RangeIndicator';

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

  // Health bar 3D acima da nave
  private healthBarGroup?: THREE.Group;
  private healthBarSceneParent?: THREE.Scene;
  private healthBarSegments: THREE.Mesh[] = [];
  private healthBarText?: THREE.Sprite;

  // Auto-targeting system
  private weaponRange: number = PLAYER_CONFIG.weapon.range;
  private autoTargetEnabled: boolean = PLAYER_CONFIG.weapon.autoTarget;
  private currentTarget: any = null; // Enemy reference
  private rangeIndicator?: RangeIndicator; // Made optional to avoid undefined access

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

    const unsubscribeVictory = this.eventBus.on('game:victory', (data) => {
      this.emitVictoryStats(data.matchDuration);
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
    this.addCleanupFunction(unsubscribeVictory);
  }

  protected createVisual(): void {
    const shipData = assetManager.getPlayerShip();
    const playerShip = shipData.model;
    playerShip.scale.setScalar(PLAYER_CONFIG.size);
    playerShip.rotation.x = -Math.PI / 2;
    playerShip.rotation.z = Math.PI / 2;
    
  this.playerShipModel = playerShip;
  this.object.add(playerShip);
  console.log('[Player] Modelo da nave adicionado:', playerShip);

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

    // Criar barra de vida 3D acima da nave
  console.log('[Player] Chamando createHealthBar3D na criação visual');
  this.createHealthBar3D();

    this.renderingSystem.addToScene(this.object);
    
    // Initialize range indicator after scene is ready
    this.rangeIndicator = new RangeIndicator(this.eventBus);
    this.rangeIndicator.setRadius(this.weaponRange);
    
    // Add range indicator to scene
    const rangeMesh = this.rangeIndicator.getMesh();
    if (rangeMesh) {
      this.renderingSystem.addToScene(rangeMesh);
    }
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
      
      // Create circle vertices centered at origin (offset will be applied via position)
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(
          Math.cos(theta) * circle.radius,
          Math.sin(theta) * circle.radius,
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
      
      // Set initial position (will be updated by updateCollisionVisualizersRotation)
      visualizer.position.set(circle.offset.x, circle.offset.y, 0);
      
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

  /**
   * Override getRadius to return the largest collision circle radius
   * This is mainly for compatibility with auto-targeting calculations
   */
  public getRadius(): number {
    if (this.collisionShape.circles.length === 0) {
      return PLAYER_CONFIG.radius || 0.15; // Fallback to config
    }
    // Return the radius of the largest collision circle
    return Math.max(...this.collisionShape.circles.map(circle => circle.radius));
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
      this.createHealthBar3D();
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
    // Since collision visualizers are children of the player object, they inherit the parent's rotation
    // We only need to apply the offset positions WITHOUT additional rotation
    // The rotation is already applied to the parent object
    this.collisionVisualizers.forEach((visualizer, index) => {
      if (index < this.collisionShape.circles.length) {
        const circle = this.collisionShape.circles[index];
        
        // Set position to the UNROTATED offset - the parent object rotation will handle the rest
        // This matches what the collision system expects since it applies rotation in getAbsoluteCollisionCircles
        visualizer.position.set(circle.offset.x, circle.offset.y, 0);
        
        // Debug: log first few updates to verify position is correct
        if (index === 0 && Math.random() < 0.01) {
          console.log('🔄 Collision visualizer debug (no rotation applied to child):', {
            circleOffset: circle.offset,
            visualizerLocalPos: { x: visualizer.position.x, y: visualizer.position.y },
            parentRotation: this.object.rotation.z
          });
        }
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
      
      // Efeito visual de piscar durante invulnerabilidade
      const blinkRate = 8; // 8 piscadas por segundo
      const blinkCycle = Math.sin(Date.now() * blinkRate * 0.01) > 0;
      if (this.playerShipModel) {
        this.playerShipModel.visible = blinkCycle;
      }
      
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        // Restaurar visibilidade normal
        if (this.playerShipModel) {
          this.playerShipModel.visible = true;
        }
        console.log('🛡️ Invulnerability ended');
      }
    }

    // Update range indicator position
    if (this.rangeIndicator) {
      if (Math.random() < 0.01) { // Log ocasional
        console.log(`🎯 Player position being sent: (${this.position.x}, ${this.position.y}, 0)`);
      }
      this.rangeIndicator.setPosition(this.position.x, this.position.y, 0);
      this.rangeIndicator.update(deltaTime);
    }

    // AUTO-TARGETING SYSTEM with configurable range - ONLY when player is NOT moving
    if (this.autoTargetEnabled && !this.isMoving && (this.infiniteAmmoEnabled || this.stats.ammo > 0) && this.shotTimer <= 0) {
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
            
            // Calculate edge-to-edge distance instead of center-to-center
            const enemyRadius = enemy.getRadius ? enemy.getRadius() : 0.25; // Default enemy radius
            const playerRadius = this.getRadius(); // Use actual collision shape radius
            const edgeToEdgeDistance = dist - enemyRadius - playerRadius;
            
            // Only consider enemies within weapon range (edge-to-edge)
            if (edgeToEdgeDistance <= this.weaponRange && dist < minDist) {
              minDist = dist;
              closestEnemy = enemy;
            }
          });
          
          // Update current target
          this.currentTarget = closestEnemy;
          
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
    } else if (this.isMoving) {
      // Clear target when moving to prevent auto-shoot conflicts
      this.currentTarget = null;
    }

    // Update animations if available
    if (this.animationController) {
      this.animationController.update(deltaTime);
    }
    // Atualiza a barra de vida para seguir o player a cada frame
    this.updateHealthBar3D();
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

    // Store movement state for auto-targeting system
    this.isMoving = currentlyMoving;

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
    

    // Calcular lifetime baseado no range do player
    const calculatedLifetime = calculateProjectileLifetime(this.weaponRange, PROJECTILE_CONFIG.speed);
    
    // Verifica se o player tem a skill de projéteis fantasmas
    const hasGhost = this.stats.skills.some(skill => skill.type === 'ghost_projectiles');
    
    const projectileConfig = {
      lifetime: calculatedLifetime,
      ...(hasGhost && { color: 0x88ccff }) // Cor azul translúcida para projéteis fantasma
    };
    
    console.log(`🎯 Projectile will expire in ${calculatedLifetime}ms (range: ${this.weaponRange}, speed: ${PROJECTILE_CONFIG.speed})`);

    // Se tiver, projétil atravessa inimigos e é translúcido
    if (hasGhost) {
      console.log(`👻 Creating ghost projectile at (${projectilePosition.x}, ${projectilePosition.y})`);
      // Projétil principal - começa com noSkillTrigger: false para triggear skills no primeiro hit
      this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity, projectileDamage, 0, 0, false, 0, false, projectileConfig, true);
      // Multi-shot também é fantasma
      if (hasMultiShot(this.stats.skills)) {
        setTimeout(() => {
          if (this.isActive) {
            this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity, projectileDamage, 0, 0, false, 0, false, projectileConfig, true);
          }
        }, 50);
      }
    } else {
      // Projétil normal
      this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity, projectileDamage, 0, maxRicochets, false, ricochetLevel, false, projectileConfig, false);
      // Multi-shot normal
      if (hasMultiShot(this.stats.skills)) {
        setTimeout(() => {
          if (this.isActive) {
            this.projectileSystem.createProjectile('player', projectilePosition, projectileVelocity, projectileDamage, 0, maxRicochets, false, ricochetLevel, false, projectileConfig, false);
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
    
    // Ativar grace period de invulnerabilidade (1 segundo)
    this.setInvulnerable(1.0);
    
    this.eventBus.emit('audio:play', { soundId: 'hit', options: { volume: 0.5 } });
    
    this.eventBus.emit('particles:hit', {
      position: { x: this.position.x, y: this.position.y, z: 0 }
    });

    console.log(`💥 Player took ${damage} damage! Health: ${this.stats.health}/${this.stats.maxHealth} (Grace period: 1s)`);

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
    
    // Emit skills updated event for UI
    this.eventBus.emit('player:skills-updated', {
      skills: [...this.stats.skills]
    });
    
    // Clear current pending options
    this.pendingSkillOptions = undefined;
    
    // Se há mais skills na fila, processar imediatamente
    if (this.skillSelectionQueue.length > 0) {
      console.log(`🎯 ${this.skillSelectionQueue.length} more level ups in queue, showing next imediatamente`);
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
    // Remove barra de vida da cena ao resetar
    if (this.healthBarGroup && this.healthBarSceneParent) {
      this.healthBarSceneParent.remove(this.healthBarGroup);
      this.healthBarGroup = undefined;
      this.healthBarSceneParent = undefined;
    }
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
  // Cria novamente a barra de vida após reset
  this.createHealthBar3D();
  }

  // Barra de vida estilo Archero: pequena, próxima da nave, com segmentos e números
  private createHealthBar3D(): void {
    if (!this.playerShipModel) {
      console.warn('[Player] playerShipModel não definido ao criar barra de vida 3D');
      return;
    }
    if (this.healthBarGroup && this.healthBarSceneParent) {
      this.healthBarSceneParent.remove(this.healthBarGroup);
      console.log('[Player] Removendo healthBarGroup antigo da cena');
    }
    const group = new THREE.Group();
    
    // Dimensões estilo Archero - mais compacta
    const barWidth = 0.7; // Mais curta para não ficar muito longa
    const barHeight = 0.08; // Mantém altura fina
    const segments = Math.ceil(this.stats.maxHealth / 10); // Cada segmento = 10 de vida
    const segmentGap = 0.008; // Gap bem fino como no Archero
    const segmentWidth = (barWidth - (segments - 1) * segmentGap) / segments;
    
    // Borda externa bem grossa e destacada (estilo Archero)
    const borderThickness = 0.02; // Mais grossa
    const borderGeom = new THREE.PlaneGeometry(barWidth + borderThickness * 2, barHeight + borderThickness * 2);
    const borderMat = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: false, // Borda sólida
      depthTest: false 
    });
    const border = new THREE.Mesh(borderGeom, borderMat);
    border.position.z = -0.002;
    border.renderOrder = 9997;
    group.add(border);
    
    // Fundo da barra (preto sólido como no Archero)
    const bgGeom = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMat = new THREE.MeshBasicMaterial({ 
      color: 0x000000, // Preto sólido
      transparent: false, 
      depthTest: false 
    });
    const background = new THREE.Mesh(bgGeom, bgMat);
    background.position.z = -0.001;
    background.renderOrder = 9998;
    group.add(background);
    
    // Segmentos de vida estilo Archero clássico
    this.healthBarSegments = [];
    for (let i = 0; i < segments; i++) {
      const geometry = new THREE.PlaneGeometry(segmentWidth, barHeight * 0.9); // Mais altura
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x00cc00, // Verde mais saturado e escuro
        transparent: false, // Sem transparência
        depthTest: false 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = -barWidth / 2 + segmentWidth / 2 + i * (segmentWidth + segmentGap);
      mesh.renderOrder = 9999;
      group.add(mesh);
      this.healthBarSegments.push(mesh);
    }
    
    // Linhas divisórias mais claras entre segmentos (estilo Archero)
    for (let i = 0; i < segments - 1; i++) {
      const dividerGeom = new THREE.PlaneGeometry(0.004, barHeight);
      const dividerMat = new THREE.MeshBasicMaterial({ 
        color: 0xaaaaaa, // Mais claro que 0x666666
        transparent: true, 
        opacity: 0.8, // Um pouco mais opaco
        depthTest: false 
      });
      const divider = new THREE.Mesh(dividerGeom, dividerMat);
      divider.position.x = -barWidth / 2 + (i + 1) * (segmentWidth + segmentGap) - segmentGap / 2;
      divider.position.z = 0.001;
      divider.renderOrder = 10000;
      group.add(divider);
    }
    
    // Texto dos números estilo Archero (apenas vida atual)
    this.healthBarText = this.createHealthBarTextSprite(`${this.stats.health}`);
    this.healthBarText.position.set(0, barHeight * 0.4, 0.002); // Mais acima da barra
    this.healthBarText.scale.set(0.35, 0.18, 1); // Tamanho otimizado
    (this.healthBarText.material as THREE.SpriteMaterial).depthTest = false;
    (this.healthBarText.material as THREE.SpriteMaterial).opacity = 1;
    this.healthBarText.renderOrder = 10001;
    group.add(this.healthBarText);
    
    // Posição próxima mas bem visível da nave
    group.position.set(0, 0.8, 0);
    // Sem rotação inicial - vai ser ajustada no update
    group.renderOrder = 10000;
    
    // Adiciona a barra diretamente na cena
    const scene = (this.renderingSystem as any).scene as THREE.Scene;
    if (scene) {
      scene.add(group);
      this.healthBarSceneParent = scene;
      console.log('[Player] healthBarGroup estilo Archero criado e adicionado à cena', group);
    } else {
      console.warn('[Player] Não foi possível obter a cena para adicionar healthBarGroup');
    }
    this.healthBarGroup = group;
    this.updateHealthBar3D();
  }

  private updateHealthBar3D(): void {
    if (!this.healthBarGroup || !this.healthBarSegments.length) {
      return;
    }
    
    // Atualiza a posição da barra para sempre ficar "acima" do player, independente da rotação
    const playerPos = this.getPosition();
    this.healthBarGroup.position.set(playerPos.x, playerPos.y + 0.8, 0); // Posição próxima da nave
    
    const health = this.stats.health;
    const maxHealth = this.stats.maxHealth;
    const segments = this.healthBarSegments.length;
    const healthPercentage = health / maxHealth;
    const filledSegments = health / 10; // Cada segmento = 10 de vida
    
    // Atualiza cada segmento com o efeito "secando"
    for (let i = 0; i < segments; i++) {
      const mesh = this.healthBarSegments[i];
      const material = mesh.material as THREE.MeshBasicMaterial;
      
      if (i < Math.floor(filledSegments)) {
        // Segmento completamente cheio - cores Archero mais saturadas
        if (healthPercentage > 0.6) {
          material.color.set(0x00cc00); // Verde mais saturado e escuro
        } else if (healthPercentage > 0.3) {
          material.color.set(0xffaa00); // Amarelo/laranja mais saturado
        } else {
          material.color.set(0xcc0000); // Vermelho mais saturado e escuro
        }
        mesh.visible = true;
        mesh.scale.x = 1; // Escala total
        // Restaura posição original
        const barWidth = 0.7;
        const segmentGap = 0.008;
        const segmentWidth = (barWidth - (segments - 1) * segmentGap) / segments;
        mesh.position.x = -barWidth / 2 + segmentWidth / 2 + i * (segmentWidth + segmentGap);
      } else if (i === Math.floor(filledSegments) && filledSegments % 1 > 0) {
        // Segmento parcial - efeito "secando" com cores Archero mais saturadas
        const partialFill = filledSegments % 1;
        if (healthPercentage > 0.6) {
          material.color.set(0x00cc00); // Verde mais saturado e escuro
        } else if (healthPercentage > 0.3) {
          material.color.set(0xffaa00); // Amarelo/laranja mais saturado
        } else {
          material.color.set(0xcc0000); // Vermelho mais saturado e escuro
        }
        mesh.visible = true;
        mesh.scale.x = partialFill; // Escala parcial para efeito "secando"
        
        // Ajusta posição X para manter alinhamento à esquerda
        const barWidth = 0.7;
        const segmentGap = 0.008;
        const segmentWidth = (barWidth - (segments - 1) * segmentGap) / segments;
        const originalX = -barWidth / 2 + segmentWidth / 2 + i * (segmentWidth + segmentGap);
        mesh.position.x = originalX - (segmentWidth * (1 - partialFill)) / 2;
      } else {
        // Segmento vazio - cor escura como no Archero (visível mas escuro)
        material.color.set(0x333333); // Cinza escuro como no Archero
        mesh.visible = true;
        mesh.scale.x = 1; // Escala total
        // Restaura posição original
        const barWidth = 0.7;
        const segmentGap = 0.008;
        const segmentWidth = (barWidth - (segments - 1) * segmentGap) / segments;
        mesh.position.x = -barWidth / 2 + segmentWidth / 2 + i * (segmentWidth + segmentGap);
      }
    }
    
    // Atualiza o texto com apenas a vida atual
    if (this.healthBarText) {
      this.updateHealthBarTextSprite(this.healthBarText, `${health}`);
    }
    
    // Mantém sempre reta (sem rotação) - como no original
    this.healthBarGroup.rotation.set(0, 0, 0);
  }

  private createHealthBarTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 36px Arial'; // Fonte maior para PC
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3; // Borda menor
    ctx.strokeText(text, 64, 32);
    ctx.fillText(text, 64, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(material);
  }

  private updateHealthBarTextSprite(sprite: THREE.Sprite, text: string): void {
    const material = sprite.material as THREE.SpriteMaterial;
    const texture = material.map;
    if (!texture) return;
    
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 36px Arial'; // Fonte maior para PC
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3; // Borda menor
    ctx.strokeText(text, 64, 32);
    ctx.fillText(text, 64, 32);
    texture.needsUpdate = true;
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

    this.updateHealthBar3D();
  }

  private onDeath(): void {
    console.log('Player died!');
    this.isActive = false;

    // Remove barra de vida da cena ao morrer e limpa referências
    if (this.healthBarGroup && this.healthBarSceneParent) {
      this.healthBarSceneParent.remove(this.healthBarGroup);
    }
    this.healthBarGroup = undefined;
    this.healthBarSceneParent = undefined;
    this.healthBarSegments = [];
    this.healthBarText = undefined;
    // Garante que não haverá atualização visual após a morte
    this.updateHealthBar3D();

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

  /**
   * Emite estatísticas de vitória com dados reais do player
   */
  private emitVictoryStats(matchDuration: number): void {
    // Calculate time alive like in the die() method (keep in milliseconds for formatTime)
    const currentTime = Date.now();
    this.stats.timeAlive = currentTime - this.gameStartTime;
    
    // Update accuracy before sending victory stats
    this.updateAccuracy();

    console.log('🎉 Player victory stats:', this.stats);
    console.log('🎉 Match duration from GameTimer (seconds):', matchDuration);
    console.log('🎉 Time alive calculated from Player (ms):', this.stats.timeAlive);

    this.eventBus.emit('game:victory-stats', { 
      stats: {
        score: this.stats.score,
        shotsFired: this.stats.shotsFired, 
        enemiesDestroyed: this.stats.enemiesDestroyed,
        enemiesEscaped: this.stats.enemiesEscaped,
        timeAlive: 360000, // Always 6 minutes for victory (360000 ms = 6 minutes)
        accuracy: this.stats.accuracy,
        matchDuration: this.stats.timeAlive, // Real time duration in milliseconds
        isVictory: true
      }
    });
  }

  protected onDestroy(): void {
    // Remove barra de vida da cena ao destruir o player
    if (this.healthBarGroup && this.healthBarSceneParent) {
      this.healthBarSceneParent.remove(this.healthBarGroup);
    }
    this.healthBarGroup = undefined;
    this.healthBarSceneParent = undefined;
    this.healthBarSegments = [];
    this.healthBarText = undefined;
    
    // Dispose range indicator
    if (this.rangeIndicator) {
      this.rangeIndicator.dispose();
    }
    
    this.renderingSystem.removeFromScene(this.object);
  }

  // Weapon range system methods
  public setWeaponRange(range: number): void {
    this.weaponRange = range;
    if (this.rangeIndicator) {
      this.rangeIndicator.setRadius(range);
    }
    this.eventBus.emit('player:range-changed', { range });
  }

  public getWeaponRange(): number {
    return this.weaponRange;
  }

  public setAutoTargetEnabled(enabled: boolean): void {
    this.autoTargetEnabled = enabled;
  }

  public isAutoTargetEnabled(): boolean {
    return this.autoTargetEnabled;
  }

  public getCurrentTarget(): any {
    return this.currentTarget;
  }

  public setRangeIndicatorVisible(visible: boolean): void {
    if (this.rangeIndicator) {
      this.rangeIndicator.setVisible(visible);
    }
  }
}