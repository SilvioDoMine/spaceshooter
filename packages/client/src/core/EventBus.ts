import { GameStats } from "../systems/GameStateManager";
import { InputState } from "../systems/InputSystem";
import { JoystickInput } from "../systems/VirtualJoystickSystem";

export type GameEventMap = {
  // Emitido em: Enemy.ts ao spawnar um boss
  'boss:spawned': { bossId: string; boss: any; config?: any };
  // ========== BOSS EVENTS ==========
  // Emitido em: Enemy.ts ao derrotar um boss
  'boss:defeated': { enemyId: string };
  // Emitido em: Enemy.ts quando o boss toma dano
  'boss:damage-taken': { health: number; maxHealth: number };
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
  
  // Emitido em: XPOrbSystem.ts após configurar sistema de orbes de XP
  // Motivo: Sistema de orbes de XP deve estar pronto para criar orbes
  'xp-orbs:ready': {};
  
  // Emitido quando precisar limpar todos os orbes de XP
  // Motivo: Limpar orbes no game over, restart, etc.
  'xp-orbs:clear': {};
  
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
  
  // Emitido por: HudSystem quando botão de pause é clicado
  // Motivo: Pausar o jogo via HUD
  'game:pause': {};
  
  // Emitido por: HudSystem quando botão de resume é clicado
  // Motivo: Despausar o jogo via HUD
  'game:resume': {};
  
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
  
  // Emitido em: EntitySystem quando jogador ganha XP (via enemy destruction)
  // Motivo: Player precisa processar XP ganho
  'player:xp-gain': { xp: number };
  
  // Emitido em: XPOrbSystem quando orbe é coletado
  // Motivo: Player precisa processar XP ganho de orbes
  'player:gain-xp': { amount: number; position: { x: number; y: number; z: number } };
  
  // Emitido em: Player.ts quando posição do jogador muda
  // Motivo: XPOrbSystem precisa saber posição para coleta automática
  'player:position-changed': { position: { x: number; y: number; z: number } };
  
  // Emitido em: Player.ts quando vida do jogador muda
  // Motivo: UIManager atualizar barra de vida
  'player:health-changed': { current: number; max: number };
  
  // Emitido em: Player.ts quando munição do jogador muda  
  // Motivo: UIManager atualizar contador de munição
  'player:ammo-changed': { current: number; max: number };
  
  // Emitido em: Player.ts quando pontuação do jogador muda
  // Motivo: UIManager atualizar pontuação na tela
  'player:score-changed': { score: number };
  
  // Emitido em: Player.ts quando nível/XP do jogador muda
  // Motivo: UIManager atualizar barra de XP e nível na tela
  'player:level-changed': { level: number; currentXP?: number; xpToNext?: number; progress?: number };
  
  // Emitido em: Player.ts quando experiência do jogador muda
  // Motivo: HudSystem atualizar barra de experiência
  'player:experience-changed': { experience: number; experienceToNext: number };
  
  // Emitido em: Player.ts quando jogador sobe de nível
  // Motivo: Criar efeitos especiais e tocar som de level up
  'player:level-up': { oldLevel: number; newLevel: number; currentXP: number; skillOptions: any[] };
  
  // Emitido em: UISystem quando jogador seleciona uma skill
  // Motivo: Player precisa aplicar a skill selecionada
  'player:skill-selected': { skillType: string };
  
  // Emitido em: Player.ts quando skills do jogador são atualizadas
  // Motivo: MenuSystem precisa atualizar a exibição de habilidades no menu de pausa
  'player:skills-updated': { skills: any[] };

  // ========== WAVE SYSTEM EVENTS ==========
  // Emitido em: WaveSystem.ts quando o sistema de ondas inicia
  // Motivo: UI precisa mostrar timer e informações da onda
  'wave:started': { totalDuration: number };
  
  // Emitido em: WaveSystem.ts quando uma nova onda começa
  // Motivo: UI precisa atualizar informações da onda atual
  'wave:changed': { wave: any; gameTime: number };
  
  // Emitido em: WaveSystem.ts quando um boss aparece
  // Motivo: UI precisa mostrar aviso de boss e limpar inimigos
  'wave:boss-spawned': { boss: any; gameTime: number };
  
  // Emitido em: WaveSystem.ts para limpar todos os inimigos
  // Motivo: EntitySystem precisa remover inimigos quando boss aparece
  'wave:clear-enemies': {};
  
  // Emitido em: WaveSystem.ts quando um inimigo de onda é spawnado
  // Motivo: EntitySystem precisa rastrear inimigos da onda
  'wave:enemy-spawned': { enemy: any; config: any; waveDescription: string };

  // ========== SPAWN EFFECT EVENTS ==========
  // Emitido em: Enemy.ts quando solicita efeito de spawn
  // Motivo: SpawnEffectSystem precisa criar efeito de buraco negro
  'spawn:request-effect': { 
    position: { x: number; y: number; z: number }; 
    onComplete?: () => void; 
    id?: string 
  };
  
  // Emitido em: SpawnEffectSystem para limpar todos os efeitos
  // Motivo: Game cleanup ou mudança de estado
  'spawn:clear-effects': {};

  // ========== CAMERA EVENTS ==========
  // Emitido em: WaveSystem para obter informações da câmera
  // Motivo: Spawn de inimigos precisa da posição atual da câmera
  'camera:get-info': { 
    callback: (info: { position: { x: number; y: number; z: number }; viewportSize: { width: number; height: number } }) => void 
  };

  // ========== TIMER EVENTS ==========
  // Emitido em: GameTimer.ts a cada update do timer
  // Motivo: HudSystem precisa atualizar display do timer
  'game-timer:update': { gameTime: number; matchDuration: number; isGameTimerFrozen: boolean };
  
  // Emitido em: GameTimer.ts quando o timer inicia
  // Motivo: HudSystem precisa resetar display do timer
  'game-timer:started': { totalGameDuration: number };

  // ========== VICTORY EVENTS ==========
  // Emitido em: GameTimer.ts quando o jogador sobrevive 6 minutos
  // Motivo: GameStateManager precisa mostrar tela de vitória
  'game:victory': { gameTime: number; matchDuration: number };
  
  // Emitido em: Player.ts em resposta ao game:victory com stats reais
  // Motivo: MenuSystem precisa exibir estatísticas reais na tela de vitória
  'game:victory-stats': { stats: GameStats };

  // ========== ENEMY EVENTS ==========
  // Emitido em: Enemy.ts quando inimigo escapa
  // Motivo: EntitySystem aplicar penalidade ao jogador
  'enemy:escaped': { damage: number; enemyType: string; enemyId: string };
  
  // Emitido em: Enemy.ts quando inimigo é destruído
  // Motivo: EntitySystem dar pontos e XP ao jogador
  'enemy:destroyed': { points: number; xp: number; enemyType: string; enemyId: string; position: { x: number; y: number; z: number } };

  // Emitido em: Enemy.ts quando inimigo atira
  // Motivo: EntitySystem criar projétil do inimigo através do ProjectileSystem
  'entity:shoot': { 
    ownerId: string; 
    position: { x: number; y: number }; 
    velocity: { x: number; y: number }; 
    damage: number; 
    config: any 
  };

  // ========== COLLISION EVENTS ==========
  // Emitido em: Enemy.ts:117 para verificar colisão de inimigo
  // Motivo: Sistema de colisão verificar se inimigo colidiu com jogador
  'collision:check': { entityId: string; entityType: string; position: { x: number; y: number }; radius: number; damage: number; diesOnPlayerCollision?: boolean };
  
  // Emitido em: ProjectileSystem.ts:133 quando projétil pode colidir com inimigo
  // Motivo: Sistema de colisão verificar impacto entre projétil e inimigos
  'collision:projectile-enemy': { projectileId: string; position: { x: number; y: number }; damage: number; radius: number; noSkillTrigger?: boolean };
  
  // Emitido em: ProjectileSystem para continuous collision detection
  // Motivo: Verificar colisão ao longo do caminho para evitar tunneling
  'collision:projectile-enemy-continuous': { 
    projectileId: string; 
    startPosition: { x: number; y: number }; 
    endPosition: { x: number; y: number }; 
    damage: number; 
    radius: number; 
    noSkillTrigger?: boolean 
  };
  
  // Emitido em: ProjectileSystem para collision detection de projéteis de inimigos  
  // Motivo: Verificar colisão de projéteis de inimigos com player
  'collision:projectile-player': {
    projectileId: string;
    position: { x: number; y: number };
    damage: number;
    radius: number;
    ownerId: string;
  };

  // Emitido em: ProjectileSystem para continuous collision detection de projéteis de inimigos
  // Motivo: Verificar colisão de projéteis de inimigos com player ao longo do caminho
  'collision:projectile-player-continuous': {
    projectileId: string;
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
    damage: number;
    radius: number;
    ownerId: string;
  };
  
  // Emitido em: ProjectileSystem quando projétil acerta um alvo
  // Motivo: Alvo precisa processar dano recebido
  'projectile:hit': { targetId: string; damage: number };
  
  // Emitido em: PowerUp.ts:120 quando power-up pode colidir com jogador
  // Motivo: Sistema de colisão verificar se jogador coletou power-up
  'collision:powerup-player': { powerUpId: string; type: string; position: { x: number; y: number }; radius: number; effect: number };

  // ========== INPUT EVENTS ==========
  // Emitido em: InputSystem.ts:117,132 a cada tecla pressionada/solta
  // Motivo: Comunica ações do jogador para sistemas que precisam reagir
  'input:action': { action: keyof InputState; pressed: boolean };
  
  // Emitido em: VirtualJoystickSystem.ts durante interação com joystick virtual
  // Motivo: Permite controle de movimento em dispositivos móveis
  'joystick:input': JoystickInput;

  // ========== MENU EVENTS ==========
  // Emitido em: MenuSystem.ts:336,349,369,379,398,408 quando botão é clicado
  // Motivo: Navegar entre menus e executar ações do jogador
  'menu:click': { type: 'main' | 'pause' | 'gameOver' | 'victory' | 'settings'; action: string };
  
  // Eventos comentados no código - mantidos para compatibilidade futura
  'menu:opened': { type: 'main' | 'pause' | 'gameOver' | 'victory' | 'settings' };
  'menu:closed': { type: 'main' | 'pause' | 'gameOver' | 'victory' | 'settings' };

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
  
  // Emitido em: UIManager quando nível/XP do jogador muda
  // Motivo: Atualizar barra de XP e nível na tela
  'ui:update-level': { level: number; currentXP: number; xpToNext: number; progress: number };
  
  // Emitido em: UIManager quando jogador sobe de nível
  // Motivo: Executar efeito visual de level up
  'ui:level-up-effect': { oldLevel: number; newLevel: number; currentXP: number };
  
  // Emitido em: UIManager no reset do jogo
  // Motivo: Resetar toda a UI para estado inicial
  'ui:reset': {};
  
  // Emitido em: UIManager quando jogo termina
  // Motivo: Exibir tela de game over com estatísticas
  'ui:game-over': { finalScore: number; stats: any };
  
  // Emitido em: UIManager quando jogador precisa escolher skill
  // Motivo: Mostrar modal de seleção de skills
  'ui:show-skill-selection': { skillOptions: any[] };
  
  // Emitido em: UISystem quando skill é selecionada
  // Motivo: Fechar modal e aplicar skill
  'ui:skill-selected': { skillType: string };
  
  // Emitido em: Player quando level up inicia câmera lenta
  // Motivo: Reduzir timeScale progressivamente até parar
  'game:slow-motion': { duration: number; targetScale: number };
  
  // Emitido em: Game quando slow motion termina completamente
  // Motivo: Sinalizar que é hora de mostrar o modal de skills
  'game:slow-motion-complete': {};
  
  // Emitido em: UISystem quando modal de skills é exibido
  // Motivo: Pausar completamente o jogo
  'game:pause-for-skill-selection': {};
  
  // Emitido em: UISystem quando skill é selecionada
  // Motivo: Despausar e ativar invulnerabilidade temporária
  'game:resume-after-skill-selection': {};
  
  // Emitido em: Player quando precisa ficar invulnerável
  // Motivo: Ativar proteção temporária
  'player:set-invulnerable': { duration: number };
  
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
  
  // Emitido em: Player quando sobe de nível
  // Motivo: Criar efeito visual especial de level up
  'particles:level-up': { position: { x: number; y: number; z: number } };
  
  // Emitido para limpar todas as partículas
  // Motivo: Reset do sistema de partículas
  'particles:clear': {};
  
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
  
  // Emitido em: RenderingSystem.ts quando janela é redimensionada
  // Motivo: Outros sistemas precisam reagir a mudanças de viewport
  'renderer:resize': { width: number; height: number; aspect: number };

  // ========== DEBUG EVENTS ==========
  // Emitido em: DebugSystem.ts para alternar modo god
  // Motivo: Player precisa saber quando god mode está ativo
  'debug:god-mode-toggle': { enabled: boolean };
  'debug:infinite-ammo-toggle': { enabled: boolean };
  
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
  
  // Emitido em: DebugSystem.ts para mostrar/ocultar joystick virtual
  // Motivo: Permite debugar joystick no desktop
  'debug:joystick-toggle': { visible: boolean };

  // Emitido em: DebugSystem.ts quando visibilidade dos ranges é alterada
  // Motivo: Coordenação entre sistema de debug e indicadores de range
  'debug:range-visibility-changed': { showPlayerRange: boolean; showEnemyRanges: boolean };

  // Emitido em: shared config quando tamanho do player muda
  // Motivo: Player precisa ajustar seu tamanho dinamicamente
  'player:size-changed': { newSize: number };
  
  // Emitido quando o range do player muda
  // Motivo: RangeIndicator precisa ajustar o raio
  'player:range-changed': { range: number };
};

export class EventBus {
  private listeners: Map<keyof GameEventMap, Set<Function>> = new Map();
  private onceListeners: Map<keyof GameEventMap, Set<Function>> = new Map();

  private silencedEvents: Set<keyof GameEventMap> = new Set([
    'assets:ready',
    'audio:play',
    'particles:explosion',
    'particles:hit',
    'particles:level-up',
    'input:action',
    'scene:add-object',
    'scene:remove-object',
    'renderer:register-ui-scene',
    'collision:check',
    'collision:projectile-enemy',
    'collision:projectile-enemy-continuous',
    'collision:projectile-player',
    'collision:projectile-player-continuous',
    'collision:powerup-player',
    'entity:shoot',
    'debug:update',
    'player:health-changed',
    'player:ammo-changed',
    'player:score-changed',
    'player:level-changed',
    'player:position-changed',
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
