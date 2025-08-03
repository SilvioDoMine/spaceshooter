# Space Shooter - Systems Guide

Este documento descreve **todos os sistemas implementados** no cliente do Space Shooter após a **refatoração arquitetural completa** de Janeiro 2025.

## 🏗️ Visão Geral da Nova Arquitetura

O Space Shooter agora utiliza uma **arquitetura Manager/System** modular e escalável:

```
packages/client/src/
├── main.ts (BOOTSTRAP - 198 linhas)
├── core/ (🆕 NOVA ARQUITETURA)
│   ├── GameManager.ts      # Orquestrador principal
│   ├── EntityManager.ts    # Gerenciamento de entidades
│   ├── CollisionSystem.ts  # Sistema de colisões
│   ├── SpawnSystem.ts      # Sistema de spawn
│   └── GameLoop.ts         # Loop principal isolado
├── systems/ (SISTEMAS EXISTENTES)
│   ├── RenderingSystem.ts  # Renderização 3D com Three.js
│   ├── InputSystem.ts      # Captura e processamento de input
│   ├── UISystem.ts         # HUD e interface
│   ├── AudioSystem.ts      # Sons e efeitos
│   ├── ParticleSystem.ts   # Efeitos visuais
│   ├── GameStateManager.ts # Estados do jogo
│   └── MenuSystem.ts       # Sistema de menus
└── assets/
    ├── AssetLoader.ts      # Carregamento e cache de assets
    └── gameAssets.ts       # Manifesto de assets do jogo
```

## 🎯 Core Managers (Nova Arquitetura)

### GameManager (Orquestrador Principal)

**Responsabilidade**: Coordena todos os sistemas e managers, ponto único de inicialização.

#### Funcionalidades
- Inicialização completa do jogo
- Coordenação entre sistemas
- Gerenciamento de estado global
- Debug tools integrados
- Error handling robusto

#### Como Usar
```typescript
// Inicialização completa
const gameManager = new GameManager();
await gameManager.initialize();

// No loop principal
function animate() {
  requestAnimationFrame(animate);
  gameManager.update(); // Coordena tudo
}

// Debug (console do browser)
gameDebug.getInfo()     // Estado geral
gameDebug.getStats()    // Performance stats
gameManager.getSystems() // Acesso aos sistemas
```

### EntityManager (Gerenciamento de Entidades)

**Responsabilidade**: CRUD completo de todas as entidades do jogo.

#### Funcionalidades
- Criação/remoção de projéteis, inimigos, power-ups
- Tracking centralizado com Maps
- Atualização de posições e estados
- Sincronização visual + data
- Cleanup automático

#### Como Usar
```typescript
// Criar entidades
const projectile = entityManager.createProjectile({
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 5 },
  damage: 10
});

const enemy = entityManager.createEnemy('basic');
const powerUp = entityManager.createPowerUp('ammo');

// Atualizar (no game loop)
entityManager.updateProjectiles(deltaTime);
const result = entityManager.updateEnemies(deltaTime);
entityManager.updatePowerUps(deltaTime);

// Informações
const counts = entityManager.getEntityCounts();
console.log(`Entidades ativas: ${counts.total}`);
```

### CollisionSystem (Sistema de Colisões)

**Responsabilidade**: Detecção e resolução de todas as colisões do jogo.

#### Funcionalidades
- Colisões projétil vs inimigo
- Colisões jogador vs inimigo
- Colisões jogador vs power-up
- Efeitos visuais e sonoros automáticos
- Configuração de raios de colisão

#### Como Usar
```typescript
// Verificar colisões (no game loop)
const playerPos = { x: player.x, y: player.y };
const result = collisionSystem.checkAllCollisions(playerPos);

// Processar resultados
result.projectileHits.forEach(hit => {
  if (hit.destroyed) {
    score += hit.points;
    console.log(`Enemy destroyed! +${hit.points} points`);
  }
});

result.powerUpCollections.forEach(collection => {
  applyPowerUpEffect(collection.powerUp.data.type, collection.effect);
});
```

### SpawnSystem (Sistema de Spawn)

**Responsabilidade**: Geração controlada e configurável de entidades.

#### Funcionalidades
- Spawn baseado em timers independentes
- Probabilidades configuráveis por tipo
- Sistema de dificuldade dinâmico
- Force spawn para debugging
- Estatísticas de spawn

#### Como Usar
```typescript
// Atualização (no game loop)
spawnSystem.update();

// Configuração de dificuldade
spawnSystem.setDifficulty('hard');
spawnSystem.setEnemySpawnRate(1000); // 1s entre spawns

// Debug
spawnSystem.forceSpawnEnemy('heavy');
spawnSystem.forceSpawnPowerUp('health');

// Estatísticas
const stats = spawnSystem.getStats();
console.log('Spawn stats:', stats);
```

### GameLoop (Loop Principal)

**Responsabilidade**: Coordenação do loop principal do jogo.

#### Funcionalidades
- Loop isolado e testável
- Delta time consistente
- FPS monitoring
- Pause/resume suporte
- Input handling centralizado

#### Como Usar
```typescript
// Controle do loop
gameLoop.start();
gameLoop.pause();
gameLoop.resume();
gameLoop.stop();

// Input handling
gameLoop.handleInput('space', true, gameState, playerShip);

// Performance
const stats = gameLoop.getPerformanceStats();
console.log(`FPS: ${stats.fps}, Entities: ${stats.entityCounts.total}`);
```

---

## 🎮 Sistemas Existentes (Mantidos)

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

## UISystem

**Responsabilidade**: Criar e gerenciar interface de usuário (HUD) totalmente dentro do Three.js.

### Características Principais
- **HUD overlay** usando câmera ortográfica independente
- **Text sprites** com canvas dinâmico para qualidade otimizada
- **Elementos visuais**: Score, vida (texto + barra), munição
- **Responsivo** com posicionamento baseado em aspect ratio
- **Performance otimizada** para 60fps
- **Zero HTML/CSS** - tudo renderizado em Three.js

### Elementos do HUD

#### Score (top-left)
- Mostra pontuação atual do jogador
- Atualizado automaticamente quando inimigos são destruídos
- Posição: canto superior esquerdo

#### Health (top-center)
- **Texto**: "Health: 100/100" com código de cores
- **Barra visual**: Verde/Amarelo/Vermelho baseado em %
- Atualizado quando jogador toma dano de inimigos
- Posição: centro superior

#### Ammo (top-right)
- **Texto**: "Ammo: 30/30" com código de cores
- Branco (normal), Amarelo (<30%), Vermelho (0)
- Atualizado a cada disparo
- Posição: canto superior direito

### Como Usar

```typescript
// Inicialização (integrado com RenderingSystem)
const uiSystem = new UISystem(renderingSystem.renderer);

// Atualizar elementos individualmente
uiSystem.updateScore(1500);
uiSystem.updateHealth(75, 100);
uiSystem.updateAmmo(24, 30);

// Métodos de conveniência
uiSystem.addScore(50);        // Adiciona pontos
uiSystem.damageHealth(25);    // Remove vida
uiSystem.useAmmo(1);          // Usa munição
uiSystem.reloadAmmo();        // Recarrega para máximo

// Render no game loop (APÓS render principal)
renderingSystem.render();
uiSystem.render();
```

### Sistema de Canvas Dinâmico

#### Tecnologia
- **Canvas individual** para cada elemento de texto
- **Tamanho baseado no conteúdo** usando `measureText()`
- **Font 64px Arial Bold** para qualidade
- **Text shadow** para legibilidade em qualquer background
- **LinearFilter** para texto nítido

#### Processo de Rendering
```typescript
// 1. Medir texto para determinar canvas size
const metrics = context.measureText(text);
canvas.width = Math.ceil(textWidth + 40);   // Padding
canvas.height = Math.ceil(textHeight + 20);

// 2. Configurar font e estilo
context.font = 'bold 64px Arial, sans-serif';
context.shadowBlur = 4;
context.shadowColor = 'rgba(0, 0, 0, 0.9)';

// 3. Renderizar texto centralizado
context.fillText(text, canvas.width / 2, canvas.height / 2);

// 4. Criar texture Three.js
const texture = new THREE.CanvasTexture(canvas);
texture.minFilter = THREE.LinearFilter;
```

### Integração com Gameplay

#### Sistema de Pontuação
```typescript
// Pontos por tipo de inimigo
basic enemy:  +10 pontos
fast enemy:   +25 pontos  
heavy enemy:  +50 pontos

// Integração automática
if (enemyDestroyed) {
  const points = getScoreForEnemyType(enemy.type);
  gameScore += points;
  uiSystem.updateScore(gameScore);
}
```

#### Sistema de Vida
```typescript
// Dano por tipo de inimigo
basic enemy:  -10 HP
fast enemy:   -15 HP
heavy enemy:  -25 HP

// Atualização com código de cores
uiSystem.updateHealth(playerHealth, playerMaxHealth);
// Verde: >50%, Amarelo: 25-50%, Vermelho: <25%
```

#### Sistema de Munição
```typescript
// Munição limitada
maxAmmo: 30 balas
cooldown: 200ms entre disparos

// Integração com sistema de tiro
if (shoot() && playerAmmo > 0) {
  playerAmmo--;
  uiSystem.updateAmmo(playerAmmo, playerMaxAmmo);
}
```

### Arquitetura Técnica

#### Câmera Ortográfica
```typescript
// Setup independente do jogo principal
this.camera = new THREE.OrthographicCamera(
  -aspect, aspect, 1, -1, 0.1, 10
);
this.camera.position.z = 1;
```

#### Renderização Overlay
```typescript
// Renderiza APÓS o jogo principal
public render(): void {
  this.renderer.autoClear = false;  // Não limpar buffer
  this.renderer.clearDepth();      // Limpar apenas depth
  this.renderer.render(this.scene, this.camera);
}
```

#### Responsividade
```typescript
// Reposicionamento automático no resize
private onWindowResize(): void {
  const aspect = window.innerWidth / window.innerHeight;
  
  // Atualizar câmera
  this.camera.left = -aspect;
  this.camera.right = aspect;
  
  // Reposicionar elementos
  this.scoreText.position.x = -aspect * 0.9;
  this.ammoText.position.x = aspect * 0.9;
}
```

### Performance e Otimizações

#### Atuais
- **Canvas reutilizados** para updates de texto
- **Redimensionamento inteligente** apenas quando necessário
- **Sprites independentes** para isolamento
- **Update seletivo** apenas quando valores mudam

#### Futuras Melhorias
- **Troika-three-text**: SDF fonts para qualidade superior
- **Object pooling**: Reutilização de sprites
- **Batch updates**: Agrupar múltiplas mudanças
- **LOD text**: Diferentes qualidades por distância

### Estado Atual vs Futuro

#### ✅ Implementado
- HUD funcional com score, vida, munição
- Text rendering de alta qualidade
- Integração completa com gameplay
- Responsividade e resize handling
- Código de cores dinâmico

#### 🔄 Planejado para Refatoração
- **Migração para troika-three-text** para melhor qualidade
- **Menu system** integrado
- **Animações** de transição
- **Customização** de layout e temas

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
- **UISystem**: HUD totalmente em Three.js com score, vida, munição
- **AssetLoader**: Cache, GLTF/GLB, texturas, material factory

### 🎮 Funcionalidades Ativas
- Nave 3D carregada de arquivo GLB (escala otimizada)
- Controles WASD para movimento (velocidade aumentada)
- **Sistema de Tiro com projéteis (Espaço)**
- **Sistema de Inimigos com 3 tipos diferentes**
- **HUD completo**: Score, vida, munição com barras visuais
- **Sistema de gameplay**: Vida do jogador, munição limitada, pontuação
- **Collision Detection funcional** (projéteis vs inimigos, inimigos vs jogador)
- **Gameplay Loop completo** com consequências
- Fallback automático (cubo verde se modelo falhar)
- Mobile-friendly (sem zoom)
- Hot reload em desenvolvimento

## Próximos Systems

Os seguintes sistemas estão planejados para implementação:

- **AudioSystem**: Gerenciamento de sons e música
- **ParticleSystem**: Efeitos visuais e partículas (explosões, trails)
- **PhysicsSystem**: Movimento e colisões avançado (compartilhado)
- **MenuSystem**: Telas de menu, game over, pause

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