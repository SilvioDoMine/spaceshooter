import * as THREE from 'three';
import { EntityManager } from './EntityManager';
import { CollisionSystem } from './CollisionSystem';
import { SpawnSystem } from './SpawnSystem';
import { GameStateManager } from '../systems/GameStateManager';
import { RenderingSystem } from '../systems/RenderingSystem';
import { PROJECTILE_CONFIG } from '@spaceshooter/shared';

export interface GameLoopDependencies {
  entityManager: EntityManager;
  collisionSystem: CollisionSystem;
  spawnSystem: SpawnSystem;
  gameStateManager: GameStateManager;
  renderingSystem: RenderingSystem;
}

export interface GameState {
  playerHealth: number;
  playerMaxHealth: number;
  playerAmmo: number;
  playerMaxAmmo: number;
  gameScore: number;
}

export interface InputState {
  move: boolean;
  shoot: boolean;
  pause: boolean;
  escape: boolean;
}

/**
 * GameLoop - Core game loop e lógica principal
 * 
 * Gerencia o loop principal do jogo, coordenando atualizações de entidades,
 * colisões, spawn, input e estado do jogo.
 * 
 * @features
 * - Loop de jogo otimizado
 * - Delta time para consistência
 * - Input handling centralizado
 * - State management integrado
 * - Performance monitoring
 * - Pause/resume support
 */
export class GameLoop {
  private animationId: number | null = null;
  private isRunning = false;
  private lastTime = 0;
  private deltaTime = 0;
  
  // Input state
  private inputState: InputState = {
    move: false,
    shoot: false,
    pause: false,
    escape: false
  };
  
  // Timing
  private lastShotTime = 0;
  private readonly SHOT_COOLDOWN = 200; // milliseconds
  
  // Performance tracking
  private frameCount = 0;
  private fpsUpdateTime = 0;
  private currentFPS = 0;

  constructor(private deps: GameLoopDependencies) {}

  /**
   * Inicia o game loop
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Game loop already running');
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsUpdateTime = this.lastTime;
    
    console.log('🚀 Game loop started');
    this.loop();
  }

  /**
   * Para o game loop
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    console.log('⏹️ Game loop stopped');
  }

  /**
   * Loop principal do jogo
   */
  private loop = (): void => {
    if (!this.isRunning) {
      return;
    }

    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Cap delta time to prevent large jumps
    this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS minimum

    // Update FPS counter
    this.updateFPS(currentTime);

    // Only update game logic if playing
    if (this.deps.gameStateManager.isPlaying()) {
      this.updateGameLogic();
    }

    // Always render (for menus, pause screen, etc.)
    this.deps.renderingSystem.render();

    // Schedule next frame
    this.animationId = requestAnimationFrame(this.loop);
  };

  /**
   * Atualiza lógica principal do jogo
   */
  private updateGameLogic(): void {
    // Update spawn system
    this.deps.spawnSystem.update();

    // Update all entities
    this.updateEntities();

    // Check collisions
    this.handleCollisions();
  }

  /**
   * Atualiza todas as entidades
   */
  private updateEntities(): void {
    // Update projectiles
    this.deps.entityManager.updateProjectiles(this.deltaTime);

    // Update enemies  
    const enemyResult = this.deps.entityManager.updateEnemies(this.deltaTime);
    
    // Handle escaped enemies
    if (enemyResult.escaped.length > 0) {
      this.handleEscapedEnemies(enemyResult.escaped);
    }

    // Update power-ups
    this.deps.entityManager.updatePowerUps(this.deltaTime);
  }

  /**
   * Processa colisões e seus efeitos
   */
  private handleCollisions(): void {
    // Get player position (assumes playerShip is available through context)
    const playerPosition = { x: 0, y: -2 }; // Default position, should be passed from GameManager
    
    const collisionResult = this.deps.collisionSystem.checkAllCollisions(playerPosition);

    // Handle projectile hits
    collisionResult.projectileHits.forEach(hit => {
      if (hit.destroyed) {
        // Update score and stats
        this.deps.gameStateManager.incrementStat('score', hit.points);
        this.deps.gameStateManager.incrementStat('enemiesDestroyed');
        
        console.log(`💥 +${hit.points} points! Enemy destroyed.`);
      }
    });

    // Handle player collisions with enemies
    collisionResult.playerCollisions.forEach(collision => {
      // This would be handled by GameManager to update player health
      console.log(`💢 Player collision: -${collision.damage} damage`);
    });

    // Handle power-up collections
    collisionResult.powerUpCollections.forEach(collection => {
      // This would be handled by GameManager to apply effects
      console.log(`✨ Power-up collected: ${collection.powerUp.data.type} (+${collection.effect})`);
    });
  }

  /**
   * Processa inimigos que escaparam
   */
  private handleEscapedEnemies(escaped: any[]): void {
    escaped.forEach(enemy => {
      // Calculate escape penalty based on enemy type
      const penalty = this.getEscapePenalty(enemy.data.type);
      
      // Update stats
      this.deps.gameStateManager.incrementStat('enemiesEscaped');
      
      console.log(`🏃 Enemy ${enemy.data.type} escaped! -${penalty} HP`);
    });
  }

  /**
   * Calcula penalidade por fuga de inimigo
   */
  private getEscapePenalty(enemyType: string): number {
    const penalties: Record<string, number> = {
      basic: 5,
      fast: 8,
      heavy: 15
    };
    return penalties[enemyType] || 5;
  }

  /**
   * Processa input do jogador
   */
  handleInput(action: string, pressed: boolean, gameState: GameState, playerShip: THREE.Group): void {
    switch (action) {
      case 'up':
        this.handleMovement(pressed, { x: 0, y: 1 }, playerShip);
        break;
      case 'down':
        this.handleMovement(pressed, { x: 0, y: -1 }, playerShip);
        break;
      case 'left':
        this.handleMovement(pressed, { x: -1, y: 0 }, playerShip);
        break;
      case 'right':
        this.handleMovement(pressed, { x: 1, y: 0 }, playerShip);
        break;
      case 'shoot':
        if (pressed) {
          this.handleShoot(gameState, playerShip);
        }
        break;
    }
  }

  /**
   * Processa movimento do jogador
   */
  private handleMovement(pressed: boolean, direction: { x: number; y: number }, playerShip: THREE.Group): void {
    console.log(`Movement action: ${pressed ? 'pressed' : 'released'} in direction ${JSON.stringify(direction)}`);
    if (!pressed) return;

    const speed = 0.08;
    const movement = {
      x: direction.x * speed,
      y: direction.y * speed
    };

    // Apply movement with bounds checking
    const newX = Math.max(-3.5, Math.min(3.5, 
      playerShip.position.x + movement.x
    ));
    const newY = Math.max(-3.5, Math.min(3.5,
      playerShip.position.y + movement.y
    ));

    playerShip.position.x = newX;
    playerShip.position.y = newY;
  }

  /**
   * Processa disparo do jogador
   */
  private handleShoot(gameState: GameState, playerShip: THREE.Group): void {
    const currentTime = Date.now();
    
    // Check cooldown
    if (currentTime - this.lastShotTime < this.SHOT_COOLDOWN) {
      return;
    }

    // Check ammo
    if (gameState.playerAmmo <= 0) {
      console.log('🚫 No ammo!');
      return;
    }

    // Create projectile
    this.deps.entityManager.createProjectile({
      position: {
        x: playerShip.position.x,
        y: playerShip.position.y + 0.5,
        z: 0
      },
      velocity: { x: 0, y: PROJECTILE_CONFIG.speed },
      damage: PROJECTILE_CONFIG.damage
    });

    // Update state
    gameState.playerAmmo--;
    this.lastShotTime = currentTime;
    
    // Update stats
    this.deps.gameStateManager.incrementStat('shotsFired');

    console.log(`🔫 Shot fired! Ammo: ${gameState.playerAmmo}/${gameState.playerMaxAmmo}`);
  }

  /**
   * Atualiza contador de FPS
   */
  private updateFPS(currentTime: number): void {
    this.frameCount++;
    
    if (currentTime - this.fpsUpdateTime >= 1000) { // Update every second
      this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }

  /**
   * Pausa o game loop
   */
  pause(): void {
    this.isRunning = false;
    console.log('⏸️ Game loop paused');
  }

  /**
   * Resume o game loop
   */
  resume(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
    console.log('▶️ Game loop resumed');
  }

  /**
   * Reset do game loop
   */
  reset(): void {
    this.lastShotTime = 0;
    this.frameCount = 0;
    this.currentFPS = 0;
    this.fpsUpdateTime = performance.now();
    
    console.log('🔄 Game loop reset');
  }

  /**
   * Estatísticas de performance
   */
  getPerformanceStats() {
    return {
      fps: this.currentFPS,
      deltaTime: this.deltaTime,
      isRunning: this.isRunning,
      frameCount: this.frameCount,
      entityCounts: this.deps.entityManager.getEntityCounts(),
      spawnStats: this.deps.spawnSystem.getStats()
    };
  }

  /**
   * Debug info
   */
  getDebugInfo() {
    return {
      performance: this.getPerformanceStats(),
      inputState: this.inputState,
      timing: {
        lastShotTime: this.lastShotTime,
        shotCooldown: this.SHOT_COOLDOWN,
        deltaTime: this.deltaTime
      }
    };
  }

  /**
   * Configura velocidade do jogo (para debug/testing)
   */
  setGameSpeed(multiplier: number): void {
    // Could modify deltaTime multiplier
    console.log(`Game speed set to: ${multiplier}x`);
  }
}