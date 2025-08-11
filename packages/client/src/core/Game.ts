import { EventBus } from './EventBus';
import { assetManager } from '../services/AssetManager';
import { InputSystem } from '../systems/InputSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { UISystem } from '../systems/UISystem';
import { GameStateManager } from '../systems/GameStateManager';
import { MenuSystem } from '../systems/MenuSystem';
import { EntitySystem } from '../systems/EntitySystem';

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
  private systems: Map<string, any> = new Map();
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private animationId: number | null = null;

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
      await this.initializeAssets();
      
      // Phase 2: Initialize core systems
      await this.initializeSystems();
      
      // Phase 3: Setup system interactions
      this.setupSystemInteractions();
      
      // Phase 4: Signal ready
      this.eventBus.emit('kernel:init', {});
      
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
    
    // Dispose all systems
    this.systems.forEach((system, name) => {
      if (system.dispose) {
        console.log(`🧹 Disposing ${name}...`);
        system.dispose();
      }
    });
    
    this.systems.clear();
    assetManager.dispose();
    
    console.log('✅ Game disposed');
  }

  /**
   * Get system by name
   */
  public getSystem<T>(name: string): T | undefined {
    return this.systems.get(name);
  }

  /**
   * Get event bus instance
   */
  public getEventBus(): EventBus {
    return this.eventBus;
  }

  // Private methods

  private async initializeAssets(): Promise<void> {
    console.log('📦 Loading assets...');
    await assetManager.initialize();
  }

  private async initializeSystems(): Promise<void> {
    console.log('⚙️ Initializing systems...');

    // Import dynamic systems
    const [
      { RenderingSystem },
      { ParticleSystem }
    ] = await Promise.all([
      import('../systems/RenderingSystem'),
      import('../systems/ParticleSystem')
    ]);

    // Initialize systems in dependency order
    const systemConfigs = [
      { name: 'rendering', class: RenderingSystem },
      { name: 'input', class: InputSystem },
      { name: 'ui', class: UISystem },
      { name: 'audio', class: AudioSystem },
      { name: 'particles', class: ParticleSystem },
      { name: 'menu', class: MenuSystem },
      { name: 'gameState', class: GameStateManager },
      { name: 'entities', class: EntitySystem },
    ];

    for (const config of systemConfigs) {
      try {
        const system = new config.class(this.eventBus);
        this.systems.set(config.name, system);
        console.log(`✅ ${config.name} system initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${config.name} system:`, error);
        throw error;
      }
    }
  }

  private setupSystemInteractions(): void {
    // Remove UI coupling from main - UI handles its own state
    console.log('🔗 Setting up system interactions...');
    
    // Systems communicate via events only
    // No direct coupling needed here
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    // Update systems via events
    const gameStateManager = this.systems.get('gameState') as GameStateManager;
    const entitySystem = this.systems.get('entities') as EntitySystem;

    if (gameStateManager?.isPlaying() && entitySystem) {
      entitySystem.update(deltaTime);
      this.eventBus.emit('particles:update', { deltaTime });
    }

    // Render frame
    this.eventBus.emit('renderer:render-frame', {});

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