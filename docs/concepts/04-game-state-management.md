# Game State Management

## O que é Game State?

Game State é o **contexto atual** do seu jogo: está no menu? Jogando? Pausado? Game over? Cada estado tem suas próprias regras, input handling, renderização e lógica de update.

## Por que é Importante?

Sem gerenciamento de estados adequado, você acaba com código como este:

```typescript
// ❌ PESADELO: Switch gigante no game loop
class Game {
  currentState = 'menu';
  
  update() {
    switch(this.currentState) {
      case 'menu':
        // 50 linhas de código do menu
        if (input.enter) this.currentState = 'playing';
        break;
        
      case 'playing':
        // 100 linhas de gameplay
        if (input.escape) this.currentState = 'paused';
        if (player.health <= 0) this.currentState = 'gameover';
        break;
        
      case 'paused':
        // 30 linhas de pause
        if (input.escape) this.currentState = 'playing';
        break;
        
      case 'gameover':
        // 40 linhas de game over
        if (input.enter) this.currentState = 'menu';
        break;
    }
  }
}
```

## Arquitetura de State Machine

### Implementação Básica
```typescript
abstract class GameState {
  abstract enter(): void;           // Setup do estado
  abstract update(deltaTime: number): void;  // Lógica por frame
  abstract render(ctx: CanvasRenderingContext2D): void;  // Renderização
  abstract handleInput(input: InputEvent): void;  // Input handling
  abstract exit(): void;            // Cleanup do estado
}

class GameStateManager {
  private static currentState: GameState | null = null;
  private static states = new Map<string, GameState>();
  
  static registerState(name: string, state: GameState) {
    this.states.set(name, state);
  }
  
  static changeState(stateName: string) {
    const newState = this.states.get(stateName);
    if (!newState) {
      throw new Error(`State ${stateName} not found`);
    }
    
    // Cleanup do estado atual
    this.currentState?.exit();
    
    // Ativa novo estado
    this.currentState = newState;
    this.currentState.enter();
  }
  
  static update(deltaTime: number) {
    this.currentState?.update(deltaTime);
  }
  
  static render(ctx: CanvasRenderingContext2D) {
    this.currentState?.render(ctx);
  }
  
  static handleInput(input: InputEvent) {
    this.currentState?.handleInput(input);
  }
}
```

## Estados do Seu SpaceShooter

### 1. **Menu State**
```typescript
class MenuState extends GameState {
  private selectedOption = 0;
  private menuOptions = ['Start Game', 'High Scores', 'Settings', 'Exit'];
  private backgroundStars: Star[] = [];
  
  enter() {
    console.log('Entering Menu State');
    this.selectedOption = 0;
    this.generateBackgroundStars();
    AudioManager.playMusic('menu_theme');
  }
  
  update(deltaTime: number) {
    // Anima estrelas de fundo
    this.backgroundStars.forEach(star => {
      star.y += star.speed * deltaTime;
      if (star.y > canvas.height) {
        star.y = -10;
        star.x = Math.random() * canvas.width;
      }
    });
  }
  
  render(ctx: CanvasRenderingContext2D) {
    // Fundo escuro
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Estrelas
    this.backgroundStars.forEach(star => {
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    
    // Título
    ctx.fillStyle = '#00FF00';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE SHOOTER', canvas.width / 2, 150);
    
    // Menu options
    this.menuOptions.forEach((option, index) => {
      ctx.fillStyle = index === this.selectedOption ? '#FFFF00' : '#FFFFFF';
      ctx.font = '24px Arial';
      ctx.fillText(option, canvas.width / 2, 250 + index * 50);
    });
  }
  
  handleInput(input: InputEvent) {
    if (input.type === 'keydown') {
      switch(input.key) {
        case 'ArrowUp':
          this.selectedOption = Math.max(0, this.selectedOption - 1);
          AudioManager.playSound('menu_move');
          break;
          
        case 'ArrowDown':
          this.selectedOption = Math.min(this.menuOptions.length - 1, this.selectedOption + 1);
          AudioManager.playSound('menu_move');
          break;
          
        case 'Enter':
          this.selectOption();
          break;
      }
    }
  }
  
  private selectOption() {
    AudioManager.playSound('menu_select');
    
    switch(this.selectedOption) {
      case 0: // Start Game
        GameStateManager.changeState('playing');
        break;
      case 1: // High Scores
        GameStateManager.changeState('highscores');
        break;
      case 2: // Settings
        GameStateManager.changeState('settings');
        break;
      case 3: // Exit
        // Fechar jogo ou voltar para tela inicial
        break;
    }
  }
  
  exit() {
    console.log('Exiting Menu State');
    AudioManager.stopMusic();
  }
  
  private generateBackgroundStars() {
    this.backgroundStars = [];
    for (let i = 0; i < 100; i++) {
      this.backgroundStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 50 + 25,
        color: `hsl(${Math.random() * 60 + 200}, 100%, ${Math.random() * 50 + 50}%)`
      });
    }
  }
}
```

### 2. **Playing State**
```typescript
class PlayingState extends GameState {
  private player: EntityID;
  private enemies: EntityID[] = [];
  private bullets: EntityID[] = [];
  private powerUps: EntityID[] = [];
  private score = 0;
  private level = 1;
  private enemySpawnTimer = 0;
  
  enter() {
    console.log('Entering Playing State');
    this.initializeGame();
    AudioManager.playMusic('game_theme');
  }
  
  update(deltaTime: number) {
    // Spawn inimigos
    this.enemySpawnTimer += deltaTime;
    if (this.enemySpawnTimer > this.getEnemySpawnInterval()) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
    }
    
    // Update todos os systems
    SystemManager.update(deltaTime);
    
    // Verifica condições de mudança de estado
    const playerHealth = ComponentManager.get(this.player, HealthComponent);
    if (playerHealth && playerHealth.current <= 0) {
      GameStateManager.changeState('gameover');
    }
    
    // Level up?
    if (this.score > this.level * 1000) {
      this.level++;
      EventSystem.emit('level:up', { level: this.level });
    }
  }
  
  render(ctx: CanvasRenderingContext2D) {
    // Limpa tela
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Renderiza todos os objetos do jogo
    SystemManager.render(ctx);
    
    // HUD
    this.renderHUD(ctx);
  }
  
  handleInput(input: InputEvent) {
    if (input.type === 'keydown' && input.key === 'Escape') {
      GameStateManager.changeState('paused');
      return;
    }
    
    // Delega input para InputSystem
    SystemManager.handleInput(input);
  }
  
  exit() {
    console.log('Exiting Playing State');
    AudioManager.stopMusic();
  }
  
  private initializeGame() {
    // Reset variáveis
    this.score = 0;
    this.level = 1;
    this.enemySpawnTimer = 0;
    
    // Cria player
    this.player = EntityFactory.createPlayer(canvas.width / 2, canvas.height - 100);
    
    // Limpa arrays
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    
    // Setup event listeners
    EventSystem.on('enemy:destroyed', (data) => {
      this.score += data.points;
      this.removeEnemyFromArray(data.entityId);
    });
    
    EventSystem.on('bullet:hit', (data) => {
      this.removeBulletFromArray(data.entityId);
    });
  }
  
  private renderHUD(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#00FF00';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    
    // Score
    ctx.fillText(`Score: ${this.score}`, 10, 30);
    
    // Level
    ctx.fillText(`Level: ${this.level}`, 10, 60);
    
    // Health
    const playerHealth = ComponentManager.get(this.player, HealthComponent);
    if (playerHealth) {
      ctx.fillText(`Health: ${playerHealth.current}/${playerHealth.max}`, 10, 90);
      
      // Health bar
      const barWidth = 200;
      const barHeight = 10;
      const healthPercent = playerHealth.current / playerHealth.max;
      
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(10, 100, barWidth, barHeight);
      
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(10, 100, barWidth * healthPercent, barHeight);
    }
  }
  
  private spawnEnemy() {
    const x = Math.random() * (canvas.width - 64);
    const enemyType = this.getRandomEnemyType();
    const enemy = EntityFactory.createEnemy(enemyType, x, -64);
    this.enemies.push(enemy);
  }
  
  private getEnemySpawnInterval(): number {
    // Spawn mais rápido conforme o level aumenta
    return Math.max(500, 2000 - this.level * 100);
  }
  
  private getRandomEnemyType(): string {
    const types = ['basic', 'fast', 'tank'];
    return types[Math.floor(Math.random() * types.length)];
  }
}
```

### 3. **Paused State**
```typescript
class PausedState extends GameState {
  private previousState: GameState;
  private pauseMenuOptions = ['Resume', 'Settings', 'Main Menu'];
  private selectedOption = 0;
  
  enter() {
    console.log('Entering Paused State');
    this.selectedOption = 0;
    AudioManager.pauseMusic();
    AudioManager.playSound('pause');
    
    // Salva screenshot do jogo para mostrar de fundo
    this.saveGameScreenshot();
  }
  
  update(deltaTime: number) {
    // Estado pausado - não atualiza gameplay
    // Só animações do menu de pause
  }
  
  render(ctx: CanvasRenderingContext2D) {
    // Renderiza screenshot do jogo (desfocado)
    this.renderGameScreenshot(ctx);
    
    // Overlay escuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Título "PAUSED"
    ctx.fillStyle = '#FFFF00';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 100);
    
    // Menu options
    this.pauseMenuOptions.forEach((option, index) => {
      ctx.fillStyle = index === this.selectedOption ? '#00FF00' : '#FFFFFF';
      ctx.font = '24px Arial';
      ctx.fillText(option, canvas.width / 2, canvas.height / 2 + index * 50);
    });
  }
  
  handleInput(input: InputEvent) {
    if (input.type === 'keydown') {
      switch(input.key) {
        case 'Escape':
          this.resumeGame();
          break;
          
        case 'ArrowUp':
          this.selectedOption = Math.max(0, this.selectedOption - 1);
          AudioManager.playSound('menu_move');
          break;
          
        case 'ArrowDown':
          this.selectedOption = Math.min(this.pauseMenuOptions.length - 1, this.selectedOption + 1);
          AudioManager.playSound('menu_move');
          break;
          
        case 'Enter':
          this.selectOption();
          break;
      }
    }
  }
  
  exit() {
    console.log('Exiting Paused State');
    AudioManager.resumeMusic();
  }
  
  private selectOption() {
    AudioManager.playSound('menu_select');
    
    switch(this.selectedOption) {
      case 0: // Resume
        this.resumeGame();
        break;
      case 1: // Settings
        GameStateManager.changeState('settings');
        break;
      case 2: // Main Menu
        GameStateManager.changeState('menu');
        break;
    }
  }
  
  private resumeGame() {
    GameStateManager.changeState('playing');
  }
}
```

### 4. **Game Over State**
```typescript
class GameOverState extends GameState {
  private finalScore: number;
  private isNewHighScore: boolean;
  private playerName = '';
  private enteringName = false;
  
  enter() {
    console.log('Entering GameOver State');
    
    // Pega score final
    this.finalScore = PlayingState.getScore();
    
    // Verifica se é high score
    this.isNewHighScore = HighScoreManager.isHighScore(this.finalScore);
    
    if (this.isNewHighScore) {
      this.enteringName = true;
    }
    
    AudioManager.stopMusic();
    AudioManager.playSound('game_over');
  }
  
  update(deltaTime: number) {
    // Animações do game over (fade in, particles, etc.)
  }
  
  render(ctx: CanvasRenderingContext2D) {
    // Fundo escuro
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // "GAME OVER"
    ctx.fillStyle = '#FF0000';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 100);
    
    // Score final
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${this.finalScore}`, canvas.width / 2, canvas.height / 2 - 50);
    
    if (this.isNewHighScore) {
      ctx.fillStyle = '#FFFF00';
      ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, canvas.height / 2 - 20);
      
      if (this.enteringName) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Enter your name:', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText(this.playerName + '_', canvas.width / 2, canvas.height / 2 + 50);
      }
    } else {
      ctx.fillStyle = '#888888';
      ctx.font = '18px Arial';
      ctx.fillText('Press ENTER to continue', canvas.width / 2, canvas.height / 2 + 50);
    }
  }
  
  handleInput(input: InputEvent) {
    if (input.type === 'keydown') {
      if (this.enteringName) {
        this.handleNameInput(input);
      } else {
        if (input.key === 'Enter') {
          GameStateManager.changeState('menu');
        }
      }
    }
  }
  
  exit() {
    console.log('Exiting GameOver State');
  }
  
  private handleNameInput(input: InputEvent) {
    if (input.key === 'Enter') {
      if (this.playerName.length > 0) {
        HighScoreManager.addScore(this.playerName, this.finalScore);
        this.enteringName = false;
      }
    } else if (input.key === 'Backspace') {
      this.playerName = this.playerName.slice(0, -1);
    } else if (input.key.length === 1 && this.playerName.length < 10) {
      this.playerName += input.key.toUpperCase();
    }
  }
}
```

## Transições Entre Estados

### Stack de Estados (Para Sub-menus)
```typescript
class GameStateStack {
  private static stack: GameState[] = [];
  
  static pushState(state: GameState) {
    // Pausa o estado atual sem fazer exit
    const current = this.getCurrentState();
    current?.pause?.();
    
    this.stack.push(state);
    state.enter();
  }
  
  static popState() {
    const current = this.stack.pop();
    current?.exit();
    
    // Resume o estado anterior
    const previous = this.getCurrentState();
    previous?.resume?.();
  }
  
  static getCurrentState(): GameState | null {
    return this.stack[this.stack.length - 1] || null;
  }
}
```

### Estados com Transições Animadas
```typescript
class FadeTransition {
  private alpha = 0;
  private fadeIn = true;
  private onComplete?: () => void;
  
  constructor(onComplete: () => void) {
    this.onComplete = onComplete;
  }
  
  update(deltaTime: number) {
    const fadeSpeed = 2; // segundos para fade completo
    
    if (this.fadeIn) {
      this.alpha += deltaTime * fadeSpeed;
      if (this.alpha >= 1) {
        this.alpha = 1;
        this.fadeIn = false;
        this.onComplete?.();
      }
    } else {
      this.alpha -= deltaTime * fadeSpeed;
      if (this.alpha <= 0) {
        this.alpha = 0;
        return true; // Transição completa
      }
    }
    
    return false;
  }
  
  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = `rgba(0, 0, 0, ${this.alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
```

## Setup no Game Loop Principal

```typescript
class Game {
  constructor() {
    // Registra todos os estados
    GameStateManager.registerState('menu', new MenuState());
    GameStateManager.registerState('playing', new PlayingState());
    GameStateManager.registerState('paused', new PausedState());
    GameStateManager.registerState('gameover', new GameOverState());
    GameStateManager.registerState('settings', new SettingsState());
    
    // Inicia no menu
    GameStateManager.changeState('menu');
  }
  
  gameLoop = (timestamp: number) => {
    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    
    // Delega tudo para o state manager
    GameStateManager.update(deltaTime);
    GameStateManager.render(this.ctx);
    
    requestAnimationFrame(this.gameLoop);
  }
  
  handleInput = (event: KeyboardEvent) => {
    GameStateManager.handleInput(event);
  }
}
```

## Exercícios Práticos

1. **Implemente State Machine básico** - Menu → Playing → GameOver
2. **Adicione Pause State** - Pausar/resumir durante o jogo
3. **Crie Settings State** - Volume, controles, dificuldade
4. **Implemente transições animadas** - Fade entre estados

## Pegadinhas Comuns

❌ **Não esqueça cleanup**
- `exit()` deve limpar resources, event listeners, timers

❌ **Não compartilhe estado diretamente**
- Use EventSystem ou parâmetros para passar dados

❌ **Não deixe estados dependentes**
- Cada estado deve ser independente

✅ **Faça:**
- Estados pequenos e focados
- Transições claras e previsíveis
- Save/load de estado quando necessário

## Próximos Passos

1. **Identifique** todos os estados do seu jogo
2. **Implemente** MenuState e PlayingState primeiro  
3. **Adicione** PausedState e GameOverState
4. **Teste** todas as transições
5. **Leia** sobre Object Pooling (próximo artigo)

---
*States bem estruturados fazem seu jogo parecer profissional!*