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

interface DebugSettings {
  godModeEnabled: boolean;
  showCollisions: boolean;
  showJoystick: boolean;
  timeScale: number;
  isPaused: boolean;
  playerSize: number;
  position?: { x: number; y: number };
  isCollapsed?: boolean;
}

export class DebugSystem {
  private eventBus: EventBus;
  private debugPanel: HTMLElement | null = null;
  private isVisible: boolean = true;
  
  private fpsHistory: number[] = [];
  private lastTime: number = 0;
  private updateInterval: number = 500; // Update every 500ms
  private lastUpdate: number = 0;
  
  // localStorage key for debug settings
  private static readonly STORAGE_KEY = 'spaceshooter_debug_settings';
  
  // Default debug settings
  private static readonly DEFAULT_SETTINGS: DebugSettings = {
    godModeEnabled: false,
    showCollisions: false,
    showJoystick: true, // Show by default for debugging
    timeScale: 1.0,
    isPaused: false,
    playerSize: PLAYER_CONFIG.size,
    position: { x: 10, y: 10 },
    isCollapsed: true
  };
  
  // Debug states
  private godModeEnabled: boolean = false;
  private showCollisions: boolean = false;
  private showJoystick: boolean = true;
  private timeScale: number = 1.0;
  private isPaused: boolean = false;
  private playerSize: number = PLAYER_CONFIG.size;
  
  // Drag functionality
  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private panelPosition: { x: number; y: number } = { x: 10, y: 10 };
  
  // Collapse functionality
  private isCollapsed: boolean = true;
  private clickTimeout: number | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.loadSettings();
    this.initialize();
    this.setupEventListeners();
  }

  private loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem(DebugSystem.STORAGE_KEY);
      if (savedSettings) {
        const settings: DebugSettings = JSON.parse(savedSettings);
        this.godModeEnabled = settings.godModeEnabled;
        this.showCollisions = settings.showCollisions;
        this.showJoystick = settings.showJoystick !== undefined ? settings.showJoystick : true;
        this.timeScale = settings.timeScale;
        this.isPaused = settings.isPaused;
        this.playerSize = settings.playerSize;
        this.panelPosition = settings.position || DebugSystem.DEFAULT_SETTINGS.position!;
        this.isCollapsed = settings.isCollapsed || false;
        console.log('🔧 Debug settings loaded from localStorage:', settings);
      } else {
        this.resetToDefaults();
      }
    } catch (error) {
      console.warn('❌ Failed to load debug settings from localStorage:', error);
      this.resetToDefaults();
    }
  }

  private saveSettings(): void {
    try {
      const settings: DebugSettings = {
        godModeEnabled: this.godModeEnabled,
        showCollisions: this.showCollisions,
        showJoystick: this.showJoystick,
        timeScale: this.timeScale,
        isPaused: this.isPaused,
        playerSize: this.playerSize,
        position: this.panelPosition,
        isCollapsed: this.isCollapsed
      };
      localStorage.setItem(DebugSystem.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('❌ Failed to save debug settings to localStorage:', error);
    }
  }

  private resetToDefaults(): void {
    this.godModeEnabled = DebugSystem.DEFAULT_SETTINGS.godModeEnabled;
    this.showCollisions = DebugSystem.DEFAULT_SETTINGS.showCollisions;
    this.showJoystick = DebugSystem.DEFAULT_SETTINGS.showJoystick;
    this.timeScale = DebugSystem.DEFAULT_SETTINGS.timeScale;
    this.isPaused = DebugSystem.DEFAULT_SETTINGS.isPaused;
    this.playerSize = DebugSystem.DEFAULT_SETTINGS.playerSize;
    this.panelPosition = DebugSystem.DEFAULT_SETTINGS.position!;
    this.isCollapsed = DebugSystem.DEFAULT_SETTINGS.isCollapsed!;
  }

  public resetAllSettings(): void {
    this.resetToDefaults();
    this.saveSettings();
    this.updateUIFromSettings();
    console.log('🔧 Debug settings reset to defaults');
  }

  private updateUIFromSettings(): void {
    // Update checkboxes
    const godModeCheckbox = document.getElementById('debug-god-mode') as HTMLInputElement;
    if (godModeCheckbox) {
      godModeCheckbox.checked = this.godModeEnabled;
    }

    const collisionCheckbox = document.getElementById('debug-show-collisions') as HTMLInputElement;
    if (collisionCheckbox) {
      collisionCheckbox.checked = this.showCollisions;
    }

    const joystickCheckbox = document.getElementById('debug-show-joystick') as HTMLInputElement;
    if (joystickCheckbox) {
      joystickCheckbox.checked = this.showJoystick;
    }

    // Update time slider
    const timeSlider = document.getElementById('debug-time-slider') as HTMLInputElement;
    if (timeSlider) {
      timeSlider.value = (this.timeScale * 100).toString();
    }

    // Update pause button
    const pauseButton = document.getElementById('debug-pause') as HTMLButtonElement;
    if (pauseButton) {
      pauseButton.textContent = this.isPaused ? 'Resume' : 'Pause';
    }

    // Update size slider
    const sizeSlider = document.getElementById('debug-size-slider') as HTMLInputElement;
    if (sizeSlider) {
      sizeSlider.value = (this.playerSize * 100).toString();
    }

    // Update displays
    this.updateTimeScaleDisplay();
    this.updateSizeDisplay();

    // Apply player size to shared config
    updatePlayerSize(this.playerSize);

    // Apply position to panel
    this.applyPanelPosition();

    // Apply collapsed state
    this.applyCollapsedState();

    // Don't emit events here - they'll be emitted when game starts
  }

  private applyLoadedSettings(): void {
    // Delay event emission to ensure all entities are created first
    setTimeout(() => {
      this.eventBus.emit('debug:god-mode-toggle', { enabled: this.godModeEnabled });
      this.eventBus.emit('debug:collision-visibility-toggle', { visible: this.showCollisions });
      this.eventBus.emit('debug:joystick-toggle', { visible: this.showJoystick });
      this.eventBus.emit('debug:time-scale-change', { timeScale: this.getTimeScale() });
      console.log('🔧 Applied loaded debug settings to game systems');
    }, 100); // Small delay to let entities initialize
  }

  private initialize(): void {
    this.debugPanel = document.getElementById('debug-panel');
    
    if (!this.debugPanel) {
      console.warn('Debug panel not found in DOM');
      return;
    }

    // Show panel by default
    this.debugPanel.classList.add('visible');

    // Add keyboard listener for U key
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyU') {
        this.toggle();
        event.preventDefault();
      }
    });

    // Setup checkbox listeners
    this.setupCheckboxListeners();

    // Apply loaded settings to UI
    this.updateUIFromSettings();

    // Setup drag functionality
    this.setupDragFunctionality();

    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  private setupEventListeners(): void {
    // Listen for game start to apply loaded settings
    this.eventBus.on('game:started', () => {
      this.applyLoadedSettings();
    });

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
        case 'powerups':
          elementId = 'debug-powerups';
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
    this.updateDebugValue('debug-powerups', '0');
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
    this.saveSettings();
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
        this.saveSettings();
        this.eventBus.emit('debug:god-mode-toggle', { enabled: this.godModeEnabled });
      });
    }

    // Collision visibility checkbox
    const collisionCheckbox = document.getElementById('debug-show-collisions') as HTMLInputElement;
    if (collisionCheckbox) {
      collisionCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.showCollisions = target.checked;
        this.saveSettings();
        this.eventBus.emit('debug:collision-visibility-toggle', { visible: this.showCollisions });
      });
    }

    // Virtual joystick visibility checkbox
    const joystickCheckbox = document.getElementById('debug-show-joystick') as HTMLInputElement;
    if (joystickCheckbox) {
      joystickCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.showJoystick = target.checked;
        this.saveSettings();
        this.eventBus.emit('debug:joystick-toggle', { visible: this.showJoystick });
      });
    }

    // Time control slider
    const timeSlider = document.getElementById('debug-time-slider') as HTMLInputElement;
    if (timeSlider) {
      timeSlider.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        this.timeScale = parseInt(target.value) / 100; // 0-2.0x range
        this.updateTimeScaleDisplay();
        this.saveSettings();
        this.eventBus.emit('debug:time-scale-change', { timeScale: this.getTimeScale() });
      });
    }

    // Pause button
    const pauseButton = document.getElementById('debug-pause') as HTMLButtonElement;
    if (pauseButton) {
      pauseButton.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        pauseButton.textContent = this.isPaused ? 'Resume' : 'Pause';
        this.saveSettings();
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

    // Reset All Settings button
    const resetAllButton = document.getElementById('debug-reset-all') as HTMLButtonElement;
    if (resetAllButton) {
      resetAllButton.addEventListener('click', () => {
        this.resetAllSettings();
      });
    }
  }

  private setupDragFunctionality(): void {
    const dragHandle = document.querySelector('#debug-panel h3') as HTMLElement;
    if (!dragHandle || !this.debugPanel) return;

    dragHandle.addEventListener('mousedown', (e) => {
      this.handleMouseDown(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.handleDragging(e);
      }
    });

    document.addEventListener('mouseup', () => {
      this.stopDragging();
    });

    // Touch events for mobile
    dragHandle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleTouchStart(touch);
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleDragging(touch);
      }
    });

    document.addEventListener('touchend', () => {
      this.stopDragging();
    });
  }

  private handleMouseDown(event: MouseEvent): void {
    this.clickTimeout = window.setTimeout(() => {
      this.startDragging(event);
    }, 150); // 150ms delay to distinguish click from drag
  }

  private handleTouchStart(touch: Touch): void {
    this.clickTimeout = window.setTimeout(() => {
      this.startDragging(touch);
    }, 150);
  }

  private startDragging(event: MouseEvent | Touch): void {
    if (!this.debugPanel) return;

    this.isDragging = true;
    this.debugPanel.classList.add('dragging');

    const rect = this.debugPanel.getBoundingClientRect();
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private handleDragging(event: MouseEvent | Touch): void {
    if (!this.isDragging || !this.debugPanel) return;

    let newX = event.clientX - this.dragOffset.x;
    let newY = event.clientY - this.dragOffset.y;

    // Simple bounds - keep panel completely inside viewport
    const panelRect = this.debugPanel.getBoundingClientRect();
    const maxX = window.innerWidth - panelRect.width;
    const maxY = window.innerHeight - panelRect.height;

    newX = Math.max(0, Math.min(maxX, newX));
    newY = Math.max(0, Math.min(maxY, newY));

    this.panelPosition = { x: newX, y: newY };
    this.applyPanelPosition();
  }

  private stopDragging(): void {
    if (this.clickTimeout) {
      // If timeout is still active, this was a quick click
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
      if (!this.isDragging) {
        this.toggleCollapse();
        return;
      }
    }

    if (this.isDragging) {
      this.isDragging = false;
      if (this.debugPanel) {
        this.debugPanel.classList.remove('dragging');
      }
      this.saveSettings(); // Save position
    }
  }

  private applyPanelPosition(): void {
    if (this.debugPanel) {
      this.debugPanel.style.left = `${this.panelPosition.x}px`;
      this.debugPanel.style.top = `${this.panelPosition.y}px`;
      this.debugPanel.style.right = 'auto'; // Remove right positioning
    }
  }

  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    this.applyCollapsedState();
    
    if (!this.isCollapsed) {
      // When expanding, check if panel is at bottom edge and adjust
      this.checkBottomEdgeAndAdjust();
    }
    
    this.saveSettings();
  }

  private applyCollapsedState(): void {
    if (this.debugPanel) {
      if (this.isCollapsed) {
        this.debugPanel.classList.add('collapsed');
      } else {
        this.debugPanel.classList.remove('collapsed');
      }
    }
  }

  private checkBottomEdgeAndAdjust(): void {
    if (!this.debugPanel) return;

    // Get panel dimensions after expanding
    setTimeout(() => {
      if (!this.debugPanel) return;
      
      const rect = this.debugPanel.getBoundingClientRect();
      const bottomOverflow = (rect.bottom) - window.innerHeight;
      
      if (bottomOverflow > 0) {
        // Panel extends beyond bottom, move it up
        this.panelPosition.y = Math.max(0, this.panelPosition.y - bottomOverflow);
        this.applyPanelPosition();
        this.saveSettings();
      }
    }, 10); // Small delay to let CSS apply
  }

  public dispose(): void {
    // Clear localStorage on dispose if needed
    // Note: we don't clear settings here as they should persist
    // Individual event listeners will be cleaned up automatically
  }
}