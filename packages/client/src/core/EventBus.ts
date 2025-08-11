import { GameStats } from "../systems/GameStateManager";
import { InputState } from "../systems/InputSystem";

export type GameEventMap = {
  // Startup Events
  'kernel:init': {};
  'renderer:init': {};
  'renderer:ready': { scene: any; renderer: any }; // THREE.Scene & THREE.WebGLRenderer
  'renderer:register-ui-scene': { scene: any; camera: any };
  'assets:ready': {};
  'input:ready': {};
  'ui:ready': {};
  'menu:ready': {};
  'audio:ready': {};
  'particles:ready': {};
  'gameState:ready': {};

  // Game State Events
  'game:main': {};
  'game:started': { difficulty: string };
  'game:paused': {};
  'game:resumed': {};
  'game:over': { finalScore: number; stats: GameStats };
  'game:exit': {};

  // Player Events
  'player:shot': {};
  'player:damage': { damage: number; reason?: string; enemyType?: string };
  'player:score': { points: number };

  // Collision Events
  'collision:check': { entityId: string; entityType: string; position: { x: number; y: number }; radius: number; damage: number };
  'collision:projectile-enemy': { projectileId: string; position: { x: number; y: number }; damage: number; radius: number };
  'collision:powerup-player': { powerUpId: string; type: string; position: { x: number; y: number }; radius: number; effect: number };

  // Input Events
  'input:action': { action: keyof InputState; pressed: boolean };
  'input:reset': {};

  // Menu Events
  'menu:click': { type: 'main' | 'pause' | 'gameOver' | 'settings'; action: string };
  'menu:opened': { type: 'main' | 'pause' | 'gameOver' | 'settings' };
  'menu:closed': { type: 'main' | 'pause' | 'gameOver' | 'settings' };
  'menu:optionSelected': { type: 'main' | 'pause' | 'gameOver' | 'settings'; option: string };
  'menu:settingsChanged': { settings: Record<string, any> };

//   // Combat Events
//   'projectile:fired': { position: Vector2; playerId: string };
//   'enemy:spawned': { enemy: Enemy };
//   'enemy:destroyed': { enemy: Enemy; position: Vector2; scorePoints: number };
//   'enemy:hit': { enemy: Enemy; damage: number };
  
//   // Player Events
//   'player:hit': { damage: number; position: Vector2 };
//   'player:health_changed': { current: number; max: number };
//   'player:ammo_changed': { current: number; max: number };
  
//   // PowerUp Events  
//   'powerup:spawned': { powerUp: PowerUp };
//   'powerup:collected': { powerUp: PowerUp; effect: any };
  
  // UI Events
  'ui:update-score': { score: number; delta?: number };
  'ui:update-health': { current: number; max: number };
  'ui:update-ammo': { current: number; max: number };
//   'score:updated': { newScore: number; delta?: number };
//   'ui:show_message': { text: string; type: 'success' | 'warning' | 'error' };
  
  // Audio Events
  'audio:play': { soundId: string; options?: { volume?: number; loop?: boolean } };
  
  // Particle Events
  'particles:explosion': { position: { x: number; y: number; z: number } };
  'particles:hit': { position: { x: number; y: number; z: number } };
  'particles:update': { deltaTime: number };
  'particles:clear': {};
  
  // Rendering Events
  'renderer:render-frame': {};
  'scene:add-object': { object: any };
  'scene:remove-object': { object: any };
  'materials:create-textured': { config: any; requestId: string };
  'materials:textured-response': { material: any; requestId: string };
  'assets:load-model': { name: string; path: string; requestId: string };
  'assets:model-response': { model: any; requestId: string; error?: string };
  'renderer:attach-dom': { containerId: string };
  'renderer:get-scene': { requestId: string };
  'renderer:scene-response': { scene: any; requestId: string };
};

export class EventBus {
  private listeners: Map<keyof GameEventMap, Set<Function>> = new Map();
  private onceListeners: Map<keyof GameEventMap, Set<Function>> = new Map();

  private silencedEvents: Set<keyof GameEventMap> = new Set([
    'kernel:init',
    'renderer:init',
    'renderer:ready',
    'assets:ready',
    'input:ready',
    'ui:ready',
    'menu:ready',
    'audio:ready',
    'particles:ready',
    'gameState:ready',
    'audio:play',
    'particles:explosion',
    'particles:hit',
    'particles:update',
    'input:action',
    'renderer:render-frame',
    'scene:add-object',
    'scene:remove-object',
    'materials:create-textured',
    'materials:textured-response',
    'renderer:get-scene',
    'renderer:scene-response',
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
