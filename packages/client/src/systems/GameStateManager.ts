/**
 * GameStateManager - Gerencia os diferentes estados do jogo
 * (Menu, Playing, Paused, GameOver)
 */
import { Observer, Subject } from "@spaceshooter/shared";
import { EventBus } from "../core/EventBus";

export enum GameStateEnum {
  INIT = 'init',
  LOADING_ASSETS = 'loading_assets',
  READY = 'ready',
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over'
}

export interface GameStats {
  score: number;
  timeAlive: number;
  enemiesDestroyed: number;
  shotsFired: number;
  accuracy: number;
  enemiesEscaped: number;
}

export class GameStateManager implements Subject {
  private currentState: GameStateEnum = GameStateEnum.INIT;

  private gameStats: GameStats = {
    score: 0,
    timeAlive: 0,
    enemiesDestroyed: 0,
    shotsFired: 0,
    accuracy: 0,
    enemiesEscaped: 0
  };

  private gameStartTime: number = 0;

  /**
   * Lista de pessoas que estão ouvindo cada tipo de emissão de evento
   */
  private observers: Observer[] = [];

  /**
   * Map de callbacks para cada estado do jogo
   * Permite registrar funções que serão chamadas quando o estado mudar
   */
  private stateChangeCallbacks: Map<GameStateEnum, (() => void)[]> = new Map();

  /**
   * EventBus para comunicação entre sistemas
   * Pode ser usado para emitir eventos de estado do jogo
   */
  private eventBus: EventBus;

  private initializedSystems: Set<string> = new Set();

  constructor(eventBus: EventBus) {
    // Inicializar callbacks vazios para cada estado
    Object.values(GameStateEnum)
      .forEach(state => {
        this.stateChangeCallbacks.set(state as GameStateEnum, []);
      });
    
    this.eventBus = eventBus;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Escutando os eventos dos sistemas necessários para iniciar o jogo:
    this.eventBus.on('renderer:ready', () => this.systemInitialized('renderer'));
    this.eventBus.on('assets:ready', () => this.systemInitialized('assets'));
    this.eventBus.on('input:ready', () => this.systemInitialized('input'));
    this.eventBus.on('audio:ready', () => this.systemInitialized('audio'));
    this.eventBus.on('particles:ready', () => this.systemInitialized('particles'));
    this.eventBus.on('menu:ready', () => this.systemInitialized('menu'));
    this.eventBus.on('ui:ready', () => this.systemInitialized('ui'));

    this.eventBus.on('menu:click', (data) => this.handleMenuAction(data));
  
    this.eventBus.on('menu:opened', (data) => {
      console.log(`Menu opened: ${data.type}`);
    });

    // Eventos de controle do jogo
    this.eventBus.on('input:action', (data) => this.handleInputAction(data));

    this.eventBus.on('game:started', () => this.startNewGame());
    this.eventBus.on('game:paused', () => this.pauseGame());
    this.eventBus.on('game:resumed', () => this.resumeGame());
    // this.eventBus.on('game:over', () => this.endGame());
    this.eventBus.on('game:exit', () => {
      this.resetGameStats();
      this.returnToMenu();
    });
  }

  private systemInitialized(system: string): void {
    // Verifica se o sistema já foi inicializado
    if (this.initializedSystems.has(system)) {
      console.error(`System ${system} already initialized.`);
      return;
    }

    // Marca o sistema como inicializado
    this.initializedSystems.add(system);
    console.log(`System initialized: ${system}`);

    // Verifica se todos os sistemas necessários foram inicializados
    const requiredSystems = ['renderer', 'input', 'audio', 'particles', 'menu', 'ui', 'assets'];
    const allInitialized = requiredSystems.every(sys => this.initializedSystems.has(sys));

    if (! allInitialized) {
      return;
    }

    this.eventBus.emit('gameState:ready', {});

    this.setState(GameStateEnum.MENU);

    console.log('All systems initialized. Game is ready.');
  }

  /**
   * Muda o estado do jogo
   */
  public setState(newState: GameStateEnum): void {
    const oldState = this.currentState;
    this.currentState = newState;
    
    console.log(`Game state changed: ${oldState} -> ${newState}`);
    
    // Executar callbacks específicos do novo estado
    // const callbacks = this.stateChangeCallbacks.get(newState) || [];
    // callbacks.forEach(callback => callback());

    // Notificar observadores sobre a mudança de estado
    // this.notify();

    // Ações específicas por estado
    this.handleStateChange(newState, oldState);
  }

  /**
   * Retorna o estado atual
   */
  public getState(): GameStateEnum {
    return this.currentState;
  }

  /**
   * Adiciona callback para mudança de estado
   */
  public onStateChange(state: GameStateEnum, callback: () => void): void {
    const callbacks = this.stateChangeCallbacks.get(state) || [];
    callbacks.push(callback);
    this.stateChangeCallbacks.set(state, callbacks);
  }

  /**
   * Inicia um novo jogo
   */
  public startNewGame(): void {
    this.resetGameStats();
    this.gameStartTime = Date.now();
    this.setState(GameStateEnum.PLAYING);
  }

  /**
   * Termina o jogo atual
   */
  public endGame(): void {
    this.updateTimeAlive();
    this.calculateAccuracy();
    this.setState(GameStateEnum.GAME_OVER);
  }

  /**
   * Pausa o jogo
   */
  public pauseGame(): void {
    if (this.currentState === GameStateEnum.PLAYING) {
      this.setState(GameStateEnum.PAUSED);
    }
  }

  /**
   * Resume o jogo
   */
  public resumeGame(): void {
    if (this.currentState === GameStateEnum.PAUSED) {
      this.setState(GameStateEnum.PLAYING);
    }
  }

  /**
   * Volta ao menu principal
   */
  public returnToMenu(): void {
    this.setState(GameStateEnum.MENU);
  }

  /**
   * Atualiza estatísticas do jogo
   */
  public updateStats(updates: Partial<GameStats>): void {
    Object.assign(this.gameStats, updates);
  }

  /**
   * Incrementa estatísticas específicas
   */
  public incrementStat(stat: keyof GameStats, amount: number = 1): void {
    if (typeof this.gameStats[stat] === 'number') {
      (this.gameStats[stat] as number) += amount;
    }
  }

  /**
   * Retorna as estatísticas atuais
   */
  public getStats(): Readonly<GameStats> {
    return { ...this.gameStats };
  }

  /**
   * Verifica se o jogo está em execução
   */
  public isPlaying(): boolean {
    return this.currentState === GameStateEnum.PLAYING;
  }

  /**
   * Verifica se o jogo está pausado
   */
  public isPaused(): boolean {
    return this.currentState === GameStateEnum.PAUSED;
  }

  /**
   * Verifica se está no menu
   */
  public isInMenu(): boolean {
    return this.currentState === GameStateEnum.MENU;
  }

  /**
   * Verifica se o jogo terminou
   */
  public isGameOver(): boolean {
    return this.currentState === GameStateEnum.GAME_OVER;
  }

  /**
   * Reseta as estatísticas do jogo
   */
  private resetGameStats(): void {
    this.gameStats = {
      score: 0,
      timeAlive: 0,
      enemiesDestroyed: 0,
      shotsFired: 0,
      accuracy: 0,
      enemiesEscaped: 0
    };
  }

  /**
   * Atualiza o tempo de vida
   */
  private updateTimeAlive(): void {
    if (this.gameStartTime > 0) {
      this.gameStats.timeAlive = Date.now() - this.gameStartTime;
    }
  }

  /**
   * Calcula a precisão de tiro
   */
  private calculateAccuracy(): void {
    if (this.gameStats.shotsFired > 0) {
      this.gameStats.accuracy = (this.gameStats.enemiesDestroyed / this.gameStats.shotsFired) * 100;
    } else {
      this.gameStats.accuracy = 0;
    }
  }

  /**
   * Manipula mudanças de estado específicas
   */
  private handleStateChange(newState: GameStateEnum, oldState: GameStateEnum): void {
    switch (newState) {
      case GameStateEnum.MENU:
        // Limpar dados do jogo anterior se necessário
        this.resetGameStats();

        this.eventBus.emit('game:main', {});
        break;

      case GameStateEnum.PLAYING:
        // Ações específicas para quando o jogo inicia
        if (oldState === GameStateEnum.MENU) {
          console.log('Game started!');
        } else if (oldState === GameStateEnum.PAUSED) {
          
          // if (this.currentState !== GameStateEnum.PLAYING) {
            this.eventBus.emit('game:resumed', {});
          // }

          console.log('Game resumed!');
        }
        break;
      
      case GameStateEnum.PAUSED:
        console.log('Game paused');
        this.eventBus.emit('game:paused', {});
        break;
      
      case GameStateEnum.GAME_OVER:
        // Don't emit game:over here - let the Player emit it with correct stats
        console.log('Game state changed to GAME_OVER');
        break;
    }
  }

  /**
   * Formata o tempo em formato legível (mm:ss)
   */
  formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  public attach(observer: Observer): void {
    const alreadyExists = this.observers.includes(observer);

    if (alreadyExists) {
      return console.warn('Observer already attached:', observer);
    }

    console.log('Attaching observer:', observer);
    this.observers.push(observer);
  }

  public detach(observer: Observer): void {
    const index = this.observers.indexOf(observer);

    if (index === -1) {
      return console.warn('Observer not found:', observer);
    }

    console.log('Detaching observer:', observer);
    this.observers.splice(index, 1);
  }

  public notify(): void {
    console.log('Notifying observers on GameStateManager:', this.observers);
    this.observers.forEach(observer => observer.update(this));
  }

  private handleInputAction(data: { action: string; pressed: boolean }): void {
    switch (data.action) {
      case 'shoot':
        if (data.pressed && this.isPlaying()) {
          this.eventBus.emit('player:shot', {});
        }
        break;
      case 'pause':
        if (data.pressed) {
          if (this.isPlaying()) {
            this.pauseGame();
          } else if (this.isPaused()) {
            this.resumeGame();
          }
        }
        break;
      default:
        console.warn(`Unknown input action: ${data.action}`);
        return;
      }
  }

  private handleMenuAction(data: { type: string; action?: string }): void {
    switch (data.type) {
      case 'main':
        if (data.action === 'start') {
          this.eventBus.emit('game:started', { difficulty: 'normal' });
        } else if (data.action === 'exit') {
          this.returnToMenu();
        }
        break;
      case 'pause':
        if (data.action === 'resume') {
          // this.resumeGame();
          this.eventBus.emit('game:resumed', {});
        } else if (data.action === 'exit') {
          this.eventBus.emit('game:exit', {});
          // this.returnToMenu();
        }
        break;
      case 'gameOver':
        switch (data.action) {
          case 'restart':
            this.eventBus.emit('game:started', { difficulty: 'normal' });
            break;
          case 'exit':
            this.eventBus.emit('game:main', {});
            break;
          default:
            console.warn('Unknown game over action:', data.action);
        }
        break;
      default:
        console.warn('Unknown menu type:', data.type);
        return;
    }
  }
}
