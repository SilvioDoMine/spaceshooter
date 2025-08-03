import * as THREE from 'three';
import { DEFAULT_GAME_CONFIG } from '@spaceshooter/shared';
import { RenderingSystem } from './systems/RenderingSystem';
import { InputSystem, InputState } from './systems/InputSystem';

console.log('Cliente iniciado');
console.log('Config do jogo:', DEFAULT_GAME_CONFIG);

let renderingSystem: RenderingSystem;
let inputSystem: InputSystem;
let playerShip: THREE.Group;

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
    
    // Rotacionar quando atirar (para testar)
    if (inputState.shoot) {
      playerShip.rotation.z += 0.1;
    }
  }
  
  renderingSystem.render();
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});