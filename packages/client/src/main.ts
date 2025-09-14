import { Game } from './core/Game';

let game: Game;

async function init() {
  try {
    game = new Game();
    await game.initialize();
    game.start();
    
    // Make game accessible globally for debug queries
    (window as any).game = game;
  } catch (error) {
    console.error('❌ Failed to start game:', error);
  }
}

// Só carrega o jogo quando o DOM estiver pronto, garantindo que todos os elementos necessários estejam disponíveis.
document.addEventListener('DOMContentLoaded', init);

// Quando sair da página, garante que os recursos do jogo sejam liberados corretamente.
// Verificar se isto está causando problemas quando fica numa aba aberta muito tempo.
window.addEventListener('beforeunload', () => {
  if (game) {
    game.dispose();
  }
});
