# Arquitetura do Space Shooter

## Estrutura do Monorepo (Yarn Workspaces)

```
spaceshooter/
├── package.json                # Configuração principal do monorepo
├── packages/
│   ├── shared/                 # Código compartilhado cliente/servidor
│   │   ├── package.json
│   │   └── src/
│   │       ├── entities/       # Player, Enemy, Projectile
│   │       ├── components/     # Transform, Health, Movement
│   │       ├── physics/        # PhysicsSystem, CollisionDetector
│   │       ├── types/          # TypeScript interfaces
│   │       ├── utils/          # MathUtils, constantes
│   │       └── events/         # EventBus, eventos do jogo
│   ├── client/                 # Frontend (browser)
│   │   ├── package.json
│   │   └── src/
│   │       ├── systems/        # RenderingSystem, InputSystem, AudioSystem
│   │       ├── ui/             # Interface do usuário
│   │       ├── assets/         # Modelos, texturas, sons
│   │       └── main.js         # Entry point do cliente
│   └── server/                 # Backend (Node.js)
│       ├── package.json
│       └── src/
│           ├── systems/        # NetworkingSystem, MatchmakingSystem
│           ├── rooms/          # Gerenciamento de salas
│           ├── api/            # REST API
│           └── server.js       # Entry point do servidor
├── .gitignore
└── README.md
```

## Separação de Responsabilidades

### 1. Sistema de Renderização (Rendering System)
**Responsabilidade**: Gerenciar toda a parte visual do jogo

```
RenderingSystem
├── SceneManager      # Gerencia a scene do Three.js
├── CameraController  # Controle de câmera
├── LightingManager   # Iluminação da cena
├── EffectsManager    # Efeitos visuais (partículas, explosões)
└── AssetLoader       # Carregamento de modelos e texturas
```

**Funções principais**:
- Inicializar scene, camera, renderer
- Renderizar todas as entidades
- Gerenciar efeitos visuais
- Controlar iluminação

### 2. Sistema de Input (Input System)
**Responsabilidade**: Capturar e processar entrada do usuário

```
InputSystem
├── KeyboardHandler   # Eventos de teclado
├── MouseHandler      # Eventos de mouse (futuro)
├── TouchHandler      # Touch events (mobile futuro)
└── InputMapper       # Mapear inputs para ações
```

**Funções principais**:
- Capturar eventos de input
- Traduzir inputs em comandos de jogo
- Suportar múltiplos dispositivos de entrada

### 3. Sistema de Física (Physics System)
**Responsabilidade**: Movimento, colisões e física do jogo

```
PhysicsSystem
├── CollisionDetector # Detecção de colisões
├── MovementHandler   # Movimento de entidades
├── BoundaryChecker   # Verificar limites da tela
└── ForceCalculator   # Cálculos de física
```

**Funções principais**:
- Detectar colisões entre entidades
- Calcular movimento e velocidade
- Aplicar física básica

### 4. Sistema de Entidades (Entity System)
**Responsabilidade**: Gerenciar todas as entidades do jogo

```
EntitySystem
├── Player            # Nave do jogador
├── Enemy             # Naves inimigas
├── Projectile        # Projéteis
├── PowerUp           # Power-ups
└── EntityManager     # Gerenciador de entidades
```

**Cada entidade possui**:
- Transform (posição, rotação, escala)
- Health/Life
- Movement component
- Render component
- Collision component

### 5. Sistema de Game State (Game State System)
**Responsabilidade**: Gerenciar estados e fluxo do jogo

```
GameStateSystem
├── MenuState         # Estado do menu
├── PlayingState      # Estado jogando
├── PausedState       # Estado pausado
├── GameOverState     # Estado game over
└── StateManager      # Gerenciador de estados
```

**Funções principais**:
- Controlar transições entre estados
- Gerenciar UI de cada estado
- Salvar/carregar dados do jogo

### 6. Sistema de Audio (Audio System)
**Responsabilidade**: Gerenciar sons e música

```
AudioSystem
├── SoundManager      # Efeitos sonoros
├── MusicManager      # Música de fundo
├── AudioLoader       # Carregamento de audio
└── VolumeController  # Controle de volume
```

**Funções principais**:
- Reproduzir efeitos sonoros
- Controlar música de fundo
- Gerenciar volume e configurações

### 7. Sistema de UI (UI System)
**Responsabilidade**: Interface do usuário

```
UISystem
├── HUD               # Interface durante o jogo
├── MenuUI            # Menus do jogo
├── ModalSystem       # Janelas modais
└── UIManager         # Gerenciador de UI
```

**Funções principais**:
- Exibir informações do jogo (score, vida)
- Renderizar menus
- Gerenciar interações de UI

## Padrões de Design Utilizados

### 1. Component-Entity System (Simplificado)
Cada entidade possui componentes:
```javascript
class Player {
  constructor() {
    this.transform = new Transform();
    this.health = new Health(100);
    this.movement = new Movement();
    this.renderer = new Renderer();
    this.collider = new Collider();
  }
}
```

### 2. Observer Pattern
Para comunicação entre sistemas:
```javascript
class EventBus {
  static emit(event, data) { /* ... */ }
  static on(event, callback) { /* ... */ }
}

// Exemplo: quando player atira
EventBus.emit('player:shoot', { position, direction });
```

### 3. State Pattern
Para gerenciar estados do jogo:
```javascript
class GameStateManager {
  constructor() {
    this.currentState = new MenuState();
  }
  
  changeState(newState) {
    this.currentState.exit();
    this.currentState = newState;
    this.currentState.enter();
  }
}
```

### 4. Object Pool
Para otimização de projéteis e inimigos:
```javascript
class ProjectilePool {
  constructor(size) {
    this.pool = [];
    // Pré-criar objetos
  }
  
  get() { /* Retorna objeto do pool */ }
  release(obj) { /* Retorna objeto para o pool */ }
}
```

## Fluxo de Dados

```
Input → InputSystem → GameLogic → EntitySystem → PhysicsSystem → RenderingSystem
  ↓                       ↓            ↓             ↓              ↓
EventBus ←→ AudioSystem ←→ UISystem ←→ StateManager ←→ AssetManager
```

## Preparação para Multiplayer

### Separação Cliente/Servidor no Monorepo

**packages/client/ (Frontend)**
```
- RenderingSystem (Three.js)
- InputSystem (Keyboard, Mouse)
- UISystem (HTML/CSS)
- AudioSystem (Web Audio API)
- AssetLoader (Texturas, Modelos)
```

**packages/shared/ (Código Compartilhado)**
```
- EntitySystem (Player, Enemy, Projectile)
- PhysicsSystem (Colisões, Movimento)
- GameLogic (Regras do jogo)
- Components (Transform, Health, etc)
- Types (Interfaces TypeScript)
- Utils (MathUtils, constantes)
- Events (EventBus)
```

**packages/server/ (Backend)**
```
- NetworkingSystem (WebSockets)
- AuthenticationSystem (Login, tokens)
- MatchmakingSystem (Salas, lobbies)
- RoomManager (Gerenciar partidas)
- API (REST endpoints)
- Database (Scores, stats)
```

### Comunicação Determinística
- Inputs são enviados para servidor
- Servidor processa lógica e retorna state
- Cliente faz interpolação/predição

## Scripts de Desenvolvimento (package.json raiz)

```json
{
  "name": "spaceshooter-monorepo",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"yarn workspace client dev\" \"yarn workspace server dev\"",
    "dev:client": "yarn workspace client dev",
    "dev:server": "yarn workspace server dev",
    "build": "yarn workspaces run build",
    "build:client": "yarn workspace client build",
    "build:server": "yarn workspace server build",
    "test": "yarn workspaces run test",
    "lint": "yarn workspaces run lint"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}
```

## Dependências por Package

**packages/shared/package.json:**
```json
{
  "name": "@spaceshooter/shared",
  "dependencies": {
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**packages/client/package.json:**
```json
{
  "name": "@spaceshooter/client",
  "dependencies": {
    "@spaceshooter/shared": "*",
    "three": "^0.155.0",
    "vite": "^4.4.0"
  }
}
```

**packages/server/package.json:**
```json
{
  "name": "@spaceshooter/server",
  "dependencies": {
    "@spaceshooter/shared": "*",
    "ws": "^8.13.0",
    "express": "^4.18.0"
  }
}
```

Esta arquitetura monorepo permite desenvolvimento eficiente com código compartilhado e builds independentes.