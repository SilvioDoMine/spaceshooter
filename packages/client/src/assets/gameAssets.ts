import { AssetManifest } from './AssetLoader';

// Manifest com assets básicos para o jogo
export const GAME_ASSETS: AssetManifest = {
  textures: {
    // Texturas básicas para desenvolvimento
    // 'metal': '/assets/textures/metal.jpg',
    // 'star': '/assets/textures/star.png',
    // 'plasma': '/assets/textures/plasma.png',
    // 'explosion': '/assets/textures/explosion.png'
  },
  models: {
    // Modelos 3D para o jogo
    'ship': '/assets/models/ship.glb',
    // 'player_ship': '/assets/models/player_ship.glb',
    // 'enemy_ship': '/assets/models/enemy_ship.glb',
    // 'asteroid': '/assets/models/asteroid.glb'
  },
  sounds: {
    // Sons básicos do jogo
    'shoot': '/assets/sounds/shoot.wav',
    'explosion': '/assets/sounds/explosion.wav',
    'hit': '/assets/sounds/hit.wav'
  }
};

// Assets básicos que sempre devem estar carregados
export const CORE_ASSETS: AssetManifest = {
  textures: {
    'white': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1 white pixel
  },
  models: {},
  sounds: {}
};
