import { InputSystem } from './systems/InputSystem';
import { AudioSystem } from './systems/AudioSystem';
import { UISystem } from './systems/UISystem';
import { GameStateManager } from './systems/GameStateManager';
import { MenuSystem } from './systems/MenuSystem';
import { EventBus } from './core/EventBus';
import { assetManager } from './services/AssetManager';
import { EntitySystem } from './systems/EntitySystem';

console.log('Cliente iniciado com sistema de entidades');

let inputSystem: InputSystem;
let gameStateManager: GameStateManager;
let entitySystem: EntitySystem;
let lastFrameTime = performance.now();

const eventBus = new EventBus();

async function init() {
  console.log('🎮 Initializing AssetManager...');
  await assetManager.initialize();

  const { RenderingSystem } = await import('./systems/RenderingSystem');
  new RenderingSystem(eventBus);

  inputSystem = new InputSystem(eventBus);
  new UISystem(eventBus);
  new AudioSystem(eventBus);

  const { ParticleSystem } = await import('./systems/ParticleSystem');
  new ParticleSystem(eventBus);
  
  new MenuSystem(eventBus);

  gameStateManager = new GameStateManager(eventBus);

  entitySystem = new EntitySystem(eventBus);

  eventBus.on('ui:ready', () => {
    const player = entitySystem.getPlayer();
    if (player) {
      const stats = player.getStats();
      eventBus.emit('ui:update-health', { current: stats.health, max: stats.maxHealth });
      eventBus.emit('ui:update-ammo', { current: stats.ammo, max: stats.maxAmmo });
      eventBus.emit('ui:update-score', { score: stats.score });
    }
  });

  eventBus.emit('kernel:init', {});
}

eventBus.on('game:started', () => {
  console.log('🎮 Game started with entity system');
});

function animate() {
  requestAnimationFrame(animate);
  
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;
  
  if (gameStateManager && gameStateManager.isPlaying()) {
    entitySystem.update(deltaTime);
    
    eventBus.emit('particles:update', { deltaTime });
  }
  
  eventBus.emit('renderer:render-frame', {});
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});