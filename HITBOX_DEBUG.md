# 🎯 Sistema de Debug de Hitboxes

## Como Usar

1. **Inicie o jogo normalmente**
2. **Pressione a tecla `H`** para ativar/desativar as hitboxes
3. **Círculos vermelhos wireframe** aparecerão ao redor de todas as entidades

## Características

### ✅ **O que é Mostrado**
- **Player**: Círculo vermelho com raio `0.3`
- **Enemies**: 
  - Basic: raio `0.15` (size 0.3 ÷ 2)
  - Fast: raio `0.1` (size 0.2 ÷ 2) 
  - Heavy: raio `0.25` (size 0.5 ÷ 2)
- **Projéteis**: raio `0.1`
- **Power-ups**: raio `0.2-0.25`

### 🔄 **Atualização Automática**
- Hitboxes se movem junto com as entidades
- Remoção automática quando entidade é destruída
- Performance otimizada (só renderiza quando ativo)

### 🎨 **Visual**
- Material wireframe vermelho semi-transparente
- Posicionado ligeiramente à frente (z: 0.01)
- Círculos com 16 segmentos para boa qualidade visual

## Implementação Técnica

### **Arquivos Modificados**
- `RenderingSystem.ts`: Sistema principal de debug
- `EventBus.ts`: Eventos debug adicionados
- `Enemy.ts`: Integração com debug
- `Player.ts`: Integração com debug
- `Entity.ts`: Cleanup automático

### **Eventos Utilizados**
```typescript
'debug:show-hitboxes': {}  // Toggle global
'debug:hitbox-create': { entityId, position, radius }
'debug:hitbox-update': { entityId, position }
'debug:hitbox-remove': { entityId }
```

### **Controles**
- **Tecla H**: Liga/desliga hitboxes
- **Console**: Mostra "🎯 Hitboxes: ON/OFF"

## Expandindo para Outras Entidades

Para adicionar debug a novas entidades:

1. **No setupEventHandlers()**:
```typescript
const unsubscribeDebug = this.eventBus.on('debug:show-hitboxes', () => {
  this.createDebugHitbox();
});
```

2. **Adicionar métodos**:
```typescript
private createDebugHitbox(): void {
  const radius = YOUR_COLLISION_RADIUS;
  this.eventBus.emit('debug:hitbox-create', {
    entityId: this.id,
    position: { x: this.position.x, y: this.position.y, z: 0.01 },
    radius: radius
  });
}

public updateDebugHitbox(): void {
  this.eventBus.emit('debug:hitbox-update', {
    entityId: this.id,
    position: { x: this.position.x, y: this.position.y, z: 0.01 }
  });
}
```

3. **No onUpdate()**:
```typescript
this.updateDebugHitbox();
```

## Performance

- **Overhead mínimo**: Só ativa quando necessário
- **Cleanup automático**: Remove recursos corretamente
- **Events silenciados**: Debug events não fazem spam no console
- **Memory safe**: Dispose correto de geometrias Three.js

Sistema implementado seguindo os padrões arquiteturais existentes do projeto!