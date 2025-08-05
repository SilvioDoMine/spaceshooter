# Arquitetura do Cliente Space Shooter

## Visão Geral

O cliente Space Shooter é uma aplicação web 3D construída com **Three.js** e **TypeScript**, utilizando uma arquitetura modular baseada em sistemas. Este documento detalha precisamente como o código funciona, desde a inicialização até a renderização e interação, permitindo manutenção e refatoração eficazes.

## Fluxo de Inicialização

### 1. Bootstrap (`main.ts:1048-1051`)

```javascript
document.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});
```

O processo de inicialização acontece quando o DOM está pronto e segue esta sequência:

### 2. Inicialização dos Sistemas (`main.ts:39-96`)

```javascript
async function init() {
  // 1. Sistema de Renderização (main.ts:40-56)
  renderingSystem = new RenderingSystem();
  renderingSystem.attachToDOM('game-container');
  await renderingSystem.loadAssets();
  
  // 2. Assets do Jogo (main.ts:51-56)
  const { GAME_ASSETS } = await import('./assets/gameAssets');
  await renderingSystem.assetLoader.loadAssetManifest(GAME_ASSETS);
  
  // 3. Sistema de Input (main.ts:58-60)
  inputSystem = new InputSystem();
  inputSystem.addInputCallback(onInputChange);
  
  // 4. Interface de Usuário (main.ts:62-66)
  uiSystem = new UISystem(renderingSystem.renderer);
  uiSystem.updateHealth/Ammo/Score(initialValues);
  
  // 5. Sistema de Áudio (main.ts:68-76)
  audioSystem = new AudioSystem();
  audioSystem.loadSounds(GAME_ASSETS.sounds);
  
  // 6. Sistema de Partículas (main.ts:78-79)
  particleSystem = new ParticleSystem(renderingSystem.scene);
  
  // 7. Gerenciador de Estado (main.ts:81-89)
  gameStateManager = new GameStateManager();
  menuSystem = new MenuSystem();
  setupMenuCallbacks();
  setupGameStateCallbacks();
  
  // 8. Criação da Nave do Jogador (main.ts:91-95)
  await createPlayerShip();
  gameStateManager.setState(GameStateEnum.MENU);
}
```

## Arquitetura de Sistemas

### 1. RenderingSystem (`systems/RenderingSystem.ts`)

**Responsabilidade**: Gerenciamento completo da renderização 3D

#### Configuração da Cena
```javascript
// Scene setup
this.scene = new THREE.Scene();
this.scene.background = new THREE.Color(0x000011); // Azul espacial escuro

// Camera perspectiva
this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
this.camera.position.set(0, 0, 8);

// Renderer WebGL com sombras
this.renderer = new THREE.WebGLRenderer({ antialias: true });
this.renderer.shadowMap.enabled = true;
this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

#### Sistema de Iluminação
- **Luz Ambiente**: `0x404040` intensidade 0.4 (iluminação base)
- **Luz Direcional**: `0xffffff` intensidade 1 com sombras (luz principal)
- **Luz Pontual**: `0x00aaff` intensidade 0.5 (destaque azul)

#### Integração com AssetLoader
```javascript
this.assetLoader = new AssetLoader();
// Carregamento de texturas, modelos 3D e materiais
```

### 2. InputSystem (`systems/InputSystem.ts`)

**Responsabilidade**: Captura e processamento de entrada do usuário

#### Mapeamento de Teclas
```javascript
const KEY_MAPPINGS = {
  // Movimento
  'KeyW': 'up', 'ArrowUp': 'up',
  'KeyS': 'down', 'ArrowDown': 'down', 
  'KeyA': 'left', 'ArrowLeft': 'left',
  'KeyD': 'right', 'ArrowRight': 'right',
  
  // Ações
  'Space': 'shoot',
  'KeyP': 'pause', 'Escape': 'pause'
};
```

#### Sistema de Callbacks
```javascript
// No main.ts:98-120
function onInputChange(action: keyof InputState, pressed: boolean) {
  // Inicialização de áudio na primeira interação
  if (audioSystem && !audioSystem.isInitialized()) {
    audioSystem.initialize();
  }
  
  // Tiro imediato
  if (action === 'shoot' && pressed && gameStateManager.isPlaying()) {
    shoot();
  }
  
  // Pause/unpause
  if (action === 'pause' && pressed) {
    gameStateManager.togglePause();
  }
}
```

### 3. UISystem (`systems/UISystem.ts`)

**Responsabilidade**: Interface de usuário usando Three.js (sem HTML)

#### Elementos de Interface
- **Score**: Posição top-left, texto branco
- **Health**: Top-center com barra visual colorida
- **Ammo**: Top-right com código de cores (branco/amarelo/vermelho)

#### Implementação Técnica
```javascript
// Camera ortográfica para UI overlay
this.uiCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 1, 1000);

// Text sprites com canvas dinâmicos
createTextSprite(text, color) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  // Renderização de texto com shadow para legibilidade
}
```

### 4. AudioSystem (`systems/AudioSystem.ts`)

**Responsabilidade**: Gerenciamento de áudio com fallbacks sintéticos

#### Sons Sintéticos
```javascript
// Tiro: Tom puro 800Hz
createShootSound() {
  const oscillator = this.audioContext.createOscillator();
  oscillator.frequency.setValueAtTime(800, now);
  // Decay exponencial para efeito realista
}

// Explosão: Ruído branco com envelope
createExplosionSound() {
  const bufferSize = this.audioContext.sampleRate * 0.5;
  // Geração de ruído branco com filtragem
}
```

### 5. ParticleSystem (`systems/ParticleSystem.ts`)

**Responsabilidade**: Efeitos visuais de partículas

#### Configurações de Efeitos
```javascript
EXPLOSION_CONFIG = {
  count: 15,
  lifetime: 1000,
  colors: [0xff6600, 0xff0000] // Laranja para vermelho
};

HIT_CONFIG = {
  count: 8, 
  lifetime: 500,
  colors: [0xffff00, 0xff6600] // Amarelo para laranja
};
```

#### Sistema de Animação
```javascript
update(deltaTime) {
  this.particles.forEach(particle => {
    // Atualização de posição com velocidade
    particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
    
    // Animação de cor e escala
    const progress = (Date.now() - particle.createdAt) / particle.lifetime;
    particle.material.color.lerpColors(startColor, endColor, progress);
    particle.scale.setScalar(1 - progress);
  });
}
```

### 6. GameStateManager (`systems/GameStateManager.ts`)

**Responsabilidade**: Gerenciamento de estados e estatísticas

#### Estados do Jogo
```javascript
enum GameStateEnum {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused', 
  GAME_OVER = 'game_over'
}
```

#### Sistema de Estatísticas
```javascript
interface GameStats {
  score: number;
  timeAlive: number;
  enemiesDestroyed: number;
  enemiesEscaped: number;
  shotsFired: number;
  accuracy: number; // Calculada automaticamente
}
```

### 7. MenuSystem (`systems/MenuSystem.ts`)

**Responsabilidade**: Interface HTML/CSS para menus

#### Telas de Interface
- **Menu Principal**: Start game, configurações
- **Tela de Game Over**: Estatísticas detalhadas, restart/menu
- **Tela de Pause**: Resume/menu/restart

#### Styling Espacial
```css
/* Tema consistente com cores cyan/azul */
.menu-container {
  background: radial-gradient(circle, rgba(0,17,34,0.95), rgba(0,0,0,0.98));
  color: #00aaff;
  font-family: 'Courier New', monospace;
}

.menu-button:hover {
  box-shadow: 0 0 20px rgba(0, 170, 255, 0.5);
  text-shadow: 0 0 10px rgba(0, 170, 255, 0.8);
}
```

## Game Loop Principal

### Função animate() (`main.ts:492-548`)

O loop principal roda a ~60fps usando `requestAnimationFrame`:

```javascript
function animate() {
  requestAnimationFrame(animate);
  
  // Só atualizar gameplay se estiver jogando
  if (gameStateManager && gameStateManager.isPlaying()) {
    // 1. Controle da nave do jogador (main.ts:498-514)
    controlPlayerShip();
    
    // 2. Atualização de entidades (main.ts:516-523)
    updateProjectiles();
    updateEnemies(); 
    updatePowerUps();
    
    // 3. Detecção de colisões (main.ts:525-532)
    checkCollisions();
    checkEnemyPlayerCollisions();
    checkPowerUpPlayerCollisions();
    
    // 4. Spawn de entidades (main.ts:534-538)
    trySpawnEnemy();
    trySpawnPowerUp();
  }
  
  // 5. Renderização (sempre) (main.ts:541-547)
  if (particleSystem) particleSystem.update(0.016);
  renderingSystem.render();
  uiSystem.render();
}
```

## Sistemas de Gameplay

### 1. Sistema de Movimento (`main.ts:498-514`)

```javascript
// Movimento contínuo baseado no estado do input
if (playerShip && inputSystem) {
  const inputState = inputSystem.getInputState();
  const speed = 0.08; // Velocidade em unidades por frame
  
  if (inputState.left) playerShip.position.x -= speed;
  if (inputState.right) playerShip.position.x += speed;
  if (inputState.up) playerShip.position.y += speed;
  if (inputState.down) playerShip.position.y -= speed;
}
```

### 2. Sistema de Tiro (`main.ts:265-330`)

#### Características Técnicas
- **Cooldown**: 200ms entre disparos
- **Sistema de Munição**: 30 balas iniciais, recarregáveis via power-ups
- **Projéteis**: Esferas azuis (`0x00ffff`) com física simples

```javascript
function shoot() {
  // Verificações de cooldown e munição
  if (currentTime - lastShotTime < SHOT_COOLDOWN) return;
  if (playerAmmo <= 0) return;
  
  // Criar projétil
  const projectileData: Projectile = {
    id: `projectile_${currentTime}_${Math.random()}`,
    position: { x: playerShip.position.x, y: playerShip.position.y + 1 },
    velocity: { x: 0, y: PROJECTILE_CONFIG.speed },
    damage: PROJECTILE_CONFIG.damage,
    ownerId: 'player'
  };
  
  // Representação visual
  const geometry = new THREE.SphereGeometry(PROJECTILE_CONFIG.size);
  const material = renderingSystem.createTexturedMaterial({ color: 0x00ffff });
  const projectileMesh = new THREE.Mesh(geometry, material);
  
  // Adicionar à cena e tracking
  renderingSystem.addToScene(projectileMesh);
  projectiles.set(projectileId, { object: projectileMesh, data: projectileData });
}
```

### 3. Sistema de Spawn de Inimigos (`main.ts:345-402`)

#### Tipos de Inimigos
```javascript
// Probabilidades de spawn (main.ts:348-357)
const rand = Math.random();
if (rand < 0.7) enemyType = 'basic';      // 70%
else if (rand < 0.9) enemyType = 'fast';  // 20% 
else enemyType = 'heavy';                 // 10%
```

#### Configurações por Tipo (shared package)
```javascript
ENEMY_CONFIG = {
  basic: { health: 1, speed: 2, size: 0.8, color: 0xff0000, spawnRate: 2000 },
  fast: { health: 1, speed: 4, size: 0.6, color: 0xff6600, spawnRate: 1500 },
  heavy: { health: 3, speed: 1, size: 1.2, color: 0x660000, spawnRate: 4000 }
};
```

### 4. Sistema de Power-ups (`main.ts:416-490`)

#### Tipos e Efeitos
```javascript
POWERUP_CONFIG = {
  ammo: { 
    effect: 15, // +15 balas
    color: 0x00ff00, // Verde
    shape: 'cone' // Triângulo
  },
  health: {
    effect: 25, // +25 HP
    color: 0xff0080, // Rosa
    shape: 'sphere'
  },
  shield: {
    effect: 5000, // 5s de proteção (não implementado)
    color: 0x0080ff, // Azul
    shape: 'octahedron'
  }
};
```

### 5. Sistema de Colisões (`main.ts:766-850`)

#### Detecção por Distância
```javascript
function checkCollisions() {
  projectiles.forEach((projectile, projectileId) => {
    enemies.forEach((enemy, enemyId) => {
      // Calcular distância euclidiana
      const dx = projData.position.x - enemyData.position.x;
      const dy = projData.position.y - enemyData.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Verificar colisão (soma dos raios)
      const collisionDistance = projRadius + enemyRadius;
      if (distance < collisionDistance) {
        // Processar colisão: dano, efeitos, score
        handleCollision(projectile, enemy);
      }
    });
  });
}
```

#### Consequências de Colisão
- **Som**: Explosão (`audioSystem.playSound('explosion')`)
- **Efeito Visual**: Partículas de explosão (`particleSystem.createExplosion()`)
- **Score**: Baseado no tipo de inimigo (básico: 10, rápido: 25, pesado: 50)
- **Estatísticas**: Incremento de `enemiesDestroyed`

### 6. Sistema de Penalidades (`main.ts:654-684`)

Inimigos que escapam pela parte inferior causam penalidades:

```javascript
function getEscapePenaltyForEnemyType(enemyType) {
  switch (enemyType) {
    case 'basic': return 5;   // -5 HP
    case 'fast': return 8;    // -8 HP  
    case 'heavy': return 15;  // -15 HP
  }
}
```

## Gerenciamento de Assets

### AssetLoader (`assets/AssetLoader.ts`)

#### Cache Strategy
```javascript
// Texturas: compartilhadas entre objetos
private textureCache = new Map<string, THREE.Texture>();

// Modelos: clonados para evitar conflitos
loadModel(name, path) {
  const loader = new GLTFLoader();
  return new Promise((resolve) => {
    loader.load(path, (gltf) => {
      const model = gltf.scene.clone(); // Clone para uso independente
      resolve(model);
    });
  });
}
```

#### Material Factory
```javascript
createTexturedMaterial(options) {
  return new THREE.MeshStandardMaterial({
    color: options.color || 0xffffff,
    roughness: options.roughness || 0.5,
    metalness: options.metalness || 0.5,
    // Configuração automática de sombras
  });
}
```

### Game Assets (`assets/gameAssets.ts`)

```javascript
export const GAME_ASSETS = {
  models: {
    ship: '/assets/models/ship.glb'
  },
  sounds: {
    shoot: '/assets/sounds/shoot.wav',
    explosion: '/assets/sounds/explosion.wav',
    hit: '/assets/sounds/hit.wav'
  },
  textures: {
    // Texturas procedurais ou externas
  }
};
```

## Shared Package (`packages/shared/src/`)

### Interfaces Comuns
```javascript
// Entidades básicas
interface Projectile {
  id: string;
  position: { x: number; y: number; };
  velocity: { x: number; y: number; };
  damage: number;
  ownerId: string;
  createdAt: number;
}

interface Enemy {
  id: string;
  position: { x: number; y: number; };
  velocity: { x: number; y: number; };
  health: number;
  maxHealth: number;
  type: 'basic' | 'fast' | 'heavy';
  createdAt: number;
}

interface PowerUp {
  id: string;
  position: { x: number; y: number; };
  velocity: { x: number; y: number; };
  type: 'ammo' | 'health' | 'shield';
  createdAt: number;
}
```

### Configurações de Gameplay
```javascript
export const DEFAULT_GAME_CONFIG = {
  player: {
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    speed: 0.08 // unidades por frame
  },
  bounds: {
    x: { min: -10, max: 10 },
    y: { min: -10, max: 10 }
  }
};
```

## Patterns de Performance

### 1. Entity Management
```javascript
// Maps para tracking eficiente
let projectiles: Map<string, { object: THREE.Mesh, data: Projectile }> = new Map();
let enemies: Map<string, { object: THREE.Mesh, data: Enemy }> = new Map();
let powerUps: Map<string, { object: THREE.Mesh, data: PowerUp }> = new Map();

// Cleanup automático baseado em bounds
function updateProjectiles() {
  const toRemove: string[] = [];
  
  projectiles.forEach((projectile, id) => {
    // Atualizar posição
    updatePosition(projectile);
    
    // Marcar para remoção se fora dos bounds
    if (isOutOfBounds(projectile.data.position)) {
      toRemove.push(id);
    }
  });
  
  // Batch removal para eficiência
  toRemove.forEach(id => removeProjectile(id));
}
```

### 2. Resource Management
```javascript
// Cleanup adequado para prevenir memory leaks
function removeProjectile(id) {
  const projectile = projectiles.get(id);
  if (projectile) {
    // Remover da cena Three.js
    renderingSystem.removeFromScene(projectile.object);
    
    // Cleanup de geometria e material se necessário
    projectile.object.geometry.dispose();
    projectile.object.material.dispose();
    
    // Remover do tracking
    projectiles.delete(id);
  }
}
```

### 3. State-based Updates
```javascript
function animate() {
  // Só atualizar gameplay quando necessário
  if (gameStateManager.isPlaying()) {
    updateGameplay();
  }
  
  // Sempre renderizar (para menus e transições)
  renderingSystem.render();
  uiSystem.render();
}
```

## Error Handling e Fallbacks

### 1. Asset Loading
```javascript
// Fallback para nave não carregada (main.ts:122-155)
async function createPlayerShip() {
  try {
    playerShip = await renderingSystem.assetLoader.loadModel('ship', '/assets/models/ship.glb');
  } catch (error) {
    console.warn('Erro ao carregar nave, usando cubo como fallback:', error);
    // Criar cubo verde como fallback
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = renderingSystem.createTexturedMaterial({ color: 0x00ff00 });
    playerShip = new THREE.Group();
    playerShip.add(new THREE.Mesh(geometry, material));
  }
}
```

### 2. Audio Fallbacks
```javascript
// Sons sintéticos quando arquivos não existem
if (!audioBuffer) {
  console.warn(`Som ${soundName} não encontrado, gerando sinteticamente`);
  audioBuffer = this.generateSyntheticSound(soundName);
}
```

### 3. Graceful Degradation
- **Assets faltando**: Não quebram o gameplay
- **Permissões de áudio**: Jogo funciona sem som
- **Performance baixa**: Sistemas podem ser desabilitados conforme necessário

## Debugging e Monitoring

### Console Logging
```javascript
// Logging detalhado para debugging
console.log('Projectile fired!', projectileId);
console.log(`Enemy spawned: ${enemyType}`, enemyId);
console.log(`Collision: ${projectileId} hit ${enemyId}`);
console.log(`PowerUp collected: ${powerUpType}`);
```

### Performance Monitoring
```javascript
// Frame rate targeting
const targetFPS = 60;
const frameTime = 1000 / targetFPS; // ~16.67ms

// Delta time para consistência
function animate() {
  const deltaTime = 0.016; // Assumindo 60fps para simplicidade
  particleSystem.update(deltaTime);
}
```

## Considerações para Manutenção

### 1. Modularidade
- Cada sistema é independente e pode ser testado isoladamente
- Interfaces bem definidas entre sistemas
- Shared package evita duplicação de código

### 2. Extensibilidade
- Novos tipos de inimigos: adicionar em `ENEMY_CONFIG`
- Novos power-ups: estender `POWERUP_CONFIG` e `applyPowerUpEffect()`
- Novos sistemas: seguir pattern existente com callbacks

### 3. Debugging
- Console logs abrangentes
- Estado do jogo claramente separado
- Fallbacks para todos os recursos externos

### 4. Performance
- Entity pooling onde aplicável
- Batch operations (ex: remoção de entidades)
- State-based updates para evitar trabalho desnecessário

Esta arquitetura demonstra um design bem estruturado, performático e maintível, com clara separação de responsabilidades e padrões consistentes em todo o codebase.