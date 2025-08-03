# Especificações Técnicas - Space Shooter

## Configuração do Monorepo (Yarn Workspaces)

### Yarn Workspaces Setup
Este projeto utiliza **Yarn 4** com workspaces para gerenciar o monorepo. As dependências são **hoisted** para a raiz quando possível, com exceções específicas para ferramentas que precisam de dependências locais (como Vite).

#### Estrutura de node_modules:
- **Raiz**: Dependências compartilhadas (TypeScript, concurrently)
- **packages/client**: Apenas dependências específicas do Vite
- **packages/server**: Sem node_modules (usa dependências da raiz)
- **packages/shared**: Sem node_modules (usa dependências da raiz)

#### Configuração do IDE (VS Code):
```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.tsdk": ".yarn/sdks/typescript/lib"
}
```

#### Comandos importantes:
```bash
# Regenerar SDKs do Yarn (após mudanças de dependências)
yarn dlx @yarnpkg/sdks vscode

# Instalar dependência em workspace específico
yarn workspace @spaceshooter/client add three

# Rodar comando em todos os workspaces
yarn workspaces run build
```

### Package.json Raiz
```json
{
  "name": "spaceshooter-monorepo",
  "private": true,
  "version": "0.0.1",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"yarn workspace @spaceshooter/client dev\" \"yarn workspace @spaceshooter/server dev\"",
    "dev:client": "yarn workspace @spaceshooter/client dev",
    "dev:server": "yarn workspace @spaceshooter/server dev",
    "build": "yarn workspaces run build"
  },
  "packageManager": "yarn@4.9.2",
  "devDependencies": {
    "concurrently": "^9.2.0",
    "typescript": "^5.9.2"
  }
}
```

### packages/shared/package.json
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

### packages/client/package.json
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

### packages/server/package.json
```json
{
  "name": "@spaceshooter/server",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/server.ts",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "build:dev": "tsc && tsx src/server.ts",
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

### Configuração Vite (packages/client/vite.config.js)
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          shared: ['@spaceshooter/shared']
        }
      }
    }
  }
});
```

### TypeScript Config (tsconfig.json raiz)
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

## Especificações de Performance

### Targets de Performance
- **FPS**: 60 FPS estável
- **Resolução**: 1920x1080 (adaptável)
- **Entidades simultâneas**: 100+ (inimigos + projéteis)
- **Tempo de loading**: < 3 segundos

### Otimizações Implementadas
- **Map-based tracking**: O(1) lookup para entidades por ID
- **Bounds checking**: Remoção automática de entidades fora da tela
- **Batch cleanup**: Remoção de múltiplas entidades por frame
- **Memory management**: Cleanup automático de objetos Three.js

### Otimizações Planejadas
- Object pooling para projéteis e inimigos
- Frustum culling para entidades fora da câmera
- Batching de draw calls similares
- Texture atlasing para sprites

## Sistema de Coordenadas e Matemática

### Sistema de Coordenadas
```javascript
// Three.js coordinate system
// X: Esquerda (-) / Direita (+)
// Y: Baixo (-) / Cima (+)  
// Z: Longe (-) / Perto (+)

const WORLD_BOUNDS = {
  left: -10,
  right: 10,
  top: 8,
  bottom: -8,
  near: -5,
  far: 5
};
```

### Fórmulas Matemáticas Implementadas

**Detecção de Colisão (Distance-based):**
```typescript
function checkCollisions() {
  projectiles.forEach((projectile, projectileId) => {
    enemies.forEach((enemy, enemyId) => {
      // Calcular distância euclidiana
      const dx = projectile.data.position.x - enemy.data.position.x;
      const dy = projectile.data.position.y - enemy.data.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Verificar colisão (soma dos raios)
      const collisionDistance = PROJECTILE_CONFIG.size + (ENEMY_CONFIG[enemy.data.type].size / 2);
      
      if (distance < collisionDistance) {
        // Colisão detectada!
      }
    });
  });
}
```

**Sistema de Movimento Linear:**
```typescript
function updateProjectiles() {
  projectiles.forEach((projectile) => {
    // Atualizar posição baseado na velocidade (assumindo 60fps)
    projectile.data.position.x += projectile.data.velocity.x * 0.016;
    projectile.data.position.y += projectile.data.velocity.y * 0.016;
    
    // Sincronizar objeto visual
    projectile.object.position.x = projectile.data.position.x;
    projectile.object.position.y = projectile.data.position.y;
  });
}
```

**Sistema de Spawn Probabilístico:**
```typescript
function determineEnemyType(): Enemy['type'] {
  const rand = Math.random();
  if (rand < 0.7) return 'basic';        // 70%
  else if (rand < 0.9) return 'fast';    // 20%
  else return 'heavy';                   // 10%
}
```

**Utilitário Matemático:**
```typescript
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
```

## Estrutura de Dados das Entidades

### Interfaces TypeScript (Shared Package)

**Player Interface:**
```typescript
interface Player {
  id: string;
  position: Vector2D;      // {x: number, y: number}
  velocity: Vector2D;
  health: number;
}
```

**Enemy Interface:**
```typescript
interface Enemy {
  id: string;              // ID único para tracking
  position: Vector2D;      // Posição atual no mundo
  velocity: Vector2D;      // Velocidade de movimento
  health: number;          // Vida atual
  maxHealth: number;       // Vida máxima
  type: 'basic' | 'fast' | 'heavy';  // Tipo determina características
  createdAt: number;       // Timestamp de criação
}
```

**Projectile Interface:**
```typescript
interface Projectile {
  id: string;              // ID único para tracking
  position: Vector2D;      // Posição atual no mundo
  velocity: Vector2D;      // Velocidade de movimento (unidades/segundo)
  damage: number;          // Dano causado ao colidir
  ownerId: string;         // ID da entidade que disparou
  createdAt: number;       // Timestamp de criação (para cleanup)
}
```

### Configurações de Entidades

**Configurações de Projéteis:**
```typescript
const PROJECTILE_CONFIG = {
  speed: 15,               // Unidades por segundo
  damage: 10,              // Dano por hit
  lifetime: 3000,          // 3 segundos em milliseconds
  size: 0.1                // Raio visual
};
```

**Configurações de Inimigos:**
```typescript
const ENEMY_CONFIG = {
  basic: {
    health: 20,            // 2 hits para destruir
    speed: 1.5,            // Velocidade moderada
    size: 0.3,             // Tamanho médio
    color: 0xff4444,       // Vermelho
    spawnRate: 2000        // A cada 2 segundos
  },
  fast: {
    health: 10,            // 1 hit para destruir
    speed: 2.5,            // Mais rápido
    size: 0.2,             // Menor
    color: 0xff8800,       // Laranja
    spawnRate: 3000        // A cada 3 segundos
  },
  heavy: {
    health: 50,            // 5 hits para destruir
    speed: 0.8,            // Mais lento
    size: 0.5,             // Maior
    color: 0x8844ff,       // Roxo
    spawnRate: 5000        // A cada 5 segundos
  }
};
```

### Sistema de Tracking de Entidades

**Maps para Performance O(1):**
```typescript
// Cliente - tracking de entidades ativas
let projectiles: Map<string, {
  object: THREE.Mesh,     // Objeto visual Three.js
  data: Projectile        // Dados da entidade
}> = new Map();

let enemies: Map<string, {
  object: THREE.Mesh,     // Objeto visual Three.js
  data: Enemy             // Dados da entidade
}> = new Map();
```

## Configurações de Renderização

### Camera Setup
```javascript
const camera = new THREE.PerspectiveCamera(
  75,                    // FOV
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,                   // Near clipping
  1000                   // Far clipping
);
camera.position.set(0, 0, 10);
```

### Lighting Setup
```javascript
// Ambient light para iluminação geral
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);

// Directional light para sombras
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 5);
```

### Material Standards
```javascript
// Material para player
const playerMaterial = new THREE.MeshLambertMaterial({
  color: 0x00ff00,
  emissive: 0x002200
});

// Material para inimigos
const enemyMaterial = new THREE.MeshLambertMaterial({
  color: 0xff0000,
  emissive: 0x220000
});

// Material para projéteis
const projectileMaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  transparent: true,
  opacity: 0.8
});
```

## Sistema de Events

### Event Types
```javascript
const EVENTS = {
  // Game events
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_OVER: 'game:over',
  
  // Player events
  PLAYER_SHOOT: 'player:shoot',
  PLAYER_HIT: 'player:hit',
  PLAYER_DEATH: 'player:death',
  
  // Enemy events
  ENEMY_SPAWN: 'enemy:spawn',
  ENEMY_DEATH: 'enemy:death',
  
  // Collision events
  COLLISION: 'collision',
  
  // UI events
  SCORE_UPDATE: 'ui:score',
  HEALTH_UPDATE: 'ui:health'
};
```

### Event Data Structure
```javascript
// Exemplo de evento de colisão
EventBus.emit(EVENTS.COLLISION, {
  entity1: player,
  entity2: enemy,
  position: collisionPoint,
  timestamp: Date.now()
});
```

## Audio Configuration

### Sound Files Required
```
assets/sounds/
├── player_shoot.wav
├── enemy_shoot.wav
├── explosion.wav
├── powerup.wav
├── background_music.mp3
└── ui_click.wav
```

### Audio Implementation
```javascript
class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;
  }
  
  loadSound(name, url) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    this.sounds.set(name, audio);
  }
  
  playSound(name, volume = this.sfxVolume) {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.currentTime = 0;
      sound.volume = volume;
      sound.play();
    }
  }
}
```

## Input Mapping

### Keyboard Controls
```javascript
const KEYS = {
  // Movement
  LEFT: ['ArrowLeft', 'KeyA'],
  RIGHT: ['ArrowRight', 'KeyD'],
  UP: ['ArrowUp', 'KeyW'],
  DOWN: ['ArrowDown', 'KeyS'],
  
  // Actions
  SHOOT: ['Space', 'KeyX'],
  PAUSE: ['Escape', 'KeyP'],
  
  // UI
  ENTER: ['Enter'],
  BACK: ['Escape']
};
```

### Input System Implementado

**Interface InputState:**
```typescript
interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  pause: boolean;
}
```

**Mapeamento de Teclas:**
```typescript
private keyMap: Map<string, keyof InputState> = new Map([
  ['KeyW', 'up'],         ['ArrowUp', 'up'],
  ['KeyS', 'down'],       ['ArrowDown', 'down'],
  ['KeyA', 'left'],       ['ArrowLeft', 'left'],
  ['KeyD', 'right'],      ['ArrowRight', 'right'],
  ['Space', 'shoot'],
  ['KeyP', 'pause'],      ['Escape', 'pause']
]);
```

**Sistema de Callbacks:**
```typescript
type InputCallback = (action: keyof InputState, pressed: boolean) => void;

// Uso para eventos discretos (como tiro)
inputSystem.addInputCallback((action, pressed) => {
  if (action === 'shoot' && pressed) {
    shoot();
  }
});

// Estado contínuo para movimento
const inputState = inputSystem.getInputState();
if (inputState.left) playerShip.position.x -= speed;
```

## Performance Monitoring e Debug

### Sistema de Logging Implementado

**Console Logging para Debug:**
```typescript
// Logs de eventos importantes
console.log('Projectile fired!', projectileId);
console.log(`Enemy spawned: ${enemyType}`, enemyId);
console.log(`Collision: ${projectileId} hit ${enemyId}`);
console.log(`Enemy destroyed: ${enemyId}`);
```

**Monitoramento de Entidades em Tempo Real:**
```javascript
// Cole no console do browser para debug
setInterval(() => {
  console.log(`Projéteis ativos: ${projectiles.size}`);
  console.log(`Inimigos ativos: ${enemies.size}`);
}, 2000);
```

### Métricas de Performance Atuais

**Complexidade Algorítmica:**
- **Movimento de entidades**: O(n) por frame
- **Collision detection**: O(n*m) projéteis vs inimigos
- **Cleanup de entidades**: O(n) por frame
- **Lookup por ID**: O(1) com Map

**Otimizações Implementadas:**
- Batch cleanup para múltiplas entidades
- Bounds checking para remoção automática
- Map-based tracking para performance O(1)
- Memory cleanup automático de objetos Three.js

### Ferramentas de Debug Recomendadas

**Browser DevTools:**
```javascript
// Performance tab: Profile de FPS e render time
// Memory tab: Uso de memória e vazamentos
// Console: Logs de eventos do jogo

// Exemplo de profile personalizado
console.time('updateProjectiles');
updateProjectiles();
console.timeEnd('updateProjectiles');
```

## Build e Deploy

### Build Configuration

**Cliente (packages/client/vite.config.js):**
```javascript
export default defineConfig({
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          shared: ['@spaceshooter/shared']
        }
      }
    }
  }
});
```

**Servidor (packages/server):**
```json
// package.json scripts
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "tsx src/server.ts"
  }
}
```

**Shared (packages/shared):**
```json
// package.json scripts
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  }
}
```

### Asset Optimization
- Texturas: WebP format, máximo 1024x1024
- Modelos 3D: GLTF/GLB format, máximo 10k polígonos
- Audio: OGG/MP3, 44.1kHz, mono para SFX

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Suporte a WebGL 2.0 obrigatório.