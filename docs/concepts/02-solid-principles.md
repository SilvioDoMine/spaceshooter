# SOLID Principles em Game Development

## O que é SOLID?

SOLID são 5 princípios fundamentais para escrever código limpo e maintível. Em games, eles ajudam a evitar o "código espaguete" que é comum em projetos que crescem rapidamente.

## Os 5 Princípios Explicados

### 1. **S - Single Responsibility Principle (SRP)**
*Uma classe deve ter apenas uma razão para mudar*

**❌ Problema comum no seu SpaceShooter:**
```typescript
// Esta classe faz MUITA coisa
class Player {
  x: number;
  y: number;
  health: number;
  
  // Responsabilidade 1: Movimento
  move(direction: string) { /* ... */ }
  
  // Responsabilidade 2: Renderização
  render(ctx: CanvasRenderingContext2D) { /* ... */ }
  
  // Responsabilidade 3: Som
  playShootSound() { /* ... */ }
  
  // Responsabilidade 4: Input
  handleInput(keys: KeyState) { /* ... */ }
  
  // Responsabilidade 5: Colisão
  checkCollision(other: GameObject) { /* ... */ }
}
```

**✅ Solução (separar responsabilidades):**
```typescript
// Só dados e lógica core
class Player {
  x: number;
  y: number;
  health: number;
  
  takeDamage(amount: number) {
    this.health -= amount;
  }
}

// Cada sistema tem sua responsabilidade
class MovementSystem {
  movePlayer(player: Player, direction: string, speed: number) { /* ... */ }
}

class RenderSystem {
  renderPlayer(player: Player, ctx: CanvasRenderingContext2D) { /* ... */ }
}

class InputSystem {
  handlePlayerInput(player: Player, keys: KeyState) { /* ... */ }
}
```

### 2. **O - Open/Closed Principle (OCP)**
*Aberto para extensão, fechado para modificação*

**❌ Problema:**
```typescript
class Enemy {
  type: string;
  
  move() {
    if (this.type === 'basic') {
      // Movimento linear
    } else if (this.type === 'zigzag') {
      // Movimento em zigzag
    } else if (this.type === 'circular') {
      // Movimento circular
    }
    // Toda vez que adicionar novo tipo, precisa modificar aqui!
  }
}
```

**✅ Solução (usar herança/composição):**
```typescript
abstract class Enemy {
  abstract move(): void;
}

class BasicEnemy extends Enemy {
  move() {
    // Movimento linear
  }
}

class ZigzagEnemy extends Enemy {
  move() {
    // Movimento em zigzag
  }
}

// Adicionar novo tipo SEM modificar código existente
class CircularEnemy extends Enemy {
  move() {
    // Movimento circular
  }
}
```

### 3. **L - Liskov Substitution Principle (LSP)**
*Subclasses devem poder substituir suas classes pai*

**❌ Problema:**
```typescript
class PowerUp {
  applyEffect(player: Player) {
    // Aplica efeito normal
  }
}

class HealthPowerUp extends PowerUp {
  applyEffect(player: Player) {
    if (player.health >= player.maxHealth) {
      throw new Error("Já está com vida cheia!"); // Quebra o contrato!
    }
    player.health += 25;
  }
}
```

**✅ Solução:**
```typescript
class PowerUp {
  applyEffect(player: Player): boolean {
    return true; // Sempre deve funcionar
  }
}

class HealthPowerUp extends PowerUp {
  applyEffect(player: Player): boolean {
    if (player.health >= player.maxHealth) {
      return false; // Não aplicou, mas não quebrou
    }
    player.health += 25;
    return true;
  }
}

// Agora pode usar qualquer PowerUp sem se preocupar
function collectPowerUp(powerUp: PowerUp, player: Player) {
  const applied = powerUp.applyEffect(player);
  if (applied) {
    EventSystem.emit('powerup:collected');
  }
}
```

### 4. **I - Interface Segregation Principle (ISP)**
*Não force classes a implementar interfaces que não usam*

**❌ Problema:**
```typescript
interface GameObject {
  update(): void;
  render(): void;
  playSound(): void;
  handleInput(): void;
  checkCollision(): void;
}

// Background não precisa de input nem colisão!
class Background implements GameObject {
  update() { /* ok */ }
  render() { /* ok */ }
  playSound() { /* não faz sentido */ throw new Error(); }
  handleInput() { /* não faz sentido */ throw new Error(); }
  checkCollision() { /* não faz sentido */ throw new Error(); }
}
```

**✅ Solução (interfaces específicas):**
```typescript
interface Updatable {
  update(): void;
}

interface Renderable {
  render(): void;
}

interface Collidable {
  checkCollision(other: Collidable): boolean;
}

interface Controllable {
  handleInput(input: InputEvent): void;
}

// Agora cada classe implementa só o que precisa
class Background implements Updatable, Renderable {
  update() { /* ... */ }
  render() { /* ... */ }
}

class Player implements Updatable, Renderable, Collidable, Controllable {
  update() { /* ... */ }
  render() { /* ... */ }
  checkCollision(other: Collidable) { /* ... */ }
  handleInput(input: InputEvent) { /* ... */ }
}
```

### 5. **D - Dependency Inversion Principle (DIP)**
*Dependa de abstrações, não de implementações concretas*

**❌ Problema:**
```typescript
class Game {
  private audioManager = new WebAudioManager(); // Dependência concreta!
  private renderer = new CanvasRenderer(); // Dependência concreta!
  
  playSound(sound: string) {
    this.audioManager.play(sound); // Se mudar pra outra lib, quebra tudo
  }
}
```

**✅ Solução (usar interfaces):**
```typescript
interface AudioManager {
  play(sound: string): void;
  stop(sound: string): void;
}

interface Renderer {
  drawSprite(sprite: Sprite, x: number, y: number): void;
}

class Game {
  constructor(
    private audioManager: AudioManager, // Aceita qualquer implementação
    private renderer: Renderer
  ) {}
  
  playSound(sound: string) {
    this.audioManager.play(sound); // Funciona com qualquer AudioManager
  }
}

// Diferentes implementações
class WebAudioManager implements AudioManager { /* ... */ }
class HowlerAudioManager implements AudioManager { /* ... */ }
class CanvasRenderer implements Renderer { /* ... */ }
class WebGLRenderer implements Renderer { /* ... */ }

// Injeção de dependência
const game = new Game(
  new WebAudioManager(),
  new CanvasRenderer()
);
```

## Como Aplicar no Seu SpaceShooter

### Passo 1: Identifique Violações
```typescript
// Procure por classes que fazem muita coisa (SRP)
// Procure por if/else ou switch grandes (OCP)
// Procure por dependências diretas (DIP)
```

### Passo 2: Refatore Gradualmente
1. **Comece com SRP**: Separar renderização da lógica
2. **Aplique OCP**: Usar herança para tipos de inimigos
3. **Use ISP**: Criar interfaces pequenas e específicas
4. **Implemente DIP**: Injetar dependências via constructor

### Exemplo Prático: Refatorando Sistema de Inimigos

**Antes (violando vários princípios):**
```typescript
class Enemy {
  move() {
    if (this.type === 'basic') { /* ... */ }
    else if (this.type === 'boss') { /* ... */ }
  }
  
  render(ctx: CanvasRenderingContext2D) { /* ... */ }
  playSound() { /* ... */ }
  checkCollision() { /* ... */ }
}
```

**Depois (seguindo SOLID):**
```typescript
// SRP: Separar responsabilidades
abstract class Enemy implements Updatable, Renderable, Collidable {
  constructor(protected audioManager: AudioManager) {} // DIP
  
  abstract update(): void; // OCP: Extensível
  abstract render(renderer: Renderer): void;
  abstract checkCollision(other: Collidable): boolean;
}

// OCP: Extensível sem modificar classe base
class BasicEnemy extends Enemy {
  update() { /* movimento linear */ }
  render(renderer: Renderer) { renderer.drawSprite(this.sprite, this.x, this.y); }
  checkCollision(other: Collidable) { /* ... */ }
}

class BossEnemy extends Enemy {
  update() { /* movimento complexo */ }
  render(renderer: Renderer) { /* renderização especial */ }
  checkCollision(other: Collidable) { /* hitbox especial */ }
}
```

## Exercícios Práticos

### 1. **Refatore sua classe Player**
- Separe movimento, renderização e input
- Use dependency injection para AudioManager

### 2. **Crie hierarquia de PowerUps**
- Use OCP para diferentes tipos
- Implemente LSP corretamente

### 3. **Analise seu código atual**
- Identifique classes com muitas responsabilidades
- Procure por dependências diretas

## Pegadinhas Comuns

❌ **Não exagere:**
- Não crie interfaces para tudo (YAGNI - You Ain't Gonna Need It)
- Não force herança onde composição é melhor

❌ **Não confunda:**
- SRP não significa "uma função por classe"
- OCP não significa "nunca modificar código"

✅ **Faça:**
- Refatore gradualmente
- Teste cada mudança
- Mantenha o código funcionando

## Sinais de que Você Está Aplicando SOLID Corretamente

- ✅ Fácil adicionar novos tipos de inimigos
- ✅ Fácil trocar sistema de audio/renderização  
- ✅ Classes pequenas e focadas
- ✅ Testes unitários são possíveis
- ✅ Mudanças não quebram código não relacionado

## Próximos Passos

1. **Identifique** violações no seu código atual
2. **Refatore** uma classe por vez
3. **Teste** para garantir que não quebrou nada
4. **Leia** sobre Entity Component System (próximo artigo)

---
*SOLID não é dogma - é uma ferramenta para escrever código mais maintível!*