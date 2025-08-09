# Event Bus Pattern - Implementação no Space Shooter

## Visão Geral

Um Event Bus é um padrão de design que implementa o padrão Publish-Subscribe (Pub/Sub), permitindo comunicação desacoplada entre diferentes partes de uma aplicação. Em vez de sistemas chamarem diretamente uns aos outros, eles emitem eventos que outros sistemas podem ouvir e reagir.

## Problemas Atuais na Arquitetura

### 1. **Alto Acoplamento**
```typescript
// main.ts - Linha 490-545
// O loop animate() conhece TODOS os sistemas
function animate() {
  if (gameStateManager.isPlaying()) {
    updateProjectiles();
    updateEnemies(); 
    checkCollisions();
    trySpawnEnemy();
  }
  particleSystem.update();
  renderingSystem.render();
  uiSystem.render();
}
```

### 2. **Chamadas Diretas Entre Sistemas**
```typescript
// Exemplo atual - main.ts:822-825
gameScore += scorePoints;
uiSystem.updateScore(gameScore);
gameStateManager.incrementStat('enemiesDestroyed');
audioSystem.playSound('explosion', { volume: 0.4   });
particleSystem.createExplosion(explosionPos);
```

Aqui, um sistema (colisões) precisa conhecer 4 outros sistemas diretamente.

## Solução: Event Bus

### Implementação Base

```typescript
// /src/core/EventManager.ts

export type GameEventMap = {
  // Game State Events
  'game:started': { difficulty: string };
  'game:paused': {};
  'game:resumed': {};
  'game:over': { finalScore: number; stats: GameStats };
  
  // Combat Events
  'projectile:fired': { position: Vector2; playerId: string };
  'enemy:spawned': { enemy: Enemy };
  'enemy:destroyed': { enemy: Enemy; position: Vector2; scorePoints: number };
  'enemy:hit': { enemy: Enemy; damage: number };
  
  // Player Events
  'player:hit': { damage: number; position: Vector2 };
  'player:health_changed': { current: number; max: number };
  'player:ammo_changed': { current: number; max: number };
  
  // PowerUp Events  
  'powerup:spawned': { powerUp: PowerUp };
  'powerup:collected': { powerUp: PowerUp; effect: any };
  
  // UI Events
  'score:updated': { newScore: number; delta?: number };
  'ui:show_message': { text: string; type: 'success' | 'warning' | 'error' };
  
  // Audio Events
  'audio:play': { soundId: string; options?: { volume?: number; loop?: boolean } };
  
  // Particle Events
  'particles:explosion': { position: Vector3; intensity?: number };
  'particles:hit': { position: Vector3; color?: number };
};

export class EventBus {
  private listeners: Map<keyof GameEventMap, Set<Function>> = new Map();
  private onceListeners: Map<keyof GameEventMap, Set<Function>> = new Map();

  /**
   * Adiciona um listener para um evento
   */
  on<K extends keyof GameEventMap>(
    event: K, 
    callback: (data: GameEventMap[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Retorna função de cleanup
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Adiciona um listener que executa apenas uma vez
   */
  once<K extends keyof GameEventMap>(
    event: K, 
    callback: (data: GameEventMap[K]) => void
  ): void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    
    this.onceListeners.get(event)!.add(callback);
  }

  /**
   * Remove um listener específico
   */
  off<K extends keyof GameEventMap>(
    event: K, 
    callback: (data: GameEventMap[K]) => void
  ): void {
    this.listeners.get(event)?.delete(callback);
    this.onceListeners.get(event)?.delete(callback);
  }

  /**
   * Emite um evento para todos os listeners
   */
  emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void {
    console.log(`🚌 Event emitted: ${String(event)}`, data);
    
    // Executar listeners normais
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
    
    // Executar listeners "once" e removê-los
    const onceEventListeners = this.onceListeners.get(event);
    if (onceEventListeners) {
      onceEventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in once listener for ${String(event)}:`, error);
        }
      });
      this.onceListeners.delete(event);
    }
  }

  /**
   * Remove todos os listeners de um evento
   */
  removeAllListeners<K extends keyof GameEventMap>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Retorna estatísticas do event bus
   */
  getStats() {
    const stats: Record<string, number> = {};
    
    this.listeners.forEach((listeners, event) => {
      stats[String(event)] = listeners.size;
    });
    
    return {
      activeListeners: stats,
      totalEvents: this.listeners.size
    };
  }
}

// Singleton instance
export const eventBus = new EventBus();
```

### Refatoração dos Sistemas

#### 1. Sistema de Áudio
```typescript
// AudioSystem.ts
export class AudioSystem {
  constructor(private eventBus: EventBus) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen para eventos de áudio
    this.eventBus.on('audio:play', ({ soundId, options }) => {
      this.playSound(soundId, options);
    });
    
    // Listen para eventos específicos do jogo
    this.eventBus.on('enemy:destroyed', () => {
      this.playSound('explosion', { volume: 0.4 });
    });
    
    this.eventBus.on('projectile:fired', () => {
      this.playSound('shoot', { volume: 0.3 });
    });
    
    this.eventBus.on('player:hit', () => {
      this.playSound('hit', { volume: 0.5 });
    });
  }
}
```

#### 2. Sistema de Partículas
```typescript
// ParticleSystem.ts
export class ParticleSystem {
  constructor(scene: THREE.Scene, private eventBus: EventBus) {
    super(scene);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.eventBus.on('particles:explosion', ({ position, intensity = 1 }) => {
      this.createExplosion(position, intensity);
    });
    
    this.eventBus.on('particles:hit', ({ position, color = 0xff0000 }) => {
      this.createHitEffect(position, color);
    });
    
    this.eventBus.on('enemy:destroyed', ({ position }) => {
      const pos = new THREE.Vector3(position.x, position.y, 0);
      this.createExplosion(pos);
    });
  }
}
```

#### 3. Sistema de Colisões Refatorado
```typescript
// main.ts - checkCollisions refatorado
function checkCollisions() {
  projectiles.forEach((projectile, projectileId) => {
    enemies.forEach((enemy, enemyId) => {
      if (isColliding(projectile.data, enemy.data)) {
        // 🚌 Emit collision event
        eventBus.emit('enemy:hit', {
          enemy: enemy.data,
          damage: projectile.data.damage
        });
        
        // Reduzir vida
        enemy.data.health -= projectile.data.damage;
        
        if (enemy.data.health <= 0) {
          const scorePoints = getScoreForEnemyType(enemy.data.type);
          
          // 🚌 Emit destruction event  
          eventBus.emit('enemy:destroyed', {
            enemy: enemy.data,
            position: { x: enemy.data.position.x, y: enemy.data.position.y },
            scorePoints
          });
          
          // Os sistemas reagem automaticamente via event listeners!
          // AudioSystem toca som de explosão
          // ParticleSystem cria partículas
          // GameStateManager atualiza estatísticas
          // UISystem atualiza score
        }
        
        removeProjectile(projectileId);
      }
    });
  });
}
```

## Pacotes Prontos Recomendados

### 1. **EventEmitter3** ⭐ **RECOMENDADO**
```bash
npm install eventemitter3
npm install @types/eventemitter3 -D
```

**Vantagens:**
- Extremamente rápido e leve (~2KB)
- API simples e familiar
- Suporte TypeScript nativo
- Usado por bibliotecas como PixiJS

```typescript
import { EventEmitter } from 'eventemitter3';

class GameEventBus extends EventEmitter<GameEventMap> {
  emitSafe<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]) {
    try {
      this.emit(event, data);
    } catch (error) {
      console.error(`Event error: ${String(event)}`, error);
    }
  }
}
```

### 2. **Mitt** 
```bash
npm install mitt
```
- Ainda menor (~200 bytes)
- API minimalista
- Perfeito para casos simples

### 3. **RxJS** (Para casos complexos)
```bash
npm install rxjs
```
- Operadores poderosos (debounce, filter, map)
- Streams reativas
- Overkill para a maioria dos casos, mas poderoso

### 4. **Node.js EventEmitter** (Built-in)
```typescript
import { EventEmitter } from 'events';
```
- Já disponível no Node.js
- Funciona no browser com bundlers

## Implementação Recomendada

Para o Space Shooter, recomendo **EventEmitter3**:

```typescript
// src/core/EventBus.ts
import { EventEmitter } from 'eventemitter3';

export const gameEventBus = new EventEmitter<GameEventMap>();

// Wrapper com logging e error handling
export class SafeEventBus {
  constructor(private emitter: EventEmitter<GameEventMap>) {}
  
  emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]) {
    console.log(`🚌 ${String(event)}`, data);
    this.emitter.emit(event, data);
  }
  
  on<K extends keyof GameEventMap>(
    event: K, 
    callback: (data: GameEventMap[K]) => void
  ) {
    this.emitter.on(event, callback);
    return () => this.emitter.off(event, callback);
  }
}

export const eventBus = new SafeEventBus(gameEventBus);
```

## Migração Gradual

1. **Fase 1:** Implementar EventBus e manter código atual
2. **Fase 2:** Migrar AudioSystem e ParticleSystem
3. **Fase 3:** Refatorar sistema de colisões
4. **Fase 4:** Integrar GameStateManager e UISystem
5. **Fase 5:** Remover chamadas diretas obsoletas

## Benefícios Finais

- ✅ **Desacoplamento:** Sistemas não se conhecem diretamente
- ✅ **Testabilidade:** Fácil mock de eventos em testes
- ✅ **Extensibilidade:** Novos sistemas só precisam ouvir eventos
- ✅ **Debug:** Log centralizado de todos os eventos
- ✅ **Performance:** Só sistemas interessados reagem
- ✅ **Flexibilidade:** Múltiplos listeners por evento