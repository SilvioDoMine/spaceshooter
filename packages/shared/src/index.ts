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
 * Configuração do mundo/sala de jogo
 */
export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Configuração da câmera
 */
export interface CameraConfig {
  followPlayer: boolean;
  smoothing: number; // 0-1, quão suave é o seguimento
  deadZone: {
    width: number;
    height: number;
  };
}

/**
 * Entidade do jogador
 */
export interface Player {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  health: number;
  level: number;
  currentXP: number;
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
 * Configuração padrão do mundo/sala
 */
export const DEFAULT_WORLD_BOUNDS: WorldBounds = {
  minX: -10,
  maxX: 10,
  minY: -7.5,
  maxY: 7.5,
  width: 20,
  height: 15
};

/**
 * Calcula world bounds adaptados para diferentes aspect ratios
 * Para mobile (aspect < 1), aumenta a altura do mundo
 * Para desktop (aspect >= 1), mantém dimensões padrão
 */
export function getAdaptiveWorldBounds(aspectRatio: number): WorldBounds {
  if (aspectRatio < 1) {
    // Mobile portrait - aumentar altura do mundo
    const extraHeight = (1 / aspectRatio - 1) * 5; // Adicionar altura baseado no aspect ratio
    return {
      minX: -10,
      maxX: 10,
      minY: -7.5 - extraHeight,
      maxY: 7.5 + extraHeight,
      width: 20,
      height: 15 + (extraHeight * 2)
    };
  } else {
    // Desktop/landscape - usar dimensões padrão
    return { ...DEFAULT_WORLD_BOUNDS };
  }
}

/**
 * Configuração padrão da câmera
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  followPlayer: true,
  smoothing: 0.1,
  deadZone: {
    width: 2,
    height: 1.5
  }
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
  maxAmmo: 50,
  speed: 2.5,
  size: 0.2,              // Escala visual do modelo
  radius: 0.15,            // Raio da hitbox (legacy - não usado com compound shapes)
  bounds: {               // Limites de movimento
    minX: -5,
    maxX: 5,
    minY: -4,
    maxY: 4
  },
  shotCooldown: 0.5,      // Cooldown entre tiros em segundos (500ms)
  level: 1,               // Nível inicial
  currentXP: 0,           // XP inicial
  // Compound collision shape em valores relativos (0-1 baseado no size)
  // Essas coordenadas são multiplicadas pelo 'size' para obter valores absolutos
  collisionShape: {
    circles: [
      // Center/cockpit circle
      { offset: { x: -0.17, y: -0.67 }, radius: 0.83, name: 'cockpit' },
      // Front nose
      { offset: { x: -0.17, y: 1.73 }, radius: 0.53, name: 'nose_far' },
      { offset: { x: -0.17, y: 0.67 }, radius: 0.53, name: 'nose_close' },
      // Left wing
      { offset: { x: -2.33, y: -0.67 }, radius: 0.53, name: 'left_wing_far' },
      { offset: { x: -1.33, y: -0.67 }, radius: 0.53, name: 'left_wing_close' },
      // Right wing
      { offset: { x: 1.83, y: -0.67 }, radius: 0.53, name: 'right_wing_far' },
      { offset: { x: 1.00, y: -0.67 }, radius: 0.53, name: 'right_wing_close' },
      // Rear engine
      { offset: { x: -0.17, y: -2.33 }, radius: 0.83, name: 'engine' }
    ]
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
  speed: 30,                // Unidades por segundo
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
    speed: 0.8,             // Velocidade moderada
    size: 0.3,              // Tamanho visual
    radius: 0.25,           // Raio da hitbox
    color: 0xff4444,        // Vermelho
    spawnRate: 1000,        // A cada 2 segundos
    xpDrop: 10              // XP dado quando morto
  },
  fast: {
    health: 10,             // 1 hit para destruir
    speed: 1.1,             // Mais rápido
    size: 0.2,              // Tamanho visual
    radius: 0.175,            // Raio da hitbox (menor)
    color: 0xff8800,        // Laranja
    spawnRate: 1500,        // A cada 3 segundos
    xpDrop: 8               // XP dado quando morto
  },
  heavy: {
    health: 50,             // 5 hits para destruir
    speed: 0.4,             // Mais lento
    size: 0.5,              // Tamanho visual
    radius: 0.4,           // Raio da hitbox (maior)
    color: 0x8844ff,        // Roxo
    spawnRate: 2500,        // A cada 5 segundos
    xpDrop: 25              // XP dado quando morto
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

/**
 * Utilitário para alterar o tamanho do player dinamicamente
 * Atualiza PLAYER_CONFIG.size e permite que sistemas reajam à mudança
 */
export function updatePlayerSize(newSize: number): void {
  const oldSize = PLAYER_CONFIG.size;
  PLAYER_CONFIG.size = clamp(newSize, 0.1, 2.0); // Limitar entre 0.1 e 2.0
  
  console.log(`Player size changed: ${oldSize.toFixed(2)} -> ${PLAYER_CONFIG.size.toFixed(2)}`);
  
  // Emitir evento se há um eventBus global disponível
  if (typeof window !== 'undefined' && (window as any).game) {
    try {
      const eventBus = (window as any).game.getEventBus();
      eventBus.emit('player:size-changed', { 
        oldSize, 
        newSize: PLAYER_CONFIG.size 
      });
    } catch (error) {
      console.warn('Could not emit player:size-changed event:', error);
    }
  }
}

export interface Subject {
  attach(observer: Observer): void;
  detach(observer: Observer): void;
  notify(): void;
}

export interface Observer {
  update(subject: Subject): void;
}

/**
 * Tabela de XP necessário para cada nível (1-50)
 * Fórmula: baseXP * (level^1.5)
 */
export const LEVEL_XP_TABLE: Record<number, number> = {
  1: 0,      // Nível 1 não precisa de XP
  2: 50,    // 20 XP para nível 2
  3: 250,    // 250 XP para nível 3
  4: 450,    // 450 XP para nível 4
  5: 700,    // 700 XP para nível 5
  6: 1000,   // 1000 XP para nível 6
  7: 1350,   // 1350 XP para nível 7
  8: 1750,   // 1750 XP para nível 8
  9: 2200,   // 2200 XP para nível 9
  10: 2700,  // 2700 XP para nível 10
  11: 3250,  // 3250 XP para nível 11
  12: 3850,  // 3850 XP para nível 12
  13: 4500,  // 4500 XP para nível 13
  14: 5200,  // 5200 XP para nível 14
  15: 5950,  // 5950 XP para nível 15
  16: 6750,  // 6750 XP para nível 16
  17: 7600,  // 7600 XP para nível 17
  18: 8500,  // 8500 XP para nível 18
  19: 9450,  // 9450 XP para nível 19
  20: 10450, // 10450 XP para nível 20
  21: 11500, // 11500 XP para nível 21
  22: 12600, // 12600 XP para nível 22
  23: 13750, // 13750 XP para nível 23
  24: 14950, // 14950 XP para nível 24
  25: 16200, // 16200 XP para nível 25
  26: 17500, // 17500 XP para nível 26
  27: 18850, // 18850 XP para nível 27
  28: 20250, // 20250 XP para nível 28
  29: 21700, // 21700 XP para nível 29
  30: 23200, // 23200 XP para nível 30
  31: 24750, // 24750 XP para nível 31
  32: 26350, // 26350 XP para nível 32
  33: 28000, // 28000 XP para nível 33
  34: 29700, // 29700 XP para nível 34
  35: 31450, // 31450 XP para nível 35
  36: 33250, // 33250 XP para nível 36
  37: 35100, // 35100 XP para nível 37
  38: 37000, // 37000 XP para nível 38
  39: 38950, // 38950 XP para nível 39
  40: 40950, // 40950 XP para nível 40
  41: 43000, // 43000 XP para nível 41
  42: 45100, // 45100 XP para nível 42
  43: 47250, // 47250 XP para nível 43
  44: 49450, // 49450 XP para nível 44
  45: 51700, // 51700 XP para nível 45
  46: 54000, // 54000 XP para nível 46
  47: 56350, // 56350 XP para nível 47
  48: 58750, // 58750 XP para nível 48
  49: 61200, // 61200 XP para nível 49
  50: 63700  // 63700 XP para nível 50 (máximo)
};

/**
 * Configuração do sistema de níveis
 */
export const LEVEL_CONFIG = {
  maxLevel: 50,
  baseXP: 100
};

/**
 * Calcula o XP necessário para atingir um nível específico
 */
export function getXPRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > LEVEL_CONFIG.maxLevel) return LEVEL_XP_TABLE[LEVEL_CONFIG.maxLevel];
  return LEVEL_XP_TABLE[level] || 0;
}

/**
 * Calcula o nível baseado no XP atual
 */
export function calculateLevelFromXP(currentXP: number): number {
  for (let level = LEVEL_CONFIG.maxLevel; level >= 1; level--) {
    if (currentXP >= getXPRequiredForLevel(level)) {
      return level;
    }
  }
  return 1;
}

/**
 * Calcula quanto XP falta para o próximo nível
 */
export function getXPToNextLevel(currentXP: number, currentLevel: number): number {
  if (currentLevel >= LEVEL_CONFIG.maxLevel) return 0;
  
  const nextLevelXP = getXPRequiredForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXP - currentXP);
}

/**
 * Calcula o progresso percentual para o próximo nível (0-100)
 */
export function getLevelProgress(currentXP: number, currentLevel: number): number {
  if (currentLevel >= LEVEL_CONFIG.maxLevel) return 100;
  
  const currentLevelXP = getXPRequiredForLevel(currentLevel);
  const nextLevelXP = getXPRequiredForLevel(currentLevel + 1);
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  
  return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
}
