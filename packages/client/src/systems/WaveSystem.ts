import { EventBus } from '../core/EventBus';
import { Enemy } from '../entities/Enemy';
import { GameTimer } from './GameTimer';
import { 
  WAVE_SYSTEM_CONFIG, 
  WaveConfig, 
  BossWaveConfig, 
  EnemyWaveConfig,
  getCurrentWave,
  shouldSpawnBoss
} from '@spaceshooter/shared';

/**
 * WaveSystem - Gerencia ondas progressivas de inimigos e bosses
 * Now uses centralized GameTimer for synchronized timing
 */
export class WaveSystem {
  private eventBus: EventBus;
  private gameTimer: GameTimer | null = null;
  private isActive: boolean = false;
  private currentWave: WaveConfig | null = null;
  
  // Tracking de spawn por tipo de inimigo
  private enemySpawnTimers: Map<string, number> = new Map();
  private enemyCount: Map<string, number> = new Map();
  
  // Boss tracking
  private activeBoss: Enemy | null = null;
  private spawnedBossAtTimes: Set<number> = new Set();
  
  // Boss spawn prevention
  private isBossSpawning: boolean = false;

  constructor(eventBus: EventBus, gameTimer?: GameTimer) {
    this.eventBus = eventBus;
    this.gameTimer = gameTimer || null;
    this.setupEventHandlers();
  }

  /**
   * Set GameTimer reference after both systems are created
   */
  public setGameTimer(gameTimer: GameTimer): void {
    this.gameTimer = gameTimer;
  }

  private setupEventHandlers(): void {
    this.eventBus.on('game:started', () => {
      console.log('🌊 WaveSystem: Game started - initializing wave system');
      this.startWaveSystem();
    });

    this.eventBus.on('game:over', () => {
      console.log('🌊 WaveSystem: Game over');
      this.stopWaveSystem();
    });

    this.eventBus.on('game:victory', () => {
      console.log('🎉 WaveSystem: Victory achieved, stopping wave system');
      this.stopWaveSystem();
    });

    this.eventBus.on('game:paused', () => {
      console.log('⏸️ WaveSystem: Game paused');
      this.isActive = false;
    });

    this.eventBus.on('game:resumed', () => {
      console.log('▶️ WaveSystem: Game resumed');
      this.isActive = true;
    });

    this.eventBus.on('boss:defeated', () => {
      console.log('👹 WaveSystem: Boss defeated, resuming normal enemy spawning');
      this.activeBoss = null;
      this.isBossSpawning = false; // Reset boss spawning flag
      // Note: GameTimer handles time unfreezing automatically via this event
    });

    this.eventBus.on('enemy:destroyed', (data) => {
      // Decrement enemy count
      if (data.enemyType) {
        const type = data.enemyType;
        const currentCount = this.enemyCount.get(type) || 0;
        this.enemyCount.set(type, Math.max(0, currentCount - 1));
        console.log(`🌊 WaveSystem: Enemy ${type} destroyed, count: ${currentCount - 1}`);
      }
    });
  }

  private startWaveSystem(): void {
    console.log('🌊 WaveSystem: Starting fresh wave system - resetting all state');
    
    // First, clear all existing enemies and bosses to ensure clean slate
    this.eventBus.emit('wave:clear-enemies', {});
    
    // Reset all wave state completely
    this.isActive = true;
    this.currentWave = null;
    this.activeBoss = null;
    this.spawnedBossAtTimes.clear();
    this.isBossSpawning = false; // Reset boss spawning flag
    
    // Reset all counters and timers
    this.enemySpawnTimers.clear();
    this.enemyCount.clear();
    
    console.log('🌊 WaveSystem: All state reset - fresh start with beginner enemies');
    
    // Force initial wave detection at time 0
    if (this.gameTimer) {
      this.updateCurrentWave(0);
      const waveDesc = this.currentWave ? (this.currentWave as WaveConfig).description : 'null';
      console.log(`🌊 WaveSystem: Forced initial wave detection - currentWave: ${waveDesc}`);
    }
    
    this.eventBus.emit('wave:started', { 
      totalDuration: WAVE_SYSTEM_CONFIG.totalDuration 
    });
  }

  private stopWaveSystem(): void {
    this.isActive = false;
    this.currentWave = null;
    this.activeBoss = null;
    this.isBossSpawning = false;
  }

  public update(deltaTime: number): void {
    if (!this.isActive || !this.gameTimer) return;

    const gameTime = this.gameTimer.getGameTime();

    // Check for boss spawns FIRST - this sets isBossSpawning flag
    this.checkBossSpawns(gameTime);

    // Update current wave only if not spawning a boss
    if (!this.isBossSpawning) {
      this.updateCurrentWave(gameTime);
    }

    // Spawn enemies only if ALL conditions are met:
    // 1. No active boss
    // 2. Not currently spawning a boss  
    // 3. Has current wave
    // 4. Timer is not frozen
    if (!this.activeBoss && !this.isBossSpawning && this.currentWave && !this.gameTimer.isGameTimerFrozen()) {
      this.updateEnemySpawns(deltaTime);
    }
  }

  private checkBossSpawns(gameTime: number): void {
    const bossConfig = shouldSpawnBoss(gameTime);
    
    // Debug timing around boss spawn times
    if (Math.abs(gameTime - 179) < 2 || Math.abs(gameTime - 359) < 2) {
      console.log(`⏰ WaveSystem: Near boss spawn time - gameTime: ${gameTime.toFixed(2)}s, bossConfig:`, bossConfig);
    }
    
    if (bossConfig && !this.spawnedBossAtTimes.has(bossConfig.time)) {
      console.log(`👹 WaveSystem: Boss spawn triggered at gameTime=${gameTime.toFixed(2)}s for boss scheduled at ${bossConfig.time}s - STOPPING enemy spawns immediately`);
      
      // IMMEDIATELY stop all enemy spawning
      this.isBossSpawning = true;
      
      // Mark this boss time as spawned
      this.spawnedBossAtTimes.add(bossConfig.time);
      
      // Clear all existing enemies
      this.eventBus.emit('wave:clear-enemies', {});
      
      console.log(`👹 WaveSystem: Enemies cleared, spawning boss - ${bossConfig.description}`);
      
      // Spawn boss
      this.spawnBoss(bossConfig);

      // Notify UI - GameTimer will handle the freeze automatically via boss:spawned event
      this.eventBus.emit('wave:boss-spawned', {
        boss: bossConfig,
        gameTime: gameTime
      });
    }
  }

  private updateCurrentWave(gameTime: number): void {
    const newWave = getCurrentWave(gameTime);
    
    console.log(`🌊 WaveSystem: Checking wave at ${gameTime.toFixed(2)}s - Found: ${newWave?.description || 'null'}, Current: ${this.currentWave?.description || 'null'}`);
    
    if (newWave && newWave !== this.currentWave) {
      this.currentWave = newWave;
      console.log(`🌊 WaveSystem: NEW WAVE ACTIVATED - ${newWave.description} (${newWave.startTime}-${newWave.endTime}s)`);
      
      // Reset spawn timers for new wave
      this.enemySpawnTimers.clear();
      
      // Log enemy types for this wave
      console.log(`🌊 WaveSystem: Wave enemy types:`, newWave.enemyTypes.map(e => `${e.type} (${e.spawnRate}ms interval, max ${e.maxConcurrent})`));
      
      // Notify UI
      this.eventBus.emit('wave:changed', {
        wave: newWave,
        gameTime: gameTime
      });
    }
  }

  private updateEnemySpawns(deltaTime: number): void {
    if (!this.currentWave) {
      console.log(`⚠️ WaveSystem: No current wave set for enemy spawning`);
      return;
    }

    // Log current wave being processed occasionally
    if (Math.random() < 0.01) { 
      console.log(`🌊 WaveSystem: Processing enemy spawns for wave "${this.currentWave.description}" with ${this.currentWave.enemyTypes.length} enemy types`);
    }

    for (const enemyConfig of this.currentWave.enemyTypes) {
      this.updateEnemyTypeSpawn(enemyConfig, deltaTime);
    }
  }

  private updateEnemyTypeSpawn(enemyConfig: EnemyWaveConfig, deltaTime: number): void {
    const typeKey = enemyConfig.type;
    
    // Get current timer and count
    const currentTimer = this.enemySpawnTimers.get(typeKey) || 0;
    const currentCount = this.enemyCount.get(typeKey) || 0;
    
    // Check if we can spawn more of this type
    if (currentCount >= enemyConfig.maxConcurrent) {
      // console.log(`🌊 WaveSystem: Max concurrent reached for ${typeKey}: ${currentCount}/${enemyConfig.maxConcurrent}`);
      return;
    }
    
    // Update spawn timer
    const newTimer = currentTimer + deltaTime;
    this.enemySpawnTimers.set(typeKey, newTimer);
    
    // Check if it's time to spawn
    const spawnInterval = enemyConfig.spawnRate / 1000; // Convert ms to seconds
    if (newTimer >= spawnInterval) {
      console.log(`🌊 WaveSystem: Spawning ${typeKey} enemy (timer: ${newTimer.toFixed(2)}s, interval: ${spawnInterval}s)`);
      this.spawnEnemyWithConfig(enemyConfig);
      this.enemySpawnTimers.set(typeKey, 0); // Reset timer
    }
  }

  private spawnEnemyWithConfig(enemyConfig: EnemyWaveConfig): void {
    try {
      console.log(`🌊 WaveSystem: Attempting to spawn ${enemyConfig.type} enemy`);
      // Solicitar informações da câmera via evento
      this.eventBus.emit('camera:get-info', {
        callback: (cameraInfo: { position: { x: number; y: number; z: number }; viewportSize: { width: number; height: number } }) => {
          console.log(`🌊 WaveSystem: Got camera info - position: (${cameraInfo.position.x.toFixed(2)}, ${cameraInfo.position.y.toFixed(2)}), viewport: ${cameraInfo.viewportSize.width.toFixed(1)}x${cameraInfo.viewportSize.height.toFixed(1)}`);
          // Usar novo método de spawn com animação na tela
          Enemy.spawnEnemyWithWaveConfigOnScreen(
            this.eventBus,
            enemyConfig,
            cameraInfo.position,
            cameraInfo.viewportSize
          ).then((enemy) => {
            // Update count
            const currentCount = this.enemyCount.get(enemyConfig.type) || 0;
            this.enemyCount.set(enemyConfig.type, currentCount + 1);
            
            console.log(`🌊 WaveSystem: Spawned ${enemyConfig.type} enemy with effect (${currentCount + 1}/${enemyConfig.maxConcurrent})`);
            
            // Emit spawn event
            this.eventBus.emit('wave:enemy-spawned', {
              enemy: enemy,
              config: enemyConfig,
              waveDescription: this.currentWave?.description || 'Unknown'
            });
          });
        }
      });
      
    } catch (error) {
      console.error('❌ WaveSystem: Error spawning enemy:', error);
    }
  }

  private spawnBoss(bossConfig: BossWaveConfig): void {
    try {
      const boss = Enemy.spawnBossWithWaveConfig(this.eventBus, bossConfig);
      this.activeBoss = boss;
      
      console.log(`👹 WaveSystem: Boss spawned - ${bossConfig.description}`);
      
      // Emit boss spawned event
      this.eventBus.emit('boss:spawned', {
        bossId: boss.getId(),
        boss: boss,
        config: bossConfig
      });
      
    } catch (error) {
      console.error('❌ WaveSystem: Error spawning boss:', error);
    }
  }

  // Public getters for UI
  public getGameTime(): number {
    return this.gameTimer?.getGameTime() || 0;
  }

  public getMatchDuration(): number {
    return this.gameTimer?.getMatchDuration() || 0;
  }

  public getCurrentWave(): WaveConfig | null {
    return this.currentWave;
  }

  public getActiveBoss(): Enemy | null {
    return this.activeBoss;
  }

  public isTimeFrozen(): boolean {
    return this.gameTimer?.isGameTimerFrozen() || false;
  }

  public getProgress(): number {
    return this.gameTimer?.getGameProgress() || 0;
  }

  public getRemainingTime(): number {
    return this.gameTimer?.getRemainingGameTime() || 0;
  }
}