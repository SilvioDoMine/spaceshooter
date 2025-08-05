# Input Handling e Command Pattern

## Por que Input Handling Importa?

Input handling é a **primeira impressão** que o jogador tem do seu jogo. Input lag, comandos perdidos ou controles não responsivos destroem completamente a experiência. Um SpaceShooter precisa de controles precisos e instantâneos.

## Problemas Comuns

### ❌ Input Handling Ruim
```typescript
// Problema 1: Polling no event handler
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    player.x -= 5; // Só move uma vez por keypress!
  }
});

// Problema 2: Input acoplado à lógica do jogo
class Player {
  update() {
    // Input misturado com game logic
    if (keys['ArrowLeft']) {
      this.x -= this.speed;
      if (this.x < 0) this.x = 0;
      this.updateAnimation('walking_left');
      AudioManager.playSound('footstep');
    }
  }
}

// Problema 3: Sem input buffering
// Jogador aperta botão entre frames = comando perdido
```

## Arquitetura de Input Handling

### 1. **Input State Manager**
```typescript
interface KeyState {
  pressed: boolean;    // Está sendo pressionado agora?
  justPressed: boolean;  // Foi pressionado neste frame?
  justReleased: boolean; // Foi solto neste frame?
  pressTime: number;   // Há quanto tempo está pressionado
}

class InputManager {
  private static keyStates = new Map<string, KeyState>();
  private static previousFrame = new Map<string, boolean>();
  
  static init() {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Perde foco = solta todas as teclas
    window.addEventListener('blur', this.releaseAllKeys.bind(this));
  }
  
  private static onKeyDown(e: KeyboardEvent) {
    e.preventDefault();
    this.setKeyState(e.code, true);
  }
  
  private static onKeyUp(e: KeyboardEvent) {
    e.preventDefault();
    this.setKeyState(e.code, false);
  }
  
  private static setKeyState(key: string, pressed: boolean) {
    if (!this.keyStates.has(key)) {
      this.keyStates.set(key, {
        pressed: false,
        justPressed: false,
        justReleased: false,
        pressTime: 0
      });
    }
    
    const state = this.keyStates.get(key)!;
    state.pressed = pressed;
    
    if (pressed) {
      state.pressTime = performance.now();
    }
  }
  
  static update(deltaTime: number) {
    // Atualiza estados derivados
    for (const [key, state] of this.keyStates) {
      const wasPressed = this.previousFrame.get(key) || false;
      
      state.justPressed = state.pressed && !wasPressed;
      state.justReleased = !state.pressed && wasPressed;
      
      this.previousFrame.set(key, state.pressed);
    }
  }
  
  static isPressed(key: string): boolean {
    return this.keyStates.get(key)?.pressed || false;
  }
  
  static isJustPressed(key: string): boolean {
    return this.keyStates.get(key)?.justPressed || false;
  }
  
  static isJustReleased(key: string): boolean {
    return this.keyStates.get(key)?.justReleased || false;
  }
  
  static getPressTime(key: string): number {
    const state = this.keyStates.get(key);
    return state?.pressed ? performance.now() - state.pressTime : 0;
  }
  
  private static releaseAllKeys() {
    for (const state of this.keyStates.values()) {
      state.pressed = false;
    }
  }
}
```

### 2. **Command Pattern para Actions**
```typescript
interface Command {
  execute(): void;
  undo?(): void;
}

// Comandos específicos do jogo
class MoveCommand implements Command {
  constructor(
    private entity: Entity,
    private direction: Vector2,
    private speed: number
  ) {}
  
  execute() {
    this.entity.velocity.x = this.direction.x * this.speed;
    this.entity.velocity.y = this.direction.y * this.speed;
  }
}

class ShootCommand implements Command {
  constructor(private weapon: WeaponSystem, private position: Vector2) {}
  
  execute() {
    this.weapon.shoot(this.position);
  }
}

class ActivatePowerUpCommand implements Command {
  constructor(private player: Player, private powerUpType: string) {}
  
  execute() {
    this.player.activatePowerUp(this.powerUpType);
  }
  
  undo() {
    this.player.deactivatePowerUp(this.powerUpType);
  }
}
```

### 3. **Input Mapping System**
```typescript
type InputBinding = {
  key: string;
  command: () => Command;
  mode: 'press' | 'hold' | 'release';
  repeat?: boolean;
};

class InputMapper {
  private static bindings: InputBinding[] = [];
  private static commandQueue: Command[] = [];
  
  static bind(key: string, commandFactory: () => Command, mode: 'press' | 'hold' | 'release' = 'press') {
    this.bindings.push({
      key,
      command: commandFactory,
      mode,
      repeat: mode === 'hold'
    });
  }
  
  static update() {
    this.commandQueue = [];
    
    for (const binding of this.bindings) {
      let shouldExecute = false;
      
      switch (binding.mode) {
        case 'press':
          shouldExecute = InputManager.isJustPressed(binding.key);
          break;
        case 'hold':
          shouldExecute = InputManager.isPressed(binding.key);
          break;
        case 'release':
          shouldExecute = InputManager.isJustReleased(binding.key);
          break;
      }
      
      if (shouldExecute) {
        this.commandQueue.push(binding.command());
      }
    }
  }
  
  static executeCommands() {
    for (const command of this.commandQueue) {
      command.execute();
    }
  }
  
  static getQueuedCommands(): Command[] {
    return [...this.commandQueue];
  }
  
  static clearBindings() {
    this.bindings = [];
  }
}
```

## Implementação para SpaceShooter

### Configuração de Controles
```typescript
class SpaceShooterInput {
  private player: Player;
  private weaponSystem: WeaponSystem;
  
  constructor(player: Player, weaponSystem: WeaponSystem) {
    this.player = player;
    this.weaponSystem = weaponSystem;
    
    this.setupBindings();
  }
  
  private setupBindings() {
    // Movimento - usa 'hold' para movimento contínuo
    InputMapper.bind('ArrowLeft', () => 
      new MoveCommand(this.player, { x: -1, y: 0 }, this.player.speed), 'hold');
    
    InputMapper.bind('ArrowRight', () => 
      new MoveCommand(this.player, { x: 1, y: 0 }, this.player.speed), 'hold');
    
    InputMapper.bind('ArrowUp', () => 
      new MoveCommand(this.player, { x: 0, y: -1 }, this.player.speed), 'hold');
    
    InputMapper.bind('ArrowDown', () => 
      new MoveCommand(this.player, { x: 0, y: 1 }, this.player.speed), 'hold');
    
    // Tiro - usa 'hold' para tiro automático
    InputMapper.bind('Space', () => 
      new ShootCommand(this.weaponSystem, this.player.position), 'hold');
    
    // Power-ups - usa 'press' para ativação única
    InputMapper.bind('KeyZ', () => 
      new ActivatePowerUpCommand(this.player, 'shield'), 'press');
    
    InputMapper.bind('KeyX', () => 
      new ActivatePowerUpCommand(this.player, 'rapid_fire'), 'press');
    
    // Pausa
    InputMapper.bind('Escape', () => 
      new PauseGameCommand(), 'press');
  }
}
```

### Input Buffering
```typescript
class InputBuffer {
  private buffer: Array<{ command: Command; timestamp: number }> = [];
  private bufferWindow = 100; // 100ms de buffer
  
  addCommand(command: Command) {
    this.buffer.push({
      command,
      timestamp: performance.now()
    });
  }
  
  processBuffer(): Command[] {
    const now = performance.now();
    const validCommands: Command[] = [];
    
    // Remove comandos expirados e coleta válidos
    this.buffer = this.buffer.filter(entry => {
      const age = now - entry.timestamp;
      
      if (age <= this.bufferWindow) {
        validCommands.push(entry.command);
        return false; // Remove da buffer após processar
      }
      
      return age <= this.bufferWindow * 2; // Mantém um pouco mais para debug
    });
    
    return validCommands;
  }
  
  clear() {
    this.buffer = [];
  }
}
```

### Combos e Sequences
```typescript
class ComboSystem {
  private sequence: string[] = [];
  private lastInputTime = 0;
  private comboWindow = 500; // 500ms entre inputs
  
  private combos = new Map<string, () => Command>([
    ['↑↑↓↓←→←→', () => new KonamiCommand()],
    ['↑→↓←', () => new SpecialAttackCommand()],
    ['Space Space', () => new DoubleShotCommand()]
  ]);
  
  addInput(input: string) {
    const now = performance.now();
    
    // Reset sequence se muito tempo passou
    if (now - this.lastInputTime > this.comboWindow) {
      this.sequence = [];
    }
    
    this.sequence.push(input);
    this.lastInputTime = now;
    
    // Limita tamanho da sequence
    if (this.sequence.length > 10) {
      this.sequence.shift();
    }
    
    // Verifica combos
    this.checkCombos();
  }
  
  private checkCombos() {
    const sequenceString = this.sequence.join('');
    
    for (const [combo, commandFactory] of this.combos) {
      if (sequenceString.endsWith(combo)) {
        const command = commandFactory();
        command.execute();
        
        this.sequence = []; // Reset após combo
        break;
      }
    }
  }
}
```

### Diferentes Esquemas de Controle
```typescript
enum ControlScheme {
  WASD = 'wasd',
  ARROWS = 'arrows',
  CUSTOM = 'custom'
}

class ControlSchemeManager {
  private static currentScheme = ControlScheme.ARROWS;
  
  private static schemes = {
    [ControlScheme.WASD]: {
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      moveUp: 'KeyW',
      moveDown: 'KeyS',
      shoot: 'Space',
      pause: 'Escape'
    },
    [ControlScheme.ARROWS]: {
      moveLeft: 'ArrowLeft',
      moveRight: 'ArrowRight',
      moveUp: 'ArrowUp',
      moveDown: 'ArrowDown',
      shoot: 'Space',
      pause: 'Escape'
    }
  };
  
  static setScheme(scheme: ControlScheme) {
    this.currentScheme = scheme;
    this.rebindControls();
  }
  
  private static rebindControls() {
    InputMapper.clearBindings();
    
    const scheme = this.schemes[this.currentScheme];
    
    // Re-bind com novo esquema
    InputMapper.bind(scheme.moveLeft, () => 
      new MoveCommand(player, { x: -1, y: 0 }, player.speed), 'hold');
    
    InputMapper.bind(scheme.moveRight, () => 
      new MoveCommand(player, { x: 1, y: 0 }, player.speed), 'hold');
    
    // ... outros bindings
  }
  
  static getKeyForAction(action: string): string {
    const scheme = this.schemes[this.currentScheme];
    return scheme[action as keyof typeof scheme] || '';
  }
}
```

## Input Handling Avançado

### 1. **Analog Input (Gamepads)**
```typescript
class GamepadManager {
  private static gamepads: Gamepad[] = [];
  private static deadzone = 0.1;
  
  static update() {
    this.gamepads = Array.from(navigator.getGamepads()).filter(gp => gp !== null) as Gamepad[];
  }
  
  static getLeftStick(gamepadIndex = 0): Vector2 {
    const gamepad = this.gamepads[gamepadIndex];
    if (!gamepad) return { x: 0, y: 0 };
    
    let x = gamepad.axes[0];
    let y = gamepad.axes[1];
    
    // Apply deadzone
    if (Math.abs(x) < this.deadzone) x = 0;
    if (Math.abs(y) < this.deadzone) y = 0;
    
    return { x, y };
  }
  
  static isButtonPressed(buttonIndex: number, gamepadIndex = 0): boolean {
    const gamepad = this.gamepads[gamepadIndex];
    return gamepad?.buttons[buttonIndex]?.pressed || false;
  }
}
```

### 2. **Touch Input (Mobile)**
```typescript
class TouchManager {
  private static touches = new Map<number, Touch>();
  
  static init() {
    document.addEventListener('touchstart', this.onTouchStart.bind(this));
    document.addEventListener('touchmove', this.onTouchMove.bind(this));
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  private static onTouchStart(e: TouchEvent) {
    e.preventDefault();
    
    for (const touch of Array.from(e.changedTouches)) {
      this.touches.set(touch.identifier, touch);
    }
  }
  
  private static onTouchMove(e: TouchEvent) {
    e.preventDefault();
    
    for (const touch of Array.from(e.changedTouches)) {
      this.touches.set(touch.identifier, touch);
    }
  }
  
  private static onTouchEnd(e: TouchEvent) {
    for (const touch of Array.from(e.changedTouches)) {
      this.touches.delete(touch.identifier);
    }
  }
  
  static getTouchPosition(touchId: number): Vector2 | null {
    const touch = this.touches.get(touchId);
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  
  static getActiveTouches(): Touch[] {
    return Array.from(this.touches.values());
  }
}
```

### 3. **Virtual Joystick (Mobile)**
```typescript
class VirtualJoystick {
  private center: Vector2;
  private radius: number;
  private knobRadius: number;
  private currentTouch: number | null = null;
  private knobPosition: Vector2;
  
  constructor(center: Vector2, radius: number = 60) {
    this.center = center;
    this.radius = radius;
    this.knobRadius = radius * 0.4;
    this.knobPosition = { ...center };
  }
  
  update() {
    const touches = TouchManager.getActiveTouches();
    
    if (this.currentTouch !== null) {
      const touchPos = TouchManager.getTouchPosition(this.currentTouch);
      
      if (touchPos) {
        // Calcula posição do knob
        const dx = touchPos.x - this.center.x;
        const dy = touchPos.y - this.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.radius) {
          this.knobPosition = touchPos;
        } else {
          // Limita na borda do joystick
          const angle = Math.atan2(dy, dx);
          this.knobPosition.x = this.center.x + Math.cos(angle) * this.radius;
          this.knobPosition.y = this.center.y + Math.sin(angle) * this.radius;
        }
      } else {
        // Touch perdido, reset
        this.currentTouch = null;
        this.knobPosition = { ...this.center };
      }
    } else {
      // Procura novo touch
      for (const touch of touches) {
        const dx = touch.clientX - this.center.x;
        const dy = touch.clientY - this.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.radius) {
          this.currentTouch = touch.identifier;
          break;
        }
      }
    }
  }
  
  getDirection(): Vector2 {
    const dx = this.knobPosition.x - this.center.x;
    const dy = this.knobPosition.y - this.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 10) return { x: 0, y: 0 }; // Deadzone
    
    return {
      x: dx / this.radius,
      y: dy / this.radius
    };
  }
  
  render(ctx: CanvasRenderingContext2D) {
    // Base do joystick
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Knob
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(this.knobPosition.x, this.knobPosition.y, this.knobRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

## Game Loop Integration

```typescript
class Game {
  private inputBuffer = new InputBuffer();
  private comboSystem = new ComboSystem();
  
  update(deltaTime: number) {
    // 1. Atualiza input managers
    InputManager.update(deltaTime);
    GamepadManager.update();
    
    // 2. Processa input mapping
    InputMapper.update();
    
    // 3. Adiciona comandos ao buffer
    for (const command of InputMapper.getQueuedCommands()) {
      this.inputBuffer.addCommand(command);
    }
    
    // 4. Processa buffer e executa comandos
    const commands = this.inputBuffer.processBuffer();
    for (const command of commands) {
      command.execute();
    }
    
    // 5. Atualiza sistemas do jogo
    this.updateGameSystems(deltaTime);
  }
  
  private updateGameSystems(deltaTime: number) {
    MovementSystem.update(deltaTime);
    WeaponSystem.update(deltaTime);
    // ... outros systems
  }
}
```

## Debug e Visualização

### Input Debug Overlay
```typescript
class InputDebugger {
  static renderInputState(ctx: CanvasRenderingContext2D) {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
    let y = 300;
    
    ctx.fillStyle = '#FFFF00';
    ctx.font = '12px monospace';
    
    for (const key of keys) {
      const pressed = InputManager.isPressed(key);
      const justPressed = InputManager.isJustPressed(key);
      const pressTime = InputManager.getPressTime(key);
      
      const status = pressed ? 
        `${key}: PRESSED (${pressTime.toFixed(0)}ms)` :
        `${key}: released`;
      
      ctx.fillStyle = pressed ? '#00FF00' : '#888888';
      ctx.fillText(status, 10, y);
      
      if (justPressed) {
        ctx.fillStyle = '#FF0000';
        ctx.fillText(' [JUST PRESSED]', 200, y);
      }
      
      y += 15;
    }
  }
}
```

## Exercícios Práticos

1. **Implemente InputManager básico** - Tracked key states
2. **Adicione Command Pattern** - Para actions do player
3. **Crie sistema de combos** - Sequences de inputs
4. **Implemente input buffering** - Para inputs responsivos
5. **Adicione suporte a gamepad** - Controller support

## Pegadinhas Comuns

❌ **Não misture input com game logic**
```typescript
// Ruim: input no update do player
if (keys['Space']) player.shoot();

// Bom: command pattern
InputMapper.bind('Space', () => new ShootCommand(player));
```

❌ **Não esqueça de cleanup**
```typescript
// Sempre remova event listeners
window.removeEventListener('keydown', handler);
```

❌ **Não ignore input lag**
```typescript
// Buffer commands para execução no próximo frame
// Não execute imediatamente no event handler
```

## Próximos Passos

1. **Refatore** input handling atual para usar Command Pattern
2. **Implemente** input buffering para responsividade
3. **Adicione** configuração de controles
4. **Teste** em diferentes dispositivos (teclado, gamepad, touch)

---
*Input handling responsivo é o que separa games amadores de profissionais!*