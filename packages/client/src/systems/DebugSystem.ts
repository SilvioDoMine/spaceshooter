import { EventBus } from '../core/EventBus';
import { updatePlayerSize, PLAYER_CONFIG } from '@spaceshooter/shared';

interface DebugData {
  fps?: number;
  memory?: number;
  renderCalls?: number;
  gameState?: string;
  level?: number;
  score?: number;
  entities?: number;
  enemies?: number;
  projectiles?: number;
  particles?: number;
  playerPos?: string;
  playerHealth?: string;
  playerAmmo?: string;
}

export class DebugSystem {
  private eventBus: EventBus;
  private debugPanel: HTMLElement | null = null;
  private isVisible: boolean = false;
  
  private fpsHistory: number[] = [];
  private lastTime: number = 0;
  private updateInterval: number = 500; // Update every 500ms
  private lastUpdate: number = 0;
  
  // Debug states
  private godModeEnabled: boolean = false;
  private showCollisions: boolean = false;
  private timeScale: number = 1.0;
  private isPaused: boolean = false;
  private playerSize: number = PLAYER_CONFIG.size;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initialize();
    this.setupEventListeners();
  }

  private initialize(): void {
    this.debugPanel = document.getElementById('debug-panel');
    
    if (!this.debugPanel) {
      console.warn('Debug panel not found in DOM');
      return;
    }

    // Add keyboard listener for U key
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyU') {
        this.toggle();
        event.preventDefault();
      }
    });

    // Setup checkbox listeners
    this.setupCheckboxListeners();

    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  private setupEventListeners(): void {
    // Listen for game data updates
    this.eventBus.on('ui:update-score', (data: { score: number }) => {
      this.updateDebugValue('debug-score', data.score.toString());
    });

    this.eventBus.on('ui:update-health', (data: { current: number; max?: number }) => {
      const max = data.max || 100;
      this.updateDebugValue('debug-player-health', `${data.current}/${max}`);
    });

    this.eventBus.on('ui:update-ammo', (data: { current: number; max: number }) => {
      this.updateDebugValue('debug-player-ammo', `${data.current}/${data.max}`);
    });

    // Listen for debug data updates
    this.eventBus.on('debug:update', (data: DebugData) => {
      this.updateDebugInfo(data);
    });

  }

  private startPerformanceMonitoring(): void {
    const updatePerformance = (currentTime: number) => {
      // Calculate FPS
      if (this.lastTime > 0) {
        const fps = Math.round(1000 / (currentTime - this.lastTime));
        this.fpsHistory.push(fps);
        
        // Keep only last 10 FPS measurements
        if (this.fpsHistory.length > 10) {
          this.fpsHistory.shift();
        }
      }
      this.lastTime = currentTime;

      // Update debug info periodically
      if (currentTime - this.lastUpdate > this.updateInterval) {
        this.updatePerformanceInfo();
        this.lastUpdate = currentTime;
      }

      requestAnimationFrame(updatePerformance);
    };

    requestAnimationFrame(updatePerformance);
  }

  private updatePerformanceInfo(): void {
    if (!this.isVisible) return;

    // Update FPS
    if (this.fpsHistory.length > 0) {
      const avgFps = Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length);
      this.updateDebugValue('debug-fps', avgFps.toString());
    }

    // Update Memory (if available)
    if ((performance as any).memory) {
      const memoryMB = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
      this.updateDebugValue('debug-memory', `${memoryMB} MB`);
    }

    // Update time scale display
    this.updateTimeScaleDisplay();
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    
    if (this.debugPanel) {
      if (this.isVisible) {
        this.debugPanel.classList.add('visible');
        this.updateAllDebugInfo();
      } else {
        this.debugPanel.classList.remove('visible');
      }
    }

    // Emit event for other systems
    this.eventBus.emit('debug:toggled', { visible: this.isVisible });
  }

  public show(): void {
    if (!this.isVisible) {
      this.toggle();
    }
  }

  public hide(): void {
    if (this.isVisible) {
      this.toggle();
    }
  }

  private updateDebugValue(elementId: string, value: string): void {
    if (!this.isVisible) return;
    
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  private updateDebugInfo(data: DebugData): void {
    if (!this.isVisible) return;

    Object.entries(data).forEach(([key, value]) => {
      let elementId = '';
      
      switch (key) {
        case 'fps':
          elementId = 'debug-fps';
          break;
        case 'memory':
          elementId = 'debug-memory';
          value = `${value} MB`;
          break;
        case 'renderCalls':
          elementId = 'debug-render-calls';
          break;
        case 'gameState':
          elementId = 'debug-game-state';
          break;
        case 'level':
          elementId = 'debug-level';
          break;
        case 'score':
          elementId = 'debug-score';
          break;
        case 'entities':
          elementId = 'debug-entities';
          break;
        case 'enemies':
          elementId = 'debug-enemies';
          break;
        case 'projectiles':
          elementId = 'debug-projectiles';
          break;
        case 'particles':
          elementId = 'debug-particles';
          break;
        case 'playerPos':
          elementId = 'debug-player-pos';
          break;
        case 'playerHealth':
          elementId = 'debug-player-health';
          break;
        case 'playerAmmo':
          elementId = 'debug-player-ammo';
          break;
      }
      
      if (elementId) {
        this.updateDebugValue(elementId, value?.toString() || '0');
      }
    });
  }

  private updateAllDebugInfo(): void {
    // Reset to default values when showing debug panel
    this.updateDebugValue('debug-game-state', 'Running');
    this.updateDebugValue('debug-level', '1');
    this.updateDebugValue('debug-entities', '0');
    this.updateDebugValue('debug-enemies', '0');
    this.updateDebugValue('debug-projectiles', '0');
    this.updateDebugValue('debug-particles', '0');
    this.updateDebugValue('debug-player-pos', '(0, 0, 0)');
    this.updateDebugValue('debug-render-calls', '0');
    
    // Update time scale display
    this.updateTimeScaleDisplay();
  }

  public isDebugVisible(): boolean {
    return this.isVisible;
  }

  public isCollisionDebugEnabled(): boolean {
    return this.showCollisions;
  }

  public isGodModeEnabled(): boolean {
    return this.godModeEnabled;
  }

  public getTimeScale(): number {
    return this.isPaused ? 0 : this.timeScale;
  }

  public isGamePaused(): boolean {
    return this.isPaused;
  }

  private updatePlayerSize(newSize: number): void {
    this.playerSize = newSize;
    updatePlayerSize(newSize); // Update the shared config
    this.updateSizeDisplay();
  }

  private updateSizeDisplay(): void {
    const sizeValueElement = document.getElementById('debug-size-value');
    if (sizeValueElement) {
      sizeValueElement.textContent = this.playerSize.toFixed(2);
    }
  }

  private updateTimeScaleDisplay(): void {
    const timeScaleElement = document.getElementById('debug-time-scale');
    if (timeScaleElement) {
      if (this.isPaused) {
        timeScaleElement.textContent = 'PAUSED';
      } else {
        timeScaleElement.textContent = `${this.timeScale.toFixed(1)}x`;
      }
    }
  }

  private setupCheckboxListeners(): void {
    // God Mode checkbox
    const godModeCheckbox = document.getElementById('debug-god-mode') as HTMLInputElement;
    if (godModeCheckbox) {
      godModeCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.godModeEnabled = target.checked;
        this.eventBus.emit('debug:god-mode-toggle', { enabled: this.godModeEnabled });
      });
    }

    // Collision visibility checkbox
    const collisionCheckbox = document.getElementById('debug-show-collisions') as HTMLInputElement;
    if (collisionCheckbox) {
      collisionCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.showCollisions = target.checked;
        this.eventBus.emit('debug:collision-visibility-toggle', { visible: this.showCollisions });
      });
    }

    // Time control slider
    const timeSlider = document.getElementById('debug-time-slider') as HTMLInputElement;
    if (timeSlider) {
      timeSlider.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        this.timeScale = parseInt(target.value) / 100; // 0-2.0x range
        this.updateTimeScaleDisplay();
        this.eventBus.emit('debug:time-scale-change', { timeScale: this.getTimeScale() });
      });
    }

    // Pause button
    const pauseButton = document.getElementById('debug-pause') as HTMLButtonElement;
    if (pauseButton) {
      pauseButton.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        pauseButton.textContent = this.isPaused ? 'Resume' : 'Pause';
        this.eventBus.emit('debug:time-scale-change', { timeScale: this.getTimeScale() });
      });
    }

    // Reset time button
    const resetButton = document.getElementById('debug-reset-time') as HTMLButtonElement;
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.timeScale = 1.0;
        this.isPaused = false;
        
        // Update UI
        if (timeSlider) timeSlider.value = '100';
        if (pauseButton) pauseButton.textContent = 'Pause';
        this.updateTimeScaleDisplay();
        
        this.eventBus.emit('debug:time-scale-change', { timeScale: this.getTimeScale() });
      });
    }

    // Player size controls
    const sizeSlider = document.getElementById('debug-size-slider') as HTMLInputElement;
    if (sizeSlider) {
      sizeSlider.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        const sizeValue = parseInt(target.value) / 100; // Convert 10-200 to 0.1-2.0
        this.updatePlayerSize(sizeValue);
      });
    }

    const resetSizeButton = document.getElementById('debug-reset-size') as HTMLButtonElement;
    if (resetSizeButton) {
      resetSizeButton.addEventListener('click', () => {
        this.updatePlayerSize(0.3); // Default size
        if (sizeSlider) sizeSlider.value = '30';
      });
    }

    const tinyButton = document.getElementById('debug-size-tiny') as HTMLButtonElement;
    if (tinyButton) {
      tinyButton.addEventListener('click', () => {
        this.updatePlayerSize(0.1); // Tiny size
        if (sizeSlider) sizeSlider.value = '10';
      });
    }

    const hugeButton = document.getElementById('debug-size-huge') as HTMLButtonElement;
    if (hugeButton) {
      hugeButton.addEventListener('click', () => {
        this.updatePlayerSize(1.5); // Huge size
        if (sizeSlider) sizeSlider.value = '150';
      });
    }
  }

  public dispose(): void {
    // Remove event listeners if needed
    this.eventBus.off('ui:update-score');
    this.eventBus.off('ui:update-health');
    this.eventBus.off('ui:update-ammo');
    this.eventBus.off('debug:update');
  }
}