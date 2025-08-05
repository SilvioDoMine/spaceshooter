# Entity Component System (ECS) para Games

## O que é ECS?

ECS é uma arquitetura que separa **dados** (Components) da **lógica** (Systems), organizados por **entidades** (Entities). É o padrão mais usado em engines modernas como Unity, Unreal, e Bevy.

## Por que ECS é Revolucionário?

### Problema da Herança Tradicional:
```typescript
// Hierarquia rígida - pesadelo para manter!
class GameObject {}
class MovableObject extends GameObject {}
class RenderableObject extends GameObject {}
class MovableRenderableObject extends MovableObject, RenderableObject {} // ❌ Não funciona!

// E se quiser um objeto que seja renderável mas não movível?
// E se quiser adicionar som só para alguns objetos?
// E se quiser objetos que se movem mas não são renderizados?
```

### Solução ECS:
```typescript
// Composição ao invés de herança!
const player = createEntity()
  .add(new PositionComponent(100, 100))
  .add(new VelocityComponent(0, 0))
  .add(new SpriteComponent('player.png'))
  .add(new HealthComponent(100))
  .add(new InputComponent());

// Fácil de combinar qualquer conjunto de características!
```

## Os 3 Pilares do ECS

### 1. **Entity** (Entidade)
*Um ID único que representa um "objeto" no jogo*

```typescript
type EntityID = number;

class EntityManager {
  private nextId = 1;
  private entities = new Set<EntityID>();
  
  createEntity(): EntityID {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }
  
  destroyEntity(id: EntityID) {
    this.entities.delete(id);
    // Remove todos os components desta entidade
    ComponentManager.removeAllComponents(id);
  }
}
```

### 2. **Component** (Componente)
*Apenas dados, SEM lógica*

```typescript
// ✅ CERTO: Só dados
class PositionComponent {
  constructor(public x: number = 0, public y: number = 0) {}
}

class VelocityComponent {
  constructor(public dx: number = 0, public dy: number = 0) {}
}

class SpriteComponent {
  constructor(
    public texture: string,
    public width: number = 32,
    public height: number = 32
  ) {}
}

class HealthComponent {
  constructor(
    public current: number = 100,
    public max: number = 100
  ) {}
}

// ❌ ERRADO: Lógica no component
class BadComponent {
  constructor(public x: number) {}
  
  update() { // ❌ Não! Components só têm dados
    this.x += 1;
  }
}
```

### 3. **System** (Sistema)
*Lógica pura que opera em components*

```typescript
// System processa entidades com components específicos
class MovementSystem {
  update(entities: EntityID[], deltaTime: number) {
    for (const entity of entities) {
      const position = ComponentManager.get(entity, PositionComponent);
      const velocity = ComponentManager.get(entity, VelocityComponent);
      
      // Só processa entidades que TÊM esses components
      if (position && velocity) {
        position.x += velocity.dx * deltaTime;
        position.y += velocity.dy * deltaTime;
      }
    }
  }
}

class RenderSystem {
  render(entities: EntityID[], ctx: CanvasRenderingContext2D) {
    for (const entity of entities) {
      const position = ComponentManager.get(entity, PositionComponent);
      const sprite = ComponentManager.get(entity, SpriteComponent);
      
      if (position && sprite) {
        ctx.drawImage(sprite.texture, position.x, position.y);
      }
    }
  }
}
```

## Implementação Simples para Seu SpaceShooter

### Component Manager
```typescript
class ComponentManager {
  // Cada tipo de component tem seu próprio Map
  private static components = new Map<string, Map<EntityID, any>>();
  
  static add<T>(entity: EntityID, component: T): void {
    const type = component.constructor.name;
    if (!this.components.has(type)) {
      this.components.set(type, new Map());
    }
    this.components.get(type)!.set(entity, component);
  }
  
  static get<T>(entity: EntityID, componentClass: new (...args: any[]) => T): T | undefined {
    const type = componentClass.name;
    return this.components.get(type)?.get(entity);
  }
  
  static remove<T>(entity: EntityID, componentClass: new (...args: any[]) => T): void {
    const type = componentClass.name;
    this.components.get(type)?.delete(entity);
  }
  
  static getEntitiesWith<T>(componentClass: new (...args: any[]) => T): EntityID[] {
    const type = componentClass.name;
    const componentMap = this.components.get(type);
    return componentMap ? Array.from(componentMap.keys()) : [];
  }
}
```

### Criando Entidades do Seu Jogo
```typescript
// Player
function createPlayer(x: number, y: number): EntityID {
  const player = EntityManager.createEntity();
  ComponentManager.add(player, new PositionComponent(x, y));
  ComponentManager.add(player, new VelocityComponent());
  ComponentManager.add(player, new SpriteComponent('player.png'));
  ComponentManager.add(player, new HealthComponent(100));
  ComponentManager.add(player, new InputComponent());
  ComponentManager.add(player, new WeaponComponent('laser', 10));
  return player;
}

// Inimigo básico
function createBasicEnemy(x: number, y: number): EntityID {
  const enemy = EntityManager.createEntity();
  ComponentManager.add(enemy, new PositionComponent(x, y));
  ComponentManager.add(enemy, new VelocityComponent(0, 2)); // Move pra baixo
  ComponentManager.add(enemy, new SpriteComponent('enemy_basic.png'));
  ComponentManager.add(enemy, new HealthComponent(50));
  ComponentManager.add(enemy, new AIComponent('linear')); // Comportamento simples
  return enemy;
}

// Projétil
function createBullet(x: number, y: number, direction: number): EntityID {
  const bullet = EntityManager.createEntity();
  ComponentManager.add(bullet, new PositionComponent(x, y));
  ComponentManager.add(bullet, new VelocityComponent(0, direction * 5));
  ComponentManager.add(bullet, new SpriteComponent('bullet.png'));
  ComponentManager.add(bullet, new DamageComponent(25));
  ComponentManager.add(bullet, new TTLComponent(3000)); // 3 segundos de vida
  return bullet;
}

// Power-up
function createHealthPowerUp(x: number, y: number): EntityID {
  const powerUp = EntityManager.createEntity();
  ComponentManager.add(powerUp, new PositionComponent(x, y));
  ComponentManager.add(powerUp, new VelocityComponent(0, 1));
  ComponentManager.add(powerUp, new SpriteComponent('health_powerup.png'));
  ComponentManager.add(powerUp, new PowerUpComponent('health', 25));
  return powerUp;
}
```

### Sistemas do Jogo
```typescript
class InputSystem {
  update(entities: EntityID[], input: KeyState) {
    for (const entity of entities) {
      const position = ComponentManager.get(entity, PositionComponent);
      const velocity = ComponentManager.get(entity, VelocityComponent);
      const inputComp = ComponentManager.get(entity, InputComponent);
      
      if (position && velocity && inputComp) {
        velocity.dx = 0;
        velocity.dy = 0;
        
        if (input.left) velocity.dx = -5;
        if (input.right) velocity.dx = 5;
        if (input.up) velocity.dy = -5;
        if (input.down) velocity.dy = 5;
      }
    }
  }
}

class CollisionSystem {
  update(entities: EntityID[]) {
    // Encontra todas as entidades com posição e que podem colidir
    const collidables = entities.filter(entity => 
      ComponentManager.get(entity, PositionComponent) &&
      (ComponentManager.get(entity, DamageComponent) || 
       ComponentManager.get(entity, HealthComponent) ||
       ComponentManager.get(entity, PowerUpComponent))
    );
    
    // Verifica colisões entre todas as combinações
    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        this.checkCollision(collidables[i], collidables[j]);
      }
    }
  }
  
  private checkCollision(entityA: EntityID, entityB: EntityID) {
    const posA = ComponentManager.get(entityA, PositionComponent)!;
    const posB = ComponentManager.get(entityB, PositionComponent)!;
    
    // Collision detection simples (pode melhorar)
    const distance = Math.sqrt((posA.x - posB.x) ** 2 + (posA.y - posB.y) ** 2);
    
    if (distance < 32) { // Colisão detectada
      this.handleCollision(entityA, entityB);
    }
  }
  
  private handleCollision(entityA: EntityID, entityB: EntityID) {
    // Lógica de colisão baseada nos components
    const damageA = ComponentManager.get(entityA, DamageComponent);
    const healthB = ComponentManager.get(entityB, HealthComponent);
    
    if (damageA && healthB) {
      healthB.current -= damageA.amount;
      EntityManager.destroyEntity(entityA); // Projétil some
      
      if (healthB.current <= 0) {
        EntityManager.destroyEntity(entityB); // Inimigo morre
      }
    }
  }
}

class TTLSystem {
  update(entities: EntityID[], deltaTime: number) {
    for (const entity of entities) {
      const ttl = ComponentManager.get(entity, TTLComponent);
      
      if (ttl) {
        ttl.timeLeft -= deltaTime;
        if (ttl.timeLeft <= 0) {
          EntityManager.destroyEntity(entity);
        }
      }
    }
  }
}
```

### Game Loop Principal
```typescript
class Game {
  private entities: EntityID[] = [];
  private systems = {
    input: new InputSystem(),
    movement: new MovementSystem(),
    collision: new CollisionSystem(),
    ttl: new TTLSystem(),
    render: new RenderSystem()
  };
  
  update(deltaTime: number, input: KeyState) {
    // Atualiza sistemas em ordem específica
    this.systems.input.update(this.entities, input);
    this.systems.movement.update(this.entities, deltaTime);
    this.systems.collision.update(this.entities);
    this.systems.ttl.update(this.entities, deltaTime);
    
    // Remove entidades mortas da lista
    this.entities = this.entities.filter(id => EntityManager.exists(id));
  }
  
  render(ctx: CanvasRenderingContext2D) {
    this.systems.render.render(this.entities, ctx);
  }
}
```

## Vantagens do ECS no Seu SpaceShooter

### 1. **Flexibilidade Total**
```typescript
// Quer um inimigo invisível? Remove SpriteComponent
// Quer um obstáculo imóvel? Remove VelocityComponent  
// Quer um power-up que atira? Adiciona WeaponComponent
```

### 2. **Performance**
- Systems processam arrays contíguos
- Menos cache misses
- Fácil paralelização

### 3. **Debugger-Friendly**
```typescript
// Fácil inspecionar qualquer entidade
function debugEntity(entity: EntityID) {
  console.log('Entity', entity, 'components:');
  console.log('Position:', ComponentManager.get(entity, PositionComponent));
  console.log('Health:', ComponentManager.get(entity, HealthComponent));
  console.log('Velocity:', ComponentManager.get(entity, VelocityComponent));
}
```

### 4. **Modular**
- Adicionar novos tipos de inimigos = novos components
- Novos comportamentos = novos systems
- Zero modificação no código existente

## Migração Gradual do Seu Código Atual

### Passo 1: Identifique Objetos
```typescript
// Current: class Player, class Enemy, class Bullet
// Future: createPlayer(), createEnemy(), createBullet()
```

### Passo 2: Extraia Dados
```typescript
// Move propriedades para Components
// Player.x, Player.y → PositionComponent
// Player.health → HealthComponent
```

### Passo 3: Extraia Lógica
```typescript
// Move métodos para Systems
// Player.move() → MovementSystem.update()
// Player.render() → RenderSystem.render()
```

## Exercícios Práticos

### 1. **Implemente ECS Básico**
- Crie EntityManager e ComponentManager
- Defina PositionComponent e VelocityComponent
- Implemente MovementSystem

### 2. **Converta Seu Player**
- Transforme class Player em createPlayer()
- Separe movimento, renderização e input

### 3. **Sistema de Power-ups**
- Crie PowerUpComponent
- Implemente PowerUpSystem
- Teste diferentes tipos

## Pegadinhas Comuns

❌ **Não faça:**
- Lógica nos Components
- Components que dependem uns dos outros
- Systems que modificam components de outros systems sem cuidado

✅ **Faça:**
- Components são só dados
- Systems são stateless quando possível  
- Use events para comunicação entre systems

## Ferramentas e Libs

### TypeScript/JavaScript:
- **ecsy**: ECS library robusta
- **bitecs**: Performance extrema
- **tick-knock**: Simples e leve

### Para Seu Projeto:
Comece com implementação própria simples, depois migre para lib se precisar.

## Próximos Passos

1. **Implemente** ECS básico (Entity + Component + 1 System)
2. **Converta** uma classe existente (Player ou Enemy)
3. **Adicione** mais systems gradualmente
4. **Leia** sobre Game State Management (próximo artigo)

---
*ECS parece complexo no início, mas vai revolucionar como você pensa sobre game architecture!*