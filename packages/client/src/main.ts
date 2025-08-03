import { GameManager } from './core/GameManager';

console.log('🚀 Space Shooter Client Starting...');

// Global game manager instance
let gameManager: GameManager;

/**
 * Bootstrap function - initializes the entire game
 */
async function bootstrap() {
  try {
    console.log('🔧 Bootstrapping game...');
    
    gameManager = new GameManager();
    await gameManager.initialize();
    
    // Make available globally for debugging
    setGlobalGameManager();
    
    console.log('✅ Game initialized successfully!');
    
    // Start main game loop
    startMainLoop();
    
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
    showErrorMessage(error);
  }
}

/**
 * Main game loop - handles animation frame updates
 */
function startMainLoop() {
  function animate() {
    requestAnimationFrame(animate);
    
    // GameManager handles all game logic and rendering
    if (gameManager) {
      gameManager.update();
    }
  }
  
  console.log('🎮 Starting main loop...');
  animate();
}

/**
 * Show error message to user if initialization fails
 */
function showErrorMessage(error: any) {
  const container = document.getElementById('game-container');
  if (container) {
    container.innerHTML = `
      <div style="
        color: #ff6b6b; 
        padding: 40px; 
        text-align: center; 
        font-family: 'Courier New', monospace;
        background: #1a1a1a;
        border-radius: 8px;
        margin: 20px;
      ">
        <h2 style="color: #ff6b6b; margin-bottom: 20px;">🚫 Failed to Load Game</h2>
        <p style="margin-bottom: 20px; color: #ccc;">${error.message || 'Unknown error occurred'}</p>
        <details style="margin-bottom: 20px; text-align: left;">
          <summary style="cursor: pointer; color: #ff6b6b;">Technical Details</summary>
          <pre style="color: #999; font-size: 12px; margin-top: 10px; overflow: auto;">
${error.stack || 'No stack trace available'}
          </pre>
        </details>
        <button 
          onclick="location.reload()" 
          style="
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          "
        >
          🔄 Retry
        </button>
      </div>
    `;
  }
}

/**
 * Handle page visibility changes (pause when tab is hidden)
 */
document.addEventListener('visibilitychange', () => {
  if (gameManager) {
    if (document.hidden) {
      // Pause game when tab is hidden
      const systems = gameManager.getSystems();
      if (systems?.gameState?.isPlaying()) {
        systems.gameState.pauseGame();
        console.log('⏸️ Game auto-paused (tab hidden)');
      }
    }
  }
});

/**
 * Handle beforeunload for cleanup
 */
window.addEventListener('beforeunload', () => {
  if (gameManager) {
    gameManager.dispose();
  }
});

/**
 * Handle errors globally
 */
window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error);
  
  // You could send error reports here
  // analytics.reportError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
  
  // Prevent default browser handling
  event.preventDefault();
});

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

/**
 * Export for debugging in browser console
 */
declare global {
  interface Window {
    gameManager: GameManager;
    gameDebug: {
      getInfo: () => any;
      enableDebug: () => void;
      disableDebug: () => void;
      forceSpawn: (type: string) => void;
      getStats: () => any;
    };
  }
}

// Make available globally for debugging
(window as any).gameDebug = {
  getInfo: () => gameManager?.getDebugInfo(),
  enableDebug: () => gameManager?.setDebugMode(true),
  disableDebug: () => gameManager?.setDebugMode(false),
  forceSpawn: (type: string) => {
    const managers = gameManager?.getManagers();
    if (type.includes('enemy')) {
      managers?.spawn?.forceSpawnEnemy(type.replace('enemy-', '') as any);
    } else if (type.includes('powerup')) {
      managers?.spawn?.forceSpawnPowerUp(type.replace('powerup-', '') as any);
    }
  },
  getStats: () => ({
    game: gameManager?.getDebugInfo(),
    performance: gameManager?.getManagers()?.gameLoop?.getPerformanceStats(),
    entities: gameManager?.getManagers()?.entity?.getEntityCounts()
  }),
  getGameManager: () => gameManager
};

// Set gameManager reference after initialization
function setGlobalGameManager() {
  (window as any).gameManager = gameManager;
}

console.log(`
🎮 Space Shooter Ready!

Debug commands:
- gameDebug.getInfo() - Get game info
- gameDebug.enableDebug() - Enable debug mode  
- gameDebug.getStats() - Get performance stats
- gameDebug.forceSpawn('enemy-basic') - Spawn enemy
- gameDebug.forceSpawn('powerup-ammo') - Spawn power-up

Game controls:
- WASD: Move player
- Space: Shoot
- P/Escape: Pause
`);