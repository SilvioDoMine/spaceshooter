import { GameStats } from "../systems/GameStateManager";
import { InputState } from "../systems/InputSystem";

export type GameEventMap = {
  // Startup Events - for system coordination
  'renderer:ready': { scene: any; renderer: any };
  'assets:ready': {};

  // Game State Events - KEEP: Core game flow communication
  'game:started': { difficulty: string };
  'game:paused': {};
  'game:resumed': {};
  'game:over': { finalScore: number; stats: GameStats };

  // Player Events - KEEP: UI notifications
  'player:damage': { damage: number; reason?: string; enemyType?: string };
  'player:score': { points: number };

  // Collision Events - KEEP: Entity interaction
  'collision:check': { entityId: string; entityType: string; position: { x: number; y: number }; radius: number; damage: number };
  'collision:projectile-enemy': { projectileId: string; position: { x: number; y: number }; damage: number; radius: number };
  'collision:powerup-player': { powerUpId: string; type: string; position: { x: number; y: number }; radius: number; effect: number };

  // Input Events - KEEP: Loose coupling for input
  'input:action': { action: keyof InputState; pressed: boolean };

  // Menu Events - KEEP: UI communication
  'menu:click': { type: 'main' | 'pause' | 'gameOver' | 'settings'; action: string };
  'menu:opened': { type: 'main' | 'pause' | 'gameOver' | 'settings' };
  'menu:closed': { type: 'main' | 'pause' | 'gameOver' | 'settings' };

  // UI Events - KEEP: Loose coupling for UI updates
  'ui:update-score': { score: number; delta?: number };
  'ui:update-health': { current: number; max: number };
  'ui:update-ammo': { current: number; max: number };
  
  // Audio Events - KEEP: Loose coupling for sound
  'audio:play': { soundId: string; options?: { volume?: number; loop?: boolean } };
  
  // Particle Events - KEEP: Visual effects
  'particles:explosion': { position: { x: number; y: number; z: number } };
  'particles:hit': { position: { x: number; y: number; z: number } };
  
  // Scene Events - KEEP: For entities that need to add/remove from scene
  'scene:add-object': { object: any };
  'scene:remove-object': { object: any };

  // UI Scene registration - KEEP: One-time setup
  'renderer:register-ui-scene': { scene: any; camera: any };
};

export class EventBus {
  private listeners: Map<keyof GameEventMap, Set<Function>> = new Map();
  private onceListeners: Map<keyof GameEventMap, Set<Function>> = new Map();

  private silencedEvents: Set<keyof GameEventMap> = new Set([
    'assets:ready',
    'audio:play',
    'particles:explosion',
    'particles:hit',
    'input:action',
    'scene:add-object',
    'scene:remove-object',
    'renderer:register-ui-scene',

    'collision:check',
    'collision:projectile-enemy',
    'collision:powerup-player',
  ]);

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
    if (! this.silencedEvents.has(event)) {
      console.log(`🚌 Event emitted: ${String(event)}`, data);
    }
    
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
