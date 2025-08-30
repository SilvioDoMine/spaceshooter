import { GameStats } from "../systems/GameStateManager";
import { InputState } from "../systems/InputSystem";

export type GameEventMap = {
  // ========== STARTUP EVENTS ==========
  // Emitido em: RenderingSystem.ts:116 quando THREE.js está pronto
  // Motivo: Coordenação entre sistemas - outros sistemas aguardam o renderer estar pronto
  'renderer:ready': { scene: any; renderer: any };
  
  // Emitido em: RenderingSystem.ts:211 após carregar todos os assets
  // Motivo: Sinaliza que texturas, modelos e recursos estão prontos para uso
  'assets:ready': {};
  
  // Emitido em: InputSystem.ts:89 após configurar listeners de teclado
  // Motivo: Garante que o sistema de input está operacional antes do jogo iniciar
  'input:ready': {};
  
  // Emitido em: AudioSystem.ts:62 após inicializar contexto de áudio
  // Motivo: Sistema de áudio precisa estar pronto para reproduzir sons
  'audio:ready': {};
  
  // Emitido em: ParticleSystem.ts:124 após configurar sistema de partículas
  // Motivo: Sistema de efeitos visuais deve estar pronto para explosões e impactos
  'particles:ready': {};
  
  // Emitido em: MenuSystem.ts:23 após configurar interface de menus
  // Motivo: Sistema de menus deve estar pronto para navegação
  'menu:ready': {};
  
  // Emitido em: UISystem.ts:87 após configurar HUD e elementos da UI
  // Motivo: Interface do usuário deve estar pronta para exibir informações
  'ui:ready': {};
  
  // Emitido em: GameStateManager.ts:125 após configurar máquina de estados
  // Motivo: Controlador principal do jogo deve estar pronto para gerenciar estados
  'gameState:ready': {};

  // ========== GAME STATE EVENTS ==========
  // Emitido em: GameStateManager.ts:312,399,416 ao iniciar nova partida
  // Motivo: Comunica início do jogo para todos os sistemas resetarem estado
  'game:started': { difficulty: string };
  
  // Emitido em: GameStateManager.ts:325 quando jogador pausa o jogo
  // Motivo: Pausa todos os sistemas (input, movimento, spawning)
  'game:paused': {};
  
  // Emitido em: GameStateManager.ts:316,407 quando jogo é despausado
  // Motivo: Retoma operação de todos os sistemas pausados
  'game:resumed': {};
  
  // Emitido em: Player.ts:258 quando vida do jogador chega a zero
  // Motivo: Finaliza jogo e exibe tela de game over com estatísticas
  'game:over': { finalScore: number; stats: GameStats };
  
  // Emitido em: GameStateManager.ts:409 para sair do jogo atual
  // Motivo: Retorna ao menu principal limpando estado do jogo
  'game:exit': {};
  
  // Emitido em: GameStateManager.ts:305,419 para ir ao menu principal
  // Motivo: Navega para tela inicial do jogo
  'game:main': {};

  // ========== PLAYER EVENTS ==========
  // Emitido em: EntitySystem quando jogador recebe dano (via enemy escape ou collision)
  // Motivo: Player precisa processar dano recebido
  'player:damage': { damage: number; reason?: string; enemyType?: string };
  
  // Emitido em: EntitySystem quando jogador ganha pontos (via enemy destruction)  
  // Motivo: Player precisa processar pontos ganhos
  'player:score': { points: number };
  
  // Emitido em: Player.ts quando vida do jogador muda
  // Motivo: UIManager atualizar barra de vida
  'player:health-changed': { current: number; max: number };
  
  // Emitido em: Player.ts quando munição do jogador muda  
  // Motivo: UIManager atualizar contador de munição
  'player:ammo-changed': { current: number; max: number };
  
  // Emitido em: Player.ts quando pontuação do jogador muda
  // Motivo: UIManager atualizar pontuação na tela
  'player:score-changed': { score: number };

  // ========== ENEMY EVENTS ==========
  // Emitido em: Enemy.ts quando inimigo escapa
  // Motivo: EntitySystem aplicar penalidade ao jogador
  'enemy:escaped': { damage: number; enemyType: string; enemyId: string };
  
  // Emitido em: Enemy.ts quando inimigo é destruído
  // Motivo: EntitySystem dar pontos ao jogador
  'enemy:destroyed': { points: number; enemyType: string; enemyId: string };

  // ========== COLLISION EVENTS ==========
  // Emitido em: Enemy.ts:117 para verificar colisão de inimigo
  // Motivo: Sistema de colisão verificar se inimigo colidiu com jogador
  'collision:check': { entityId: string; entityType: string; position: { x: number; y: number }; radius: number; damage: number };
  
  // Emitido em: ProjectileSystem.ts:133 quando projétil pode colidir com inimigo
  // Motivo: Sistema de colisão verificar impacto entre projétil e inimigos
  'collision:projectile-enemy': { projectileId: string; position: { x: number; y: number }; damage: number; radius: number };
  
  // Emitido em: PowerUp.ts:120 quando power-up pode colidir com jogador
  // Motivo: Sistema de colisão verificar se jogador coletou power-up
  'collision:powerup-player': { powerUpId: string; type: string; position: { x: number; y: number }; radius: number; effect: number };

  // ========== INPUT EVENTS ==========
  // Emitido em: InputSystem.ts:117,132 a cada tecla pressionada/solta
  // Motivo: Comunica ações do jogador para sistemas que precisam reagir
  'input:action': { action: keyof InputState; pressed: boolean };

  // ========== MENU EVENTS ==========
  // Emitido em: MenuSystem.ts:336,349,369,379,398,408 quando botão é clicado
  // Motivo: Navegar entre menus e executar ações do jogador
  'menu:click': { type: 'main' | 'pause' | 'gameOver' | 'settings'; action: string };
  
  // Eventos comentados no código - mantidos para compatibilidade futura
  'menu:opened': { type: 'main' | 'pause' | 'gameOver' | 'settings' };
  'menu:closed': { type: 'main' | 'pause' | 'gameOver' | 'settings' };

  // ========== UI EVENTS ==========
  // Emitido em: Player.ts:240, main2.ts:71,143,761,606 para atualizar HUD
  // Motivo: Manter pontuação na tela sincronizada com estado do jogo
  'ui:update-score': { score: number; delta?: number };
  
  // Emitido em: Player.ts:232, main2.ts:69,142,605,831,963 para atualizar vida
  // Motivo: Manter barra de vida na tela sincronizada com vida do jogador
  'ui:update-health': { current: number; max: number };
  
  // Emitido em: Player.ts:236, main2.ts:70,144,211,956 para atualizar munição
  // Motivo: Manter contador de munição na tela sincronizado
  'ui:update-ammo': { current: number; max: number };
  
  // ========== AUDIO EVENTS ==========
  // Emitido em: Player.ts:154,163, Enemy.ts:94,163, main2.ts:256,613,747,833,929, EntitySystem.ts:217
  // Motivo: Reproduzir efeitos sonoros sem acoplamento direto ao sistema de áudio
  'audio:play': { soundId: string; options?: { volume?: number; loop?: boolean } };
  
  // ========== PARTICLE EVENTS ==========
  // Emitido em: Enemy.ts:165, main2.ts:750 quando algo explode
  // Motivo: Criar efeito visual de explosão na posição especificada
  'particles:explosion': { position: { x: number; y: number; z: number } };
  
  // Emitido em: Player.ts:165, Enemy.ts:96, main2.ts:616,836,920, EntitySystem.ts:213
  // Motivo: Criar efeito visual de impacto na posição especificada
  'particles:hit': { position: { x: number; y: number; z: number } };
  
  // ========== SCENE EVENTS ==========
  // Emitido por entidades para adicionar objetos 3D à cena
  // Motivo: Desacoplar entidades do sistema de renderização
  'scene:add-object': { object: any };
  
  // Emitido por entidades para remover objetos 3D da cena
  // Motivo: Limpeza automática quando entidades são destruídas
  'scene:remove-object': { object: any };

  // ========== RENDERER EVENTS ==========
  // Emitido em: UISystem.ts:81 para registrar cena de UI
  // Motivo: Sistema de UI precisa registrar sua cena separada para overlay
  'renderer:register-ui-scene': { scene: any; camera: any };

  // ========== DEBUG EVENTS ==========
  // Emitido em: DebugSystem.ts para alternar modo god
  // Motivo: Player precisa saber quando god mode está ativo
  'debug:god-mode-toggle': { enabled: boolean };
  
  // Emitido em: DebugSystem.ts para mostrar/ocultar colisões
  // Motivo: Entidades precisam saber quando mostrar visualização de colisão
  'debug:collision-visibility-toggle': { visible: boolean };
  
  // Emitido em: DebugSystem.ts para alterar escala de tempo
  // Motivo: Game loop precisa saber qual multiplicador aplicar
  'debug:time-scale-change': { timeScale: number };
  
  // Emitido em: DebugSystem.ts para atualizar dados debug
  // Motivo: Sistema de debug atualizar display de informações
  'debug:update': { [key: string]: any };
  
  // Emitido em: DebugSystem.ts quando visibilidade do debug muda
  // Motivo: Outros sistemas podem reagir ao debug sendo ligado/desligado
  'debug:toggled': { visible: boolean };

  // Emitido em: shared config quando tamanho do player muda
  // Motivo: Player precisa ajustar seu tamanho dinamicamente
  'player:size-changed': { newSize: number };
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
    'debug:update',
    'player:health-changed',
    'player:ammo-changed',
    'player:score-changed',
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
