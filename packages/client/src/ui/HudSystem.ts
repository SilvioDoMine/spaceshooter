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
    timerText: HTMLElement | null;
    bossBar: HTMLElement | null;
    bossText: HTMLElement | null;
    bossProgressFill: HTMLElement | null;
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

  private timerInterval: number | null = null;
  private timerSeconds: number = 0;
  private timerRunning: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.elements = {
      levelText: document.getElementById('level-text'),
      levelProgressFill: document.getElementById('level-progress-fill'),
      ammoCount: document.getElementById('ammo-count'),
      scoreCount: document.getElementById('score-count'),
      pauseButton: document.getElementById('pause-notch'),
      fullscreenButton: document.getElementById('fullscreen-notch'),
      timerText: document.getElementById('timer-text'),
      bossBar: document.getElementById('boss-bar'),
      bossText: document.getElementById('boss-text'),
      bossProgressFill: document.getElementById('boss-progress-fill')
    };

    // Timer: resetar e iniciar ao começar o jogo
    this.eventBus.on('game:started', () => {
      this.resetTimer();
      this.startTimer();
    });
    // Timer: pausar e continuar
    this.eventBus.on('game:paused', () => {
      this.pauseTimer();
    });
    this.eventBus.on('game:resumed', () => {
      this.resumeTimer();
    });
    // Timer: resetar ao terminar
    this.eventBus.on('game:over', () => {
      this.stopTimer();
      this.hideBossBar();
    });

    // Boss events
    this.eventBus.on('boss:spawned', (data: { bossId: string; boss: any }) => {
      this.showBossBar();
    });

    this.eventBus.on('boss:defeated', (data: { enemyId: string }) => {
      this.hideBossBar();
    });

    this.eventBus.on('boss:damage-taken', (data: { health: number; maxHealth: number }) => {
      this.updateBossBar(data.health, data.maxHealth);
    });

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

    // Escuta eventos de munição e score
    this.eventBus.on('ui:update-ammo', (data: { current: number; max: number }) => {
      this.setAmmo(data.current, data.max);
    });

    this.eventBus.on('ui:update-score', (data: { score: number }) => {
      this.setScore(data.score);
    });
    console.log('🎮 HUD System initialized');
  }

  // Timer HUD
  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerRunning = true;
    this.timerInterval = window.setInterval(() => {
      if (this.timerRunning) {
        this.timerSeconds++;
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  private pauseTimer() {
    this.timerRunning = false;
  }

  private resumeTimer() {
    this.timerRunning = true;
  }

  private stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.timerRunning = false;
  }

  private resetTimer() {
    this.stopTimer();
    this.timerSeconds = 0;
    this.updateTimerDisplay();
  }

  private updateTimerDisplay() {
    if (this.elements.timerText) {
      const min = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
      const sec = (this.timerSeconds % 60).toString().padStart(2, '0');
      this.elements.timerText.textContent = `${min}:${sec}`;
    }
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

    // Listen for fullscreen changes to update button icon
    this.setupFullscreenListeners();
  }

  private toggleFullscreen(): void {
    const doc = document as any;
    const docEl = document.documentElement as any;
    
    // Check if we're currently in fullscreen mode
    const isFullscreen = !!(
      doc.fullscreenElement || 
      doc.webkitFullscreenElement || 
      doc.webkitCurrentFullScreenElement || // Safari uses this property
      doc.mozFullScreenElement || 
      doc.msFullscreenElement
    );
    
    if (!isFullscreen) {
      // Enter fullscreen mode
      console.log('🖥️ Entering fullscreen mode...');
      
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err: any) => {
          console.error('Failed to enter fullscreen mode:', err);
        });
      } else if (docEl.webkitRequestFullscreen) {
        // Safari desktop
        docEl.webkitRequestFullscreen();
      } else if (docEl.webkitRequestFullScreen) {
        // Safari mobile (different capitalization)
        docEl.webkitRequestFullScreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      } else {
        console.warn('Fullscreen API not supported on this browser/device');
        alert('Fullscreen não suportado neste navegador');
        return;
      }
    } else {
      // Exit fullscreen mode
      console.log('🖥️ Exiting fullscreen mode...');
      
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch((err: any) => {
          console.error('Failed to exit fullscreen mode:', err);
        });
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.webkitCancelFullScreen) {
        // Safari mobile
        doc.webkitCancelFullScreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  }

  private setupFullscreenListeners(): void {
    const doc = document as any;
    
    // Listen to all possible fullscreen change events for cross-browser compatibility
    const fullscreenChangeEvents = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];
    
    const updateFullscreenButton = () => {
      const isFullscreen = !!(
        doc.fullscreenElement || 
        doc.webkitFullscreenElement || 
        doc.webkitCurrentFullScreenElement ||
        doc.mozFullScreenElement || 
        doc.msFullscreenElement
      );
      
      if (this.elements.fullscreenButton) {
        const iconElement = this.elements.fullscreenButton.querySelector('.notch-icon');
        if (iconElement) {
          if (isFullscreen) {
            iconElement.textContent = '⧉'; // Exit fullscreen icon (smaller window)
            this.elements.fullscreenButton.title = 'Sair da tela cheia';
          } else {
            iconElement.textContent = '⛶'; // Enter fullscreen icon (expand)
            this.elements.fullscreenButton.title = 'Tela cheia';
          }
        }
      }
      
      console.log(`🖥️ Fullscreen state changed: ${isFullscreen ? 'ON' : 'OFF'}`);
    };
    
    // Add listeners for all browser variations
    fullscreenChangeEvents.forEach(eventName => {
      document.addEventListener(eventName, updateFullscreenButton);
    });
    
    // Initial button state
    updateFullscreenButton();
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
        this.elements.pauseButton.textContent = '▶';
        this.elements.pauseButton.title = 'Resume Game';
      } else {
        this.elements.pauseButton.textContent = '❚❚';
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

  // Boss bar methods
  public showBossBar(): void {
    if (this.elements.bossBar) {
      this.elements.bossBar.style.display = 'block';
      console.log('👹 Boss health bar shown in HUD');
    }
  }

  public hideBossBar(): void {
    if (this.elements.bossBar) {
      this.elements.bossBar.style.display = 'none';
      console.log('👹 Boss health bar hidden from HUD');
    }
  }

  public updateBossBar(health: number, maxHealth: number): void {
    if (this.elements.bossProgressFill) {
      const healthPercentage = Math.max(0, health / maxHealth);
      this.elements.bossProgressFill.style.width = `${healthPercentage * 100}%`;
      console.log(`👹 Boss health updated: ${health}/${maxHealth} (${(healthPercentage * 100).toFixed(1)}%)`);
    }
  }

  public dispose(): void {
    // Remove event listeners if needed
    console.log('🎮 HUD System disposed');
  }
}