import * as THREE from 'three';
import { DEFAULT_GAME_CONFIG, Projectile, PROJECTILE_CONFIG } from '@spaceshooter/shared';
import { RenderingSystem } from './systems/RenderingSystem';
import { InputSystem, InputState } from './systems/InputSystem';

console.log('Cliente iniciado');
console.log('Config do jogo:', DEFAULT_GAME_CONFIG);

let renderingSystem: RenderingSystem;
let inputSystem: InputSystem;
let playerShip: THREE.Group;
let projectiles: Map<string, { object: THREE.Mesh, data: Projectile }> = new Map();
let lastShotTime = 0;
const SHOT_COOLDOWN = 50; // milliseconds

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
  playerShip.scale.setScalar(0.5); // Reduzir tamanho se necessário

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
  
  lastShotTime = currentTime;
  
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

function animate() {
  requestAnimationFrame(animate);
  
  // Controlar nave do jogador
  if (playerShip && inputSystem) {
    const inputState = inputSystem.getInputState();
    const speed = 0.05;
    
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
  
  renderingSystem.render();
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

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});