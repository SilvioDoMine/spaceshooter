# Space Shooter Game - Roadmap

## Visão Geral do Projeto
Um jogo de space shooter clássico desenvolvido com Three.js, com arquitetura preparada para futuro modo multiplayer.

## Fase 1: Core Game (Single Player)

### 1.1 Setup Inicial
- [ ] Configurar ambiente de desenvolvimento
- [ ] Setup Three.js básico
- [ ] Criar estrutura de pastas do projeto
- [ ] Configurar bundler (Vite/Webpack)

### 1.2 Sistema de Renderização
- [ ] Criar scene, camera e renderer básicos
- [ ] Implementar sistema de loading de assets
- [ ] Criar background/skybox espacial
- [ ] Sistema de partículas básico

### 1.3 Entidades do Jogo
- [ ] Criar classe Player (nave do jogador)
- [ ] Criar classe Enemy (naves inimigas)
- [ ] Criar classe Projectile (projéteis)
- [ ] Sistema de spawn de inimigos
- [ ] Sistema de colisões

### 1.4 Sistema de Input
- [ ] Captura de eventos de teclado
- [ ] Movimento da nave do jogador
- [ ] Sistema de disparo
- [ ] Controles responsivos

### 1.5 Game Loop
- [ ] Update loop principal
- [ ] Sistema de states (menu, jogo, game over)
- [ ] Sistema de pontuação
- [ ] Condições de vitória/derrota

### 1.6 Audio e Efeitos
- [ ] Sistema de audio (tiros, explosões)
- [ ] Efeitos visuais (explosões, trails)
- [ ] Feedback visual de dano

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

## Fase 3: Preparação Multiplayer

### 3.1 Refatoração da Arquitetura
- [ ] Separar lógica de apresentação
- [ ] Sistema de estados determinístico
- [ ] Separar input de ações
- [ ] Sistema de eventos

### 3.2 Networking Foundation
- [ ] Escolher tecnologia (WebSockets/WebRTC)
- [ ] Implementar client-server básico
- [ ] Sistema de sincronização
- [ ] Handling de latência

### 3.3 Multiplayer Features
- [ ] Lobby system
- [ ] Matchmaking
- [ ] Sincronização de jogadores
- [ ] Sistema de rooms

## Tecnologias e Decisões

### Stack Tecnológico
- **Renderização**: Three.js
- **Linguagem**: JavaScript ou TypeScript (a decidir)
- **Bundler**: Vite (recomendado para desenvolvimento rápido)
- **Audio**: Web Audio API ou Howler.js
- **Networking futuro**: Socket.io ou ws

### Estrutura de Arquivos Sugerida
```
src/
├── core/           # Game engine básico
├── entities/       # Player, Enemy, Projectile
├── systems/        # Input, Rendering, Collision
├── utils/          # Helpers e utilitários
├── assets/         # Modelos, texturas, sons
├── networking/     # Futuro código multiplayer
└── ui/            # Interface do usuário
```

## Próximos Passos
1. Definir se vai usar JS ou TS
2. Configurar ambiente de desenvolvimento
3. Implementar protótipo básico (nave + movimento)
4. Incrementar funcionalidades conforme roadmap