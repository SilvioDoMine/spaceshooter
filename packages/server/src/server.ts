import { DEFAULT_GAME_CONFIG, Player, Vector2D } from '@spaceshooter/shared';

console.log('Servidor iniciado');
console.log('Config do jogo:', DEFAULT_GAME_CONFIG);

const player: Player = {
  id: 'player1',
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  health: 100
};

console.log('Player criado:', player);
