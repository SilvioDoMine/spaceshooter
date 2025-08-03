# Space Shooter - Systems Guide

Este documento descreve os sistemas implementados no cliente do Space Shooter, como usá-los e suas principais funcionalidades.

## Visão Geral dos Systems

O cliente do Space Shooter é construído com uma arquitetura modular baseada em sistemas especializados:

```
packages/client/src/systems/
├── RenderingSystem.ts    # Renderização 3D com Three.js
├── InputSystem.ts        # Captura e processamento de input
└── (futuros: AudioSystem, UISystem, etc.)

packages/client/src/assets/
├── AssetLoader.ts        # Carregamento e cache de assets
└── gameAssets.ts         # Manifesto de assets do jogo
```

## RenderingSystem

**Responsabilidade**: Gerenciar toda a renderização 3D do jogo.

### Funcionalidades
- Scene 3D com background espacial
- Camera perspectiva configurável  
- WebGL renderer com shadows e antialias
- Sistema de iluminação (ambiente, direcional, pontual)
- Integração com AssetLoader
- Responsivo (redimensionamento automático)

### Como Usar

```typescript
// Inicialização
const renderingSystem = new RenderingSystem();
renderingSystem.attachToDOM('game-container');

// Carregar assets
await renderingSystem.loadAssets((progress) => {
  console.log(`Loading: ${progress}%`);
});

// Adicionar objetos à cena
const mesh = new THREE.Mesh(geometry, material);
renderingSystem.addToScene(mesh);

// Loop de renderização
function animate() {
  requestAnimationFrame(animate);
  renderingSystem.render();
}
```

### Propriedades Públicas
- `scene`: THREE.Scene - Cena principal
- `camera`: THREE.PerspectiveCamera - Câmera do jogo
- `renderer`: THREE.WebGLRenderer - Renderer WebGL
- `assetLoader`: AssetLoader - Sistema de assets integrado

## InputSystem

**Responsabilidade**: Capturar e processar eventos de teclado.

### Mapeamento de Teclas
- **Movimento**: WASD, Arrow Keys
- **Tiro**: Space
- **Pause**: P, Escape

### Como Usar

```typescript
// Inicialização
const inputSystem = new InputSystem();

// Callback para eventos discretos
inputSystem.addInputCallback((action, pressed) => {
  if (action === 'shoot' && pressed) {
    player.shoot();
  }
});

// Estado contínuo no game loop
function gameLoop() {
  const input = inputSystem.getInputState();
  
  if (input.up) player.moveUp();
  if (input.left) player.moveLeft();
  if (input.right) player.moveRight();
  if (input.down) player.moveDown();
}
```

### Interface InputState
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

### Métodos Principais
- `getInputState()`: Retorna estado atual de todas as teclas
- `isPressed(action)`: Verifica se ação específica está pressionada
- `addInputCallback(callback)`: Adiciona listener para eventos
- `removeInputCallback(callback)`: Remove listener

## AssetLoader

**Responsabilidade**: Carregar, cachear e disponibilizar assets do jogo.

### Tipos de Assets Suportados
- **Texturas**: JPG, PNG
- **Modelos 3D**: GLTF, GLB  
- **Sons**: WAV, MP3 (preparado para AudioSystem futuro)

### Como Usar

```typescript
const assetLoader = new AssetLoader();

// Carregar assets individuais
const texture = await assetLoader.loadTexture('metal', '/textures/metal.jpg');
const model = await assetLoader.loadModel('ship', '/models/ship.glb');

// Carregar via manifest
const manifest = {
  textures: { 'metal': '/textures/metal.jpg' },
  models: { 'ship': '/models/ship.glb' },
  sounds: { 'laser': '/sounds/laser.wav' }
};

assetLoader.onProgress = (progress) => console.log(`${progress}%`);
await assetLoader.loadAssetManifest(manifest);

// Recuperar assets do cache
const cachedTexture = assetLoader.getTexture('metal');
const shipClone = assetLoader.getModel('ship'); // retorna clone

// Factory de materiais
const material = assetLoader.createMaterial({
  color: 0xff0000,
  map: 'metal',
  roughness: 0.5,
  metalness: 0.2
});
```

### Sistema de Cache
- **Texturas**: Compartilhadas entre objetos (referência)
- **Modelos**: Clonados automaticamente (instâncias únicas)
- **Loading Promises**: Evita carregamentos duplicados

### Callbacks Disponíveis
- `onProgress(progress: number)`: Progresso de carregamento (0-100)
- `onComplete()`: Todos os assets carregados
- `onError(error: Error)`: Erro no carregamento

## Integração dos Systems

### Exemplo Completo

```typescript
import { RenderingSystem } from './systems/RenderingSystem';
import { InputSystem } from './systems/InputSystem';

let renderingSystem: RenderingSystem;
let inputSystem: InputSystem;

async function init() {
  // Inicializar renderização
  renderingSystem = new RenderingSystem();
  renderingSystem.attachToDOM('game-container');
  
  // Carregar assets
  await renderingSystem.loadAssets((progress) => {
    console.log(`Loading: ${progress}%`);
  });
  
  // Inicializar input
  inputSystem = new InputSystem();
  inputSystem.addInputCallback(handleInput);
  
  // Iniciar game loop
  gameLoop();
}

function handleInput(action: string, pressed: boolean) {
  console.log(`${action}: ${pressed ? 'pressed' : 'released'}`);
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  
  // Processar input
  const input = inputSystem.getInputState();
  updateGame(input);
  
  // Renderizar
  renderingSystem.render();
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
```

## Estado Atual de Implementação

### ✅ Systems Completos
- **RenderingSystem**: Scene 3D, iluminação, shadows, responsivo
- **InputSystem**: WASD, espaço, pause, callbacks
- **AssetLoader**: Cache, GLTF/GLB, texturas, material factory

### 🎮 Funcionalidades Ativas
- Nave 3D carregada de arquivo GLB (escala otimizada)
- Controles WASD para movimento (velocidade aumentada)
- **Sistema de Tiro com projéteis (Espaço)**
- **Sistema de Inimigos com 3 tipos diferentes**
- **Collision Detection funcional**
- **Gameplay Loop completo**
- Fallback automático (cubo verde se modelo falhar)
- Mobile-friendly (sem zoom)
- Hot reload em desenvolvimento

## Próximos Systems

Os seguintes sistemas estão planejados para implementação:

- **AudioSystem**: Gerenciamento de sons e música
- **UISystem**: Interface do usuário e HUD
- **ParticleSystem**: Efeitos visuais e partículas
- **PhysicsSystem**: Movimento e colisões (compartilhado)

## Boas Práticas

### Performance
- Use `getInputState()` no game loop para movimento contínuo
- Use callbacks para eventos discretos (tiro, pause)
- Assets são cacheados automaticamente
- Modelos são clonados para evitar conflitos

### Limpeza
```typescript
// Sempre fazer dispose ao finalizar
renderingSystem.dispose();
inputSystem.dispose();
```

### Organização
- Mantenha assets organizados no manifest (`gameAssets.ts`)
- Use nomes descritivos para assets
- Configure callbacks de progresso para UX melhor

## Sistema de Tiro (Shooting System)

**Responsabilidade**: Gerenciar criação, movimento e lifecycle de projéteis.

### Características Principais
- **Cooldown**: 50ms entre disparos para evitar spam
- **Projéteis visuais**: Esferas azuis (SphereGeometry)
- **Movimento automático**: 15 unidades/segundo para frente
- **Cleanup automático**: 3 segundos de lifetime + bounds checking
- **Tracking único**: Cada projétil tem ID único para gerenciamento

### Como Funciona

#### Disparo
```typescript
// Disparar ao pressionar espaço (via InputSystem callback)
inputSystem.addInputCallback((action, pressed) => {
  if (action === 'shoot' && pressed) {
    shoot(); // Cria novo projétil se não estiver em cooldown
  }
});
```

#### Estrutura do Projétil
```typescript
// Interface compartilhada (packages/shared)
interface Projectile {
  id: string;              // ID único
  position: Vector2D;      // Posição atual
  velocity: Vector2D;      // Velocidade (x, y)
  damage: number;          // Dano do projétil
  ownerId: string;         // ID do jogador que atirou
  createdAt: number;       // Timestamp de criação
}

// Configurações (packages/shared)
const PROJECTILE_CONFIG = {
  speed: 15,               // Velocidade (unidades/segundo)
  damage: 10,              // Dano causado
  lifetime: 3000,          // Tempo de vida (ms)
  size: 0.1                // Tamanho visual
};
```

#### Sistema de Tracking
```typescript
// Map para tracking de projéteis ativos
let projectiles: Map<string, { 
  object: THREE.Mesh,      // Objeto visual Three.js
  data: Projectile         // Dados do projétil
}> = new Map();
```

#### Loop de Atualização
```typescript
function updateProjectiles() {
  const currentTime = Date.now();
  const toRemove: string[] = [];
  
  projectiles.forEach((projectile, id) => {
    const { object, data } = projectile;
    
    // Verificar expiração
    if (currentTime - data.createdAt > PROJECTILE_CONFIG.lifetime) {
      toRemove.push(id);
      return;
    }
    
    // Atualizar posição (60fps assumed)
    data.position.x += data.velocity.x * 0.016;
    data.position.y += data.velocity.y * 0.016;
    
    object.position.x = data.position.x;
    object.position.y = data.position.y;
    
    // Verificar bounds (limites da tela)
    if (data.position.y > 10 || data.position.y < -10 ||
        data.position.x > 10 || data.position.x < -10) {
      toRemove.push(id);
    }
  });
  
  // Cleanup
  toRemove.forEach(id => {
    const projectile = projectiles.get(id);
    if (projectile) {
      renderingSystem.removeFromScene(projectile.object);
      projectiles.delete(id);
    }
  });
}
```

### Integração com Systems

#### RenderingSystem
- Adiciona/remove objetos visuais da cena
- Cria material cyan para projéteis
- Usa SphereGeometry com tamanho configurável

#### InputSystem
- Disparo via callback do evento 'shoot'
- Cooldown implementado para evitar spam

#### Shared Package
- Interface `Projectile` para tipagem
- `PROJECTILE_CONFIG` para configurações
- Reutilizável para multiplayer futuro

### Performance e Otimizações

#### Atuais
- **Map tracking**: O(1) para lookup por ID
- **Batch cleanup**: Remove múltiplos projéteis por frame
- **Bounds checking**: Remove projéteis fora da tela
- **Lifetime limit**: Evita acúmulo infinito

#### Futuras (Object Pooling)
```typescript
// Pool de objetos reutilizáveis (planejado)
class ProjectilePool {
  private available: THREE.Mesh[] = [];
  private active: Set<THREE.Mesh> = new Set();
  
  acquire(): THREE.Mesh { /* ... */ }
  release(mesh: THREE.Mesh): void { /* ... */ }
}
```

### Próximas Features
- **Different Types**: Projéteis com características diferentes
- **Visual Effects**: Trails, partículas
- **Audio**: Sons de disparo

## Sistema de Inimigos (Enemy System)

**Responsabilidade**: Gerenciar spawn, movimento, tipos e lifecycle de inimigos.

### Características Principais
- **3 tipos diferentes**: Basic, Fast, Heavy com stats únicos
- **Spawn automático**: Controle de timing e frequência
- **Movimento automático**: Descida vertical em direção ao jogador
- **Sistema de health**: Múltiplos hits para destruição
- **Cleanup automático**: Remoção quando saem da tela
- **Balanceamento**: Probabilidades diferentes para cada tipo

### Tipos de Inimigos

#### Basic (70% spawn rate)
```typescript
{
  health: 20,        // 2 hits para destruir
  speed: 1.5,        // Velocidade moderada
  size: 0.3,         // Tamanho médio
  color: 0xff4444,   // Vermelho
  spawnRate: 2000    // A cada 2 segundos
}
```

#### Fast (20% spawn rate)
```typescript
{
  health: 10,        // 1 hit para destruir
  speed: 2.5,        // Mais rápido
  size: 0.2,         // Menor
  color: 0xff8800,   // Laranja
  spawnRate: 3000    // A cada 3 segundos
}
```

#### Heavy (10% spawn rate)
```typescript
{
  health: 50,        // 5 hits para destruir
  speed: 0.8,        // Mais lento
  size: 0.5,         // Maior
  color: 0x8844ff,   // Roxo
  spawnRate: 5000    // A cada 5 segundos
}
```

### Como Funciona

#### Spawn System
```typescript
function spawnEnemy() {
  // Determinar tipo baseado em probabilidade
  const rand = Math.random();
  let enemyType: Enemy['type'];
  if (rand < 0.7) enemyType = 'basic';
  else if (rand < 0.9) enemyType = 'fast';
  else enemyType = 'heavy';
  
  // Criar inimigo no topo da tela
  const enemyData: Enemy = {
    position: { x: randomX, y: 6 },
    velocity: { x: 0, y: -config.speed },
    health: config.health,
    type: enemyType
  };
}
```

#### Movement System
```typescript
function updateEnemies() {
  enemies.forEach((enemy, id) => {
    // Movimento automático baseado na velocidade
    enemy.data.position.y += enemy.data.velocity.y * deltaTime;
    enemy.object.position.y = enemy.data.position.y;
    
    // Cleanup se saiu da tela
    if (enemy.data.position.y < -6) {
      removeEnemy(id);
    }
  });
}
```

#### Health System
```typescript
// No sistema de colisões
if (collision) {
  enemy.health -= projectile.damage;
  
  if (enemy.health <= 0) {
    // Inimigo destruído
    removeEnemy(enemyId);
  }
}
```

### Integração com Systems

#### RenderingSystem
- Cria objetos visuais (BoxGeometry) com cores específicas
- Adiciona/remove da cena Three.js
- Aplica shadows e materiais

#### Collision System
- Detecta colisões com projéteis
- Aplica dano baseado no damage do projétil
- Remove inimigos quando health <= 0

#### Shared Package
- Interface `Enemy` para tipagem
- `ENEMY_CONFIG` com configurações balanceadas
- Tipos union para type safety

### Performance e Otimizações

#### Atuais
- **Map tracking**: O(1) para lookup por ID
- **Batch cleanup**: Remove múltiplos inimigos por frame
- **Bounds checking**: Remove inimigos que saíram da tela
- **Type-based spawning**: Sistema de probabilidades eficiente

#### Spawn Control
```typescript
function trySpawnEnemy() {
  const currentTime = Date.now();
  
  // Controle de timing baseado no tipo basic
  if (currentTime - lastEnemySpawnTime > ENEMY_CONFIG.basic.spawnRate) {
    spawnEnemy();
    lastEnemySpawnTime = currentTime;
  }
}
```

### Balanceamento de Gameplay

#### Dificuldade Progressiva
- **Basic**: Comum, moderado - base do gameplay
- **Fast**: Raro, rápido - desafio de precisão
- **Heavy**: Muito raro, tanque - teste de DPS

#### Timing e Ritmo
- Spawn a cada 2 segundos mantém ritmo constante
- Velocidades balanceadas para permitir esquiva
- Health variado cria diferentes objetivos táticos

### Futuras Features
- **Padrões de movimento**: Movimento diagonal, zigzag
- **Inimigos atiradores**: Projéteis inimigos
- **Boss enemies**: Inimigos grandes com fases
- **Wave system**: Ondas progressivas de dificuldade
- **Diferentes spawns**: Laterais, múltiplos pontos