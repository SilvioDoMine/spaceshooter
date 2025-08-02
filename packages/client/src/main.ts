import * as THREE from 'three';
import { DEFAULT_GAME_CONFIG } from '@spaceshooter/shared';
import { RenderingSystem } from './systems/RenderingSystem';

console.log('Cliente iniciado');
console.log('Config do jogo:', DEFAULT_GAME_CONFIG);

let renderingSystem: RenderingSystem;
let testCube: THREE.Mesh;

function init() {
  // Inicializar sistema de renderização
  renderingSystem = new RenderingSystem();
  renderingSystem.attachToDOM('game-container');

  // Criar cubo de teste
  createTestCube();
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
  
  // Rotacionar o cubo para teste
  if (testCube) {
    testCube.rotation.x += 0.01;
    testCube.rotation.y += 0.01;
  }
  
  renderingSystem.render();
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});