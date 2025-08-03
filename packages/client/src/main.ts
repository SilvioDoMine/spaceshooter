import * as THREE from 'three';
import { DEFAULT_GAME_CONFIG, Projectile, PROJECTILE_CONFIG, Enemy, ENEMY_CONFIG } from '@spaceshooter/shared';
import { RenderingSystem } from './systems/RenderingSystem';
import { InputSystem, InputState } from './systems/InputSystem';
import { UISystem } from './systems/UISystem';

console.log('Cliente iniciado');
console.log('Config do jogo:', DEFAULT_GAME_CONFIG);

let renderingSystem: RenderingSystem;
let inputSystem: InputSystem;
let uiSystem: UISystem;
let playerShip: THREE.Group;
let projectiles: Map<string, { object: THREE.Mesh, data: Projectile }> = new Map();
let enemies: Map<string, { object: THREE.Mesh, data: Enemy }> = new Map();
let lastShotTime = 0;
let lastEnemySpawnTime = 0;
const SHOT_COOLDOWN = 200; // milliseconds - increased for ammo management

// Game state
let playerHealth = 100;
let playerMaxHealth = 100;
let playerAmmo = 30;
let playerMaxAmmo = 30;
let gameScore = 0;

async function init() {
  // Inicializar sistema de renderização
  renderingSystem = new RenderingSystem();
  renderingSystem.attachToDOM('game-container');

  // Carregar assets básicos e do jogo
  console.log('Carregando assets...');
  await renderingSystem.loadAssets((progress) => {
    console.log(`Loading progress: ${progress.toFixed(1)}%`);
  });
  
  // Carregar assets do jogo (incluindo nave)
  const { GAME_ASSETS } = await import('./assets/gameAssets');
  await renderingSystem.assetLoader.loadAssetManifest(GAME_ASSETS).catch((error) => {
    console.warn('Alguns assets do jogo não puderam ser carregados:', error.message);
  });
  
  console.log('Assets carregados!');

  // Inicializar sistema de input
  inputSystem = new InputSystem();
  inputSystem.addInputCallback(onInputChange);

  // Inicializar sistema de UI
  uiSystem = new UISystem(renderingSystem.renderer);
  uiSystem.updateHealth(playerHealth, playerMaxHealth);
  uiSystem.updateAmmo(playerAmmo, playerMaxAmmo);
  uiSystem.updateScore(gameScore);

  // Criar nave do jogador
  await createPlayerShip();
}

function onInputChange(action: keyof InputState, pressed: boolean) {
  console.log(`${action}: ${pressed ? 'pressed' : 'released'}`);
  
  if (action === 'shoot' && pressed) {
    shoot();
  }
}

async function createPlayerShip() {
  try {
    // Tentar carregar nave do arquivo
    playerShip = await renderingSystem.assetLoader.loadModel('ship', '/assets/models/ship.glb');
    console.log('Nave carregada com sucesso!');
  } catch (error) {
    console.warn('Erro ao carregar nave, usando cubo como fallback:', error);
    // Fallback: criar cubo se nave não carregar
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = renderingSystem.createTexturedMaterial({
      color: 0x00ff00,
      roughness: 0.3,
      metalness: 0.7
    });
    
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    
    playerShip = new THREE.Group();
    playerShip.add(cube);
  }
  
  // Posicionar nave
  playerShip.position.set(0, 0, 0);
  playerShip.scale.setScalar(0.3); // Reduzir tamanho para melhor gameplay

  // Rotaciona a nave para frente
  playerShip.rotation.x = -Math.PI / 2; // Rotaciona para que
  // Ele está de frente, preciso que fique de lado
  playerShip.rotation.z = Math.PI / 2; // Rotaciona para que fique de lado
  
  renderingSystem.addToScene(playerShip);
}

/**
 * Sistema de Tiro
 * 
 * Cria e gerencia projéteis do jogador. Os projéteis são representados visualmente
 * como esferas azuis que se movem automaticamente para frente da nave.
 * 
 * Características:
 * - Cooldown de 50ms entre disparos para evitar spam
 * - Projéteis têm velocidade configurável (15 unidades/segundo)
 * - Cleanup automático após 3 segundos ou quando saem dos bounds
 * - Cada projétil tem ID único para tracking
 * - Visual: esfera azul (SphereGeometry + material cyan)
 * 
 * @see PROJECTILE_CONFIG para configurações
 * @see Projectile interface no shared package
 */
function shoot() {
  const currentTime = Date.now();
  if (currentTime - lastShotTime < SHOT_COOLDOWN) {
    return; // Still in cooldown
  }
  
  // Check ammo
  if (playerAmmo <= 0) {
    console.log('No ammo!');
    return;
  }
  
  lastShotTime = currentTime;
  
  // Use ammo
  playerAmmo--;
  uiSystem.updateAmmo(playerAmmo, playerMaxAmmo);
  
  const projectileId = `projectile_${currentTime}_${Math.random()}`;
  
  // Create projectile data
  const projectileData: Projectile = {
    id: projectileId,
    position: {
      x: playerShip.position.x,
      y: playerShip.position.y + 1 // Spawn slightly in front of ship
    },
    velocity: {
      x: 0,
      y: PROJECTILE_CONFIG.speed
    },
    damage: PROJECTILE_CONFIG.damage,
    ownerId: 'player',
    createdAt: currentTime
  };
  
  // Create visual object
  const geometry = new THREE.SphereGeometry(PROJECTILE_CONFIG.size);
  const material = renderingSystem.createTexturedMaterial({
    color: 0x00ffff
  });
  
  const projectileMesh = new THREE.Mesh(geometry, material);
  projectileMesh.position.set(
    projectileData.position.x,
    projectileData.position.y,
    0
  );
  
  // Add to scene and tracking
  renderingSystem.addToScene(projectileMesh);
  projectiles.set(projectileId, {
    object: projectileMesh,
    data: projectileData
  });
  
  console.log('Projectile fired!', projectileId);
}

/**
 * Sistema de Spawn de Inimigos
 * 
 * Gera inimigos automaticamente em intervalos regulares na parte superior da tela.
 * Inimigos são criados com tipos diferentes (basic, fast, heavy) e começam a se
 * mover automaticamente em direção ao jogador.
 * 
 * Características:
 * - Spawn no topo da tela em posições aleatórias no eixo X
 * - Diferentes tipos com health, velocidade e visual únicos
 * - Sistema de timing para controlar frequência de spawn
 * - Visual: cubos coloridos baseados no tipo
 */
function spawnEnemy() {
  const currentTime = Date.now();
  
  // Determinar tipo de inimigo (70% basic, 20% fast, 10% heavy)
  const rand = Math.random();
  let enemyType: Enemy['type'];
  if (rand < 0.7) {
    enemyType = 'basic';
  } else if (rand < 0.9) {
    enemyType = 'fast';
  } else {
    enemyType = 'heavy';
  }
  
  const config = ENEMY_CONFIG[enemyType];
  const enemyId = `enemy_${currentTime}_${Math.random()}`;
  
  // Criar dados do inimigo
  const enemyData: Enemy = {
    id: enemyId,
    position: {
      x: (Math.random() - 0.5) * 8, // Random X entre -4 e 4
      y: 6 // Spawn no topo
    },
    velocity: {
      x: 0,
      y: -config.speed // Move para baixo
    },
    health: config.health,
    maxHealth: config.health,
    type: enemyType,
    createdAt: currentTime
  };
  
  // Criar objeto visual
  const geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
  const material = renderingSystem.createTexturedMaterial({
    color: config.color
  });
  
  const enemyMesh = new THREE.Mesh(geometry, material);
  enemyMesh.position.set(
    enemyData.position.x,
    enemyData.position.y,
    0
  );
  enemyMesh.castShadow = true;
  enemyMesh.receiveShadow = true;
  
  // Adicionar à cena e tracking
  renderingSystem.addToScene(enemyMesh);
  enemies.set(enemyId, {
    object: enemyMesh,
    data: enemyData
  });
  
  console.log(`Enemy spawned: ${enemyType}`, enemyId);
}

function animate() {
  requestAnimationFrame(animate);
  
  // Controlar nave do jogador
  if (playerShip && inputSystem) {
    const inputState = inputSystem.getInputState();
    const speed = 0.08;
    
    if (inputState.left) {
      playerShip.position.x -= speed;
    }
    if (inputState.right) {
      playerShip.position.x += speed;
    }
    if (inputState.up) {
      playerShip.position.y += speed;
    }
    if (inputState.down) {
      playerShip.position.y -= speed;
    }
  }
  
  // Update projectiles
  updateProjectiles();
  
  // Update enemies
  updateEnemies();
  
  // Check collisions
  checkCollisions();
  
  // Check enemy-player collisions
  checkEnemyPlayerCollisions();
  
  // Spawn enemies
  trySpawnEnemy();
  
  renderingSystem.render();
  uiSystem.render();
}

/**
 * Atualiza todos os projéteis ativos
 * 
 * Esta função é chamada a cada frame do loop de renderização e:
 * - Atualiza posições dos projéteis baseado na velocidade
 * - Remove projéteis expirados (após 3 segundos)
 * - Remove projéteis que saíram dos bounds da tela
 * - Limpa objetos da memória e da cena Three.js
 * 
 * Performance: O(n) onde n = número de projéteis ativos
 */
function updateProjectiles() {
  const currentTime = Date.now();
  const toRemove: string[] = [];
  
  projectiles.forEach((projectile, id) => {
    const { object, data } = projectile;
    
    // Check if projectile has expired
    if (currentTime - data.createdAt > PROJECTILE_CONFIG.lifetime) {
      toRemove.push(id);
      return;
    }
    
    // Update position
    data.position.x += data.velocity.x * 0.016; // ~60fps
    data.position.y += data.velocity.y * 0.016;
    
    object.position.x = data.position.x;
    object.position.y = data.position.y;
    
    // Remove if out of bounds (assuming screen bounds)
    if (data.position.y > 10 || data.position.y < -10 ||
        data.position.x > 10 || data.position.x < -10) {
      toRemove.push(id);
    }
  });
  
  // Remove expired/out-of-bounds projectiles
  toRemove.forEach(id => {
    const projectile = projectiles.get(id);
    if (projectile) {
      renderingSystem.removeFromScene(projectile.object);
      projectiles.delete(id);
    }
  });
}

/**
 * Controla o spawn automático de inimigos
 * 
 * Verifica se é hora de spawnar um novo inimigo baseado no tempo decorrido
 * desde o último spawn. Usa rate diferentes para cada tipo de inimigo.
 */
function trySpawnEnemy() {
  const currentTime = Date.now();
  
  // Spawn básico a cada 2 segundos
  if (currentTime - lastEnemySpawnTime > ENEMY_CONFIG.basic.spawnRate) {
    spawnEnemy();
    lastEnemySpawnTime = currentTime;
  }
}

/**
 * Atualiza todos os inimigos ativos
 * 
 * Esta função é chamada a cada frame e:
 * - Atualiza posições dos inimigos baseado na velocidade
 * - Remove inimigos que saíram da tela (parte inferior)
 * - Limpa objetos da memória e da cena Three.js
 * 
 * Performance: O(n) onde n = número de inimigos ativos
 */
function updateEnemies() {
  const toRemove: string[] = [];
  
  enemies.forEach((enemy, id) => {
    const { object, data } = enemy;
    
    // Atualizar posição
    data.position.x += data.velocity.x * 0.016; // ~60fps
    data.position.y += data.velocity.y * 0.016;
    
    object.position.x = data.position.x;
    object.position.y = data.position.y;
    
    // Remove se saiu da tela (parte inferior)
    if (data.position.y < -6 ||
        data.position.x > 10 || data.position.x < -10) {
      toRemove.push(id);
    }
  });
  
  // Remove inimigos que saíram da tela
  toRemove.forEach(id => {
    const enemy = enemies.get(id);
    if (enemy) {
      renderingSystem.removeFromScene(enemy.object);
      enemies.delete(id);
    }
  });
}

/**
 * Sistema de Detecção de Colisões
 * 
 * Verifica colisões entre projéteis e inimigos usando detecção por distância.
 * Quando uma colisão é detectada:
 * - O projétil é removido
 * - O inimigo perde vida
 * - Se o inimigo morre, é removido da cena
 * 
 * Performance: O(n*m) onde n = projéteis, m = inimigos
 */
function checkCollisions() {
  const projectilesToRemove: string[] = [];
  const enemiesToRemove: string[] = [];
  
  projectiles.forEach((projectile, projectileId) => {
    const projData = projectile.data;
    
    enemies.forEach((enemy, enemyId) => {
      const enemyData = enemy.data;
      
      // Calcular distância entre projétil e inimigo
      const dx = projData.position.x - enemyData.position.x;
      const dy = projData.position.y - enemyData.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Verificar colisão (soma dos raios)
      const projRadius = PROJECTILE_CONFIG.size;
      const enemyRadius = ENEMY_CONFIG[enemyData.type].size / 2;
      const collisionDistance = projRadius + enemyRadius;
      
      if (distance < collisionDistance) {
        // Colisão detectada!
        console.log(`Collision: ${projectileId} hit ${enemyId}`);
        
        // Marcar projétil para remoção
        if (!projectilesToRemove.includes(projectileId)) {
          projectilesToRemove.push(projectileId);
        }
        
        // Reduzir vida do inimigo
        enemyData.health -= projData.damage;
        
        // Se inimigo morreu, marcar para remoção
        if (enemyData.health <= 0) {
          console.log(`Enemy destroyed: ${enemyId}`);
          if (!enemiesToRemove.includes(enemyId)) {
            enemiesToRemove.push(enemyId);
          }
          
          // Add score based on enemy type
          const scorePoints = getScoreForEnemyType(enemyData.type);
          gameScore += scorePoints;
          uiSystem.updateScore(gameScore);
        }
      }
    });
  });
  
  // Remover projéteis que colidiram
  projectilesToRemove.forEach(id => {
    const projectile = projectiles.get(id);
    if (projectile) {
      renderingSystem.removeFromScene(projectile.object);
      projectiles.delete(id);
    }
  });
  
  // Remover inimigos destruídos
  enemiesToRemove.forEach(id => {
    const enemy = enemies.get(id);
    if (enemy) {
      renderingSystem.removeFromScene(enemy.object);
      enemies.delete(id);
    }
  });
}

/**
 * Calcula pontuação baseada no tipo de inimigo
 */
function getScoreForEnemyType(enemyType: Enemy['type']): number {
  switch (enemyType) {
    case 'basic': return 10;
    case 'fast': return 25;
    case 'heavy': return 50;
    default: return 10;
  }
}

/**
 * Verifica colisões entre inimigos e o jogador
 * Causa dano ao jogador quando há colisão
 */
function checkEnemyPlayerCollisions() {
  if (!playerShip) return;
  
  const enemiesToRemove: string[] = [];
  
  enemies.forEach((enemy, enemyId) => {
    const enemyData = enemy.data;
    
    // Calcular distância entre inimigo e jogador
    const dx = enemyData.position.x - playerShip.position.x;
    const dy = enemyData.position.y - playerShip.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Verificar colisão (raio do jogador + raio do inimigo)
    const playerRadius = 0.3; // Baseado na escala da nave
    const enemyRadius = ENEMY_CONFIG[enemyData.type].size / 2;
    const collisionDistance = playerRadius + enemyRadius;
    
    if (distance < collisionDistance) {
      // Colisão detectada!
      console.log(`Player hit by enemy: ${enemyId}`);
      
      // Causar dano ao jogador baseado no tipo de inimigo
      const damage = getDamageForEnemyType(enemyData.type);
      playerHealth = Math.max(0, playerHealth - damage);
      uiSystem.updateHealth(playerHealth, playerMaxHealth);
      
      // Remover inimigo que colidiu
      enemiesToRemove.push(enemyId);
      
      // Check game over
      if (playerHealth <= 0) {
        console.log('Game Over!');
        // TODO: Implementar tela de game over
      }
    }
  });
  
  // Remover inimigos que colidiram com o jogador
  enemiesToRemove.forEach(id => {
    const enemy = enemies.get(id);
    if (enemy) {
      renderingSystem.removeFromScene(enemy.object);
      enemies.delete(id);
    }
  });
}

/**
 * Calcula dano baseado no tipo de inimigo
 */
function getDamageForEnemyType(enemyType: Enemy['type']): number {
  switch (enemyType) {
    case 'basic': return 10;
    case 'fast': return 15;
    case 'heavy': return 25;
    default: return 10;
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});