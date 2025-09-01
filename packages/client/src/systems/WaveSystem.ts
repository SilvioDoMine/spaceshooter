import { EventBus } from '../core/EventBus';
import { Enemy } from '../entities/Enemy';
import { 
  WAVE_SYSTEM_CONFIG, 
  WaveConfig, 
  BossWaveConfig, 
  EnemyWaveConfig,
  getCurrentWave,
  shouldSpawnBoss,
  isGameVictorious,
  ENEMY_CONFIG
} from '@spaceshooter/shared';

/**
 * WaveSystem - Gerencia ondas progressivas de inimigos e bosses
 * Substitui o sistema simples de spawn por um baseado em tempo com escalação
 */
export class WaveSystem {
  private eventBus: EventBus;
  private gameStartTime: number = 0;
  private gameTime: number = 0;
  private isActive: boolean = false;
  private currentWave: WaveConfig | null = null;
  private timeFrozen: boolean = false;
  private frozenTime: number = 0;
  
  // Tracking de spawn por tipo de inimigo
  private enemySpawnTimers: Map<string, number> = new Map();
  private enemyCount: Map<string, number> = new Map();
  
  // Boss tracking
  private activeBoss: Enemy | null = null;
  private spawnedBossAtTimes: Set<number> = new Set();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventHandlers();
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

    this.eventBus.on('game:paused', () => {
      console.log('⏸️ WaveSystem: Game paused');
      this.isActive = false;
    });

    this.eventBus.on('game:resumed', () => {
      console.log('▶️ WaveSystem: Game resumed');
      this.isActive = true;
    });

    this.eventBus.on('boss:defeated', (data) => {
      console.log('👹 WaveSystem: Boss defeated, resuming time');
      this.activeBoss = null;
      this.timeFrozen = false;
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
    this.gameStartTime = Date.now();
    this.gameTime = 0;
    this.isActive = true;
    this.currentWave = null;
    this.timeFrozen = false;
    this.frozenTime = 0;
    this.activeBoss = null;
    this.spawnedBossAtTimes.clear();
    
    // Reset counters
    this.enemySpawnTimers.clear();
    this.enemyCount.clear();
    
    console.log('🌊 WaveSystem: Started - 6 minute survival mode');
    this.eventBus.emit('wave:started', { 
      totalDuration: WAVE_SYSTEM_CONFIG.totalDuration 
    });
  }

  private stopWaveSystem(): void {
    this.isActive = false;
    this.currentWave = null;
    this.activeBoss = null;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    // Update game time (freeze during boss fights)
    if (!this.timeFrozen) {
      this.gameTime += deltaTime;
    } else {
      this.frozenTime += deltaTime;
    }

    // Check for victory condition
    if (isGameVictorious(this.gameTime)) {
      console.log('🎉 WaveSystem: Victory achieved! 6 minutes survived');
      this.eventBus.emit('game:victory', {
        gameTime: this.gameTime,
        frozenTime: this.frozenTime
      });
      return;
    }

    // Check for boss spawns
    this.checkBossSpawns();

    // Update current wave
    this.updateCurrentWave();

    // Spawn enemies based on current wave
    if (!this.activeBoss && this.currentWave) {
      this.updateEnemySpawns(deltaTime);
    }
  }

  private checkBossSpawns(): void {
    const bossConfig = shouldSpawnBoss(this.gameTime);
    if (bossConfig && !this.spawnedBossAtTimes.has(bossConfig.time)) {
      console.log(`👹 WaveSystem: Spawning boss at ${this.gameTime}s - ${bossConfig.description}`);
      
      // Mark this boss time as spawned
      this.spawnedBossAtTimes.add(bossConfig.time);
      
      // Clear all existing enemies
      this.eventBus.emit('wave:clear-enemies', {});
      
      // Spawn boss
      this.spawnBoss(bossConfig);
      
      // Freeze time if configured
      if (bossConfig.freezeTime) {
        this.timeFrozen = true;
        console.log('⏰ WaveSystem: Time frozen for boss fight');
      }

      // Notify UI
      this.eventBus.emit('wave:boss-spawned', {
        boss: bossConfig,
        gameTime: this.gameTime
      });
    }
  }

  private updateCurrentWave(): void {
    const newWave = getCurrentWave(this.gameTime);
    
    if (newWave && newWave !== this.currentWave) {
      this.currentWave = newWave;
      console.log(`🌊 WaveSystem: New wave active - ${newWave.description}`);
      
      // Reset spawn timers for new wave
      this.enemySpawnTimers.clear();
      
      // Notify UI
      this.eventBus.emit('wave:changed', {
        wave: newWave,
        gameTime: this.gameTime
      });
    }
  }

  private updateEnemySpawns(deltaTime: number): void {
    if (!this.currentWave) return;

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
    return this.gameTime;
  }

  public getFrozenTime(): number {
    return this.frozenTime;
  }

  public getCurrentWave(): WaveConfig | null {
    return this.currentWave;
  }

  public getActiveBoss(): Enemy | null {
    return this.activeBoss;
  }

  public isTimeFrozen(): boolean {
    return this.timeFrozen;
  }

  public getProgress(): number {
    return Math.min(1, this.gameTime / WAVE_SYSTEM_CONFIG.totalDuration);
  }

  public getRemainingTime(): number {
    return Math.max(0, WAVE_SYSTEM_CONFIG.totalDuration - this.gameTime);
  }
}