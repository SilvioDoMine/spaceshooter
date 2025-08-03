// Shared types and utilities for spaceshooter game

export interface GameConfig {
  width: number;
  height: number;
  playerSpeed: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  health: number;
}

export interface Projectile {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
  ownerId: string;
  createdAt: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  width: 800,
  height: 600,
  playerSpeed: 5
};

export const PROJECTILE_CONFIG = {
  speed: 15,
  damage: 10,
  lifetime: 3000, // 3 seconds in milliseconds
  size: 0.1
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
