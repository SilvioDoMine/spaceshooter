import { AssetManifest } from './AssetLoader';

// Manifest com assets básicos para o jogo
export const GAME_ASSETS: AssetManifest = {
  textures: {},
  models: {
    'ship': '/assets/models/ship.glb'
  },
  sounds: {
    'shoot': '/assets/sounds/shoot.wav',
    'explosion': '/assets/sounds/explosion.wav',
    'hit': '/assets/sounds/hit.wav',
    'powerup': '/assets/sounds/powerup.wav'
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
