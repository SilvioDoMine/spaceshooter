# Guia de Arquitetura: Eventos vs Injeção de Dependências

## 🎯 Objetivo

Este guia define quando usar **eventos** vs **injeção de dependências** no SpaceShooter, estabelecendo padrões claros para manter o código organizador e performático.

## 📋 Regras Gerais

### ✅ USE INJEÇÃO DE DEPENDÊNCIAS para:

1. **Relacionamentos diretos entre sistemas**
   ```typescript
   class EntitySystem {
     constructor(eventBus: EventBus, renderingSystem: RenderingSystem) {
       this.renderingSystem = renderingSystem; // ✅ Dependência direta
     }
   }
   ```

2. **Operações síncronas e determinísticas**
   ```typescript
   // ✅ Renderização direta
   this.renderingSystem.render();
   
   // ✅ Atualizações do game loop
   this.entitySystem.update(deltaTime);
   ```

3. **Acesso a recursos compartilhados**
   ```typescript
   // ✅ Acesso direto à scene
   this.renderingSystem.addToScene(mesh);
   this.renderingSystem.scene.add(object);
   ```

4. **Chamadas que precisam de retorno**
   ```typescript
   // ✅ Operações que retornam valores
   const material = this.renderingSystem.createTexturedMaterial(config);
   const player = this.entitySystem.getPlayer();
   ```

### ✅ USE EVENTOS para:

1. **Notificações de mudança de estado**
   ```typescript
   // ✅ Mudanças de estado do jogo
   this.eventBus.emit('game:started', { difficulty: 'normal' });
   this.eventBus.emit('game:over', { finalScore: 1000, stats });
   ```

2. **Atualizações de UI**
   ```typescript
   // ✅ UI reativa às mudanças
   this.eventBus.emit('ui:update-score', { score: newScore, delta: 100 });
   this.eventBus.emit('ui:update-health', { current: 80, max: 100 });
   ```

3. **Interações entre entidades**
   ```typescript
   // ✅ Colisões e interações
   this.eventBus.emit('collision:projectile-enemy', {
     projectileId: '123',
     position: { x: 10, y: 20 },
     damage: 50
   });
   ```

4. **Efeitos visuais e sonoros**
   ```typescript
   // ✅ Efeitos loose-coupled
   this.eventBus.emit('particles:explosion', { position: { x: 0, y: 0, z: 0 } });
   this.eventBus.emit('audio:play', { soundId: 'explosion' });
   ```

5. **Input handling**
   ```typescript
   // ✅ Input desacoplado
   this.eventBus.emit('input:action', { action: 'shoot', pressed: true });
   ```

## 🚫 Antipadrões - O que NÃO fazer

### ❌ NÃO use eventos para:

1. **Operações síncronas diretas**
   ```typescript
   // ❌ RUIM - Usar evento para render
   this.eventBus.emit('renderer:render-frame', {});
   
   // ✅ BOM - Chamar diretamente
   this.renderingSystem.render();
   ```

2. **Request/Response patterns**
   ```typescript
   // ❌ RUIM - Request via evento com callback
   this.eventBus.emit('materials:create-textured', { config, requestId });
   
   // ✅ BOM - Chamar diretamente
   const material = this.renderingSystem.createTexturedMaterial(config);
   ```

3. **Game loop core**
   ```typescript
   // ❌ RUIM - Game loop via eventos
   this.eventBus.emit('entities:update', { deltaTime });
   this.eventBus.emit('particles:update', { deltaTime });
   
   // ✅ BOM - Chamadas diretas
   this.entitySystem.update(deltaTime);
   this.particleSystem.update(deltaTime);
   ```

### ❌ NÃO use injeção para:

1. **Notificações opcionais**
   ```typescript
   // ❌ RUIM - Injetar UI para notificar score
   constructor(uiSystem: UISystem) { /* */ }
   
   // ✅ BOM - Evento para UI reativa
   this.eventBus.emit('ui:update-score', { score: newScore });
   ```

2. **Efeitos visuais temporários**
   ```typescript
   // ❌ RUIM - Injetar ParticleSystem em todas entidades
   constructor(particleSystem: ParticleSystem) { /* */ }
   
   // ✅ BOM - Evento para efeito
   this.eventBus.emit('particles:explosion', { position });
   ```

## 📊 Arquitetura Atual

### Core Systems (Dependency Injection)
```
Game
├── RenderingSystem (injected)
├── EntitySystem (injected)
├── ParticleSystem (injected)
├── GameStateManager (injected)
├── InputSystem (injected)
├── UISystem (injected)
├── AudioSystem (injected)
└── MenuSystem (injected)
```

### Event Flow (Loose Coupling)
```
Input → Events → Systems
Game State → Events → UI
Entity Interactions → Events → Systems
Player Actions → Events → UI + Audio + Particles
```

## 🔄 Fluxo de Dados

### Game Loop (Direct Dependencies)
```typescript
private gameLoop = (): void => {
  // ✅ Chamadas diretas para performance
  if (this.gameStateManager.isPlaying()) {
    this.entitySystem.update(deltaTime);      // Direct
    this.particleSystem.update(deltaTime);    // Direct
  }
  this.renderingSystem.render();               // Direct
};
```

### State Changes (Events)
```typescript
// ✅ Mudança de estado notifica todos interessados
onPlayerDeath() {
  this.eventBus.emit('game:over', { finalScore, stats }); // Event
  // GameStateManager, UISystem, MenuSystem reagem automaticamente
}
```

## 🏗️ Patterns de Implementação

### 1. System Dependencies
```typescript
export class EntitySystem {
  constructor(
    private eventBus: EventBus,           // Para eventos
    private renderingSystem: RenderingSystem // Para operações diretas
  ) {}
  
  // Use direct calls para performance
  private addToScene(object: THREE.Object3D) {
    this.renderingSystem.addToScene(object);
  }
  
  // Use events para notificações
  private notifyScoreChange(points: number) {
    this.eventBus.emit('ui:update-score', { score: points });
  }
}
```

### 2. Entity Pattern
```typescript
export class Player extends Entity {
  constructor(
    private eventBus: EventBus,           // Para eventos
    private renderingSystem: RenderingSystem, // Para scene operations
    private projectileSystem: ProjectileSystem // Para direct projectile creation
  ) {}
  
  shoot() {
    // Direct call para criar projétil
    this.projectileSystem.createProjectile(/* ... */);
    
    // Event para efeitos
    this.eventBus.emit('audio:play', { soundId: 'shoot' });
  }
}
```

## 🎯 Benefícios da Arquitetura

### Performance
- **Game loop** usa chamadas diretas = sem overhead de eventos
- **Core systems** têm acesso direto aos recursos que precisam
- **Eventos** apenas onde loose coupling é necessário

### Manutenibilidade
- **Dependências explícitas** no construtor = fácil de entender
- **Eventos documentados** em GameEventMap = contrato claro
- **Separação clara** de responsabilidades

### Testabilidade
- **Sistemas isolados** com dependências injetadas = fácil de mockar
- **Eventos discretos** = fácil de testar isoladamente
- **Fluxo determinístico** no core game loop

## 📝 Checklist para Novos Features

Antes de implementar algo novo, pergunte:

1. ✅ **Precisa ser síncrono e determinístico?** → Use injeção de dependência
2. ✅ **É uma notificação que outros sistemas podem querer escutar?** → Use evento
3. ✅ **É parte do core game loop?** → Use injeção de dependência
4. ✅ **É um efeito visual/sonoro temporal?** → Use evento
5. ✅ **Precisa de retorno/valor?** → Use injeção de dependência
6. ✅ **É input do usuário?** → Use evento
7. ✅ **É mudança de estado do jogo?** → Use evento
8. ✅ **É atualização de UI?** → Use evento

---

Esta arquitetura garante que tenhamos o melhor dos dois mundos: **performance** onde é crítica e **flexibilidade** onde é necessária.