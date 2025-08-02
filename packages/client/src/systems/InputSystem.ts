export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  pause: boolean;
}

export type InputCallback = (action: keyof InputState, pressed: boolean) => void;

/**
 * Sistema de Input do Space Shooter
 * 
 * Captura e processa eventos de teclado, mapeando teclas para ações do jogo.
 * Suporta múltiplas teclas por ação e callbacks para notificação de mudanças.
 * 
 * @example
 * ```typescript
 * const inputSystem = new InputSystem();
 * 
 * // Adicionar callback para receber eventos
 * inputSystem.addInputCallback((action, pressed) => {
 *   console.log(`${action}: ${pressed ? 'pressed' : 'released'}`);
 * });
 * 
 * // Verificar estado atual no loop do jogo
 * function gameLoop() {
 *   const input = inputSystem.getInputState();
 *   
 *   if (input.up) player.moveUp();
 *   if (input.left) player.moveLeft();
 *   if (input.shoot) player.shoot();
 * }
 * ```
 * 
 * @keymap
 * - Movimento: WASD, Arrow Keys
 * - Tiro: Space
 * - Pause: P, Escape
 * 
 * @features
 * - Mapeamento configurável de teclas
 * - Estado contínuo para movimento suave
 * - Callbacks para eventos discretos
 * - Prevenção de comportamentos padrão do browser
 * - Reset automático quando janela perde foco
 * - Prevenção de repeat de teclas
 */
export class InputSystem {
  private keysPressed: Set<string> = new Set();
  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
    pause: false
  };
  
  private keyMap: Map<string, keyof InputState> = new Map([
    ['KeyW', 'up'],
    ['ArrowUp', 'up'],
    ['KeyS', 'down'],
    ['ArrowDown', 'down'],
    ['KeyA', 'left'],
    ['ArrowLeft', 'left'],
    ['KeyD', 'right'],
    ['ArrowRight', 'right'],
    ['Space', 'shoot'],
    ['KeyP', 'pause'],
    ['Escape', 'pause']
  ]);

  private callbacks: InputCallback[] = [];

  constructor() {
    this.init();
  }

  private init(): void {
    // Prevenir comportamento padrão para teclas do jogo
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Prevenir scroll com espaço
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
      }
    });

    // Reset input state quando janela perde foco
    window.addEventListener('blur', this.resetInputState.bind(this));
  }

  private onKeyDown(event: KeyboardEvent): void {
    const action = this.keyMap.get(event.code);
    
    if (action && !this.keysPressed.has(event.code)) {
      this.keysPressed.add(event.code);
      this.inputState[action] = true;
      
      // Notificar callbacks
      this.callbacks.forEach(callback => callback(action, true));
      
      event.preventDefault();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    const action = this.keyMap.get(event.code);
    
    if (action && this.keysPressed.has(event.code)) {
      this.keysPressed.delete(event.code);
      this.inputState[action] = false;
      
      // Notificar callbacks
      this.callbacks.forEach(callback => callback(action, false));
      
      event.preventDefault();
    }
  }

  private resetInputState(): void {
    this.keysPressed.clear();
    Object.keys(this.inputState).forEach(key => {
      const action = key as keyof InputState;
      if (this.inputState[action]) {
        this.inputState[action] = false;
        this.callbacks.forEach(callback => callback(action, false));
      }
    });
  }

  public getInputState(): Readonly<InputState> {
    return { ...this.inputState };
  }

  public isPressed(action: keyof InputState): boolean {
    return this.inputState[action];
  }

  public addInputCallback(callback: InputCallback): void {
    this.callbacks.push(callback);
  }

  public removeInputCallback(callback: InputCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    document.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('blur', this.resetInputState.bind(this));
    this.callbacks.length = 0;
  }
}