import * as THREE from 'three';
import { DEFAULT_GAME_CONFIG, Projectile, PROJECTILE_CONFIG, Enemy, ENEMY_CONFIG, PowerUp, POWERUP_CONFIG } from '@spaceshooter/shared';
import { InputSystem } from './systems/InputSystem';
import { AudioSystem } from './systems/AudioSystem';
import { UISystem } from './systems/UISystem';
import { GameStateManager } from './systems/GameStateManager';
import { MenuSystem } from './systems/MenuSystem';
import { EventBus } from './core/EventBus';
import { assetManager } from './services/AssetManager';

console.log('Cliente iniciado');
console.log('Config do jogo:', DEFAULT_GAME_CONFIG);

let inputSystem: InputSystem;
let gameStateManager: GameStateManager;
let playerShip: THREE.Group;
let projectiles: Map<string, { object: THREE.Mesh, data: Projectile }> = new Map();
let enemies: Map<string, { object: THREE.Mesh, data: Enemy }> = new Map();
let powerUps: Map<string, { object: THREE.Mesh, data: PowerUp }> = new Map();
let lastShotTime = 0;
let lastEnemySpawnTime = 0;
let lastPowerUpSpawnTime = 0;
const SHOT_COOLDOWN = 200; // milliseconds - increased for ammo management

// Game state
let playerHealth = 100;
let playerMaxHealth = 100;
let playerAmmo = 30;
let playerMaxAmmo = 30;
let gameScore = 0;
let lastFrameTime = performance.now();

const eventBus = new EventBus();

async function init() {
  // Initialize AssetManager first
  console.log('🎮 Initializing AssetManager...');
  await assetManager.initialize();

  // Inicializar sistema de renderização
  const { RenderingSystem } = await import('./systems/RenderingSystem');
  new RenderingSystem(eventBus);

  // Inicializar sistema de input
  inputSystem = new InputSystem(eventBus);
  // inputSystem.addInputCallback(onInputChange);

  // Inicializar sistema de UI
  new UISystem(eventBus);

  // Inicializar sistema de áudio
  new AudioSystem(eventBus);

  // Inicializar sistema de partículas
  const { ParticleSystem } = await import('./systems/ParticleSystem');
  new ParticleSystem(eventBus);
  
  // Inicializar sistema de menus
  new MenuSystem(eventBus);

  // Inicializar gerenciador de estado do jogo
  gameStateManager = new GameStateManager(eventBus);

  // Criar nave do jogador
  createPlayerShip();

  // Aguardar UI estar pronta antes de inicializar estado
  eventBus.on('ui:ready', () => {
    eventBus.emit('ui:update-health', { current: playerHealth, max: playerMaxHealth });
    eventBus.emit('ui:update-ammo', { current: playerAmmo, max: playerMaxAmmo });
    eventBus.emit('ui:update-score', { score: gameScore });
  });

  eventBus.emit('kernel:init', {});
}

function createPlayerShip() {
  let shipModel: THREE.Group | null = null;
  let shipUsed = 'fallback';

  const SHIP_CONFIG = 'auto' as 'auto' | 'fallback' | string;

  // Try to get ship based on configuration
  if (SHIP_CONFIG === 'auto') {
    // Auto mode: try in order of preference
    shipModel = assetManager.getPlayerShip();
    shipUsed = 'auto-selected';
  } else if (SHIP_CONFIG === 'fallback') {
    // Force fallback cube
    shipModel = null;
  } else {
    // Try specific ship
    shipModel = assetManager.getShipModel(SHIP_CONFIG);
    if (shipModel) {
      shipUsed = SHIP_CONFIG;
    }
  }

  // Fallback if no model loaded
  if (!shipModel) {
    shipModel = assetManager.getPlayerShip(); // This handles fallback internally
    shipUsed = 'fallback-cube';
  }

  playerShip = shipModel;
  console.log(`🚀 Nave criada via AssetManager! (usando: ${shipUsed})`);
  
  // Lista naves disponíveis para debug
  const availableShips = assetManager.getAvailableShips();
  if (availableShips.length > 0) {
    console.log(`🛸 Naves disponíveis: ${availableShips.join(', ')}`);
    console.log(`💡 Para trocar, mude SHIP_CONFIG.preferredShip para: ${availableShips.map(s => `'${s}'`).join(' | ')}`);
  }
  
  // Posicionar nave
  playerShip.position.set(0, 0, 0);
  playerShip.scale.setScalar(0.3); // Reduzir tamanho para melhor gameplay

  // Rotaciona a nave para frente
  playerShip.rotation.x = -Math.PI / 2; // Rotaciona para que
  // Ele está de frente, preciso que fique de lado
  playerShip.rotation.z = Math.PI / 2; // Rotaciona para que fique de lado
  
  // Adicionar à scene via eventos
  eventBus.emit('scene:add-object', { object: playerShip });
}

eventBus.on('game:started', () => {
  resetGame();
});

/**
 * Reseta o estado do jogo para começar uma nova partida
 */
function resetGame() {
  // Reset player stats
  playerHealth = playerMaxHealth;
  playerAmmo = playerMaxAmmo;
  gameScore = 0;
  
  // Update UI
  eventBus.emit('ui:update-health', { current: playerHealth, max: playerMaxHealth });
  eventBus.emit('ui:update-score', { score: gameScore });
  eventBus.emit('ui:update-ammo', { current: playerAmmo, max: playerMaxAmmo });
  
  // Clear all projectiles
  projectiles.forEach(projectile => {
    eventBus.emit('scene:remove-object', { object: projectile.object });
  });
  projectiles.clear();
  
  // Clear all enemies
  enemies.forEach(enemy => {
    eventBus.emit('scene:remove-object', { object: enemy.object });
  });
  enemies.clear();
  
  // Clear all power-ups
  powerUps.forEach(powerUp => {
    eventBus.emit('scene:remove-object', { object: powerUp.object });
  });
  powerUps.clear();
  
  // Clear particles
  eventBus.emit('particles:clear', {});
  
  // Reset timers
  lastShotTime = 0;
  lastEnemySpawnTime = 0;
  lastPowerUpSpawnTime = 0;
  
  // Reset player position
  if (playerShip) {
    playerShip.position.set(0, 0, 0);
  }
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
  console.log('🔫 Shoot function called');
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
  eventBus.emit('ui:update-ammo', { current: playerAmmo, max: playerMaxAmmo });
  
  // Track shot fired
  gameStateManager.incrementStat('shotsFired');
  
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
  
  // Create visual object using AssetManager
  console.log('🎯 Creating projectile geometry');
  const geometry = new THREE.SphereGeometry(PROJECTILE_CONFIG.size);
  console.log('🎨 Getting material from AssetManager');
  const material = assetManager.getProjectileMaterial();
  console.log('✅ Material retrieved:', material);
  
  const projectileMesh = new THREE.Mesh(geometry, material);
  projectileMesh.position.set(
    projectileData.position.x,
    projectileData.position.y,
    0
  );
  
  // Add to scene and tracking
  eventBus.emit('scene:add-object', { object: projectileMesh });

  projectiles.set(projectileId, {
    object: projectileMesh,
    data: projectileData
  });

  eventBus.emit('audio:play', { soundId: 'shoot', options: { volume: 0.3 } });

  console.log('Projectile fired!', projectileId);
}

eventBus.on('player:shot', () => {
  try {
    shoot();
  } catch (error) {
    console.error('Error shooting:', error);
  }
});

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
  
  // Criar objeto visual using AssetManager
  const geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
  const material = assetManager.getEnemyMaterial(enemyType);
  
  const enemyMesh = new THREE.Mesh(geometry, material);
  enemyMesh.position.set(
    enemyData.position.x,
    enemyData.position.y,
    0
  );
  enemyMesh.castShadow = true;
  enemyMesh.receiveShadow = true;
  
  // Adicionar à cena e tracking
  eventBus.emit('scene:add-object', { object: enemyMesh });

  enemies.set(enemyId, {
    object: enemyMesh,
    data: enemyData
  });
  
  console.log(`Enemy spawned: ${enemyType}`, enemyId);
}

/**
 * Sistema de Spawn de Power-ups
 * 
 * Gera power-ups ocasionalmente na parte superior da tela.
 * Power-ups se movem lentamente para baixo e podem ser coletados pelo jogador.
 * 
 * Características:
 * - Spawn no topo da tela em posições aleatórias no eixo X
 * - Diferentes tipos com efeitos únicos (ammo, health, shield)
 * - Sistema de timing para controlar frequência de spawn
 * - Visual: formas geométricas coloridas baseadas no tipo
 */
function spawnPowerUp() {
  const currentTime = Date.now();
  
  // Determinar tipo de power-up (70% ammo, 25% health, 5% shield)
  const rand = Math.random();
  let powerUpType: PowerUp['type'];
  if (rand < 0.7) {
    powerUpType = 'ammo';
  } else if (rand < 0.95) {
    powerUpType = 'health';
  } else {
    powerUpType = 'shield';
  }
  
  const config = POWERUP_CONFIG[powerUpType];
  const powerUpId = `powerup_${currentTime}_${Math.random()}`;
  
  // Criar dados do power-up
  const powerUpData: PowerUp = {
    id: powerUpId,
    position: {
      x: (Math.random() - 0.5) * 8, // Random X entre -4 e 4
      y: 6 // Spawn no topo
    },
    velocity: {
      x: 0,
      y: -config.speed // Move para baixo
    },
    type: powerUpType,
    createdAt: currentTime
  };
  
  // Criar objeto visual (diferente por tipo)
  let geometry: THREE.BufferGeometry;
  switch (powerUpType) {
    case 'ammo':
      // Triângulo (usando ConeGeometry com poucos segmentos)
      geometry = new THREE.ConeGeometry(config.size, config.size * 1.5, 3);
      break;
    case 'health':
      geometry = new THREE.SphereGeometry(config.size, 8, 6);
      break;
    case 'shield':
      geometry = new THREE.OctahedronGeometry(config.size);
      break;
  }
  
  // Get material from AssetManager
  const material = assetManager.getPowerUpMaterial(powerUpType);
  
  const powerUpMesh = new THREE.Mesh(geometry, material);
  powerUpMesh.position.set(
    powerUpData.position.x,
    powerUpData.position.y,
    0
  );
  powerUpMesh.castShadow = true;
  powerUpMesh.receiveShadow = true;
  
  // Adicionar rotação para efeito visual
  powerUpMesh.rotation.x = Math.random() * Math.PI;
  powerUpMesh.rotation.y = Math.random() * Math.PI;
  
  // Adicionar à cena e tracking
  eventBus.emit('scene:add-object', { object: powerUpMesh });

  powerUps.set(powerUpId, {
    object: powerUpMesh,
    data: powerUpData
  });
  
  console.log(`PowerUp spawned: ${powerUpType}`, powerUpId);
}

function animate() {
  requestAnimationFrame(animate);
  
  // Calculate real deltaTime
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert ms to seconds
  lastFrameTime = currentTime;
  
  // Sempre renderizar, mas só atualizar gameplay se estiver jogando
  if (gameStateManager && gameStateManager.isPlaying()) {
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
    
    // Update power-ups
    updatePowerUps();
    
    // Check collisions
    checkCollisions();
    
    // Check enemy-player collisions
    checkEnemyPlayerCollisions();
    
    // Check power-up-player collisions
    checkPowerUpPlayerCollisions();
    
    // Spawn enemies (fire-and-forget)
    trySpawnEnemy();
    
    // Spawn power-ups (fire-and-forget)
    trySpawnPowerUp();
    
    // Update particle system só quando jogando (com deltaTime real)
    eventBus.emit('particles:update', { deltaTime });
  }
  
  eventBus.emit('renderer:render-frame', {});
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
      eventBus.emit('scene:remove-object', { object: projectile.object });
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
    try {
      spawnEnemy();
    } catch (error) {
      console.error('Error spawning enemy:', error);
    }
    lastEnemySpawnTime = currentTime;
  }
}

/**
 * Controla o spawn automático de power-ups
 * 
 * Verifica se é hora de spawnar um novo power-up baseado no tempo decorrido.
 * Power-ups aparecem com menos frequência que inimigos.
 */
function trySpawnPowerUp() {
  const currentTime = Date.now();
  
  // Spawn de power-up a cada 15 segundos (poder de munição)
  if (currentTime - lastPowerUpSpawnTime > POWERUP_CONFIG.ammo.spawnRate) {
    try {
      spawnPowerUp();
    } catch (error) {
      console.error('Error spawning power-up:', error);
    }
    lastPowerUpSpawnTime = currentTime;
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
    if (data.position.y < -4 ||
        data.position.x > 10 || data.position.x < -10) {
      
      // Penalidade por inimigo que escapou pela parte inferior
      if (data.position.y < -4) {
        const escapePenalty = getEscapePenaltyForEnemyType(data.type);
        playerHealth = Math.max(0, playerHealth - escapePenalty);
        eventBus.emit('ui:update-health', { current: playerHealth, max: playerMaxHealth });
        eventBus.emit('ui:update-score', { score: gameScore });
        
        console.log(`Inimigo ${data.type} escapou! -${escapePenalty} HP (Total: ${playerHealth})`);
        
        // Track enemy escaped
        gameStateManager.incrementStat('enemiesEscaped');

        eventBus.emit('audio:play', { soundId: 'hit', options: { volume: 0.3 } });
        
        // Efeito visual de penalidade (flash vermelho na tela)
        eventBus.emit('particles:hit', {
          position: { x: 0, y: -3, z: 0 } // Centro-baixo da tela
        });
        
        // Check game over após penalidade
        if (playerHealth <= 0) {
          console.log('Game Over por inimigos escapando!');
          gameStateManager.endGame();
        }
      }
      
      toRemove.push(id);
    }
  });
  
  // Remove inimigos que saíram da tela
  toRemove.forEach(id => {
    const enemy = enemies.get(id);
    if (enemy) {
      eventBus.emit('scene:remove-object', { object: enemy.object });
      enemies.delete(id);
    }
  });
}

/**
 * Atualiza todos os power-ups ativos
 * 
 * Esta função é chamada a cada frame e:
 * - Atualiza posições dos power-ups baseado na velocidade
 * - Adiciona rotação para efeito visual
 * - Remove power-ups que saíram da tela ou expiraram
 * - Limpa objetos da memória e da cena Three.js
 */
function updatePowerUps() {
  const currentTime = Date.now();
  const toRemove: string[] = [];
  
  powerUps.forEach((powerUp, id) => {
    const { object, data } = powerUp;
    const config = POWERUP_CONFIG[data.type];
    
    // Verificar se power-up expirou
    if (currentTime - data.createdAt > config.lifetime) {
      toRemove.push(id);
      return;
    }
    
    // Atualizar posição
    data.position.x += data.velocity.x * 0.016; // ~60fps
    data.position.y += data.velocity.y * 0.016;
    
    object.position.x = data.position.x;
    object.position.y = data.position.y;
    
    // Adicionar rotação para efeito visual
    object.rotation.x += 0.02;
    object.rotation.y += 0.03;
    
    // Efeito de pulsação (scale)
    const pulseScale = 1 + Math.sin(currentTime * 0.005) * 0.1;
    object.scale.setScalar(pulseScale);
    
    // Remove se saiu da tela (parte inferior)
    if (data.position.y < -6 ||
        data.position.x > 10 || data.position.x < -10) {
      toRemove.push(id);
    }
  });
  
  // Remove power-ups que saíram da tela ou expiraram
  toRemove.forEach(id => {
    const powerUp = powerUps.get(id);
    if (powerUp) {
      eventBus.emit('scene:remove-object', { object: powerUp.object });
      powerUps.delete(id);
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

          // Play hit sound
          eventBus.emit('audio:play', { soundId: 'explosion', options: { volume: 0.4 } });

          // Create explosion particle effect
          eventBus.emit('particles:explosion', {
            position: {
              x: enemyData.position.x,
              y: enemyData.position.y,
              z: 0
            }
          });
          
          // Add score based on enemy type
          const scorePoints = getScoreForEnemyType(enemyData.type);
          gameScore += scorePoints;
          eventBus.emit('ui:update-score', { score: gameScore });
          
          // Track enemy destroyed
          gameStateManager.incrementStat('enemiesDestroyed');
          gameStateManager.updateStats({ score: gameScore });
        }
      }
    });
  });
  
  // Remover projéteis que colidiram
  projectilesToRemove.forEach(id => {
    const projectile = projectiles.get(id);
    if (projectile) {
      eventBus.emit('scene:remove-object', { object: projectile.object });
      projectiles.delete(id);
    }
  });
  
  // Remover inimigos destruídos
  enemiesToRemove.forEach(id => {
    const enemy = enemies.get(id);
    if (enemy) {
      eventBus.emit('scene:remove-object', { object: enemy.object });
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
      eventBus.emit('ui:update-health', { current: playerHealth, max: playerMaxHealth });

      eventBus.emit('audio:play', { soundId: 'hit', options: { volume: 0.5 } });

      // Create hit particle effect
      eventBus.emit('particles:hit', {
        position: {
          x: playerShip.position.x,
          y: playerShip.position.y,
          z: 0
        }
      });
      
      // Remover inimigo que colidiu
      enemiesToRemove.push(enemyId);
      
      // Check game over
      if (playerHealth <= 0) {
        console.log('Game Over!');
        gameStateManager.endGame();
      }
    }
  });
  
  // Remover inimigos que colidiram com o jogador
  enemiesToRemove.forEach(id => {
    const enemy = enemies.get(id);
    if (enemy) {
      eventBus.emit('scene:remove-object', { object: enemy.object });
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

/**
 * Calcula penalidade baseada no tipo de inimigo que escapou
 * Inimigos mais fracos causam menos penalidade, mais fortes causam mais
 */
function getEscapePenaltyForEnemyType(enemyType: Enemy['type']): number {
  switch (enemyType) {
    case 'basic': return 5;   // Penalidade menor para inimigo básico
    case 'fast': return 8;    // Penalidade média para inimigo rápido  
    case 'heavy': return 15;  // Penalidade maior para inimigo pesado
    default: return 5;
  }
}

/**
 * Verifica colisões entre power-ups e o jogador
 * Aplica efeitos dos power-ups quando coletados
 */
function checkPowerUpPlayerCollisions() {
  if (!playerShip) return;
  
  const powerUpsToRemove: string[] = [];
  
  powerUps.forEach((powerUp, powerUpId) => {
    const powerUpData = powerUp.data;
    
    // Calcular distância entre power-up e jogador
    const dx = powerUpData.position.x - playerShip.position.x;
    const dy = powerUpData.position.y - playerShip.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Verificar colisão (raio do jogador + raio do power-up)
    const playerRadius = 0.3; // Baseado na escala da nave
    const powerUpRadius = POWERUP_CONFIG[powerUpData.type].size;
    const collisionDistance = playerRadius + powerUpRadius;
    
    if (distance < collisionDistance) {
      // Colisão detectada!
      console.log(`PowerUp collected: ${powerUpData.type}`, powerUpId);
      
      // Aplicar efeito do power-up
      applyPowerUpEffect(powerUpData.type);
      
      // Efeito visual de coleta
      eventBus.emit('particles:hit', {
        position: {
          x: powerUpData.position.x,
          y: powerUpData.position.y,
          z: 0
        }
      });
      
      // Efeito sonoro de coleta
      eventBus.emit('audio:play', { soundId: 'powerup', options: { volume: 0.4 } });
      
      // Remover power-up coletado
      powerUpsToRemove.push(powerUpId);
    }
  });
  
  // Remover power-ups coletados
  powerUpsToRemove.forEach(id => {
    const powerUp = powerUps.get(id);
    if (powerUp) {
      eventBus.emit('scene:remove-object', { object: powerUp.object });
      powerUps.delete(id);
    }
  });
}

/**
 * Aplica o efeito de um power-up coletado
 */
function applyPowerUpEffect(powerUpType: PowerUp['type']) {
  const config = POWERUP_CONFIG[powerUpType];
  
  switch (powerUpType) {
    case 'ammo':
      // Recarregar munição (não ultrapassar máximo)
      playerAmmo = Math.min(playerMaxAmmo, playerAmmo + config.effect);
      eventBus.emit('ui:update-ammo', { current: playerAmmo, max: playerMaxAmmo });
      console.log(`Munição recarregada! +${config.effect} balas (Total: ${playerAmmo})`);
      break;
      
    case 'health':
      // Restaurar vida (não ultrapassar máximo)
      playerHealth = Math.min(playerMaxHealth, playerHealth + config.effect);
      eventBus.emit('ui:update-health', { current: playerHealth, max: playerMaxHealth });
      console.log(`Vida restaurada! +${config.effect} HP (Total: ${playerHealth})`);
      break;
      
    case 'shield':
      // TODO: Implementar sistema de escudo temporário
      console.log(`Escudo ativado por ${config.effect}ms (não implementado ainda)`);
      break;
      
    default:
      console.warn(`Tipo de power-up desconhecido: ${powerUpType}`);
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});