import { EntityManager } from './EntityManager';
import { ENEMY_CONFIG, POWERUP_CONFIG } from '@spaceshooter/shared';

export interface SpawnConfig {
  enemies: {
    enabled: boolean;
    baseRate: number; // milliseconds between spawns
    types: {
      basic: { probability: number; rate: number };
      fast: { probability: number; rate: number };
      heavy: { probability: number; rate: number };
    };
  };
  powerUps: {
    enabled: boolean;
    types: {
      ammo: { probability: number; rate: number };
      health: { probability: number; rate: number };
      shield: { probability: number; rate: number };
    };
  };
}

/**
 * SpawnSystem - Sistema de spawn de entidades
 * 
 * Gerencia o aparecimento automático de inimigos e power-ups no jogo.
 * Controla timing, probabilidades e balanceamento de spawn.
 * 
 * @features
 * - Spawn baseado em timers independentes
 * - Probabilidades configuráveis por tipo
 * - Balanceamento dinâmico
 * - Sistema de waves (futuro)
 * - Debug e monitoramento
 */
export class SpawnSystem {
  private config: SpawnConfig;
  private timers = {
    lastEnemySpawn: 0,
    lastPowerUpSpawn: 0,
    ammoSpawn: 0,
    healthSpawn: 0,
    shieldSpawn: 0
  };

  constructor(private entityManager: EntityManager) {
    this.config = this.getDefaultConfig();
  }

  /**
   * Configuração padrão do sistema de spawn
   */
  private getDefaultConfig(): SpawnConfig {
    return {
      enemies: {
        enabled: true,
        baseRate: 2000, // 2 segundos base
        types: {
          basic: { probability: 0.6, rate: 2000 },   // 60% - a cada 2s
          fast: { probability: 0.3, rate: 2000 },    // 30% - a cada 2s  
          heavy: { probability: 0.1, rate: 2000 }    // 10% - a cada 2s
        }
      },
      powerUps: {
        enabled: true,
        types: {
          ammo: { probability: 0.7, rate: 5000 },    // 70% - a cada 5s
          health: { probability: 0.25, rate: 20000 }, // 25% - a cada 20s
          shield: { probability: 0.05, rate: 30000 }  // 5% - a cada 30s
        }
      }
    };
  }

  /**
   * Atualiza o sistema de spawn (chamar no game loop)
   */
  update(): void {
    const currentTime = Date.now();
    
    if (this.config.enemies.enabled) {
      this.trySpawnEnemies(currentTime);
    }
    
    if (this.config.powerUps.enabled) {
      this.trySpawnPowerUps(currentTime);
    }
  }

  /**
   * Tentativa de spawn de inimigos
   */
  private trySpawnEnemies(currentTime: number): void {
    if (currentTime - this.timers.lastEnemySpawn < this.config.enemies.baseRate) {
      return;
    }

    // Determine enemy type based on probabilities
    const enemyType = this.selectEnemyType();
    if (enemyType) {
      const enemy = this.entityManager.createEnemy(enemyType);
      this.timers.lastEnemySpawn = currentTime;
      
      console.log(`👾 Enemy spawned: ${enemyType} (${enemy.data.id})`);
    }
  }

  /**
   * Tentativa de spawn de power-ups
   */
  private trySpawnPowerUps(currentTime: number): void {
    // Check each power-up type independently
    this.trySpawnPowerUpType('ammo', currentTime);
    this.trySpawnPowerUpType('health', currentTime);
    this.trySpawnPowerUpType('shield', currentTime);
  }

  /**
   * Tenta spawnar tipo específico de power-up
   */
  private trySpawnPowerUpType(type: keyof SpawnConfig['powerUps']['types'], currentTime: number): void {
    const config = this.config.powerUps.types[type];
    const lastSpawnKey = `${type}Spawn` as keyof typeof this.timers;
    
    if (currentTime - this.timers[lastSpawnKey] < config.rate) {
      return;
    }

    // Check probability
    if (Math.random() < config.probability) {
      const powerUp = this.entityManager.createPowerUp(type);
      this.timers[lastSpawnKey] = currentTime;
      
      console.log(`✨ Power-up spawned: ${type} (${powerUp.data.id})`);
    } else {
      // Reset timer even if not spawned (for probability calculation)
      this.timers[lastSpawnKey] = currentTime;
    }
  }

  /**
   * Seleciona tipo de inimigo baseado em probabilidades
   */
  private selectEnemyType(): keyof typeof ENEMY_CONFIG | null {
    const rand = Math.random();
    const types = this.config.enemies.types;
    
    let cumulative = 0;
    
    // Check in order of probability
    if ((cumulative += types.basic.probability) > rand) {
      return 'basic';
    }
    
    if ((cumulative += types.fast.probability) > rand) {
      return 'fast';
    }
    
    if ((cumulative += types.heavy.probability) > rand) {
      return 'heavy';
    }
    
    // Fallback to basic if probabilities don't add to 1
    return 'basic';
  }

  /**
   * Força spawn de inimigo específico
   */
  forceSpawnEnemy(type: keyof typeof ENEMY_CONFIG): void {
    const enemy = this.entityManager.createEnemy(type);
    console.log(`🔧 Force spawned enemy: ${type} (${enemy.data.id})`);
  }

  /**
   * Força spawn de power-up específico
   */
  forceSpawnPowerUp(type: keyof typeof POWERUP_CONFIG): void {
    const powerUp = this.entityManager.createPowerUp(type);
    console.log(`🔧 Force spawned power-up: ${type} (${powerUp.data.id})`);
  }

  /**
   * Ativa/desativa spawn de inimigos
   */
  setEnemySpawnEnabled(enabled: boolean): void {
    this.config.enemies.enabled = enabled;
    console.log(`Enemy spawn: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Ativa/desativa spawn de power-ups
   */
  setPowerUpSpawnEnabled(enabled: boolean): void {
    this.config.powerUps.enabled = enabled;
    console.log(`Power-up spawn: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Atualiza taxa de spawn de inimigos
   */
  setEnemySpawnRate(rate: number): void {
    this.config.enemies.baseRate = rate;
    Object.keys(this.config.enemies.types).forEach(type => {
      (this.config.enemies.types as any)[type].rate = rate;
    });
    console.log(`Enemy spawn rate updated: ${rate}ms`);
  }

  /**
   * Atualiza probabilidades de inimigos
   */
  setEnemyProbabilities(probabilities: { basic: number; fast: number; heavy: number }): void {
    // Normalize probabilities to sum to 1
    const total = probabilities.basic + probabilities.fast + probabilities.heavy;
    
    this.config.enemies.types.basic.probability = probabilities.basic / total;
    this.config.enemies.types.fast.probability = probabilities.fast / total;
    this.config.enemies.types.heavy.probability = probabilities.heavy / total;
    
    console.log('Enemy probabilities updated:', {
      basic: this.config.enemies.types.basic.probability,
      fast: this.config.enemies.types.fast.probability,
      heavy: this.config.enemies.types.heavy.probability
    });
  }

  /**
   * Configura taxa de power-up específico
   */
  setPowerUpRate(type: keyof SpawnConfig['powerUps']['types'], rate: number): void {
    this.config.powerUps.types[type].rate = rate;
    console.log(`Power-up ${type} rate updated: ${rate}ms`);
  }

  /**
   * Configura probabilidade de power-up específico
   */
  setPowerUpProbability(type: keyof SpawnConfig['powerUps']['types'], probability: number): void {
    this.config.powerUps.types[type].probability = Math.max(0, Math.min(1, probability));
    console.log(`Power-up ${type} probability updated: ${probability}`);
  }

  /**
   * Reset de todos os timers
   */
  resetTimers(): void {
    const currentTime = Date.now();
    Object.keys(this.timers).forEach(key => {
      (this.timers as any)[key] = currentTime;
    });
    console.log('🔄 Spawn timers reset');
  }

  /**
   * Modo de dificuldade (ajusta spawn rates)
   */
  setDifficulty(level: 'easy' | 'normal' | 'hard' | 'insane'): void {
    const difficultyConfigs = {
      easy: {
        enemyRate: 3000,
        powerUpMultiplier: 0.7 // Power-ups mais frequentes
      },
      normal: {
        enemyRate: 2000,
        powerUpMultiplier: 1.0
      },
      hard: {
        enemyRate: 1500,
        powerUpMultiplier: 1.3 // Power-ups menos frequentes
      },
      insane: {
        enemyRate: 1000,
        powerUpMultiplier: 1.5
      }
    };

    const config = difficultyConfigs[level];
    this.setEnemySpawnRate(config.enemyRate);
    
    // Adjust power-up rates
    Object.keys(this.config.powerUps.types).forEach(type => {
      const currentRate = (this.config.powerUps.types as any)[type].rate;
      (this.config.powerUps.types as any)[type].rate = currentRate * config.powerUpMultiplier;
    });

    console.log(`🎯 Difficulty set to: ${level}`);
  }

  /**
   * Estatísticas do spawn system
   */
  getStats() {
    const currentTime = Date.now();
    
    return {
      enabled: {
        enemies: this.config.enemies.enabled,
        powerUps: this.config.powerUps.enabled
      },
      timeSinceLastSpawn: {
        enemy: currentTime - this.timers.lastEnemySpawn,
        ammo: currentTime - this.timers.ammoSpawn,
        health: currentTime - this.timers.healthSpawn,
        shield: currentTime - this.timers.shieldSpawn
      },
      config: {
        enemyRate: this.config.enemies.baseRate,
        enemyProbabilities: this.config.enemies.types,
        powerUpRates: this.config.powerUps.types
      },
      entityCounts: this.entityManager.getEntityCounts()
    };
  }

  /**
   * Configuração atual do spawn
   */
  getConfig(): Readonly<SpawnConfig> {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Aplicar configuração customizada
   */
  setConfig(newConfig: Partial<SpawnConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      enemies: { ...this.config.enemies, ...newConfig.enemies },
      powerUps: { ...this.config.powerUps, ...newConfig.powerUps }
    };
    
    console.log('Spawn config updated:', this.config);
  }
}