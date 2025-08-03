# Game State & Menu System Guide

## Visão Geral

O sistema de estados do jogo é composto por dois componentes principais:
- **GameStateManager**: Gerencia os estados do jogo (Menu/Playing/Paused/GameOver)
- **MenuSystem**: Renderiza as interfaces e telas do jogo

## GameStateManager

### Estados Disponíveis

```typescript
enum GameState {
  MENU = 'menu',           // Menu principal
  PLAYING = 'playing',     // Jogando
  PAUSED = 'paused',       // Pausado
  GAME_OVER = 'game_over'  // Game over
}
```

### Uso Básico

```typescript
import { GameStateManager, GameState } from './systems/GameStateManager';

const gameStateManager = new GameStateManager();

// Mudar estado
gameStateManager.setState(GameState.PLAYING);

// Verificar estado atual
if (gameStateManager.isPlaying()) {
  // Lógica do jogo
}

// Callbacks para mudanças de estado
gameStateManager.onStateChange(GameState.MENU, () => {
  console.log('Voltou ao menu');
});
```

### Sistema de Estatísticas

O GameStateManager rastreia automaticamente:

```typescript
interface GameStats {
  score: number;           // Pontuação total
  timeAlive: number;       // Tempo vivo em ms
  enemiesDestroyed: number; // Inimigos destruídos
  shotsFired: number;      // Tiros disparados
  accuracy: number;        // Precisão (%)
}
```

#### Atualizando Estatísticas

```typescript
// Incrementar contador
gameStateManager.incrementStat('shotsFired');
gameStateManager.incrementStat('enemiesDestroyed');

// Atualizar valor específico
gameStateManager.updateStats({ score: 1500 });

// Obter estatísticas
const stats = gameStateManager.getStats();
console.log(`Precisão: ${stats.accuracy.toFixed(1)}%`);
```

### Controle de Jogo

```typescript
// Iniciar novo jogo
gameStateManager.startNewGame();

// Pausar/despausar
gameStateManager.pauseGame();
gameStateManager.resumeGame();

// Finalizar jogo
gameStateManager.endGame();

// Voltar ao menu
gameStateManager.returnToMenu();
```

### Verificações de Estado

```typescript
// Métodos de conveniência
gameStateManager.isPlaying();   // true se PLAYING
gameStateManager.isPaused();    // true se PAUSED
gameStateManager.isInMenu();    // true se MENU
gameStateManager.isGameOver();  // true se GAME_OVER
```

## MenuSystem

### Telas Disponíveis

1. **Menu Principal**: Botão para iniciar, informações de controles
2. **Tela de Pause**: Continuar ou voltar ao menu
3. **Game Over**: Estatísticas e opções de restart

### Uso Básico

```typescript
import { MenuSystem } from './systems/MenuSystem';

const menuSystem = new MenuSystem();

// Configurar callbacks
menuSystem.setCallbacks({
  onStartGame: () => gameStateManager.startNewGame(),
  onResumeGame: () => gameStateManager.resumeGame(),
  onReturnToMenu: () => gameStateManager.returnToMenu(),
  onRestartGame: () => {
    resetGame();
    gameStateManager.startNewGame();
  }
});

// Mostrar telas
menuSystem.showMainMenu();
menuSystem.showPauseScreen();
menuSystem.showGameOverScreen(stats);
menuSystem.hideAllMenus();
```

### Callbacks Interface

```typescript
interface MenuCallbacks {
  onStartGame?: () => void;     // Iniciar novo jogo
  onResumeGame?: () => void;    // Continuar jogo pausado
  onReturnToMenu?: () => void;  // Voltar ao menu principal
  onRestartGame?: () => void;   // Reiniciar após game over
}
```

## Integração Completa

### Setup Inicial

```typescript
// main.ts
let gameStateManager: GameStateManager;
let menuSystem: MenuSystem;

async function init() {
  // Criar sistemas
  gameStateManager = new GameStateManager();
  menuSystem = new MenuSystem();
  
  // Configurar callbacks
  setupMenuCallbacks();
  setupGameStateCallbacks();
  
  // Começar no menu
  gameStateManager.setState(GameState.MENU);
}
```

### Configuração de Callbacks

```typescript
function setupMenuCallbacks() {
  menuSystem.setCallbacks({
    onStartGame: () => {
      gameStateManager.startNewGame();
    },
    onResumeGame: () => {
      gameStateManager.resumeGame();
    },
    onReturnToMenu: () => {
      resetGame();
      gameStateManager.returnToMenu();
    },
    onRestartGame: () => {
      resetGame();
      gameStateManager.startNewGame();
    }
  });
}

function setupGameStateCallbacks() {
  gameStateManager.onStateChange(GameState.MENU, () => {
    menuSystem.showMainMenu();
  });
  
  gameStateManager.onStateChange(GameState.PLAYING, () => {
    menuSystem.hideAllMenus();
  });
  
  gameStateManager.onStateChange(GameState.PAUSED, () => {
    menuSystem.showPauseScreen();
  });
  
  gameStateManager.onStateChange(GameState.GAME_OVER, () => {
    const stats = gameStateManager.getStats();
    menuSystem.showGameOverScreen(stats);
  });
}
```

### Controles de Input

```typescript
function onInputChange(action: string, pressed: boolean) {
  // Pause/unpause com P
  if (action === 'pause' && pressed) {
    if (gameStateManager.isPlaying()) {
      gameStateManager.pauseGame();
    } else if (gameStateManager.isPaused()) {
      gameStateManager.resumeGame();
    }
  }
  
  // Só processar gameplay se estiver jogando
  if (gameStateManager.isPlaying()) {
    if (action === 'shoot' && pressed) {
      shoot();
      gameStateManager.incrementStat('shotsFired');
    }
  }
}
```

### Loop de Jogo

```typescript
function animate() {
  // Só atualizar gameplay se estiver jogando
  if (gameStateManager.isPlaying()) {
    updatePlayer();
    updateProjectiles();
    updateEnemies();
    checkCollisions();
  }
  
  // Sempre atualizar efeitos visuais
  particleSystem.update(deltaTime);
  
  render();
}
```

### Eventos de Jogo

```typescript
// Quando inimigo é destruído
if (enemy.health <= 0) {
  gameStateManager.incrementStat('enemiesDestroyed');
  gameStateManager.updateStats({ score: gameScore });
  
  // Efeitos visuais/sonoros
  particleSystem.createExplosion(enemy.position);
  audioSystem.playSound('explosion');
}

// Quando jogador morre
if (playerHealth <= 0) {
  gameStateManager.endGame(); // Vai para GameState.GAME_OVER
}
```

## Estilos CSS

O MenuSystem inclui estilos CSS completos:

- **Design cyberpunk** com cores cyan/azul
- **Responsivo** para mobile e desktop
- **Animações** em botões e hover effects
- **Tipografia** monospace para tema retro
- **Layout flexível** com centralização automática

### Customização de Estilos

Para customizar aparência:

1. Editar `MenuSystem.ts` no método `setupStyles()`
2. Modificar cores, fontes e animações
3. Adicionar novos elementos CSS conforme necessário

## Fluxo de Estados

```
MENU → (Start Game) → PLAYING
  ↑                      ↓
  |                   (Pause)
  |                      ↓
  |                   PAUSED
  |                      ↓
  |                  (Resume)
  |                      ↓
  |                   PLAYING
  |                      ↓
  |                 (Health = 0)
  |                      ↓
  └── (Return to Menu) ← GAME_OVER
```

## Formatação de Tempo

```typescript
// Converter milliseconds para formato mm:ss
const formattedTime = gameStateManager.formatTime(timeAlive);
// Exemplo: "02:35" para 155000ms
```

## Best Practices

1. **Sempre verificar estado** antes de executar lógica de gameplay
2. **Usar callbacks** para separar responsabilidades
3. **Resetar estatísticas** ao iniciar novo jogo
4. **Atualizar stats em tempo real** para feedback imediato
5. **Tratar edge cases** como pause durante transições