# Arquitetura do Space Shooter

## Estrutura do Monorepo (Yarn Workspaces)

```
spaceshooter/
├── package.json                # Configuração principal do monorepo
├── .vscode/
│   └── settings.json           # Configurações do VS Code para workspaces
├── .yarn/
│   └── sdks/                   # TypeScript SDKs do Yarn
├── yarn.lock                   # Lock file do Yarn
├── packages/
│   ├── shared/                 # Código compartilhado cliente/servidor
│   │   ├── package.json        # Aponta para src/index.ts (desenvolvimento)
│   │   ├── tsconfig.json       # Extends da configuração raiz
│   │   ├── dist/               # Build output (gerado)
│   │   └── src/
│   │       ├── index.ts        # Entry point principal
│   │       ├── entities/       # Player, Enemy, Projectile
│   │       ├── components/     # Transform, Health, Movement
│   │       ├── physics/        # PhysicsSystem, CollisionDetector
│   │       ├── types/          # TypeScript interfaces
│   │       ├── utils/          # MathUtils, constantes
│   │       └── events/         # EventBus, eventos do jogo
│   ├── client/                 # Frontend (browser)
│   │   ├── package.json        # Vite + Three.js + tipos
│   │   ├── tsconfig.json       # Configuração para desenvolvimento web
│   │   ├── vite.config.js      # Configuração do Vite
│   │   ├── index.html          # HTML principal
│   │   ├── node_modules/       # Dependências locais do Vite
│   │   └── src/
│   │       ├── main.ts         # Entry point do cliente
│   │       ├── systems/        # RenderingSystem, InputSystem, AudioSystem
│   │       ├── ui/             # Interface do usuário
│   │       └── assets/         # Modelos, texturas, sons
│   └── server/                 # Backend (Node.js)
│       ├── package.json        # tsx + TypeScript para servidor
│       ├── tsconfig.json       # Configuração para Node.js
│       └── src/
│           ├── server.ts       # Entry point do servidor
│           ├── systems/        # NetworkingSystem, MatchmakingSystem
│           ├── rooms/          # Gerenciamento de salas
│           └── api/            # REST API
├── docs/                       # Documentação do projeto
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
  "private": true,
  "version": "0.0.1",
  "workspaces": ["packages/*"],
  "packageManager": "yarn@4.9.2",
  "scripts": {
    "dev": "concurrently \"yarn workspace @spaceshooter/client dev\" \"yarn workspace @spaceshooter/server dev\"",
    "dev:client": "yarn workspace @spaceshooter/client dev",
    "dev:server": "yarn workspace @spaceshooter/server dev",
    "build": "yarn workspaces run build"
  },
  "devDependencies": {
    "concurrently": "^9.2.0",
    "typescript": "^5.9.2"
  }
}
```

## Dependências por Package

**packages/shared/package.json:**
```json
{
  "name": "@spaceshooter/shared",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.9.2"
  }
}
```

**packages/client/package.json:**
```json
{
  "name": "@spaceshooter/client",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@spaceshooter/shared": "workspace:^",
    "three": "^0.179.1"
  },
  "devDependencies": {
    "@types/node": "^24.1.0",
    "@types/three": "^0.178.1",
    "vite": "^7.0.6"
  }
}
```

**packages/server/package.json:**
```json
{
  "name": "@spaceshooter/server",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/server.ts",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "tsx src/server.ts"
  },
  "dependencies": {
    "@spaceshooter/shared": "workspace:^"
  },
  "devDependencies": {
    "@types/node": "^24.1.0",
    "tsx": "^4.16.5",
    "typescript": "^5.9.2"
  }
}
```

## Configuração do Workspace TypeScript

### TypeScript Configuration (tsconfig.json raiz)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext", 
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/client" },
    { "path": "./packages/server" }
  ]
}
```

### Configurações Específicas por Package

**packages/shared/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

**packages/client/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

**packages/server/tsconfig.json:**
```json
{
  "extends": "../../tsconfig.json", 
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "skipLibCheck": true,
    "typeRoots": ["node_modules/@types"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

### Gestão de Dependências

**Hoisting do Yarn:**
- Dependências compartilhadas ficam na raiz
- `node_modules` locais apenas quando necessário
- Vite precisa de dependências locais para funcionamento

**Comandos importantes:**
```bash
# Adicionar dependência em workspace específico
yarn workspace @spaceshooter/client add three

# Regenerar SDKs após mudanças
yarn dlx @yarnpkg/sdks vscode

# Build de todos os packages
yarn workspaces run build
```

**VS Code Configuration (.vscode/settings.json):**
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.tsdk": ".yarn/sdks/typescript/lib",
  "search.exclude": {
    "**/.yarn": true,
    "**/.pnp.*": true
  }
}
```

Esta arquitetura monorepo permite desenvolvimento eficiente com código compartilhado, builds independentes e configuração moderna do TypeScript.