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

interface CollisionDebugInfo {
  mouseHover: string;
  collisionStatus: string;
  colliderName: string;
}

interface DebugSettings {
  godModeEnabled: boolean;
  infiniteAmmoEnabled: boolean;
  showCollisions: boolean;
  showJoystick: boolean;
  showPlayerRange: boolean;
  showEnemyRanges: boolean;
  timeScale: number;
  isPaused: boolean;
  playerSize: number;
  position?: { x: number; y: number };
  isCollapsed?: boolean;
  positionBeforeCollapse?: { x: number; y: number };
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
  
  // Default debug settings - positioned at top left (flexible positioning)
  private static readonly DEFAULT_SETTINGS: DebugSettings = {
    godModeEnabled: false,
    infiniteAmmoEnabled: false,
    showCollisions: false,
    showJoystick: false, // Hidden by default
    showPlayerRange: false, // Hidden by default
    showEnemyRanges: false, // Hidden by default
    timeScale: 1.0,
    isPaused: false,
    playerSize: PLAYER_CONFIG.size,
    position: { x: 10, y: 10 }, // Simple top left corner
    isCollapsed: true,
    positionBeforeCollapse: undefined
  };
  
  // Debug states
  private godModeEnabled: boolean = false;
  private infiniteAmmoEnabled: boolean = false;
  private showCollisions: boolean = false;
  private showJoystick: boolean = false;
  private showPlayerRange: boolean = false;
  private showEnemyRanges: boolean = false;
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
  private positionBeforeCollapse: { x: number; y: number } | undefined = undefined;
  
  // Collision debugging
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private collisionDebugInfo: CollisionDebugInfo = {
    mouseHover: 'None',
    collisionStatus: 'N/A',
    colliderName: 'N/A'
  };
  private mouseEventListener: ((event: MouseEvent) => void) | null = null;
  private checkCounter: number = 0;

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
        this.infiniteAmmoEnabled = settings.infiniteAmmoEnabled || false;
        this.showCollisions = settings.showCollisions;
        this.showJoystick = settings.showJoystick !== undefined ? settings.showJoystick : true;
        this.showPlayerRange = settings.showPlayerRange !== undefined ? settings.showPlayerRange : false;
        this.showEnemyRanges = settings.showEnemyRanges !== undefined ? settings.showEnemyRanges : false;
        this.timeScale = settings.timeScale;
        this.isPaused = settings.isPaused;
        this.playerSize = settings.playerSize;
        // Validate loaded position is within current viewport bounds
        const loadedPosition = settings.position || DebugSystem.DEFAULT_SETTINGS.position!;
        const maxX = Math.max(0, window.innerWidth - 250); // Leave space for panel width
        const maxY = Math.max(0, window.innerHeight - 200); // Leave space for panel height (flexible)
        
        this.panelPosition = {
          x: Math.max(0, Math.min(maxX, loadedPosition.x)),
          y: Math.max(0, Math.min(maxY, loadedPosition.y)) // Allow any position within bounds
        };
        this.isCollapsed = settings.isCollapsed || false;
        this.positionBeforeCollapse = settings.positionBeforeCollapse;
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
        infiniteAmmoEnabled: this.infiniteAmmoEnabled,
        showCollisions: this.showCollisions,
        showJoystick: this.showJoystick,
        showPlayerRange: this.showPlayerRange,
        showEnemyRanges: this.showEnemyRanges,
        timeScale: this.timeScale,
        isPaused: this.isPaused,
        playerSize: this.playerSize,
        position: this.panelPosition,
        isCollapsed: this.isCollapsed,
        positionBeforeCollapse: this.positionBeforeCollapse
      };
      localStorage.setItem(DebugSystem.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('❌ Failed to save debug settings to localStorage:', error);
    }
  }

  private resetToDefaults(): void {
    this.godModeEnabled = DebugSystem.DEFAULT_SETTINGS.godModeEnabled;
    this.infiniteAmmoEnabled = DebugSystem.DEFAULT_SETTINGS.infiniteAmmoEnabled;
    this.showCollisions = DebugSystem.DEFAULT_SETTINGS.showCollisions;
    this.showJoystick = DebugSystem.DEFAULT_SETTINGS.showJoystick;
    this.showPlayerRange = DebugSystem.DEFAULT_SETTINGS.showPlayerRange;
    this.showEnemyRanges = DebugSystem.DEFAULT_SETTINGS.showEnemyRanges;
    this.timeScale = DebugSystem.DEFAULT_SETTINGS.timeScale;
    this.isPaused = DebugSystem.DEFAULT_SETTINGS.isPaused;
    this.playerSize = DebugSystem.DEFAULT_SETTINGS.playerSize;
    
    // Simple default position - top left, can be moved anywhere
    this.panelPosition = { x: 10, y: 10 };
    this.isCollapsed = DebugSystem.DEFAULT_SETTINGS.isCollapsed!;
    this.positionBeforeCollapse = undefined;
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

    const infiniteAmmoCheckbox = document.getElementById('debug-infinite-ammo') as HTMLInputElement;
    if (infiniteAmmoCheckbox) {
      infiniteAmmoCheckbox.checked = this.infiniteAmmoEnabled;
    }

    const collisionCheckbox = document.getElementById('debug-show-collisions') as HTMLInputElement;
    if (collisionCheckbox) {
      collisionCheckbox.checked = this.showCollisions;
    }

    const joystickCheckbox = document.getElementById('debug-show-joystick') as HTMLInputElement;
    if (joystickCheckbox) {
      joystickCheckbox.checked = this.showJoystick;
    }

    const playerRangeCheckbox = document.getElementById('debug-show-player-range') as HTMLInputElement;
    if (playerRangeCheckbox) {
      playerRangeCheckbox.checked = this.showPlayerRange;
    }

    const enemyRangesCheckbox = document.getElementById('debug-show-enemy-ranges') as HTMLInputElement;
    if (enemyRangesCheckbox) {
      enemyRangesCheckbox.checked = this.showEnemyRanges;
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
      this.eventBus.emit('debug:infinite-ammo-toggle', { enabled: this.infiniteAmmoEnabled });
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

    // Setup mouse collision detection
    this.setupMouseCollisionDetection();

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

  public isInfiniteAmmoEnabled(): boolean {
    return this.infiniteAmmoEnabled;
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

    // Infinite Ammo checkbox
    const infiniteAmmoCheckbox = document.getElementById('debug-infinite-ammo') as HTMLInputElement;
    if (infiniteAmmoCheckbox) {
      infiniteAmmoCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.infiniteAmmoEnabled = target.checked;
        this.saveSettings();
        this.eventBus.emit('debug:infinite-ammo-toggle', { enabled: this.infiniteAmmoEnabled });
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

    // Player range visibility checkbox
    const playerRangeCheckbox = document.getElementById('debug-show-player-range') as HTMLInputElement;
    if (playerRangeCheckbox) {
      playerRangeCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.showPlayerRange = target.checked;
        this.saveSettings();
        this.eventBus.emit('debug:range-visibility-changed', { 
          showPlayerRange: this.showPlayerRange,
          showEnemyRanges: this.showEnemyRanges
        });
      });
    }

    // Enemy ranges visibility checkbox
    const enemyRangesCheckbox = document.getElementById('debug-show-enemy-ranges') as HTMLInputElement;
    if (enemyRangesCheckbox) {
      enemyRangesCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.showEnemyRanges = target.checked;
        this.saveSettings();
        this.eventBus.emit('debug:range-visibility-changed', { 
          showPlayerRange: this.showPlayerRange,
          showEnemyRanges: this.showEnemyRanges
        });
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
        const defaultSize = DebugSystem.DEFAULT_SETTINGS.playerSize;
        console.log('🔧 Reset size button clicked, resetting to:', defaultSize);
        this.updatePlayerSize(defaultSize); // Default size from settings
        if (sizeSlider) sizeSlider.value = (defaultSize * 100).toString();
      });
    } else {
      console.warn('❌ Reset size button not found in DOM');
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
    // Longer delay for touch to accommodate mobile tap gestures
    this.clickTimeout = window.setTimeout(() => {
      this.startDragging(touch);
    }, 300); // Increased from 150ms to 300ms for mobile
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

    // Simple bounds checking - keep panel completely inside viewport
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
    if (this.isCollapsed) {
      // About to expand - store current position (collapsed position)
      this.positionBeforeCollapse = { ...this.panelPosition };
      
      // Check if expanding would cause panel to go outside viewport
      this.adjustPositionForExpansion();
    } else {
      // About to collapse - restore to original collapsed position
      if (this.positionBeforeCollapse) {
        this.panelPosition = { ...this.positionBeforeCollapse };
        this.applyPanelPosition();
      }
    }
    
    this.isCollapsed = !this.isCollapsed;
    this.applyCollapsedState();
    
    this.saveSettings();
  }

  private adjustPositionForExpansion(): void {
    if (!this.debugPanel) return;
    
    // Get more accurate dimensions based on viewport
    const isMobile = window.innerWidth <= 768;
    const estimatedExpandedHeight = Math.min(
      isMobile ? window.innerHeight * 0.7 : window.innerHeight * 0.8,
      500 // Maximum reasonable height
    );
    const estimatedExpandedWidth = isMobile ? 200 : 250;
    
    let adjustedX = this.panelPosition.x;
    let adjustedY = this.panelPosition.y;
    
    // Check if panel would extend beyond bottom of screen
    if (this.panelPosition.y + estimatedExpandedHeight > window.innerHeight) {
      // Move panel up so it fits, with some padding
      adjustedY = Math.max(10, window.innerHeight - estimatedExpandedHeight - 10);
    }
    
    // Check if panel would extend beyond right edge of screen  
    if (this.panelPosition.x + estimatedExpandedWidth > window.innerWidth) {
      // Move panel left so it fits, with some padding
      adjustedX = Math.max(10, window.innerWidth - estimatedExpandedWidth - 10);
    }
    
    // Apply temporary adjustment for expansion
    if (adjustedX !== this.panelPosition.x || adjustedY !== this.panelPosition.y) {
      this.panelPosition = { x: adjustedX, y: adjustedY };
      this.applyPanelPosition();
      console.log(`🔧 Debug panel position adjusted for expansion: (${adjustedX}, ${adjustedY})`);
    }
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


  private setupMouseCollisionDetection(): void {
    let debugCounter = 0; // Counter to limit debug logs
    
    this.mouseEventListener = (event: MouseEvent) => {
      // Debug: Log first few mouse events to see if they're being triggered
      if (debugCounter < 5) {
        console.log('🐭 Mouse event triggered:', { x: event.clientX, y: event.clientY, visible: this.isVisible });
        debugCounter++;
      }
      
      if (!this.isVisible) {
        // Clear collision debug info when debug panel is not visible
        this.updateCollisionDebugInfo('Panel Hidden', 'N/A', 'N/A');
        return;
      }
      
      // Get canvas element to convert screen coordinates to world coordinates
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        if (debugCounter < 3) {
          console.log('❌ No canvas found');
        }
        this.updateCollisionDebugInfo('No Canvas', 'N/A', 'N/A');
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const canvasY = event.clientY - rect.top;
      
      // Convert to normalized coordinates (-1 to 1)
      const normalizedX = (canvasX / canvas.clientWidth) * 2 - 1;
      const normalizedY = -(canvasY / canvas.clientHeight) * 2 + 1;
      
      // Store mouse position for collision detection
      this.mousePosition = { x: normalizedX, y: normalizedY };
      
      // Debug: Show coordinates being calculated for first few events
      if (debugCounter < 5) {
        console.log('📍 Mouse coordinates:', {
          screen: { x: event.clientX, y: event.clientY },
          canvas: { x: canvasX, y: canvasY },
          normalized: this.mousePosition
        });
      }
      
      // Check collision with player colliders
      this.checkPlayerColliderHover();
    };
    
    document.addEventListener('mousemove', this.mouseEventListener);
    console.log('✅ Mouse collision detection setup complete');
  }

  private checkPlayerColliderHover(): void {
    // Debug: Log first few calls to this method
    if (this.checkCounter < 3) {
      console.log('🔍 checkPlayerColliderHover called:', this.checkCounter);
      this.checkCounter++;
    }
    
    // Get player entity from global game instance
    const game = (window as any).game;
    if (!game) {
      this.updateCollisionDebugInfo('No Game', '❌ GAME NOT LOADED', 'N/A');
      return;
    }
    
    try {
      const entitySystem = game.getEntitySystem();
      if (!entitySystem) {
        this.updateCollisionDebugInfo('No EntitySystem', '❌ ENTITY SYSTEM MISSING', 'N/A');
        return;
      }
      
      const player = entitySystem.getPlayer();
      if (!player) {
        if (this.checkCounter < 5) {
          console.log('❌ Player not found in EntitySystem');
        }
        this.updateCollisionDebugInfo('No Player', '❌ PLAYER NOT FOUND', 'N/A');
        return;
      }
      
      if (this.checkCounter < 5) {
        console.log('✅ Player found:', player);
      }
      
      // Get player's absolute collision circles
      const collisionCircles = player.getAbsoluteCollisionCircles();
      if (!collisionCircles || collisionCircles.length === 0) {
        this.updateCollisionDebugInfo('No Colliders', '❌ NO COLLISION CIRCLES', 'N/A');
        return;
      }
      
      // Debug info - log occasionally to see what's happening
      if (Math.random() < 0.01) { // 1% chance to log
        console.log('🎯 Collision Debug Info:', {
          mouseNormalized: this.mousePosition,
          playerColliders: collisionCircles.length,
          firstCollider: collisionCircles[0]
        });
      }
      
      // Convert mouse position to world coordinates
      const renderingSystem = game.getRenderingSystem();
      if (!renderingSystem) {
        this.updateCollisionDebugInfo('No RenderingSystem', '❌ RENDERING SYSTEM MISSING', 'N/A');
        return;
      }
      
      const camera = renderingSystem.camera;
      if (!camera) {
        this.updateCollisionDebugInfo('No Camera', '❌ CAMERA MISSING', 'N/A');
        return;
      }
      
      // Get camera position from the camera system 
      const cameraSystem = game.getCameraSystem();
      if (!cameraSystem) return;
      
      // Use camera info to properly convert screen to world coordinates
      const cameraPos = cameraSystem.getCameraPosition();
      const viewportSize = cameraSystem.getViewportSize();
      
      // Convert normalized coordinates to world coordinates
      const worldX = cameraPos.x + (this.mousePosition.x * viewportSize.width / 2);
      const worldY = cameraPos.y + (this.mousePosition.y * viewportSize.height / 2);
      
      // Debug log world coordinates occasionally
      if (Math.random() < 0.005) { // 0.5% chance to log
        console.log('🌍 World Coordinates:', {
          worldMouse: { x: worldX, y: worldY },
          cameraPos,
          viewportSize,
          normalizedMouse: this.mousePosition
        });
      }
      
      // Check each collision circle
      let hoveredCollider = null;
      let hoveredDistance = Infinity;
      let isInsideCollider = false;
      
      for (let i = 0; i < collisionCircles.length; i++) {
        const circle = collisionCircles[i];
        const dx = worldX - circle.pos.x;
        const dy = worldY - circle.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= circle.radius && distance < hoveredDistance) {
          hoveredCollider = circle;
          hoveredDistance = distance;
          isInsideCollider = true;
        }
      }
      
      if (hoveredCollider) {
        const colliderName = hoveredCollider.name || `Collider ${collisionCircles.indexOf(hoveredCollider)}`;
        const statusText = isInsideCollider ? '✅ INSIDE COLLIDER' : '🎯 HOVERING';
        const distanceInfo = `${hoveredDistance.toFixed(2)}/${hoveredCollider.radius.toFixed(2)}`;
        this.updateCollisionDebugInfo('Player Collider', statusText, `${colliderName} (${distanceInfo})`);
        
        if (this.checkCounter < 10) {
          console.log('🎯 COLLISION FOUND!', { colliderName, statusText, distanceInfo });
        }
      } else {
        this.updateCollisionDebugInfo('Searching...', `Mouse: ${worldX.toFixed(1)}, ${worldY.toFixed(1)}`, `${collisionCircles.length} colliders`);
        
        if (this.checkCounter < 10) {
          console.log('🔍 No collision found. Mouse world pos:', { worldX, worldY }, 'Colliders:', collisionCircles.length);
        }
      }
      
    } catch (error) {
      // Game not fully initialized yet or other error
      console.error('🚨 Error in checkPlayerColliderHover:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateCollisionDebugInfo('Error', `❌ ${errorMessage}`, 'N/A');
    }
  }
  
  private updateCollisionDebugInfo(mouseHover: string, collisionStatus: string, colliderName: string): void {
    this.collisionDebugInfo = { mouseHover, collisionStatus, colliderName };
    
    // Update debug display
    this.updateDebugValue('debug-collision-hover', mouseHover);
    this.updateDebugValue('debug-collision-status', collisionStatus);
    this.updateDebugValue('debug-collider-name', colliderName);
  }

  public dispose(): void {
    // Remove mouse event listener
    if (this.mouseEventListener) {
      document.removeEventListener('mousemove', this.mouseEventListener);
      this.mouseEventListener = null;
    }
    
    // Clear localStorage on dispose if needed
    // Note: we don't clear settings here as they should persist
    // Individual event listeners will be cleaned up automatically
  }
}