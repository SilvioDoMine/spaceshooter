import { Game } from './core/Game';

console.log('Cliente iniciado com sistema de entidades');

let game: Game;

async function init() {
  try {
    game = new Game();
    await game.initialize();
    game.start();
  } catch (error) {
    console.error('❌ Failed to start game:', error);
  }
}

document.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (game) {
    game.dispose();
  }
});