# Refatorando main.ts - Guia Conceitual

## Análise do Problema

Seu `main.ts` está com **1049 linhas** e concentra múltiplas responsabilidades:

1. **Inicialização de sistemas** (renderização, áudio, input, UI, partículas)
2. **Gerenciamento de estado do jogo** (saúde, munição, pontuação)
3. **Lógica de gameplay** (spawn de inimigos, tiro, movimento)
4. **Sistema de colisões** (projéteis vs inimigos, jogador vs inimigos/power-ups)
5. **Loop principal de animação**
6. **Configuração de callbacks e eventos**

## Princípios de Refatoração

### 1. Single Responsibility Principle (SRP)
Cada classe/módulo deve ter apenas uma razão para mudar. Atualmente seu main.ts muda por qualquer motivo relacionado ao jogo.

### 2. Separation of Concerns
Separar as preocupações permite:
- **Manutenibilidade**: Mais fácil encontrar e corrigir bugs
- **Testabilidade**: Testar partes isoladas
- **Reutilização**: Componentes podem ser usados em outros contextos
- **Colaboração**: Diferentes desenvolvedores podem trabalhar em partes diferentes

### 3. Dependency Injection
Em vez de criar dependências internamente, receba-as como parâmetros. Isso facilita testes e torna o código mais flexível.

## Estrutura Atual (Já Implementada!)

Você já fez uma excelente refatoração! Sua estrutura atual faz muito sentido:

```
packages/
├── shared/                   # ✅ Tipos e configs compartilhados
│   └── src/index.ts         # Interfaces, configurações, utilitários
├── client/src/
│   ├── main.ts              # ✅ Inicialização limpa (185 linhas!)
│   ├── core/                # ✅ Sistemas centrais
│   │   ├── GameManager.ts   # Orquestrador principal
│   │   ├── EntityManager.ts # Gerenciamento de entidades
│   │   ├── CollisionSystem.ts # Detecção de colisões
│   │   ├── SpawnSystem.ts   # Controle de spawn
│   │   └── GameLoop.ts      # Loop principal
│   ├── game/                # ✅ Estado do jogo
│   │   └── GameState.ts     # Estado centralizado
│   ├── systems/             # ✅ Sistemas especializados
│   │   ├── RenderingSystem.ts # Three.js
│   │   ├── AudioSystem.ts   # Som
│   │   ├── InputSystem.ts   # Controles
│   │   └── UISystem.ts      # Interface
│   └── assets/              # ✅ Carregamento de assets
└── server/                  # 🚀 Futuro servidor
    └── src/server.ts        # Lógica autoritativa
```

## Por que essa estrutura faz sentido:

### 1. **Separação Client/Server Correta**
- **Client**: Foca em renderização, input, UI, áudio
- **Server**: Focará em lógica autoritativa, anti-cheat
- **Shared**: Mantém contratos comuns entre ambos

### 2. **Escalabilidade**
- Cada sistema pode crescer independentemente
- Fácil adicionar novos sistemas sem quebrar existentes
- Server pode reutilizar shared sem puxar código de renderização

## Passos da Refatoração

### Fase 1: Extrair Estado do Jogo
**Por que**: Centralizar o estado facilita debugging e torna as mudanças mais previsíveis.

```typescript
// GameState.ts - exemplo conceitual
export class GameState {
  public playerHealth: number = 100;
  public playerAmmo: number = 30;
  public gameScore: number = 0;
  
  // Métodos para modificar estado de forma controlada
  public takeDamage(amount: number): void
  public addAmmo(amount: number): void
  public addScore(points: number): void
}
```

### Fase 2: Extrair Entidades
**Por que**: Cada tipo de objeto deve conhecer sua própria lógica de comportamento.

```typescript
// Player.ts - exemplo conceitual
export class Player {
  constructor(private gameState: GameState, private inputSystem: InputSystem) {}
  
  public update(deltaTime: number): void {
    this.handleMovement(deltaTime);
    this.handleShooting();
  }
  
  private handleMovement(deltaTime: number): void {
    // Lógica de movimento baseada no input
  }
}
```

### Fase 3: Extrair Managers
**Por que**: Sistemas complexos como colisões e spawn precisam de lógica dedicada.

```typescript
// CollisionManager.ts - exemplo conceitual
export class CollisionManager {
  public checkAllCollisions(
    projectiles: Map<string, ProjectileEntity>,
    enemies: Map<string, EnemyEntity>,
    player: Player
  ): void {
    this.checkProjectileEnemyCollisions(projectiles, enemies);
    this.checkPlayerEnemyCollisions(player, enemies);
  }
}
```

### Fase 4: GameEngine como Orquestrador
**Por que**: Um ponto central que coordena todos os sistemas sem conhecer os detalhes internos.

```typescript
// GameEngine.ts - exemplo conceitual
export class GameEngine {
  constructor(
    private gameState: GameState,
    private player: Player,
    private collisionManager: CollisionManager,
    // ... outros managers
  ) {}
  
  public update(deltaTime: number): void {
    if (!this.gameStateManager.isPlaying()) return;
    
    this.player.update(deltaTime);
    this.spawnManager.update(deltaTime);
    this.collisionManager.checkAllCollisions(/*...*/);
    // ...
  }
}
```

## Benefícios da Refatoração

### 1. **Facilita Testes**
- Cada classe pode ser testada isoladamente
- Mocks podem ser injetados para simular dependências
- Bugs são mais fáceis de reproduzir e corrigir

### 2. **Melhora Performance**
- Sistemas podem ser otimizados independentemente
- Facilita implementação de object pooling
- Permite paralelização de sistemas independentes

### 3. **Facilita Adição de Features**
- Novo tipo de inimigo? Só mexe no sistema de inimigos
- Nova arma? Só mexe no sistema de projéteis
- Novo power-up? Só mexe nesse sistema específico

### 4. **Facilita Debugging**
- Logs mais específicos por sistema
- Estado centralizado é mais fácil de monitorar
- Breakpoints em lugares mais específicos

## Ordem de Implementação Recomendada

1. **GameState** - Comece centralizando o estado
2. **Player** - Extraia a lógica do jogador
3. **SpawnManager** - Centralize toda lógica de spawn
4. **CollisionManager** - Isole a detecção de colisões
5. **GameEngine** - Orquestre tudo
6. **main.ts** - Simplifique para só fazer setup inicial

## Pontos de Atenção

### 1. **Evite Refatoração Grande Bang**
- Faça incrementalmente
- Teste após cada mudança
- Mantenha backup do código funcionando

### 2. **Considere Performance**
- Sistemas que rodam todo frame precisam ser eficientes
- Evite criação excessiva de objetos no loop principal
- Considere object pooling para projéteis/inimigos

### 3. **Mantenha Interfaces Simples**
- Métodos públicos devem ter propósito claro
- Evite vazamento de detalhes internos
- Prefira composição sobre herança

### 4. **Documentation**
- Documente decisões de design
- Explique o "por que", não só o "como"
- Mantenha README atualizado

## Conclusão

A refatoração é um investimento no futuro do seu código. Embora tome tempo inicial, ela:
- Reduz tempo de desenvolvimento de novas features
- Diminui bugs
- Facilita manutenção
- Melhora a experiência de desenvolvimento

Comece pequeno, teste muito, e evolua gradualmente. O objetivo é ter um código que seja um prazer de trabalhar, não uma dor de cabeça para manter.