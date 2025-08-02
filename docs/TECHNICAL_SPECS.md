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
- Object pooling para projéteis
- Frustum culling para entidades fora da tela
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

### Fórmulas Matemáticas Chave
```javascript
// Detecção de colisão (sphere)
function checkCollision(entity1, entity2) {
  const distance = entity1.position.distanceTo(entity2.position);
  return distance < (entity1.radius + entity2.radius);
}

// Movimento linear
function updatePosition(entity, deltaTime) {
  entity.position.add(
    entity.velocity.clone().multiplyScalar(deltaTime)
  );
}

// Interpolação para smooth movement
function lerp(start, end, factor) {
  return start + (end - start) * factor;
}
```

## Estrutura de Dados das Entidades

### Player
```javascript
class Player {
  constructor() {
    this.position = new THREE.Vector3(0, -6, 0);
    this.velocity = new THREE.Vector3();
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 5;
    this.fireRate = 0.2; // segundos entre tiros
    this.lastShot = 0;
    this.mesh = null; // Three.js mesh
    this.boundingBox = new THREE.Box3();
  }
}
```

### Enemy
```javascript
class Enemy {
  constructor(type = 'basic') {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3(0, -2, 0);
    this.health = this.getHealthByType(type);
    this.speed = this.getSpeedByType(type);
    this.scoreValue = this.getScoreByType(type);
    this.type = type;
    this.mesh = null;
  }
}
```

### Projectile
```javascript
class Projectile {
  constructor(owner, direction) {
    this.position = owner.position.clone();
    this.velocity = direction.clone().multiplyScalar(10);
    this.damage = 25;
    this.lifeTime = 3; // segundos
    this.owner = owner; // 'player' ou 'enemy'
    this.active = true;
    this.mesh = null;
  }
}
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

### Input State Management
```javascript
class InputManager {
  constructor() {
    this.keys = new Set();
    this.actions = new Map();
  }
  
  isKeyPressed(keyCode) {
    return this.keys.has(keyCode);
  }
  
  isActionActive(action) {
    return KEYS[action].some(key => this.keys.has(key));
  }
}
```

## Performance Monitoring

### Métricas a Monitorar
```javascript
class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.entityCount = 0;
    this.drawCalls = 0;
  }
  
  update() {
    const currentTime = performance.now();
    this.frameCount++;
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // Log performance metrics
      console.log(`FPS: ${this.fps}, Entities: ${this.entityCount}`);
    }
  }
}
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