import { EventBus } from './EventBus';
import { assetManager } from '../services/AssetManager';
import { InputSystem } from '../systems/InputSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { UISystem } from '../systems/UISystem';
import { GameStateManager } from '../systems/GameStateManager';
import { MenuSystem } from '../systems/MenuSystem';
import { EntitySystem } from '../systems/EntitySystem';
import { RenderingSystem } from '../systems/RenderingSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { BackgroundSystem } from '../systems/BackgroundSystem';
import { DebugSystem } from '../systems/DebugSystem';
import { UIManager } from '../managers/UIManager';

/**
 * Game - Core game class that manages all systems and lifecycle
 * 
 * Responsibilities:
 * - Initialize all game systems in correct order
 * - Manage game loop
 * - Handle system lifecycle (start, stop, cleanup)
 * - Centralize error handling
 */
export class Game {
  private eventBus: EventBus;
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private animationId: number | null = null;

  // Direct system references - no more Map lookup hell
  private renderingSystem!: RenderingSystem;
  private inputSystem!: InputSystem;
  private audioSystem!: AudioSystem;  
  private uiSystem!: UISystem;
  private particleSystem!: ParticleSystem;
  private menuSystem!: MenuSystem;
  private gameStateManager!: GameStateManager;
  private entitySystem!: EntitySystem;
  private backgroundSystem!: BackgroundSystem;
  private debugSystem!: DebugSystem;
  private uiManager!: UIManager;

  constructor() {
    this.eventBus = new EventBus();
    this.setupGlobalErrorHandling();
  }

  /**
   * Initialize the game and all systems
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🎮 Initializing game...');
      
      // Phase 1: Initialize assets
      console.log('📦 Phase 1: Initialize assets...');
      await this.initializeAssets();
      console.log('✅ Assets initialized');
      
      // Phase 2: Initialize systems with proper dependencies
      console.log('⚙️ Phase 2: Initialize systems...');
      this.initializeSystems();
      console.log('✅ Systems initialized');
      
      // Phase 3: Setup DOM and load assets
      console.log('🎨 Phase 3: Setup rendering and assets...');
      await this.setupRenderingAndAssets();
      console.log('✅ Rendering and assets setup complete');
      
      console.log('✅ Game initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      throw error;
    }
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('Game is already running');
      return;
    }

    console.log('▶️ Starting game loop...');
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    if (!this.isRunning) return;

    console.log('⏹️ Stopping game loop...');
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Cleanup all resources
   */
  public dispose(): void {
    this.stop();
    
    // Dispose all systems directly
    if (this.entitySystem) this.entitySystem.dispose();
    if (this.renderingSystem) this.renderingSystem.dispose();
    if (this.particleSystem) this.particleSystem.dispose();
    if (this.audioSystem) this.audioSystem.dispose();
    if (this.uiSystem) this.uiSystem.dispose();
    if (this.inputSystem) this.inputSystem.dispose();
    if (this.backgroundSystem) this.backgroundSystem.dispose();
    if (this.debugSystem) this.debugSystem.dispose();
    
    assetManager.dispose();
    
    console.log('✅ Game disposed');
  }

  /**
   * Get direct access to systems
   */
  public getRenderingSystem(): RenderingSystem { return this.renderingSystem; }
  public getEntitySystem(): EntitySystem { return this.entitySystem; }
  public getGameStateManager(): GameStateManager { return this.gameStateManager; }
  public getEventBus(): EventBus { return this.eventBus; }
  public getDebugSystem(): DebugSystem { return this.debugSystem; }

  // Private methods

  private async initializeAssets(): Promise<void> {
    console.log('📦 Loading assets...');
    await assetManager.initialize();
  }

  private initializeSystems(): void {
    console.log('⚙️ Initializing systems...');

    // Initialize systems in dependency order with direct injection
    this.renderingSystem = new RenderingSystem(this.eventBus);
    this.inputSystem = new InputSystem(this.eventBus);
    this.audioSystem = new AudioSystem(this.eventBus);
    this.uiSystem = new UISystem(this.eventBus);
    this.uiManager = new UIManager(this.eventBus);
    this.particleSystem = new ParticleSystem(this.eventBus);
    this.menuSystem = new MenuSystem(this.eventBus);
    this.gameStateManager = new GameStateManager(this.eventBus);
    this.backgroundSystem = new BackgroundSystem(this.eventBus);
    this.debugSystem = new DebugSystem(this.eventBus);
    
    // EntitySystem needs RenderingSystem for direct scene manipulation
    this.entitySystem = new EntitySystem(this.eventBus, this.renderingSystem);
    
    // BackgroundSystem needs RenderingSystem reference
    this.backgroundSystem.setRenderingSystem(this.renderingSystem);
    
    // Initialize UISystem with rendering system after both are created
    this.uiSystem.setRenderingSystem(this.renderingSystem.scene, this.renderingSystem.renderer);
    
    // Initialize ParticleSystem with scene reference (it will still listen to renderer:ready event too)
    // This ensures it works even if the event timing is off

    console.log('✅ All systems initialized');
  }

  private async setupRenderingAndAssets(): Promise<void> {
    // Attach rendering system to DOM
    this.renderingSystem.attachToDOM('game-container');
    
    // Load assets directly
    await this.renderingSystem.loadAssets((progress) => {
      console.log(`Loading progress: ${progress.toFixed(1)}%`);
    });
    
    // Start the game automatically after everything is loaded
    console.log('🎮 Starting game automatically...');
    this.gameStateManager.startNewGame();
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    let deltaTime = ((currentTime - this.lastFrameTime) / 1000);
    this.lastFrameTime = currentTime;

    // Apply debug time scale
    const timeScale = this.debugSystem.getTimeScale();
    deltaTime *= timeScale;

    // Update systems directly - no events needed for core game loop
    if (this.gameStateManager.isPlaying()) {
      this.backgroundSystem.update(deltaTime);
      this.entitySystem.update(deltaTime);
      this.particleSystem.update(deltaTime);
    }

    // Render frame directly
    this.renderingSystem.render();

    // Schedule next frame
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      console.error('🚨 Global error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
    });
  }
}