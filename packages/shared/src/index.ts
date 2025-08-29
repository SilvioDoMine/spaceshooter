// Shared types and utilities for spaceshooter game

/**
 * Configuração global do jogo
 */
export interface GameConfig {
  width: number;
  height: number;
  playerSpeed: number;
}

/**
 * Representação de um ponto ou vetor em 2D
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Entidade do jogador
 */
export interface Player {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  health: number;
}

/**
 * Entidade de projétil
 * 
 * Representa projéteis disparados pelo jogador ou inimigos.
 * Possui ID único, posição, velocidade, dano e informações de lifecycle.
 */
export interface Projectile {
  id: string;              // Identificador único
  position: Vector2D;      // Posição atual no mundo
  velocity: Vector2D;      // Velocidade de movimento (unidades/segundo)
  damage: number;          // Dano causado ao colidir
  ownerId: string;         // ID da entidade que disparou
  createdAt: number;       // Timestamp de criação (para cleanup)
}

/**
 * Entidade de inimigo
 * 
 * Representa inimigos que aparecem automaticamente e se movem em direção ao jogador.
 * Possui diferentes tipos com características únicas (health, velocidade, visual).
 */
export interface Enemy {
  id: string;              // Identificador único
  position: Vector2D;      // Posição atual no mundo
  velocity: Vector2D;      // Velocidade de movimento (unidades/segundo)
  health: number;          // Vida atual
  maxHealth: number;       // Vida máxima
  type: 'basic' | 'fast' | 'heavy';  // Tipo determina características
  createdAt: number;       // Timestamp de criação
}

/**
 * Entidade de power-up
 * 
 * Representa power-ups que aparecem no jogo e podem ser coletados pelo jogador.
 * Diferentes tipos oferecem diferentes benefícios.
 */
export interface PowerUp {
  id: string;              // Identificador único
  position: Vector2D;      // Posição atual no mundo
  velocity: Vector2D;      // Velocidade de movimento (unidades/segundo)
  type: 'ammo' | 'health' | 'shield';  // Tipo determina o efeito
  createdAt: number;       // Timestamp de criação
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  width: 800,
  height: 600,
  playerSpeed: 5
};

/**
 * Configurações do jogador
 * 
 * Define características do jogador:
 * - health: Vida inicial e máxima
 * - speed: Velocidade de movimento (unidades/segundo)
 * - size: Tamanho visual (escala do modelo)
 * - radius: Raio da hitbox para colisões
 * - bounds: Limites de movimento na tela
 */
export const PLAYER_CONFIG = {
  health: 100,
  maxHealth: 100,
  ammo: 30,
  maxAmmo: 30,
  speed: 5,
  size: 0.3,              // Escala visual do modelo
  radius: 0.15,            // Raio da hitbox
  bounds: {               // Limites de movimento
    minX: -5,
    maxX: 5,
    minY: -4,
    maxY: 4
  }
};

/**
 * Configurações dos projéteis
 * 
 * Define comportamento padrão dos projéteis do jogador:
 * - speed: Velocidade de movimento (unidades/segundo)
 * - damage: Dano causado aos inimigos
 * - lifetime: Tempo de vida antes de ser removido (ms)
 * - size: Tamanho visual (raio da esfera)
 * - radius: Raio da hitbox para colisões
 */
export const PROJECTILE_CONFIG = {
  speed: 15,                // Unidades por segundo
  damage: 10,               // Dano por hit
  lifetime: 3000,           // 3 segundos em milliseconds
  size: 0.1,                // Raio visual
  radius: 0.05              // Raio da hitbox
};

/**
 * Configurações dos tipos de inimigos
 * 
 * Define características de cada tipo de inimigo:
 * - health: Vida total do inimigo
 * - speed: Velocidade de movimento (unidades/segundo)
 * - size: Tamanho visual (lado do cubo)
 * - radius: Raio da hitbox para colisões
 * - color: Cor hexadecimal para identificação visual
 * - spawnRate: Intervalo entre spawns (ms)
 * 
 * Tipos disponíveis:
 * - basic: Inimigo padrão, balanceado
 * - fast: Rápido mas frágil
 * - heavy: Lento mas resistente
 */
export const ENEMY_CONFIG = {
  basic: {
    health: 20,             // 2 hits para destruir
    speed: 1.5,             // Velocidade moderada
    size: 0.3,              // Tamanho visual
    radius: 0.15,           // Raio da hitbox
    color: 0xff4444,        // Vermelho
    spawnRate: 500         // A cada 2 segundos
  },
  fast: {
    health: 10,             // 1 hit para destruir
    speed: 2.5,             // Mais rápido
    size: 0.2,              // Tamanho visual
    radius: 0.1,            // Raio da hitbox (menor)
    color: 0xff8800,        // Laranja
    spawnRate: 1000         // A cada 3 segundos
  },
  heavy: {
    health: 50,             // 5 hits para destruir
    speed: 0.8,             // Mais lento
    size: 0.5,              // Tamanho visual
    radius: 0.25,           // Raio da hitbox (maior)
    color: 0x8844ff,        // Roxo
    spawnRate: 1500         // A cada 5 segundos
  }
};

/**
 * Configurações dos power-ups
 * 
 * Define características de cada tipo de power-up:
 * - effect: Quantidade do efeito aplicado
 * - speed: Velocidade de movimento (unidades/segundo)
 * - size: Tamanho visual
 * - radius: Raio da hitbox para colisões
 * - color: Cor hexadecimal para identificação visual
 * - spawnRate: Intervalo entre spawns (ms)
 * - lifetime: Tempo de vida antes de desaparecer (ms)
 * 
 * Tipos disponíveis:
 * - ammo: Recarrega munição do jogador
 * - health: Restaura vida do jogador
 * - shield: Proteção temporária (futuro)
 */
export const POWERUP_CONFIG = {
  ammo: {
    effect: 15,             // +15 balas
    speed: 1.0,             // Velocidade lenta
    size: 0.2,              // Tamanho visual
    radius: 0.1,            // Raio da hitbox
    color: 0x00ff00,        // Verde
    spawnRate: 5000,       // A cada 15 segundos
    lifetime: 10000         // 10 segundos para coletar
  },
  health: {
    effect: 25,             // +25 HP
    speed: 1.0,             // Velocidade lenta
    size: 0.2,              // Tamanho visual
    radius: 0.1,            // Raio da hitbox
    color: 0xff0088,        // Rosa/Magenta
    spawnRate: 20000,       // A cada 20 segundos
    lifetime: 12000         // 12 segundos para coletar
  },
  shield: {
    effect: 5000,           // 5 segundos de proteção
    speed: 1.0,             // Velocidade lenta
    size: 0.25,             // Tamanho visual
    radius: 0.125,          // Raio da hitbox
    color: 0x0088ff,        // Azul
    spawnRate: 30000,       // A cada 30 segundos
    lifetime: 8000          // 8 segundos para coletar
  }
};

/**
 * Utilitário matemático para limitar valor entre min e max
 * 
 * @param value Valor a ser limitado
 * @param min Valor mínimo
 * @param max Valor máximo
 * @returns Valor limitado entre min e max
 * 
 * @example
 * clamp(15, 0, 10) // retorna 10
 * clamp(-5, 0, 10) // retorna 0
 * clamp(7, 0, 10)  // retorna 7
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface Subject {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(): void;
}

export interface Observer {
  update(subject: Subject): void;
}
