# Space Shooter Game - Roadmap

## Visão Geral do Projeto
Um jogo de space shooter clássico desenvolvido com Three.js em arquitetura monorepo (Yarn Workspaces), permitindo compartilhamento de código entre cliente e servidor.

## Fase 1: Core Game (Single Player)

### 1.1 Setup do Monorepo
- [x] Configurar Yarn Workspaces
- [x] Criar packages (shared, client, server)
- [x] Setup TypeScript para todo o projeto
- [x] Configurar Vite para cliente
- [x] Configurar scripts de desenvolvimento
- [x] Configurar VS Code workspace
- [x] Setup Yarn SDKs para TypeScript

### 1.2 Package Shared
- [x] Criar estrutura básica do package shared
- [x] Configurar build e tipos TypeScript
- [x] Implementar interfaces básicas (GameConfig, Vector2D, Player)
- [x] Utils matemáticos compartilhados (clamp function)
- [x] **Implementar entidade Projectile com configurações**
- [x] **Implementar entidade Enemy com 3 tipos (basic, fast, heavy)**
- [x] **Sistema de configurações ENEMY_CONFIG**
- [ ] Criar sistema de componentes (Transform, Health)
- [ ] Sistema de eventos

### 1.3 Package Client (Frontend)
- [x] Configurar Vite e dependências (Three.js)
- [x] Estrutura básica do cliente
- [x] Integração com package shared funcionando
- [x] Setup Three.js e cena básica
- [x] Sistema de renderização (RenderingSystem)
- [x] Configuração mobile-friendly (sem zoom)
- [x] Sistema de input (InputSystem com WASD/Espaço/P)
- [x] Loading de assets (AssetLoader completo + modelos 3D)
- [x] Estrutura de assets (public/assets/)
- [x] Sistema de nave controlável
- [x] **Sistema de tiro com projéteis (cooldown, movimento, cleanup)**
- [x] **Sistema de inimigos (spawn, movimento, 3 tipos)**
- [x] **Collision detection (projéteis vs inimigos)**
- [x] **Balanceamento de gameplay (velocidades otimizadas)**
- [x] **Sistema de áudio (AudioSystem com sons sintéticos)**
- [x] **Interface do usuário (HUD, Menu, Game Over)**
- [x] **Sistema de partículas (ParticleSystem)**
- [x] **Gerenciamento de estados (GameStateManager)**

### 1.4 Package Server (Backend)
- [x] Configurar TypeScript e tsx para desenvolvimento
- [x] Estrutura básica do servidor
- [x] Integração com package shared funcionando
- [ ] Setup Node.js com Express
- [ ] WebSocket server básico
- [ ] Sistema de rooms/lobbies
- [ ] API REST para scores
- [ ] Sistema de autenticação simples

### 1.5 Game Logic Integrado
- [x] **Sistema de projéteis básico**
- [x] **Sistema de inimigos completo**
- [x] **Sistema de power-ups completo**
- [x] **Detecção de colisões (projéteis vs inimigos, power-ups vs jogador)**
- [x] **Game loop principal funcional**
- [x] **Spawn automático de inimigos e power-ups**
- [x] **Sistema de pontuação e estatísticas**
- [ ] Sistema de física avançado (compartilhado)
- [ ] Sistema de states

## Fase 2: Melhorias e Polish - ✅ COMPLETO

### 2.1 Gameplay Avançado
- [x] **Diferentes tipos de inimigos (3 tipos implementados)**
- [x] **Power-ups e upgrades básicos** (munição, vida, escudo)
- [ ] Fases/waves progressivas
- [ ] Boss battles

### 2.2 UI/UX - ✅ COMPLETO
- [x] **Menu principal**
- [x] **HUD durante o jogo**
- [x] **Tela de game over**
- [x] **Tela de pause**
- [x] **Sistema de estatísticas (pontuação, precisão, tempo)**
- [ ] Sistema de high scores persistente

### 2.3 Performance & Architecture Patterns
- [ ] **Object Pool Pattern** para projéteis e inimigos (Prioridade: CRÍTICA)
- [ ] **Command Pattern** para sistema de input (Prioridade: ALTA)
- [ ] **Strategy Pattern** para comportamentos de inimigos (Prioridade: ALTA)
- [ ] Frustum culling
- [ ] Level of detail (LOD)
- [ ] **Flyweight Pattern** para entidades similares (Prioridade: MÉDIA)
- [ ] Otimização de renderização

### 2.4 Refatoração Arquitetural (Nova)
- [ ] **Entity Component System (ECS)** para escalabilidade (Prioridade: BAIXA)
- [ ] **Event Bus Pattern** para comunicação entre sistemas
- [ ] **Dependency Injection** para melhor testabilidade
- [ ] **Builder Pattern** para configuração complexa de entidades

### 2.5 Audio & Visual Effects - ✅ COMPLETO
- [x] **AudioSystem com efeitos sonoros**
- [x] **ParticleSystem para explosões**
- [x] **Efeitos visuais de impacto**

## Fase 3: Multiplayer Básico

### 3.1 Networking Foundation
- [ ] WebSocket client/server comunicação
- [ ] Protocolo de mensagens (em shared)
- [ ] Input commands serializables
- [ ] Estado do jogo compartilhável

### 3.2 Sincronização Básica
- [ ] Server-side game loop
- [ ] Client-side prediction
- [ ] State reconciliation
- [ ] Basic lag compensation

### 3.3 Features Multiplayer
- [ ] Sistema de rooms funcional
- [ ] Matchmaking simples
- [ ] Spectator mode
- [ ] Reconnection handling

## Fase 4: Multiplayer Avançado

### 4.1 Otimizações de Rede
- [ ] Delta compression
- [ ] Interest management
- [ ] Adaptive tick rate
- [ ] Bandwidth optimization

### 4.2 Features Avançadas
- [ ] Replay system
- [ ] Anti-cheat measures
- [ ] Leaderboards
- [ ] Tournament mode

## Tecnologias e Decisões

### Stack Tecnológico Final
- **Arquitetura**: Yarn Workspaces (Monorepo)
- **Linguagem**: TypeScript
- **Frontend**: Three.js + Vite
- **Backend**: Node.js + Express + WebSockets
- **Shared**: Código compartilhado (entidades, tipos, utils)
- **Audio**: Web Audio API

### Estrutura Final do Monorepo
```
spaceshooter/
├── package.json              # Workspace config
├── packages/
│   ├── shared/               # Código compartilhado
│   │   └── src/
│   │       ├── entities/     # Player, Enemy, Projectile
│   │       ├── components/   # Transform, Health, Movement
│   │       ├── physics/      # Collision, Movement
│   │       ├── types/        # TypeScript interfaces
│   │       └── utils/        # Math, helpers
│   ├── client/               # Frontend
│   │   └── src/
│   │       ├── systems/      # Rendering, Input, Audio
│   │       ├── ui/           # Interface
│   │       └── assets/       # Modelos, texturas, sons
│   └── server/               # Backend
│       └── src/
│           ├── systems/      # GameServer, NetworkManager
│           ├── rooms/        # Room management
│           └── api/          # REST endpoints
└── tsconfig.json            # TypeScript config
```

## Comandos de Desenvolvimento

```bash
# Setup inicial
yarn install
yarn workspace @spaceshooter/shared build

# Desenvolvimento
yarn dev          # Cliente + Servidor
yarn dev:client   # Apenas cliente
yarn dev:server   # Apenas servidor

# Build e deploy
yarn build        # Build completo
yarn test         # Testes
```

## Próximos Passos Imediatos (Atualizado - Janeiro 2025)

### 🔥 Crítico (Esta Sprint)
1. **Implementar Object Pool Pattern** para projéteis e inimigos
   - Melhoria de performance imediata (~40% otimização)
   - Ver: [Design Patterns Implementation Guide](DESIGN_PATTERNS_GUIDE.md)

### ⚡ Alta Prioridade (Próximas 2 Sprints)
2. **Command Pattern** para sistema de input
   - Facilita configuração de controles e replays
3. **Strategy Pattern** para comportamentos variados de inimigos
   - Adiciona riqueza ao gameplay

### 📈 Médio Prazo (Fase 3 - Multiplayer)
4. **Implementar servidor** básico com Express + WebSockets
5. **Integrar comunicação** cliente-servidor
6. **Event Bus Pattern** para comunicação entre sistemas

### 🚀 Longo Prazo (Fase 4 - Escalabilidade)
7. **Entity Component System (ECS)** quando complexidade aumentar
8. **Expandir features** conforme roadmap

## Vantagens da Arquitetura Escolhida

- **Reutilização de código**: Entidades e lógica compartilhadas
- **Type safety**: TypeScript em todo o projeto
- **Desenvolvimento eficiente**: Hot reload cliente + servidor
- **Escalabilidade**: Fácil adição de novos packages
- **Deploy flexvel**: Cliente e servidor independentes