/**
 * MenuSystem - Sistema de interface para menus do jogo
 * Gerencia telas de menu principal, game over e pause
 */

import { EventBus } from '../core/EventBus';
import { GameStats } from './GameStateManager';

export class MenuSystem {
  private container: HTMLElement;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
    this.container = this.createContainer();
    document.body.appendChild(this.container);
    this.setupStyles();
  }

  private setupEventListeners(): void {
    this.eventBus.on('renderer:ready', () => {
      this.eventBus.emit('menu:ready', {});
    });

    this.eventBus.on('game:main', () => {
      this.showMainMenu();
    });

    this.eventBus.on('game:over', (data) => {
      this.showGameOverScreen(data.stats);
    });

    this.eventBus.on('game:paused', () => {
      this.showPauseScreen();
    });

    this.eventBus.on('game:started', () => {
      this.hideAllMenus();
    });

    this.eventBus.on('game:resumed', () => {
      this.hideAllMenus();
    });
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
              <span class="stat-label">Inimigos Escaparam:</span>
              <span class="stat-value">${stats.enemiesEscaped}</span>
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
        box-sizing: border-box;
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
        max-width: 90vw;
        max-height: 95vh;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
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
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .menu-button:hover, .menu-button:active {
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

      /* Mobile landscape and small tablets */
      @media (max-width: 768px) and (min-height: 500px) {
        .menu-content {
          min-width: 85%;
          max-width: 500px;
          padding: 25px;
        }
        
        .game-title, .game-over-title, .pause-title {
          font-size: 2.2em;
          margin-bottom: 25px;
        }
        
        .menu-button {
          font-size: 1.1em;
          padding: 18px 25px;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .menu-buttons {
          gap: 18px;
        }
      }

      /* Mobile portrait - compact layout */
      @media (max-width: 600px) and (max-height: 900px) {
        #menu-container {
          padding: 10px;
          overflow-y: auto;
        }
        
        .menu-content {
          min-width: 95%;
          max-width: none;
          padding: 15px;
          margin: auto;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .game-title, .game-over-title, .pause-title {
          font-size: 1.8em;
          margin: 0 0 20px 0;
          line-height: 1.2;
        }
        
        .menu-button {
          font-size: 1em;
          padding: 15px 20px;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .menu-buttons {
          gap: 15px;
          margin-top: 20px;
        }
        
        .stats-container {
          margin: 15px 0;
        }
        
        .stat-item {
          margin: 8px 0;
          padding: 6px 0;
          font-size: 0.9em;
        }
        
        .controls-info {
          margin-top: 15px;
          padding: 15px;
          font-size: 0.9em;
        }
        
        .controls-info p {
          margin: 6px 0;
        }
      }

      /* Portrait orientation specific */
      @media (orientation: portrait) and (max-width: 600px) {
        #menu-container {
          align-items: flex-start;
          padding-top: 5vh;
        }
        
        .menu-content {
          min-width: 95%;
          padding: 20px 15px;
          margin: 0 auto;
          justify-content: flex-start;
        }
        
        .game-title, .game-over-title, .pause-title {
          font-size: 1.8em;
          margin: 10px 0 20px 0;
        }
      }

      /* Very small portrait screens */
      @media (max-width: 400px), (max-height: 600px) {
        #menu-container {
          padding: 5px;
          align-items: flex-start;
          padding-top: 2vh;
        }
        
        .menu-content {
          padding: 15px 10px;
          min-width: 98%;
          border-radius: 8px;
          margin: 0;
        }
        
        .game-title, .game-over-title, .pause-title {
          font-size: 1.4em;
          margin: 5px 0 15px 0;
          line-height: 1.1;
        }
        
        .menu-button {
          font-size: 0.9em;
          padding: 12px 16px;
          min-height: 42px;
          border-radius: 4px;
        }
        
        .menu-buttons {
          gap: 10px;
          margin-top: 15px;
        }
        
        .stat-item {
          font-size: 0.8em;
          margin: 5px 0;
          padding: 3px 0;
        }
        
        .stats-container {
          margin: 10px 0;
        }
        
        .controls-info {
          padding: 10px;
          margin-top: 10px;
          font-size: 0.8em;
        }
        
        .controls-info p {
          margin: 4px 0;
        }
      }
      
      /* Extra small screens or very short screens */
      @media (max-height: 500px), (max-width: 350px) {
        .menu-content {
          padding: 8px;
          max-height: 98vh;
          overflow-y: auto;
        }
        
        .game-title, .game-over-title, .pause-title {
          font-size: 1.2em;
          margin: 5px 0 10px 0;
        }
        
        .menu-button {
          font-size: 0.85em;
          padding: 10px 12px;
          min-height: 38px;
        }
        
        .menu-buttons {
          gap: 8px;
          margin-top: 10px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Adiciona evento que funciona em mobile e desktop
   */
  private addButtonEvent(button: HTMLElement, callback: () => void): void {
    // Prevenir multiple events
    let eventFired = false;
    
    const fireEvent = () => {
      if (eventFired) return;
      eventFired = true;
      callback();
      // Reset after a short delay
      setTimeout(() => {
        eventFired = false;
      }, 300);
    };

    // Desktop
    button.addEventListener('click', fireEvent);
    
    // Mobile
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      fireEvent();
    });
  }

  /**
   * Configura eventos do menu principal
   */
  private setupMainMenuEvents(): void {
    const startButton = document.getElementById('start-button');
    const controlsButton = document.getElementById('controls-button');
    const controlsInfo = document.getElementById('controls-info');

    if (startButton) {
      this.addButtonEvent(startButton, () => {
        this.hideAllMenus();
        this.eventBus.emit('menu:click', {
          type: 'main',
          action: 'start'
        });
      });
    }

    if (controlsButton && controlsInfo) {
      this.addButtonEvent(controlsButton, () => {
        const isVisible = controlsInfo.style.display !== 'none';
        controlsInfo.style.display = isVisible ? 'none' : 'block';
        controlsButton.textContent = isVisible ? 'Controles' : 'Ocultar';

        this.eventBus.emit('menu:click', {
          type: 'main',
          action: 'toggleControls'
        });
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
      this.addButtonEvent(restartButton, () => {
        console.log('🔄 Restart button clicked/touched');
        this.eventBus.emit('menu:click', {
          type: 'gameOver',
          action: 'restart'
        });
      });
    }

    if (menuButton) {
      this.addButtonEvent(menuButton, () => {
        console.log('🏠 Menu button clicked/touched');
        this.eventBus.emit('menu:click', {
          type: 'gameOver',
          action: 'exit'
        });
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
      this.addButtonEvent(resumeButton, () => {
        console.log('▶️ Resume button clicked/touched');
        this.hideAllMenus();
        this.eventBus.emit('menu:click', {
          type: 'pause',
          action: 'resume',
        });
      });
    }

    if (menuButton) {
      this.addButtonEvent(menuButton, () => {
        console.log('🏠 Pause menu button clicked/touched');
        this.eventBus.emit('menu:click', {
          type: 'pause',
          action: 'exit',
        });
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