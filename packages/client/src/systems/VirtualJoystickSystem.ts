import { EventBus } from '../core/EventBus';

export interface JoystickInput {
  x: number; // -1 to 1
  y: number; // -1 to 1
  magnitude: number; // 0 to 1
  angle: number; // in radians
}

export class VirtualJoystickSystem {
  private eventBus: EventBus;
  private joystickContainer: HTMLElement | null = null;
  private joystickKnob: HTMLElement | null = null;
  
  private isActive: boolean = false;
  private isDragging: boolean = false;
  private centerX: number = 0;
  private centerY: number = 0;
  private maxRadius: number = 40; // Distance from center to edge
  
  // Floating joystick
  private originalPosition: { x: number; y: number } = { x: 0, y: 0 };
  private isFloating: boolean = false;
  
  private currentInput: JoystickInput = {
    x: 0,
    y: 0,
    magnitude: 0,
    angle: 0
  };

  // Mobile detection
  private isMobile: boolean = false;
  private showOnDesktop: boolean = false; // Will be controlled by debug panel

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.detectMobile();
    this.initialize();
    this.setupEventListeners();
  }

  private detectMobile(): void {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    ('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0);
  }

  private initialize(): void {
    this.joystickContainer = document.getElementById('virtual-joystick');
    this.joystickKnob = document.getElementById('joystick-knob');

    if (!this.joystickContainer || !this.joystickKnob) {
      console.warn('Virtual joystick elements not found in DOM');
      return;
    }

    // Show joystick based on platform and debug settings
    this.updateVisibility();

    // Calculate center and max radius
    this.updateDimensions();

    // Store original position for floating functionality
    this.storeOriginalPosition();

    // Setup touch/mouse events
    this.setupJoystickEvents();

    // Setup global touch listeners for floating joystick
    this.setupGlobalTouchListeners();

    console.log('🕹️ Virtual joystick initialized');
  }

  private updateVisibility(): void {
    if (!this.joystickContainer) return;

    const shouldShow = this.isMobile || this.showOnDesktop;
    
    if (shouldShow) {
      this.joystickContainer.classList.add('visible');
      // Re-setup global listeners when becoming visible
      this.setupGlobalTouchListeners();
    } else {
      this.joystickContainer.classList.remove('visible');
    }
  }

  private updateDimensions(): void {
    if (!this.joystickContainer) return;

    const rect = this.joystickContainer.getBoundingClientRect();
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
    this.maxRadius = Math.min(rect.width, rect.height) / 2 - 20; // Leave some margin
  }

  private storeOriginalPosition(): void {
    if (!this.joystickContainer) return;

    const rect = this.joystickContainer.getBoundingClientRect();
    this.originalPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  private setupEventListeners(): void {
    // Listen for debug events
    this.eventBus.on('debug:joystick-toggle', (data: { visible: boolean }) => {
      this.showOnDesktop = data.visible;
      this.updateVisibility();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.updateDimensions();
      this.storeOriginalPosition();
    });
  }

  private setupGlobalTouchListeners(): void {
    // Only add global listeners on mobile or when debug is enabled
    if (!this.isMobile && !this.showOnDesktop) return;

    // Listen for touches anywhere on the screen
    document.addEventListener('touchstart', (e) => {
      if (!this.isVisible() || this.isDragging) return;
      
      const touch = e.touches[0];
      const targetElement = e.target as Element;
      
      // Don't interfere with other UI elements
      if (targetElement && (
        targetElement.closest('#debug-panel') ||
        targetElement.closest('#virtual-joystick')
      )) {
        return;
      }

      // Move joystick to touch position and start interaction
      this.moveJoystickToPosition(touch.clientX, touch.clientY);
      this.startInteraction(touch);
      e.preventDefault();
    }, { passive: false });
  }

  private setupJoystickEvents(): void {
    if (!this.joystickContainer || !this.joystickKnob) return;

    // Mouse events
    this.joystickContainer.addEventListener('mousedown', (e) => {
      this.startInteraction(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.handleInteraction(e);
      }
    });

    document.addEventListener('mouseup', () => {
      this.endInteraction();
    });

    // Touch events
    this.joystickContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startInteraction(e.touches[0]);
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        this.handleInteraction(e.touches[0]);
      }
    });

    document.addEventListener('touchend', () => {
      this.endInteraction();
    });
  }

  private moveJoystickToPosition(x: number, y: number): void {
    if (!this.joystickContainer) return;

    this.isFloating = true;
    this.joystickContainer.classList.add('floating');

    // Position joystick at touch point (center the joystick on the touch)
    const joystickRect = this.joystickContainer.getBoundingClientRect();
    const newX = x - joystickRect.width / 2;
    const newY = y - joystickRect.height / 2;

    // Ensure joystick doesn't go off-screen
    const maxX = window.innerWidth - joystickRect.width;
    const maxY = window.innerHeight - joystickRect.height;

    const constrainedX = Math.max(0, Math.min(maxX, newX));
    const constrainedY = Math.max(0, Math.min(maxY, newY));

    this.joystickContainer.style.left = `${constrainedX}px`;
    this.joystickContainer.style.top = `${constrainedY}px`;
    this.joystickContainer.style.bottom = 'auto';
    this.joystickContainer.style.transform = 'none';

    // Update center position for interaction calculations
    this.centerX = joystickRect.width / 2;
    this.centerY = joystickRect.height / 2;
  }

  private returnToOriginalPosition(): void {
    if (!this.joystickContainer || !this.isFloating) return;

    this.isFloating = false;
    this.joystickContainer.classList.remove('floating');

    // Reset to original CSS positioning
    this.joystickContainer.style.left = '50%';
    this.joystickContainer.style.top = 'auto';
    this.joystickContainer.style.bottom = '50px';
    this.joystickContainer.style.transform = 'translateX(-50%)';

    // Update center position
    this.updateDimensions();
  }

  private startInteraction(event: MouseEvent | Touch): void {
    if (!this.joystickContainer || !this.joystickKnob) return;

    this.isDragging = true;
    this.joystickKnob.classList.add('active');
    this.handleInteraction(event);
  }

  private handleInteraction(event: MouseEvent | Touch): void {
    if (!this.joystickContainer || !this.joystickKnob || !this.isDragging) return;

    const containerRect = this.joystickContainer.getBoundingClientRect();
    
    // Calculate relative position from center
    const relativeX = event.clientX - (containerRect.left + this.centerX);
    const relativeY = event.clientY - (containerRect.top + this.centerY);

    // Calculate distance and angle
    const distance = Math.min(Math.sqrt(relativeX * relativeX + relativeY * relativeY), this.maxRadius);
    const angle = Math.atan2(relativeY, relativeX);

    // Calculate final position (constrain to circle)
    const constrainedX = Math.cos(angle) * distance;
    const constrainedY = Math.sin(angle) * distance;

    // Update knob position
    this.joystickKnob.style.transform = `translate(calc(-50% + ${constrainedX}px), calc(-50% + ${constrainedY}px))`;

    // Update input values
    this.currentInput = {
      x: constrainedX / this.maxRadius,
      y: constrainedY / this.maxRadius,
      magnitude: distance / this.maxRadius,
      angle: angle
    };

    // Emit input event
    this.emitInputEvent();
  }

  private endInteraction(): void {
    if (!this.joystickKnob) return;

    this.isDragging = false;
    this.joystickKnob.classList.remove('active');

    // Reset knob to center
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';

    // Return joystick to original position if it was floating
    this.returnToOriginalPosition();

    // Reset input
    this.currentInput = {
      x: 0,
      y: 0,
      magnitude: 0,
      angle: 0
    };

    // Emit reset event
    this.emitInputEvent();
  }

  private emitInputEvent(): void {
    this.eventBus.emit('joystick:input', this.currentInput);
  }

  public getCurrentInput(): JoystickInput {
    return { ...this.currentInput };
  }

  public setDebugVisible(visible: boolean): void {
    this.showOnDesktop = visible;
    this.updateVisibility();
  }

  public isVisible(): boolean {
    return this.joystickContainer?.classList.contains('visible') || false;
  }

  public dispose(): void {
    // Event listeners will be cleaned up automatically
    console.log('🕹️ Virtual joystick disposed');
  }
}