/**
 * GameStateManager - Gerencia os diferentes estados do jogo
 * (Menu, Playing, Paused, GameOver)
 */

export enum GameStateEnum {
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

export class GameStateManager {
  private currentState: GameStateEnum = GameStateEnum.MENU;
  private gameStats: GameStats = {
    score: 0,
    timeAlive: 0,
    enemiesDestroyed: 0,
    shotsFired: 0,
    accuracy: 0,
    enemiesEscaped: 0
  };
  private gameStartTime: number = 0;
  private stateChangeCallbacks: Map<GameStateEnum, (() => void)[]> = new Map();

  constructor() {
    // Inicializar callbacks vazios para cada estado
    Object.values(GameStateEnum).forEach(state => {
      this.stateChangeCallbacks.set(state as GameStateEnum, []);
    });
  }

  /**
   * Muda o estado do jogo
   */
  setState(newState: GameStateEnum): void {
    const oldState = this.currentState;
    this.currentState = newState;
    
    console.log(`Game state changed: ${oldState} -> ${newState}`);
    
    // Executar callbacks específicos do novo estado
    const callbacks = this.stateChangeCallbacks.get(newState) || [];
    callbacks.forEach(callback => callback());
    
    // Ações específicas por estado
    this.handleStateChange(newState, oldState);
  }

  /**
   * Retorna o estado atual
   */
  getState(): GameStateEnum {
    return this.currentState;
  }

  /**
   * Adiciona callback para mudança de estado
   */
  onStateChange(state: GameStateEnum, callback: () => void): void {
    const callbacks = this.stateChangeCallbacks.get(state) || [];
    callbacks.push(callback);
    this.stateChangeCallbacks.set(state, callbacks);
  }

  /**
   * Inicia um novo jogo
   */
  startNewGame(): void {
    this.resetGameStats();
    this.gameStartTime = Date.now();
    this.setState(GameStateEnum.PLAYING);
  }

  /**
   * Termina o jogo atual
   */
  endGame(): void {
    this.updateTimeAlive();
    this.calculateAccuracy();
    this.setState(GameStateEnum.GAME_OVER);
  }

  /**
   * Pausa o jogo
   */
  pauseGame(): void {
    if (this.currentState === GameStateEnum.PLAYING) {
      this.setState(GameStateEnum.PAUSED);
    }
  }

  /**
   * Resume o jogo
   */
  resumeGame(): void {
    if (this.currentState === GameStateEnum.PAUSED) {
      this.setState(GameStateEnum.PLAYING);
    }
  }

  /**
   * Volta ao menu principal
   */
  returnToMenu(): void {
    this.setState(GameStateEnum.MENU);
  }

  /**
   * Atualiza estatísticas do jogo
   */
  updateStats(updates: Partial<GameStats>): void {
    Object.assign(this.gameStats, updates);
  }

  /**
   * Incrementa estatísticas específicas
   */
  incrementStat(stat: keyof GameStats, amount: number = 1): void {
    if (typeof this.gameStats[stat] === 'number') {
      (this.gameStats[stat] as number) += amount;
    }
  }

  /**
   * Retorna as estatísticas atuais
   */
  getStats(): Readonly<GameStats> {
    return { ...this.gameStats };
  }

  /**
   * Verifica se o jogo está em execução
   */
  isPlaying(): boolean {
    return this.currentState === GameStateEnum.PLAYING;
  }

  /**
   * Verifica se o jogo está pausado
   */
  isPaused(): boolean {
    return this.currentState === GameStateEnum.PAUSED;
  }

  /**
   * Verifica se está no menu
   */
  isInMenu(): boolean {
    return this.currentState === GameStateEnum.MENU;
  }

  /**
   * Verifica se o jogo terminou
   */
  isGameOver(): boolean {
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
        break;
      
      case GameStateEnum.PLAYING:
        // Ações específicas para quando o jogo inicia
        if (oldState === GameStateEnum.MENU) {
          console.log('Game started!');
        } else if (oldState === GameStateEnum.PAUSED) {
          console.log('Game resumed!');
        }
        break;
      
      case GameStateEnum.PAUSED:
        console.log('Game paused');
        break;
      
      case GameStateEnum.GAME_OVER:
        console.log('Game over! Final stats:', this.gameStats);
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
}