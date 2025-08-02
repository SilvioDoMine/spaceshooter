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
- [ ] Implementar entidades base completas (Player, Enemy, Projectile)
- [ ] Criar sistema de componentes (Transform, Health)
- [ ] Sistema de eventos

### 1.3 Package Client (Frontend)
- [x] Configurar Vite e dependências (Three.js)
- [x] Estrutura básica do cliente
- [x] Integração com package shared funcionando
- [x] Setup Three.js e cena básica
- [x] Sistema de renderização (RenderingSystem)
- [x] Configuração mobile-friendly (sem zoom)
- [ ] Sistema de input
- [ ] Loading de assets (modelos, texturas)
- [ ] Sistema de áudio
- [ ] Interface do usuário

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
- [ ] Sistema de física (compartilhado)
- [ ] Detecção de colisões
- [ ] Game loop principal
- [ ] Sistema de states
- [ ] Spawn de inimigos
- [ ] Sistema de pontuação

## Fase 2: Melhorias e Polish

### 2.1 Gameplay Avançado
- [ ] Diferentes tipos de inimigos
- [ ] Power-ups e upgrades
- [ ] Fases/waves progressivas
- [ ] Boss battles

### 2.2 UI/UX
- [ ] Menu principal
- [ ] HUD durante o jogo
- [ ] Tela de game over
- [ ] Sistema de high scores

### 2.3 Performance
- [ ] Object pooling para projéteis
- [ ] Frustum culling
- [ ] Level of detail (LOD)
- [ ] Otimização de renderização

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

## Próximos Passos Imediatos

1. **Configurar monorepo** com Yarn Workspaces
2. **Implementar package shared** com entidades base
3. **Desenvolver cliente** com Three.js
4. **Implementar servidor** básico
5. **Integrar comunicação** cliente-servidor
6. **Expandir features** conforme roadmap

## Vantagens da Arquitetura Escolhida

- **Reutilização de código**: Entidades e lógica compartilhadas
- **Type safety**: TypeScript em todo o projeto
- **Desenvolvimento eficiente**: Hot reload cliente + servidor
- **Escalabilidade**: Fácil adição de novos packages
- **Deploy flexvel**: Cliente e servidor independentes