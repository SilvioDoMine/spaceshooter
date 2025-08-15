# Plano de Implementação: Observer Pattern no SpaceShooter

## 📋 **Análise da Situação Atual**

### **Acoplamentos Diretos Identificados (PROBLEMÁTICOS):**

**No main.ts - Linha por linha dos problemas:**

1. **Linha ~380**: `uiSystem.updateHealth()` - chamada direta
2. **Linha ~381**: `uiSystem.updateAmmo()` - chamada direta  
3. **Linha ~382**: `uiSystem.updateScore()` - chamada direta
4. **Linha ~445**: `audioSystem.playSound('shoot')` - chamada direta
5. **Linha ~520**: `audioSystem.playSound('hit')` - chamada direta
6. **Linha ~530**: `audioSystem.playSound('explosion')` - chamada direta
7. **Linha ~540**: `gameStateManager.incrementStat()` - chamada direta
8. **Linha ~565**: `gameStateManager.endGame()` - chamada direta

### **Por que o Documento Está Errado?**

O documento sugere começar pelo **Player**, mas na sua arquitetura:

❌ **Problema 1**: Não há uma classe `Player` - a lógica do player está **espalhada no main.ts**
❌ **Problema 2**: Os acoplamentos críticos estão no **loop principal do jogo**, não numa entidade Player
❌ **Problema 3**: Começar pelo Player não resolve os acoplamentos dos **sistemas núcleo**

## 🎯 **Plano Estratégico Correto**

### **Ordem de Implementação (Do Núcleo Para as Folhas):**

```
INFRAESTRUTURA → NÚCLEO → GAMEPLAY → POLIMENTO
```

---

## 📚 **FASE 1: INFRAESTRUTURA (Semana 1)**

### **1.1 Criar EventBus Central**
**Arquivo**: `packages/client/src/core/EventBus.ts`

**Funcionalidades**:
- Sistema de subscription/unsubscription  
- Tipagem forte dos eventos
- Namespace de eventos por sistema
- Debug mode para desenvolvimento
- Performance tracking

**Eventos Essenciais a Definir**:
```typescript
// Game State Events
'game:start', 'game:pause', 'game:resume', 'game:over'

// Player Events  
'player:damage', 'player:heal', 'player:ammo-change', 'player:death'

// Combat Events
'projectile:fired', 'enemy:hit', 'enemy:destroyed', 'enemy:escaped'

// Powerup Events
'powerup:collected', 'powerup:spawned'

// UI Events
'ui:score-update', 'ui:health-update', 'ui:ammo-update'

// Audio Events
'audio:play-sound', 'audio:play-music'
```

### **1.2 Definir Types Centralizados** 
**Arquivo**: `packages/shared/src/events/GameEvents.ts`

**Conteúdo**:
- Interface de todos os eventos
- Payload types para cada evento  
- Event constants/enums
- Validation schemas

---

## 🧠 **FASE 2: NÚCLEO (Semana 2-3)**

### **2.1 Refatorar GameStateManager**
**Por que primeiro?** É o **cérebro** do jogo - todos outros sistemas dependem dele.

**Mudanças**:
- ✅ **Já tem callbacks** - expandir para EventBus
- ✅ Emitir eventos de mudança de estado
- ✅ Escutar eventos de fim de jogo
- ✅ Centralizar estatísticas via eventos

**Prioridade**: 🔴 **CRÍTICA**

### **2.2 Refatorar RenderingSystem**  
**Por que segundo?** Sem ele, não vemos nada.

**Mudanças**:
- Escutar eventos de spawn/destroy para adicionar/remover objetos 3D
- Emitir eventos de renderização completada
- Gerenciar câmera via eventos

**Prioridade**: 🔴 **CRÍTICA**

### **2.3 Refatorar InputSystem**
**Por que terceiro?** Controla todas as interações.

**Mudanças**:
- Emitir eventos de input ao invés de callbacks diretos
- Permitir múltiplos listeners para mesma tecla
- Estados de input via eventos

**Prioridade**: 🔴 **CRÍTICA**

---

## 🎮 **FASE 3: GAMEPLAY (Semana 4-5)**

### **3.1 Extrair Player Class**
**Por que agora?** Núcleo já está desacoplado, Player pode usar eventos.

**Nova Estrutura**:
```typescript
class Player {
  // Emite eventos ao invés de chamadas diretas
  takeDamage() {
    this.health -= damage;
    EventBus.emit('player:damage', { health: this.health, damage });
  }
  
  shoot() {
    if (this.ammo > 0) {
      this.ammo--;
      EventBus.emit('projectile:fired', { position: this.position });
      EventBus.emit('player:ammo-change', { ammo: this.ammo });
    }
  }
}
```

### **3.2 Refatorar Collision System**
- Emitir eventos de colisão ao invés de processar diretamente
- Separar detecção de reação

### **3.3 Refatorar Spawn Systems** 
- Emitir eventos de spawn para desacoplar criação visual

---

## 💎 **FASE 4: POLIMENTO (Semana 6)**

### **4.1 Refatorar UISystem**
**Mudanças**:
- Escutar eventos ao invés de receber chamadas diretas
- Auto-update baseado em eventos
- Animações reativas a eventos

### **4.2 Refatorar AudioSystem**  
**Mudanças**:
- Escutar eventos de audio ao invés de chamadas diretas
- Queue de sons e controle de volume por evento
- Música adaptativa baseada em game state

### **4.3 Refatorar ParticleSystem**
**Mudanças**:
- Reagir a eventos de explosão/impacto automaticamente
- Efeitos visuais baseados em eventos de gameplay

---

## 🎯 **Resultados Esperados**

### **Antes (Atual)**:
```typescript
// main.ts - ACOPLADO
function handleEnemyHit() {
  playerHealth -= damage;
  uiSystem.updateHealth(playerHealth);      // ❌ Direto
  audioSystem.playSound('hit');            // ❌ Direto  
  gameStateManager.incrementStat('hits');  // ❌ Direto
}
```

### **Depois (Desacoplado)**:
```typescript  
// Player.ts - DESACOPLADO
class Player {
  takeDamage(damage: number) {
    this.health -= damage;
    EventBus.emit('player:damage', { 
      health: this.health, 
      damage, 
      position: this.position 
    });
  }
}

// Sistemas escutam independentemente:
// UISystem.ts
EventBus.on('player:damage', (data) => this.updateHealth(data.health));

// AudioSystem.ts  
EventBus.on('player:damage', () => this.playSound('hit'));

// GameStateManager.ts
EventBus.on('player:damage', () => this.incrementStat('hits'));
```

---

## 📊 **Métricas de Sucesso**

### **Técnicas**:
- ✅ Zero chamadas diretas entre sistemas no main.ts
- ✅ Sistemas podem ser removidos sem quebrar o código  
- ✅ Novos sistemas podem ser adicionados sem modificar existentes
- ✅ Cobertura de testes para eventos críticos

### **Qualidade**:
- ✅ Código mais limpo e legível
- ✅ Debugging mais fácil com event logs
- ✅ Extensibilidade para multiplayer
- ✅ Performance mantida ou melhorada

---

## ⚠️ **Riscos e Mitigações**

### **Risco 1**: Over-engineering
**Mitigação**: Começar com eventos essenciais, expandir gradualmente

### **Risco 2**: Performance degradation  
**Mitigação**: Benchmarking antes/depois, otimização do EventBus

### **Risco 3**: Event spaghetti
**Mitigação**: Nomenclatura consistente, documentação clara

### **Risco 4**: Memory leaks
**Mitigação**: Auto-cleanup de listeners, weak references onde necessário

---

## 🧪 **Testes de Cada Fase**

### **Fase 1**: 
- ✅ EventBus registra e emite eventos
- ✅ Tipagem funciona corretamente
- ✅ Multiple listeners para mesmo evento

### **Fase 2**:
- ✅ Game state changes via eventos
- ✅ Rendering reage a spawn/destroy events  
- ✅ Input events são emitidos corretamente

### **Fase 3**:
- ✅ Player actions emitem eventos
- ✅ Combat system totalmente baseado em eventos
- ✅ Collisions desacopladas

### **Fase 4**:  
- ✅ UI atualiza automaticamente via eventos
- ✅ Audio reage a gameplay events
- ✅ Particles são automáticos

---

## 🚀 **Próximos Passos**

1. **Confirmar o plano** com você
2. **Implementar EventBus** (Fase 1.1)
3. **Definir tipos de eventos** (Fase 1.2)  
4. **Refatorar GameStateManager** (Fase 2.1)
5. **Iteração e testes constantes**

---

**🎯 Meta Final**: Um spaceshooter totalmente desacoplado, onde sistemas se comunicam apenas via eventos, permitindo fácil extensão, teste e manutenção.