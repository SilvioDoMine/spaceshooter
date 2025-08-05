# Design Patterns em Game Development

## O que são Design Patterns?

Design Patterns são soluções reutilizáveis para problemas comuns no desenvolvimento de software. Em games, eles ajudam a organizar código complexo e tornar o projeto mais maintível.

## Principais Patterns para o Seu SpaceShooter

### 1. **Observer Pattern** 
*Para comunicação entre sistemas*

**O que é:** Permite que objetos sejam notificados quando algo acontece, sem criar dependências diretas.

**No seu game:**
```typescript
// Ao invés de fazer isso (ruim):
class Player {
  takeDamage() {
    this.health -= 10;
    // Acopla diretamente com UI e audio
    gameUI.updateHealthBar(this.health);
    audioManager.playSound('damage');
    achievementSystem.checkHealth(this.health);
  }
}

// Faça isso (bom):
class EventSystem {
  private listeners: { [event: string]: Function[] } = {};
  
  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  
  emit(event: string, data: any) {
    this.listeners[event]?.forEach(callback => callback(data));
  }
}

class Player {
  takeDamage() {
    this.health -= 10;
    EventSystem.emit('player:damage', { health: this.health });
  }
}

// UI, audio e achievements escutam independentemente
EventSystem.on('player:damage', (data) => gameUI.updateHealthBar(data.health));
EventSystem.on('player:damage', () => audioManager.playSound('damage'));
```

**Pegadinha comum:** Esquecer de remover listeners pode causar memory leaks!

### 2. **State Pattern**
*Para gerenciar estados do jogo*

**O que é:** Cada estado do jogo (menu, jogando, pausado) é uma classe separada.

**No seu game:**
```typescript
// Ao invés de um switch gigante (ruim):
class Game {
  currentState = 'menu';
  
  update() {
    switch(this.currentState) {
      case 'menu': /* 50 linhas */ break;
      case 'playing': /* 100 linhas */ break;
      case 'paused': /* 30 linhas */ break;
      case 'gameover': /* 40 linhas */ break;
    }
  }
}

// Faça isso (bom):
abstract class GameState {
  abstract enter(): void;
  abstract update(deltaTime: number): void;
  abstract exit(): void;
  abstract handleInput(input: InputEvent): void;
}

class MenuState extends GameState {
  enter() { this.showMenu(); }
  update(deltaTime: number) { this.updateMenuAnimations(); }
  handleInput(input: InputEvent) { 
    if (input.key === 'Enter') GameStateManager.changeState(new PlayingState());
  }
  exit() { this.hideMenu(); }
}

class GameStateManager {
  private static currentState: GameState;
  
  static changeState(newState: GameState) {
    this.currentState?.exit();
    this.currentState = newState;
    this.currentState.enter();
  }
}
```

### 3. **Factory Pattern**
*Para criar inimigos e power-ups*

**O que é:** Uma classe responsável por criar objetos específicos baseado em parâmetros.

**No seu game:**
```typescript
// Ao invés de criar manualmente (ruim):
function spawnEnemy(type: string) {
  if (type === 'basic') {
    return new Enemy(100, 2, 'basic_sprite.png');
  } else if (type === 'fast') {
    return new Enemy(50, 5, 'fast_sprite.png');
  }
  // ... mais 10 tipos
}

// Faça isso (bom):
class EnemyFactory {
  private static configs = {
    basic: { health: 100, speed: 2, sprite: 'basic_sprite.png' },
    fast: { health: 50, speed: 5, sprite: 'fast_sprite.png' },
    tank: { health: 300, speed: 1, sprite: 'tank_sprite.png' }
  };
  
  static create(type: string, x: number, y: number): Enemy {
    const config = this.configs[type];
    if (!config) throw new Error(`Enemy type ${type} not found`);
    
    return new Enemy(x, y, config.health, config.speed, config.sprite);
  }
}

// Uso simples:
const enemy = EnemyFactory.create('fast', 400, 0);
```

### 4. **Object Pool Pattern**
*Para projéteis e explosões*

**O que é:** Reutiliza objetos ao invés de criar/destruir constantemente.

**No seu game:**
```typescript
class BulletPool {
  private bullets: Bullet[] = [];
  private activeBullets: Bullet[] = [];
  
  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      this.bullets.push(new Bullet());
    }
  }
  
  getBullet(): Bullet | null {
    const bullet = this.bullets.pop();
    if (bullet) {
      this.activeBullets.push(bullet);
      return bullet;
    }
    return null; // Pool vazio
  }
  
  returnBullet(bullet: Bullet) {
    bullet.reset(); // Limpa estado
    const index = this.activeBullets.indexOf(bullet);
    if (index > -1) {
      this.activeBullets.splice(index, 1);
      this.bullets.push(bullet);
    }
  }
}
```

## Como Aplicar no Seu Projeto

### 1. **Comece com Observer Pattern**
- Implemente um EventSystem básico
- Substitua chamadas diretas por eventos
- Exemplo: `player.takeDamage()` → `EventSystem.emit('player:damage')`

### 2. **Refatore Estados**
- Identifique todos os estados do seu jogo
- Crie uma classe para cada estado
- Implemente transições controladas

### 3. **Use Factory para Spawn**
- Crie factories para inimigos, power-ups, projéteis
- Centralize configurações em arquivos JSON/objetos

## Exercícios Práticos

1. **Implementar EventSystem**: Crie eventos para score, vida, power-ups
2. **Refatorar GameState**: Separar menu/jogo/pause em classes
3. **Bullet Factory**: Criar diferentes tipos de projéteis
4. **Enemy Behavior**: Usar State Pattern para IA dos inimigos

## Pegadinhas Comuns

❌ **Não faça:**
- Observer sem cleanup (memory leaks)
- States que não limpam recursos no `exit()`
- Factory que não valida parâmetros
- Object Pool que não reseta objetos

✅ **Faça:**
- Sempre remova listeners
- Limpe recursos entre estados
- Valide inputs na Factory
- Reset completo no Pool

## Próximos Passos

1. Leia sobre **Component Pattern** (próximo artigo)
2. Pratique implementando um EventSystem simples
3. Identifique onde no seu código atual você pode aplicar esses patterns

---
*Lembre-se: Patterns são ferramentas, não regras. Use quando fazem sentido!*