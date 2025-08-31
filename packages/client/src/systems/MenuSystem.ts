/**
 * MenuSystem - Sistema de interface para menus do jogo
 * Gerencia telas de menu principal, game over e pause
 */

import { EventBus } from '../core/EventBus';
import { GameStats } from './GameStateManager';
import { PlayerSkill, SKILLS_CONFIG, SKILL_RARITY_MAP } from '@spaceshooter/shared';

export class MenuSystem {
  private container: HTMLElement;
  private eventBus: EventBus;
  private playerSkills: PlayerSkill[] = [];

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
      // Reset skills on game start
      this.playerSkills = [];
    });

    this.eventBus.on('game:resumed', () => {
      this.hideAllMenus();
    });

    this.eventBus.on('player:skills-updated', (data: { skills: PlayerSkill[] }) => {
      this.playerSkills = data.skills || [];
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
    const abilitiesGridHTML = this.generateAbilitiesGrid();
    
    this.container.innerHTML = `
      <div class="menu-screen" id="pause-menu">
        <div class="menu-content">
          <h1 class="pause-title">PAUSADO</h1>
          ${abilitiesGridHTML}
          <div class="menu-buttons">
            <button class="menu-button" id="resume-button">Continuar</button>
            <button class="menu-button secondary" id="menu-button">Menu Principal</button>
          </div>
        </div>
      </div>
    `;

    this.container.style.display = 'flex';
    this.setupPauseEvents();
    this.setupAbilityTooltips();
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

      /* Abilities Section Styles */
      .abilities-section {
        margin: 20px 0;
        text-align: center;
      }

      .abilities-title {
        color: #00ffff;
        font-size: 1.2em;
        margin: 0 0 15px 0;
        text-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
      }

      .abilities-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(50px, 55px));
        gap: 5px;
        max-width: 400px;
        margin: 0 auto;
      }

      .ability-item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: transform 0.2s ease;
      }

      .ability-item:hover {
        transform: scale(1.1);
      }

      .ability-icon {
        width: 50px;
        height: 50px;
        border: 3px solid #3fa7ff;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5em;
        background: rgba(0, 20, 40, 0.8);
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        margin-bottom: 5px;
        position: relative;
      }

      .ability-level {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ff4444;
        color: white;
        font-size: 0.5em;
        font-weight: bold;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #fff;
        z-index: 10;
      }

      .abilities-empty {
        color: #888;
        font-style: italic;
        line-height: 1.6;
      }

      .abilities-empty p {
        margin: 8px 0;
      }

      /* Tooltip Styles */
      .ability-tooltip {
        position: fixed;
        background: rgba(0, 20, 40, 0.95);
        border: 2px solid #00ffff;
        border-radius: 8px;
        padding: 12px;
        color: white;
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
        max-width: 250px;
        z-index: 2000;
        display: none;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
      }

      .tooltip-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .tooltip-icon {
        font-size: 1.2em;
      }

      .tooltip-name {
        font-weight: bold;
        color: #00ffff;
        flex: 1;
      }

      .tooltip-level {
        background: #ff4444;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.8em;
      }

      .tooltip-rarity {
        font-weight: bold;
        font-size: 0.8em;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }

      .tooltip-description {
        color: #ccc;
        line-height: 1.4;
        margin-bottom: 8px;
      }

      .tooltip-effect {
        color: #88ff88;
        line-height: 1.4;
        font-size: 0.85em;
      }

      /* Mobile Responsive for Abilities */
      @media (max-width: 600px) {
        .abilities-grid {
          grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
          gap: 12px;
          max-width: 300px;
        }

        .ability-icon {
          width: 45px;
          height: 45px;
          font-size: 1.3em;
        }

        .ability-level {
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          font-size: 0.7em;
        }

        .ability-tooltip {
          font-size: 0.8em;
          max-width: 200px;
          padding: 10px;
        }
      }

      @media (max-width: 400px) {
        .abilities-grid {
          grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
          gap: 10px;
          max-width: 250px;
        }

        .ability-icon {
          width: 40px;
          height: 40px;
          font-size: 1.1em;
        }

        .ability-level {
          top: -5px;
          right: -5px;
          width: 16px;
          height: 16px;
          font-size: 0.6em;
        }
      }

      /* Mobile landscape - specifically for abilities grid */
      @media (orientation: landscape) and (max-height: 500px) {
        #menu-container {
          padding: 5px;
          overflow-y: auto;
          align-items: flex-start;
          padding-top: 10px;
        }

        .menu-content {
          min-width: 90%;
          max-width: none;
          padding: 10px;
          margin: auto;
          max-height: 90vh;
          overflow-y: auto;
        }

        .game-title, .game-over-title, .pause-title {
          font-size: 1.4em;
          margin: 5px 0 10px 0;
          line-height: 1.1;
        }

        .abilities-section h3 {
          margin: 5px 0 8px 0;
          font-size: 1em;
        }

        .abilities-grid {
          grid-template-columns: repeat(auto-fit, minmax(35px, 40px));
          gap: 6px;
          max-width: 320px;
          margin: 0 auto 10px auto;
        }

        .ability-icon {
          width: 35px;
          height: 35px;
          font-size: 1em;
          border-radius: 6px;
          border-width: 2px;
          margin-bottom: 3px;
        }

        .ability-level {
          top: -4px;
          right: -4px;
          width: 14px;
          height: 14px;
          font-size: 0.55em;
          border-width: 1px;
        }

        .menu-buttons {
          gap: 8px;
          margin-top: 10px;
        }

        .menu-button {
          font-size: 0.9em;
          padding: 8px 15px;
          min-height: 36px;
        }

        .stats-container {
          margin: 8px 0;
        }

        .stat-item {
          margin: 4px 0;
          padding: 4px 0;
          font-size: 0.8em;
        }

        .ability-tooltip {
          font-size: 0.75em;
          max-width: 200px;
          padding: 8px;
          border-radius: 6px;
        }

        .tooltip-header {
          font-size: 0.85em;
          margin-bottom: 4px;
        }

        .tooltip-description {
          font-size: 0.8em;
          line-height: 1.2;
        }
      }

      /* Extra narrow landscape (phones rotated) */
      @media (orientation: landscape) and (max-height: 400px) {
        .abilities-grid {
          grid-template-columns: repeat(auto-fit, minmax(30px, 35px));
          gap: 4px;
          max-width: 280px;
        }

        .ability-icon {
          width: 30px;
          height: 30px;
          font-size: 0.9em;
          border-radius: 5px;
          margin-bottom: 2px;
        }

        .ability-level {
          top: -3px;
          right: -3px;
          width: 12px;
          height: 12px;
          font-size: 0.5em;
        }

        .game-title, .game-over-title, .pause-title {
          font-size: 1.2em;
          margin: 3px 0 8px 0;
        }

        .abilities-section h3 {
          margin: 3px 0 5px 0;
          font-size: 0.9em;
        }

        .menu-button {
          font-size: 0.8em;
          padding: 6px 12px;
          min-height: 32px;
        }

        .menu-buttons {
          gap: 6px;
          margin-top: 8px;
        }

        .ability-tooltip {
          font-size: 0.7em;
          max-width: 180px;
          padding: 6px;
          border-radius: 4px;
          border-width: 1px;
        }

        .tooltip-header {
          font-size: 0.8em;
          margin-bottom: 3px;
        }

        .tooltip-description {
          font-size: 0.75em;
          line-height: 1.1;
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
   * Gera o HTML da grade de habilidades
   */
  private generateAbilitiesGrid(): string {
    if (this.playerSkills.length === 0) {
      return `
        <div class="abilities-section">
          <h3 class="abilities-title">Habilidades</h3>
          <div class="abilities-empty">
            <p>Nenhuma habilidade desbloqueada ainda.</p>
            <p>Destrua inimigos para ganhar XP e subir de nível!</p>
          </div>
        </div>
      `;
    }

    const skillsHTML = this.playerSkills.map(skill => {
      const config = SKILLS_CONFIG[skill.type];
      const rarity = SKILL_RARITY_MAP[skill.type] || 'rara';
      const rarityColors = {
        'rara': '#3fa7ff',
        'epica': '#b86cff', 
        'lendaria': '#ffd700'
      };
      const rarityColor = rarityColors[rarity];
      
      return `
        <div class="ability-item" data-skill-type="${skill.type}">
          <div class="ability-icon" style="border-color: ${rarityColor};">
            ${config.icon || '⭐'}
            <div class="ability-level">${skill.level}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="abilities-section">
        <h3 class="abilities-title">Habilidades Ativas</h3>
        <div class="abilities-grid">
          ${skillsHTML}
        </div>
      </div>
    `;
  }

  /**
   * Configura tooltips para as habilidades
   */
  private setupAbilityTooltips(): void {
    const abilityItems = document.querySelectorAll('.ability-item');
    const tooltip = this.createTooltip();
    
    abilityItems.forEach(item => {
      const skillType = item.getAttribute('data-skill-type') as keyof typeof SKILLS_CONFIG;
      if (!skillType) return;

      const skill = this.playerSkills.find(s => s.type === skillType);
      if (!skill) return;

      const config = SKILLS_CONFIG[skillType];
      const rarity = SKILL_RARITY_MAP[skillType];
      const effect = config.effects[skill.level];
      
      const showTooltip = (e: Event) => {
        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        
        tooltip.innerHTML = `
          <div class="tooltip-header">
            <span class="tooltip-icon">${config.icon || '⭐'}</span>
            <span class="tooltip-name">${config.name}</span>
            <span class="tooltip-level">Nível ${skill.level}</span>
          </div>
          <div class="tooltip-rarity" style="color: ${this.getRarityColor(rarity)};">
            ${this.getRarityLabel(rarity)}
          </div>
          <div class="tooltip-description">
            ${config.description}
          </div>
          <div class="tooltip-effect">
            <strong>Efeito atual:</strong> ${effect?.description || 'N/A'}
          </div>
        `;
        
        tooltip.style.display = 'block';
        
        // Calculate initial position
        let left = rect.left + rect.width / 2;
        let top = rect.top - 10;
        let transformX = '-50%';
        let transformY = '-100%';
        
        // Check viewport bounds and adjust position
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Horizontal bounds checking
        if (left - tooltipRect.width / 2 < 10) {
          // Too far left, align to left edge
          left = rect.left;
          transformX = '0%';
        } else if (left + tooltipRect.width / 2 > viewportWidth - 10) {
          // Too far right, align to right edge
          left = rect.right;
          transformX = '-100%';
        }
        
        // Vertical bounds checking (especially important for landscape)
        if (rect.top < tooltipRect.height + 20) {
          // Not enough space above, show below
          top = rect.bottom + 10;
          transformY = '0%';
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.transform = `translate(${transformX}, ${transformY})`;
      };
      
      const hideTooltip = () => {
        tooltip.style.display = 'none';
      };

      // Desktop
      item.addEventListener('mouseenter', showTooltip);
      item.addEventListener('mouseleave', hideTooltip);
      
      // Mobile
      item.addEventListener('touchstart', (e) => {
        e.preventDefault();
        showTooltip(e);
        setTimeout(hideTooltip, 3000);
      });
    });
  }

  /**
   * Cria elemento tooltip
   */
  private createTooltip(): HTMLElement {
    let tooltip = document.getElementById('ability-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'ability-tooltip';
      tooltip.className = 'ability-tooltip';
      document.body.appendChild(tooltip);
    }
    return tooltip;
  }

  /**
   * Retorna a cor da raridade
   */
  private getRarityColor(rarity: string): string {
    const colors = {
      'rara': '#3fa7ff',
      'epica': '#b86cff',
      'lendaria': '#ffd700'
    };
    return colors[rarity as keyof typeof colors] || '#fff';
  }

  /**
   * Retorna o label da raridade
   */
  private getRarityLabel(rarity: string): string {
    const labels = {
      'rara': 'Rara',
      'epica': 'Épica', 
      'lendaria': 'Lendária'
    };
    return labels[rarity as keyof typeof labels] || 'Comum';
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