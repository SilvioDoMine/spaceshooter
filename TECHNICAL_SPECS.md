# Especificações Técnicas - Space Shooter

## Configuração do Ambiente de Desenvolvimento

### Opção 1: JavaScript Puro
```json
// package.json
{
  "name": "spaceshooter",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^4.4.0"
  },
  "dependencies": {
    "three": "^0.155.0"
  }
}
```

### Opção 2: TypeScript
```json
// package.json adicional
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/three": "^0.155.0"
  }
}
```

### Configuração Vite
```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
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
```javascript
// vite.config.js production
export default defineConfig({
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
});
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