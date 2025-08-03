/**
 * MenuSystem - Sistema de interface para menus do jogo
 * Gerencia telas de menu principal, game over e pause
 */

import { GameStats } from './GameStateManager';

export interface MenuCallbacks {
  onStartGame?: () => void;
  onResumeGame?: () => void;
  onReturnToMenu?: () => void;
  onRestartGame?: () => void;
}

export class MenuSystem {
  private container: HTMLElement;
  private callbacks: MenuCallbacks = {};

  constructor() {
    this.container = this.createContainer();
    document.body.appendChild(this.container);
    this.setupStyles();
  }

  /**
   * Define callbacks para ações do menu
   */
  setCallbacks(callbacks: MenuCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Mostra o menu principal
   */
  showMainMenu(): void {
    this.container.innerHTML = `
      <div class="menu-screen" id="main-menu">
        <div class="menu-content">
          <h1 class="game-title">SPACE SHOOTER</h1>
          <div class="menu-buttons">
            <button class="menu-button" id="start-button">Iniciar Jogo</button>
            <button class="menu-button" id="controls-button">Controles</button>
          </div>
          <div class="controls-info" id="controls-info" style="display: none;">
            <h3>Controles:</h3>
            <p><strong>WASD</strong> - Movimento</p>
            <p><strong>Espaço</strong> - Atirar</p>
            <p><strong>P</strong> - Pausar</p>
          </div>
        </div>
      </div>
    `;

    this.container.style.display = 'flex';
    this.setupMainMenuEvents();
  }

  /**
   * Mostra a tela de game over
   */
  showGameOverScreen(stats: GameStats): void {
    const timeFormatted = this.formatTime(stats.timeAlive);
    
    this.container.innerHTML = `
      <div class="menu-screen" id="game-over">
        <div class="menu-content">
          <h1 class="game-over-title">GAME OVER</h1>
          <div class="stats-container">
            <div class="stat-item">
              <span class="stat-label">Pontuação Final:</span>
              <span class="stat-value">${stats.score}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Tempo Vivo:</span>
              <span class="stat-value">${timeFormatted}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Inimigos Destruídos:</span>
              <span class="stat-value">${stats.enemiesDestroyed}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Tiros Disparados:</span>
              <span class="stat-value">${stats.shotsFired}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Precisão:</span>
              <span class="stat-value">${stats.accuracy.toFixed(1)}%</span>
            </div>
          </div>
          <div class="menu-buttons">
            <button class="menu-button" id="restart-button">Jogar Novamente</button>
            <button class="menu-button secondary" id="menu-button">Menu Principal</button>
          </div>
        </div>
      </div>
    `;

    this.container.style.display = 'flex';
    this.setupGameOverEvents();
  }

  /**
   * Mostra a tela de pause
   */
  showPauseScreen(): void {
    this.container.innerHTML = `
      <div class="menu-screen" id="pause-menu">
        <div class="menu-content">
          <h1 class="pause-title">PAUSADO</h1>
          <div class="menu-buttons">
            <button class="menu-button" id="resume-button">Continuar</button>
            <button class="menu-button secondary" id="menu-button">Menu Principal</button>
          </div>
        </div>
      </div>
    `;

    this.container.style.display = 'flex';
    this.setupPauseEvents();
  }

  /**
   * Esconde todos os menus
   */
  hideAllMenus(): void {
    this.container.style.display = 'none';
  }

  /**
   * Cria o container principal
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'menu-container';
    return container;
  }

  /**
   * Configura os estilos CSS
   */
  private setupStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #menu-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: 'Courier New', monospace;
      }

      .menu-screen {
        text-align: center;
        color: white;
      }

      .menu-content {
        background: rgba(0, 20, 40, 0.8);
        border: 2px solid #00ffff;
        border-radius: 10px;
        padding: 40px;
        min-width: 400px;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
      }

      .game-title {
        font-size: 3em;
        margin: 0 0 30px 0;
        color: #00ffff;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        letter-spacing: 3px;
      }

      .game-over-title {
        font-size: 2.5em;
        margin: 0 0 30px 0;
        color: #ff4444;
        text-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
        letter-spacing: 2px;
      }

      .pause-title {
        font-size: 2.5em;
        margin: 0 0 30px 0;
        color: #ffff44;
        text-shadow: 0 0 10px rgba(255, 255, 68, 0.5);
        letter-spacing: 2px;
      }

      .menu-buttons {
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin-top: 30px;
      }

      .menu-button {
        background: linear-gradient(45deg, #004466, #006699);
        border: 2px solid #00ffff;
        color: #00ffff;
        padding: 15px 30px;
        font-size: 1.2em;
        font-family: 'Courier New', monospace;
        cursor: pointer;
        border-radius: 5px;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .menu-button:hover {
        background: linear-gradient(45deg, #006699, #0099cc);
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
        transform: translateY(-2px);
      }

      .menu-button.secondary {
        background: linear-gradient(45deg, #333, #555);
        border-color: #888;
        color: #ccc;
      }

      .menu-button.secondary:hover {
        background: linear-gradient(45deg, #555, #777);
        box-shadow: 0 0 15px rgba(200, 200, 200, 0.3);
      }

      .stats-container {
        margin: 20px 0;
        text-align: left;
      }

      .stat-item {
        display: flex;
        justify-content: space-between;
        margin: 10px 0;
        padding: 8px 0;
        border-bottom: 1px solid rgba(0, 255, 255, 0.2);
      }

      .stat-label {
        color: #88ccff;
      }

      .stat-value {
        color: #00ffff;
        font-weight: bold;
      }

      .controls-info {
        margin-top: 20px;
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
        border: 1px solid #00ffff;
      }

      .controls-info h3 {
        color: #00ffff;
        margin: 0 0 15px 0;
      }

      .controls-info p {
        margin: 8px 0;
        color: #cccccc;
      }

      @media (max-width: 600px) {
        .menu-content {
          min-width: 90%;
          padding: 20px;
        }
        
        .game-title {
          font-size: 2em;
        }
        
        .menu-button {
          font-size: 1em;
          padding: 12px 20px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Configura eventos do menu principal
   */
  private setupMainMenuEvents(): void {
    const startButton = document.getElementById('start-button');
    const controlsButton = document.getElementById('controls-button');
    const controlsInfo = document.getElementById('controls-info');

    if (startButton) {
      startButton.addEventListener('click', () => {
        this.hideAllMenus();
        this.callbacks.onStartGame?.();
      });
    }

    if (controlsButton && controlsInfo) {
      controlsButton.addEventListener('click', () => {
        const isVisible = controlsInfo.style.display !== 'none';
        controlsInfo.style.display = isVisible ? 'none' : 'block';
        controlsButton.textContent = isVisible ? 'Controles' : 'Ocultar';
      });
    }
  }

  /**
   * Configura eventos da tela de game over
   */
  private setupGameOverEvents(): void {
    const restartButton = document.getElementById('restart-button');
    const menuButton = document.getElementById('menu-button');

    if (restartButton) {
      restartButton.addEventListener('click', () => {
        this.hideAllMenus();
        this.callbacks.onRestartGame?.();
      });
    }

    if (menuButton) {
      menuButton.addEventListener('click', () => {
        this.callbacks.onReturnToMenu?.();
      });
    }
  }

  /**
   * Configura eventos da tela de pause
   */
  private setupPauseEvents(): void {
    const resumeButton = document.getElementById('resume-button');
    const menuButton = document.getElementById('menu-button');

    if (resumeButton) {
      resumeButton.addEventListener('click', () => {
        this.hideAllMenus();
        this.callbacks.onResumeGame?.();
      });
    }

    if (menuButton) {
      menuButton.addEventListener('click', () => {
        this.callbacks.onReturnToMenu?.();
      });
    }
  }

  /**
   * Formata tempo em mm:ss
   */
  private formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}