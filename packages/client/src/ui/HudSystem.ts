import { EventBus } from '../core/EventBus';

/**
 * Sistema de HUD em HTML/CSS
 * Gerencia os elementos da interface do usuário overlay
 */
export class HudSystem {
  // Sempre resetar o estado de pausa ao iniciar novo jogo
  private setupPauseResetOnNewGame() {
    this.eventBus.on('game:started', () => {
      this.gameState.isPaused = false;
      this.updatePauseButton();
    });
  }
  private eventBus: EventBus;
  private elements: {
    levelText: HTMLElement | null;
    levelProgressFill: HTMLElement | null;
    ammoCount: HTMLElement | null;
    scoreCount: HTMLElement | null;
    pauseButton: HTMLElement | null;
    fullscreenButton: HTMLElement | null;
  };
  
  private gameState = {
    level: 1,
    experience: 0,
    experienceToNext: 100,
    ammo: 30,
    maxAmmo: 30,
    score: 0,
    isPaused: false
  };

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    
    this.elements = {
      levelText: document.getElementById('level-text'),
      levelProgressFill: document.getElementById('level-progress-fill'),
      ammoCount: document.getElementById('ammo-count'),
      scoreCount: document.getElementById('score-count'),
      pauseButton: document.getElementById('pause-notch'),
      fullscreenButton: document.getElementById('fullscreen-notch')
    };

    this.setupEventListeners();
    // Garante barra zerada ao iniciar
    if (this.elements.levelProgressFill) {
      this.elements.levelProgressFill.style.width = '0%';
    }
    this.updateDisplay();
    this.setupPauseResetOnNewGame();
    // Escuta eventos de UI para manter sincronizado com UISystem
    this.eventBus.on('ui:update-level', (data: { level: number; currentXP: number; xpToNext: number; progress: number }) => {
      this.gameState.level = data.level;
      this.gameState.experience = data.currentXP;
      this.gameState.experienceToNext = data.xpToNext;
      this.updateLevelDisplay();
      // Sempre seta width diretamente, sem animar do valor anterior
      if (this.elements.levelProgressFill) {
        this.elements.levelProgressFill.style.width = `${Math.max(0, Math.min(data.progress, 100))}%`;
      }
    });
    console.log('🎮 HUD System initialized');
  }

  private setupEventListeners(): void {
    // Pause button
    this.elements.pauseButton?.addEventListener('click', () => {
      this.togglePause();
    });

    // Fullscreen button
    this.elements.fullscreenButton?.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }

  private toggleFullscreen(): void {
    const doc = document as any;
    const docEl = document.documentElement;
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
      } else if ((docEl as any).webkitRequestFullscreen) {
        (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).mozRequestFullScreen) {
        (docEl as any).mozRequestFullScreen();
      } else if ((docEl as any).msRequestFullscreen) {
        (docEl as any).msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  }
  // Keyboard shortcut para pause (ESC key)
  // (deve estar dentro de setupEventListeners, não após toggleFullscreen)

  private togglePause(): void {
    if (this.gameState.isPaused) {
      this.eventBus.emit('game:resume', {});
    } else {
      this.eventBus.emit('game:pause', {});
    }
  }

  private updateDisplay(): void {
    this.updateLevelDisplay();
    this.updateAmmoDisplay();
    this.updateScoreDisplay();
    this.updatePauseButton();
  }

  private updateLevelDisplay(): void {
    if (this.elements.levelText) {
      this.elements.levelText.textContent = `${this.gameState.level}`;
    }
  }

  // Removido: agora só o evento ui:update-level controla a barra de XP

  private updateAmmoDisplay(): void {
    if (this.elements.ammoCount) {
      this.elements.ammoCount.textContent = `${this.gameState.ammo}`;
      
      // Change color based on ammo level
      const ammoPercentage = this.gameState.ammo / this.gameState.maxAmmo;
      if (ammoPercentage <= 0.2) {
        this.elements.ammoCount.style.color = '#ff4444';
      } else if (ammoPercentage <= 0.5) {
        this.elements.ammoCount.style.color = '#ffaa44';
      } else {
        this.elements.ammoCount.style.color = 'white';
      }
    }
  }

  private updateScoreDisplay(): void {
    if (this.elements.scoreCount) {
      // Format score with commas for readability
      const formattedScore = this.gameState.score.toLocaleString();
      this.elements.scoreCount.textContent = formattedScore;
    }
  }

  private updatePauseButton(): void {
    if (this.elements.pauseButton) {
      if (this.gameState.isPaused) {
        this.elements.pauseButton.textContent = '▶️';
        this.elements.pauseButton.title = 'Resume Game';
      } else {
        this.elements.pauseButton.textContent = '⏸️';
        this.elements.pauseButton.title = 'Pause Game';
      }
    }
  }

  // Public methods for manual updates
  public setLevel(level: number): void {
  this.gameState.level = level;
  this.updateLevelDisplay();
  // updateLevelProgressDisplay removido, agora só ui:update-level controla a barra
  }

  public setExperience(current: number, toNext: number): void {
  this.gameState.experience = current;
  this.gameState.experienceToNext = toNext;
  // updateLevelProgressDisplay removido, agora só ui:update-level controla a barra
  }

  public setAmmo(current: number, max: number): void {
    this.gameState.ammo = current;
    this.gameState.maxAmmo = max;
    this.updateAmmoDisplay();
  }

  public setScore(score: number): void {
    this.gameState.score = score;
    this.updateScoreDisplay();
  }

  public getGameState() {
    return { ...this.gameState };
  }

  public dispose(): void {
    // Remove event listeners if needed
    console.log('🎮 HUD System disposed');
  }
}