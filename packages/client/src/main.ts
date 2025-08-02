import * as THREE from 'three';
import { DEFAULT_GAME_CONFIG } from '@spaceshooter/shared';
import { RenderingSystem } from './systems/RenderingSystem';
import { InputSystem, InputState } from './systems/InputSystem';

console.log('Cliente iniciado');
console.log('Config do jogo:', DEFAULT_GAME_CONFIG);

let renderingSystem: RenderingSystem;
let inputSystem: InputSystem;
let testCube: THREE.Mesh;

function init() {
  // Inicializar sistema de renderização
  renderingSystem = new RenderingSystem();
  renderingSystem.attachToDOM('game-container');

  // Inicializar sistema de input
  inputSystem = new InputSystem();
  inputSystem.addInputCallback(onInputChange);

  // Criar cubo de teste
  createTestCube();
}

function onInputChange(action: keyof InputState, pressed: boolean) {
  console.log(`${action}: ${pressed ? 'pressed' : 'released'}`);
}

function createTestCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({ 
    color: 0x00ff00,
    shininess: 100 
  });
  
  testCube = new THREE.Mesh(geometry, material);
  testCube.castShadow = true;
  testCube.receiveShadow = true;
  
  renderingSystem.addToScene(testCube);
}

function animate() {
  requestAnimationFrame(animate);
  
  // Testar controles movendo o cubo
  if (testCube && inputSystem) {
    const inputState = inputSystem.getInputState();
    const speed = 0.05;
    
    if (inputState.left) {
      testCube.position.x -= speed;
    }
    if (inputState.right) {
      testCube.position.x += speed;
    }
    if (inputState.up) {
      testCube.position.y += speed;
    }
    if (inputState.down) {
      testCube.position.y -= speed;
    }
    
    // Rotacionar quando atirar (para testar)
    if (inputState.shoot) {
      testCube.rotation.z += 0.1;
    }
  }
  
  renderingSystem.render();
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});