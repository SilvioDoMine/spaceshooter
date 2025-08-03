import * as THREE from 'three';
import { RenderingSystem } from '../systems/RenderingSystem';
import { InputSystem, InputState } from '../systems/InputSystem';
import { UISystem } from '../systems/UISystem';
import { AudioSystem } from '../systems/AudioSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { GameStateManager, GameState } from '../systems/GameStateManager';
import { MenuSystem } from '../systems/MenuSystem';

import { EntityManager } from './EntityManager';
import { CollisionSystem } from './CollisionSystem';
import { SpawnSystem } from './SpawnSystem';
import { GameLoop } from './GameLoop';

export interface GameManagerState {
  playerHealth: number;
  playerMaxHealth: number;
  playerAmmo: number;
  playerMaxAmmo: number;
  gameScore: number;
}

/**
 * GameManager - Orquestrador principal do jogo
 * 
 * Coordena todos os sistemas e managers, gerencia o estado global
 * e funciona como ponto central de comunicação entre componentes.
 * 
 * @features
 * - Inicialização e setup completo
 * - Coordenação entre sistemas
 * - Gerenciamento de estado global
 * - Input handling centralizado
 * - Lifecycle management (start, pause, stop)
 * - Debug e monitoramento
 */
export class GameManager {
  // Core systems
  private renderingSystem!: RenderingSystem;
  private inputSystem!: InputSystem;
  private uiSystem!: UISystem;
  private audioSystem!: AudioSystem;
  private particleSystem!: ParticleSystem;
  private gameStateManager!: GameStateManager;
  private menuSystem!: MenuSystem;
  
  // Game managers
  private entityManager!: EntityManager;
  private collisionSystem!: CollisionSystem;
  private spawnSystem!: SpawnSystem;
  private gameLoop!: GameLoop;
  
  // Game entities
  private playerShip!: THREE.Group;
  
  // Game state
  private state: GameManagerState = {
    playerHealth: 100,
    playerMaxHealth: 100,
    playerAmmo: 30,
    playerMaxAmmo: 30,
    gameScore: 0
  };

  // Initialization flag
  private initialized = false;

  /**
   * Inicializa todos os sistemas e managers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('GameManager already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing GameManager...');
      
      await this.initializeSystems();
      await this.initializeManagers();
      await this.setupCallbacks();
      await this.createPlayer();
      
      this.initialized = true;
      
      // Start in menu state
      this.gameStateManager.setState(GameState.MENU);
      
      console.log('✅ GameManager initialization complete');
      
    } catch (error) {
      console.error('❌ GameManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Inicializa sistemas básicos
   */
  private async initializeSystems(): Promise<void> {
    console.log('📦 Initializing core systems...');
    
    // Rendering system
    this.renderingSystem = new RenderingSystem();
    this.renderingSystem.attachToDOM('game-container');
    
    // Load assets
    console.log('📂 Loading assets...');
    await this.renderingSystem.loadAssets((progress) => {
      console.log(`Loading progress: ${progress.toFixed(1)}%`);
    });
    
    const { GAME_ASSETS } = await import('../assets/gameAssets');

    await this.renderingSystem.assetLoader.loadAssetManifest(GAME_ASSETS).catch((error) => {
      console.warn('⚠️ Some game assets could not be loaded:', error.message);
    });
    
    console.log('✅ Assets loaded');
    
    // Other systems
    this.inputSystem = new InputSystem();
    this.uiSystem = new UISystem(this.renderingSystem.renderer);
    this.audioSystem = new AudioSystem();
    this.particleSystem = new ParticleSystem(this.renderingSystem.scene);
    this.gameStateManager = new GameStateManager();
    this.menuSystem = new MenuSystem();
    
    // Load sounds (non-blocking)
    if (GAME_ASSETS.sounds) {
      this.audioSystem.loadSounds(GAME_ASSETS.sounds).catch(error => {
        console.warn('⚠️ Some sounds could not be loaded:', error);
      });
    }

    console.log('✅ Core systems initialized');
  }

  /**
   * Inicializa managers de jogo
   */
  private async initializeManagers(): Promise<void> {
    console.log('🎮 Initializing game managers...');
    
    this.entityManager = new EntityManager(this.renderingSystem);
    this.collisionSystem = new CollisionSystem(this.entityManager, this.audioSystem, this.particleSystem);
    this.spawnSystem = new SpawnSystem(this.entityManager);
    
    this.gameLoop = new GameLoop({
      entityManager: this.entityManager,
      collisionSystem: this.collisionSystem,
      spawnSystem: this.spawnSystem,
      gameStateManager: this.gameStateManager,
      renderingSystem: this.renderingSystem
    });
    
    console.log('✅ Game managers initialized');
  }

  /**
   * Configura callbacks e event handlers
   */
  private async setupCallbacks(): Promise<void> {
    console.log('🔗 Setting up callbacks...');
    
    // Input callbacks
    this.inputSystem.addInputCallback((action, pressed) => {
      this.handleInput(action, pressed);
    });

    // Menu callbacks
    this.menuSystem.setCallbacks({
      onStartGame: () => {
        this.startNewGame();
      },
      onReturnToMenu: () => {
        this.returnToMenu();
      },
      onRestartGame: () => {
        this.startNewGame();
      },
      onResumeGame: () => {
        this.gameStateManager.resumeGame();
      }
    });

    // Game state callbacks
    this.gameStateManager.onStateChange(GameState.PLAYING, () => {
      this.onGameStateStart();
    });

    this.gameStateManager.onStateChange(GameState.MENU, () => {
      this.onGameStateMenu();
    });

    this.gameStateManager.onStateChange(GameState.PAUSED, () => {
      this.onGameStatePause();
    });

    this.gameStateManager.onStateChange(GameState.GAME_OVER, () => {
      this.onGameStateGameOver();
    });
    
    console.log('✅ Callbacks configured');
  }

  /**
   * Cria jogador
   */
  private async createPlayer(): Promise<void> {
    console.log('👤 Creating player...');
    
    this.playerShip = await this.entityManager.createPlayer();
    
    console.log('✅ Player created');
  }

  /**
   * Processa input do usuário
   */
  private handleInput(action: keyof InputState, pressed: boolean): void {
    // Initialize audio on first interaction
    if (this.audioSystem && !this.audioSystem.isInitialized()) {
      this.audioSystem.initialize().catch(error => {
        console.warn('⚠️ Audio initialization failed:', error);
      });
    }

    // Game-specific input (only when playing)
    if (this.gameStateManager.isPlaying()) {
      this.gameLoop.handleInput(action, pressed, this.state, this.playerShip);
    }

    // Global inputs (work in any state)
    if (pressed) {
      switch (action) {
        case 'pause':
          this.handlePauseInput();
          break;
      }
    }
  }

  /**
   * Processa input de pause
   */
  private handlePauseInput(): void {
    if (this.gameStateManager.isPlaying()) {
      this.gameStateManager.pauseGame();
    } else if (this.gameStateManager.isPaused()) {
      this.gameStateManager.resumeGame();
    }
  }

  /**
   * Inicia novo jogo
   */
  private startNewGame(): void {
    console.log('🎮 Starting new game...');
    
    this.resetGameState();
    this.entityManager.clearAll();
    this.gameLoop.reset();
    this.spawnSystem.resetTimers();
    
    this.gameStateManager.startNewGame();
  }

  /**
   * Retorna ao menu principal
   */
  private returnToMenu(): void {
    console.log('📱 Returning to menu...');
    
    this.resetGameState();
    this.entityManager.clearAll();
    this.gameLoop.stop();
    
    this.gameStateManager.returnToMenu();
  }

  /**
   * Reset do estado do jogo
   */
  private resetGameState(): void {
    this.state = {
      playerHealth: 100,
      playerMaxHealth: 100,
      playerAmmo: 30,
      playerMaxAmmo: 30,
      gameScore: 0
    };

    // Update UI
    this.uiSystem.updateHealth(this.state.playerHealth, this.state.playerMaxHealth);
    this.uiSystem.updateAmmo(this.state.playerAmmo, this.state.playerMaxAmmo);
    this.uiSystem.updateScore(this.state.gameScore);

    // Reset player position
    if (this.playerShip) {
      this.playerShip.position.set(0, -2, 0);
    }
  }

  /**
   * Handler: Estado PLAYING
   */
  private onGameStateStart(): void {
    this.menuSystem.hideAllMenus();
    this.gameLoop.start();
    console.log('▶️ Game started');
  }

  /**
   * Handler: Estado MENU
   */
  private onGameStateMenu(): void {
    this.gameLoop.stop();
    this.menuSystem.showMainMenu();
    console.log('📱 Menu shown');
  }

  /**
   * Handler: Estado PAUSED
   */
  private onGameStatePause(): void {
    this.gameLoop.pause();
    this.menuSystem.showPauseScreen();
    console.log('⏸️ Game paused');
  }

  /**
   * Handler: Estado GAME_OVER
   */
  private onGameStateGameOver(): void {
    this.gameLoop.stop();
    const stats = this.gameStateManager.getStats();
    this.menuSystem.showGameOverScreen(stats);
    console.log('💀 Game over');
  }

  /**
   * Atualiza o jogo (chamado externamente no animation frame)
   */
  update(): void {
    if (!this.initialized) return;

    // Handle collision results and update game state
    if (this.gameStateManager.isPlaying()) {
      this.updateGameState();
    }

    // Always update rendering for UI, menus, etc.
    this.renderingSystem.render();
  }

  /**
   * Atualiza estado baseado em colisões e eventos
   */
  private updateGameState(): void {
    // Get collision results
    const playerPosition = {
      x: this.playerShip.position.x,
      y: this.playerShip.position.y
    };
    
    const collisionResult = this.collisionSystem.checkAllCollisions(playerPosition);

    // Process projectile hits
    collisionResult.projectileHits.forEach(hit => {
      if (hit.destroyed) {
        this.state.gameScore += hit.points;
        this.gameStateManager.incrementStat('score', hit.points);
        this.gameStateManager.incrementStat('enemiesDestroyed');
        this.uiSystem.updateScore(this.state.gameScore);
      }
    });

    // Process player collisions with enemies
    collisionResult.playerCollisions.forEach(collision => {
      this.state.playerHealth -= collision.damage;
      this.state.playerHealth = Math.max(0, this.state.playerHealth);
      this.uiSystem.updateHealth(this.state.playerHealth, this.state.playerMaxHealth);
      
      // Check game over
      if (this.state.playerHealth <= 0) {
        this.gameStateManager.endGame();
      }
    });

    // Process power-up collections
    collisionResult.powerUpCollections.forEach(collection => {
      this.applyPowerUpEffect(collection.powerUp.data.type, collection.effect);
    });

    // Handle escaped enemies
    this.handleEscapedEnemies();
  }

  /**
   * Aplica efeito de power-up
   */
  private applyPowerUpEffect(type: string, effect: number): void {
    switch (type) {
      case 'ammo':
        this.state.playerAmmo = Math.min(this.state.playerMaxAmmo, this.state.playerAmmo + effect);
        this.uiSystem.updateAmmo(this.state.playerAmmo, this.state.playerMaxAmmo);
        console.log(`🔫 Ammo refilled! +${effect} bullets (Total: ${this.state.playerAmmo})`);
        break;
        
      case 'health':
        this.state.playerHealth = Math.min(this.state.playerMaxHealth, this.state.playerHealth + effect);
        this.uiSystem.updateHealth(this.state.playerHealth, this.state.playerMaxHealth);
        console.log(`❤️ Health restored! +${effect} HP (Total: ${this.state.playerHealth})`);
        break;
        
      case 'shield':
        // TODO: Implement shield system
        console.log(`🛡️ Shield power-up collected! (Not implemented yet)`);
        break;
    }
  }

  /**
   * Processa inimigos que escaparam
   */
  private handleEscapedEnemies(): void {
    // This would need to be coordinated with EntityManager
    // For now, this is handled in the GameLoop
  }

  /**
   * Retorna estado atual do jogo
   */
  getGameState(): Readonly<GameManagerState> {
    return { ...this.state };
  }

  /**
   * Retorna referência do jogador
   */
  getPlayerShip(): THREE.Group {
    return this.playerShip;
  }

  /**
   * Retorna sistemas para acesso externo
   */
  getSystems() {
    return {
      rendering: this.renderingSystem,
      ui: this.uiSystem,
      audio: this.audioSystem,
      gameState: this.gameStateManager,
      input: this.inputSystem,
      menu: this.menuSystem
    };
  }

  /**
   * Retorna managers para debugging
   */
  getManagers() {
    return {
      entity: this.entityManager,
      collision: this.collisionSystem,
      spawn: this.spawnSystem,
      gameLoop: this.gameLoop
    };
  }

  /**
   * Estatísticas de debug
   */
  getDebugInfo() {
    if (!this.initialized) {
      return { status: 'not_initialized' };
    }

    return {
      status: 'initialized',
      gameState: this.state,
      currentState: this.gameStateManager.getState(),
      performance: this.gameLoop.getPerformanceStats(),
      entities: this.entityManager.getEntityCounts(),
      spawn: this.spawnSystem.getStats()
    };
  }

  /**
   * Configura modo debug
   */
  setDebugMode(enabled: boolean): void {
    if (enabled) {
      // Enable debug features
      this.collisionSystem.debugDrawCollisionCircles(true);
      console.log('🐛 Debug mode enabled');
    } else {
      this.collisionSystem.debugDrawCollisionCircles(false);
      console.log('🐛 Debug mode disabled');
    }
  }

  /**
   * Limpa recursos (cleanup)
   */
  dispose(): void {
    console.log('🧹 Disposing GameManager...');
    
    this.gameLoop.stop();
    this.entityManager.clearAll();
    this.inputSystem.dispose?.();
    this.audioSystem.dispose?.();
    
    this.initialized = false;
    
    console.log('✅ GameManager disposed');
  }
}