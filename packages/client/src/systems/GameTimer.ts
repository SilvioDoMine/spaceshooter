import { EventBus } from '../core/EventBus';
import { GameStateManager, GameStateEnum } from './GameStateManager';

/**
 * GameTimer - Centralized game timer synchronized with GameState and DeltaTime
 * 
 * Features:
 * - Synchronized with GameStateManager (pauses when game is paused)
 * - Uses DeltaTime for accurate timing independent of framerate
 * - Supports boss fight time freezing
 * - Always shows exactly 6 minutes when game completes
 * - Tracks actual match duration separately for metrics
 */
export class GameTimer {
  private eventBus: EventBus;
  private gameStateManager: GameStateManager;
  
  // Game timer (the 6-minute countdown that pauses during boss fights)
  private gameTime: number = 0; // Game time in seconds (0-360)
  private isGameTimerActive: boolean = false;
  private isGameTimerFrozenForBoss: boolean = false;
  
  // Real-time match duration timer (for metrics)
  private matchStartTime: number = 0;
  private matchDuration: number = 0;
  private isMatchTimerActive: boolean = false;
  
  // Boss tracking
  private activeBossId: string | null = null;

  constructor(eventBus: EventBus, gameStateManager: GameStateManager) {
    this.eventBus = eventBus;
    this.gameStateManager = gameStateManager;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Game lifecycle events
    this.eventBus.on('game:started', () => {
      console.log('⏰ GameTimer: Starting timers');
      this.startTimers();
    });

    this.eventBus.on('game:over', () => {
      console.log('⏰ GameTimer: Stopping timers');
      this.stopTimers();
    });

    this.eventBus.on('game:victory', () => {
      console.log('⏰ GameTimer: Victory achieved, stopping timers');
      this.stopTimers();
    });

    // Boss events
    this.eventBus.on('boss:spawned', (data: { bossId: string; boss: any }) => {
      console.log(`⏰ GameTimer: Boss spawned (${data.bossId}), freezing game timer`);
      this.activeBossId = data.bossId;
      this.isGameTimerFrozenForBoss = true;
    });

    this.eventBus.on('boss:defeated', (data: { enemyId: string }) => {
      console.log(`⏰ GameTimer: Boss defeated (${data.enemyId}), checking if it's the active boss (${this.activeBossId})`);
      
      // Only unfreeze if the defeated boss is the one that caused the freeze
      if (this.activeBossId && data.enemyId === this.activeBossId) {
        console.log(`⏰ GameTimer: CORRECT boss defeated - resuming game timer`);
        this.activeBossId = null;
        this.isGameTimerFrozenForBoss = false;
      } else {
        console.log(`⏰ GameTimer: Wrong enemy defeated - timer remains frozen for boss ${this.activeBossId}`);
      }
    });
  }

  /**
   * Update both timers with deltaTime
   * This should be called from the main game loop
   */
  public update(deltaTime: number): void {
    // Only update if game is playing (respects GameState pauses)
    if (!this.gameStateManager.isPlaying()) {
      return;
    }

    // Update match duration timer (always runs during gameplay)
    if (this.isMatchTimerActive) {
      this.matchDuration += deltaTime;
    }

    // Update game timer (freezes during boss fights)
    if (this.isGameTimerActive && !this.isGameTimerFrozenForBoss) {
      const previousGameTime = this.gameTime;
      this.gameTime += deltaTime;
      
      // Check for victory condition
      if (previousGameTime < 360 && this.gameTime >= 360) {
        console.log('🎉 GameTimer: Victory condition reached! 6 minutes completed');
        this.eventBus.emit('game:victory', {
          gameTime: 360, // Always exactly 6 minutes
          matchDuration: this.matchDuration
        });
      }
      
      // Emit timer update events for UI
      this.eventBus.emit('game-timer:update', {
        gameTime: this.gameTime,
        matchDuration: this.matchDuration,
        isGameTimerFrozen: this.isGameTimerFrozenForBoss
      });
    }
  }

  /**
   * Start both timers when game begins
   */
  private startTimers(): void {
    this.gameTime = 0;
    this.matchDuration = 0;
    this.matchStartTime = Date.now();
    this.isGameTimerActive = true;
    this.isMatchTimerActive = true;
    this.isGameTimerFrozenForBoss = false;
    this.activeBossId = null;

    console.log('⏰ GameTimer: Timers started - 6 minute survival mode');
    
    // Notify UI that timer started
    this.eventBus.emit('game-timer:started', {
      totalGameDuration: 360 // 6 minutes
    });
  }

  /**
   * Stop all timers
   */
  private stopTimers(): void {
    this.isGameTimerActive = false;
    this.isMatchTimerActive = false;
    
    console.log(`⏰ GameTimer: Timers stopped - Game: ${this.formatTime(this.gameTime)}, Match: ${this.formatTime(this.matchDuration)}`);
  }

  // Public getters for other systems

  /**
   * Get current game time (the 6-minute timer that freezes during bosses)
   */
  public getGameTime(): number {
    return this.gameTime;
  }

  /**
   * Get real match duration (continuous timer for metrics)
   */
  public getMatchDuration(): number {
    return this.matchDuration;
  }

  /**
   * Check if game timer is frozen for boss fight
   */
  public isGameTimerFrozen(): boolean {
    return this.isGameTimerFrozenForBoss;
  }

  /**
   * Get game timer progress (0-1)
   */
  public getGameProgress(): number {
    return Math.min(1, this.gameTime / 360);
  }

  /**
   * Get remaining game time
   */
  public getRemainingGameTime(): number {
    return Math.max(0, 360 - this.gameTime);
  }

  /**
   * Check if victory condition is met (6 minutes completed)
   */
  public isVictoryAchieved(): boolean {
    return this.gameTime >= 360;
  }

  /**
   * Format time in MM:SS format
   */
  public formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format time display for UI (shows game time, indicates if frozen)
   */
  public getFormattedDisplayTime(): string {
    const formatted = this.formatTime(this.gameTime);
    return this.isGameTimerFrozenForBoss ? `${formatted} ⏸️` : formatted;
  }

  /**
   * Get comprehensive timer state for debugging/UI
   */
  public getTimerState(): {
    gameTime: number;
    matchDuration: number;
    isGameTimerActive: boolean;
    isGameTimerFrozen: boolean;
    activeBossId: string | null;
    gameProgress: number;
    isVictoryAchieved: boolean;
  } {
    return {
      gameTime: this.gameTime,
      matchDuration: this.matchDuration,
      isGameTimerActive: this.isGameTimerActive,
      isGameTimerFrozen: this.isGameTimerFrozenForBoss,
      activeBossId: this.activeBossId,
      gameProgress: this.getGameProgress(),
      isVictoryAchieved: this.isVictoryAchieved()
    };
  }
}