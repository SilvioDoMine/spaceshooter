/**
 * Raridade das skills
 */
export type SkillRarity = 'rara' | 'epica' | 'lendaria';

/**
 * Tipos de skills disponíveis
 */
export type SkillType = 
  | 'damage_boost'      // Aumentar dano
  | 'attack_speed'      // Aumentar velocidade de ataque
  | 'multi_shot'        // Multi ataque (único nível)
  | 'health_regeneration' // Recuperar vida aleatória
  | 'max_health_boost'  // Aumento de vida permanente
  | 'move_speed'        // Aumentar velocidade de movimento
  | 'ricochet'          // Projéteis ricocheteiam para inimigos próximos
  | 'ammo_capacity'     // Aumentar capacidade máxima de munição
  | 'tri_shot'          // 20% chance de spawnar 3 projéteis em triângulo ao acertar inimigo
  | 'ghost_projectiles'; // Projéteis atravessam inimigos (épica)

/**
 * Mapeamento de raridade por skill
 */
export const SKILL_RARITY_MAP: Record<SkillType, SkillRarity> = {
  damage_boost: 'rara',
  attack_speed: 'rara',
  health_regeneration: 'rara',
  max_health_boost: 'rara',
  move_speed: 'rara',
  ammo_capacity: 'rara',
  tri_shot: 'epica',
  ghost_projectiles: 'epica',
  multi_shot: 'lendaria',
  ricochet: 'lendaria'
};
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
 * Informações de uma skill individual
 */
export interface PlayerSkill {
  type: SkillType;
  level: number;
  rarity?: SkillRarity; // Opcional para retrocompatibilidade
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
  skills: PlayerSkill[];
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
  noSkillTrigger?: boolean; // Se true, não ativa ricochete nem tri_shot
  _ghostFirstHitDone?: boolean; // Interno: se já trigou skills no primeiro hit
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
  type: 'basic' | 'fast' | 'heavy' | 'boss';  // Tipo determina características
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
  maxAmmo: 30,
  speed: 2.5,
  size: 0.2,              // Escala visual do modelo
  radius: 0.15,            // Raio da hitbox (legacy - não usado com compound shapes)
  bounds: {               // Limites de movimento
    minX: -5,
    maxX: 5,
    minY: -4,
    maxY: 4
  },
  shotCooldown: 1.0,      // Cooldown entre tiros em segundos (500ms)
  level: 1,               // Nível inicial
  currentXP: 0,           // XP inicial
  skills: [] as PlayerSkill[], // Skills iniciais vazias
  // Configurações de arma/targeting
  weapon: {
    range: 3.0,           // Range de targeting automático
    autoTarget: true,     // Auto targeting ativado
    showRange: true       // Range visual ativado por padrão
  },
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
 * Interface para configuração de projéteis de entidades
 */
export interface ProjectileConfig {
  speed: number;            // Velocidade de movimento (unidades/segundo)
  damage: number;          // Dano causado
  lifetime: number;        // Tempo de vida em milliseconds
  size: number;            // Raio visual
  radius: number;          // Raio da hitbox
  color: number;           // Cor hexadecimal
  cooldown: number;        // Tempo entre tiros em segundos
  canShoot?: boolean;      // Se a entidade pode atirar
  shootRange?: number;     // Alcance para atirar (null = sem limite)
  targetType?: 'player' | 'enemy'; // Tipo de alvo que atira
}

/**
 * Configurações dos projéteis do jogador (padrão)
 * 
 * Define comportamento padrão dos projéteis do jogador:
 * - speed: Velocidade de movimento (unidades/segundo)
 * - damage: Dano causado aos inimigos
 * - lifetime: Tempo de vida antes de ser removido (ms)
 * - size: Tamanho visual (raio da esfera)
 * - radius: Raio da hitbox para colisões
 */
export const PROJECTILE_CONFIG = {
  speed: 20,                // Unidades por segundo
  damage: 5,               // Dano por hit
  lifetime: 3000,           // 3 segundos em milliseconds (usado para inimigos)
  size: 0.1,                // Raio visual
  radius: 0.1              // Raio da hitbox
};

/**
 * Interface para ranges de XP aleatórios
 */
export interface XPRange {
  min: number;
  max: number;
}

/**
 * Calcula o lifetime do projétil baseado no range do player
 * Para que o projétil expire quando sair da área de targeting
 */
export function calculateProjectileLifetime(playerRange: number, projectileSpeed: number): number {
  // Tempo em segundos para percorrer a distância do range
  const timeInSeconds = playerRange / projectileSpeed;
  // Converter para milliseconds
  return Math.round(timeInSeconds * 1000);
}

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
    speed: 0.6,             // Velocidade moderada
    size: 0.3,              // Tamanho visual
    radius: 0.25,           // Raio da hitbox
    color: 0xff4444,        // Vermelho
    spawnRate: 1000,        // A cada 1 segundo
    xpRange: { min: 8, max: 15 }, // XP aleatório entre 8-15
    diesOnPlayerCollision: false,
  },
  fast: {
    health: 10,             // 1 hit para destruir
    speed: 0.8,             // Mais rápido
    size: 0.2,              // Tamanho visual
    radius: 0.175,          // Raio da hitbox (menor)
    color: 0xff8800,        // Laranja
    spawnRate: 8000,        // A cada 8 segundos
    xpRange: { min: 5, max: 12 }, // XP aleatório entre 5-12 (rápido de matar, menos XP)
    diesOnPlayerCollision: true,
    // Não atira por enquanto
    projectile: {
      canShoot: false
    } as Partial<ProjectileConfig>
  },
  heavy: {
    health: 50,             // 5 hits para destruir
    speed: 0.1,             // Mais lento
    size: 0.5,              // Tamanho visual
    radius: 0.4,            // Raio da hitbox (maior)
    color: 0x8844ff,        // Roxo
    spawnRate: 20000,       // A cada 20 segundos
    xpRange: { min: 20, max: 35 }, // XP aleatório entre 20-35 (difícil de matar, mais XP)
    diesOnPlayerCollision: false,
    // Heavy atira projéteis pequenos e rápidos
    projectile: {
      canShoot: true,
      speed: 2,             // Devagar
      damage: 15,           // Dano médio
      lifetime: 4000,       // 4 segundos
      size: 0.04,           // Projétil pequeno
      radius: 0.04,         // Hitbox pequena
      color: 0x8800ff,      // Roxo como o inimigo
      cooldown: 5.0,        // Atira a cada 3 segundos
      shootRange: 6.0,      // Só atira se jogador estiver próximo
      targetType: 'player'  // Atira no jogador
    } as ProjectileConfig
  },
  boss: {
    health: 1000,            // 50 hits para destruir - muito resistente
    speed: 0.2,             // Bem lento
    size: 1.3,              // Grande
    radius: 0.8,            // Hitbox maior
    color: 0xff0080,        // Rosa/Magenta para diferenciação
    spawnRate: 60000,       // A cada 60 segundos (muito raro)
    xpRange: { min: 150, max: 250 }, // XP aleatório entre 150-250 (boss recompensa alta)
    diesOnPlayerCollision: false,
    // Boss atira projéteis grandes e lentos
    projectile: {
      canShoot: true,
      speed: 2,             // Mais lento que do jogador
      damage: 25,           // Dano alto
      lifetime: 5000,       // 5 segundos
      size: 0.1,            // Projétil grande
      radius: 0.08,         // Hitbox maior
      color: 0xff0040,      // Vermelho escuro
      cooldown: 2.0,        // Atira a cada 2 segundos
      shootRange: 5,        // Só atira se jogador estiver próximo
      targetType: 'player'  // Atira no jogador
    } as ProjectileConfig
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
  2: 20,     // 2 inimigos
  3: 50,     // 5 inimigos
  4: 90,     // 9 inimigos
  5: 150,    // 15 inimigos
  6: 230,    // 23 inimigos
  7: 330,    // 33 inimigos
  8: 450,    // 45 inimigos
  9: 590,    // 59 inimigos
  10: 750,   // 75 inimigos
  11: 930,   // 93 inimigos
  12: 1130,  // 113 inimigos
  13: 1350,  // 135 inimigos
  14: 1590,  // 159 inimigos
  15: 1850,  // 185 inimigos
  16: 2130,  // 213 inimigos
  17: 2430,  // 243 inimigos
  18: 2750,  // 275 inimigos
  19: 3090,  // 309 inimigos
  20: 3450,  // 345 inimigos
  21: 3830,  // 383 inimigos
  22: 4230,  // 423 inimigos
  23: 4650,  // 465 inimigos
  24: 5090,  // 509 inimigos
  25: 5550,  // 555 inimigos
  26: 6030,  // 603 inimigos
  27: 6530,  // 653 inimigos
  28: 7050,  // 705 inimigos
  29: 7590,  // 759 inimigos
  30: 8150,  // 815 inimigos
  31: 8730,  // 873 inimigos
  32: 9330,  // 933 inimigos
  33: 9950,  // 995 inimigos
  34: 10590, // 1059 inimigos
  35: 11250, // 1125 inimigos
  36: 11930, // 1193 inimigos
  37: 12630, // 1263 inimigos
  38: 13350, // 1335 inimigos
  39: 14090, // 1409 inimigos
  40: 14850, // 1485 inimigos
  41: 15630, // 1563 inimigos
  42: 16430, // 1643 inimigos
  43: 17250, // 1725 inimigos
  44: 18090, // 1809 inimigos
  45: 18950, // 1895 inimigos
  46: 19830, // 1983 inimigos
  47: 20730, // 2073 inimigos
  48: 21650, // 2165 inimigos
  49: 22590, // 2259 inimigos
  50: 23550  // 2355 inimigos
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

/**
 * Configuração das skills disponíveis
 */
export interface SkillConfig {
  id: SkillType;
  name: string;
  description: string;
  maxLevel: number;
  icon?: string;
  effects: {
    [level: number]: {
      value: number;
      description: string;
    };
  };
}

/**
 * Configurações de todas as skills do jogo
 */
export const SKILLS_CONFIG: Record<SkillType, SkillConfig> = {
  ghost_projectiles: {
    id: 'ghost_projectiles',
    name: 'Projéteis Fantasmas',
    description: 'Seus projéteis ficam translúcidos e atravessam inimigos, causando dano em todos na linha de trajetória.',
    maxLevel: 1,
    icon: '👻',
    effects: {
      1: { value: 1, description: 'Projéteis atravessam inimigos e continuam causando dano até sair do mapa ou expirar.' }
    }
  },
  tri_shot: {
    id: 'tri_shot',
    name: 'Tiro Triangular',
    description: '100% de chance de, ao acertar um inimigo, disparar 3 projéteis em triângulo a partir do inimigo',
    maxLevel: 1,
    icon: '🔺',
    effects: {
      1: { value: 1.0, description: '100% de chance de spawnar 3 projéteis em triângulo ao acertar inimigo' }
    }
  },
  damage_boost: {
    id: 'damage_boost',
    name: 'Dano Aumentado',
    description: 'Aumenta o dano dos seus projéteis',
    maxLevel: 10,
    icon: '💥',
    effects: {
      1: { value: 1.2, description: '+20% de dano' },
      2: { value: 1.4, description: '+40% de dano' },
      3: { value: 1.6, description: '+60% de dano' },
      4: { value: 1.8, description: '+80% de dano' },
      5: { value: 2.0, description: '+100% de dano' },
      6: { value: 2.3, description: '+130% de dano' },
      7: { value: 2.6, description: '+160% de dano' },
      8: { value: 3.0, description: '+200% de dano' },
      9: { value: 3.5, description: '+250% de dano' },
      10: { value: 4.0, description: '+300% de dano' }
    }
  },
  attack_speed: {
    id: 'attack_speed',
    name: 'Tiro Rápido',
    description: 'Diminui o tempo entre disparos',
    maxLevel: 10,
    icon: '🔥',
    effects: {
      1: { value: 0.8, description: '-20% cooldown de tiro' },
      2: { value: 0.65, description: '-35% cooldown de tiro' },
      3: { value: 0.5, description: '-50% cooldown de tiro' },
      4: { value: 0.4, description: '-60% cooldown de tiro' },
      5: { value: 0.3, description: '-70% cooldown de tiro' },
      6: { value: 0.25, description: '-75% cooldown de tiro' },
      7: { value: 0.2, description: '-80% cooldown de tiro' },
      8: { value: 0.15, description: '-85% cooldown de tiro' },
      9: { value: 0.1, description: '-90% cooldown de tiro' },
      10: { value: 0.05, description: '-95% cooldown de tiro' }
    }
  },
  multi_shot: {
    id: 'multi_shot',
    name: 'Tiro Múltiplo',
    description: 'Atira múltiplos projéteis simultaneamente',
    maxLevel: 1,
    icon: '🔫',
    effects: {
      1: { value: 2, description: 'Atira 2 projéteis por disparo' },
      // 2: { value: 3, description: 'Atira 3 projéteis por disparo' },
      // 3: { value: 4, description: 'Atira 4 projéteis por disparo' },
      // 4: { value: 5, description: 'Atira 5 projéteis por disparo' },
      // 5: { value: 6, description: 'Atira 6 projéteis por disparo' },
      // 6: { value: 7, description: 'Atira 7 projéteis por disparo' },
      // 7: { value: 8, description: 'Atira 8 projéteis por disparo' },
      // 8: { value: 9, description: 'Atira 9 projéteis por disparo' },
      // 9: { value: 10, description: 'Atira 10 projéteis por disparo' },
      // 10: { value: 12, description: 'Atira 12 projéteis por disparo' }
    }
  },
  health_regeneration: {
    id: 'health_regeneration',
    name: 'Regeneração',
    description: 'Recupera vida periodicamente',
    maxLevel: 10,
    icon: '💚',
    effects: {
      1: { value: 5, description: 'Regenera 5 HP a cada 10s' },
      2: { value: 8, description: 'Regenera 8 HP a cada 8s' },
      3: { value: 12, description: 'Regenera 12 HP a cada 6s' },
      4: { value: 15, description: 'Regenera 15 HP a cada 5s' },
      5: { value: 20, description: 'Regenera 20 HP a cada 4s' },
      6: { value: 25, description: 'Regenera 25 HP a cada 3.5s' },
      7: { value: 30, description: 'Regenera 30 HP a cada 3s' },
      8: { value: 40, description: 'Regenera 40 HP a cada 2.5s' },
      9: { value: 50, description: 'Regenera 50 HP a cada 2s' },
      10: { value: 75, description: 'Regenera 75 HP a cada 1.5s' }
    }
  },
  max_health_boost: {
    id: 'max_health_boost',
    name: 'Vitalidade',
    description: 'Aumenta sua vida máxima permanentemente',
    maxLevel: 10,
    icon: '❤️',
    effects: {
      1: { value: 20, description: '+20 HP máximo' },
      2: { value: 40, description: '+40 HP máximo' },
      3: { value: 60, description: '+60 HP máximo' },
      4: { value: 80, description: '+80 HP máximo' },
      5: { value: 100, description: '+100 HP máximo' },
      6: { value: 130, description: '+130 HP máximo' },
      7: { value: 160, description: '+160 HP máximo' },
      8: { value: 200, description: '+200 HP máximo' },
      9: { value: 250, description: '+250 HP máximo' },
      10: { value: 300, description: '+300 HP máximo' }
    }
  },
  move_speed: {
    id: 'move_speed',
    name: 'Velocidade',
    description: 'Aumenta sua velocidade de movimento',
    maxLevel: 10,
    icon: '🚀',
    effects: {
      1: { value: 1.2, description: '+20% velocidade de movimento' },
      2: { value: 1.4, description: '+40% velocidade de movimento' },
      3: { value: 1.6, description: '+60% velocidade de movimento' },
      4: { value: 1.8, description: '+80% velocidade de movimento' },
      5: { value: 2.0, description: '+100% velocidade de movimento' },
      6: { value: 2.3, description: '+130% velocidade de movimento' },
      7: { value: 2.6, description: '+160% velocidade de movimento' },
      8: { value: 3.0, description: '+200% velocidade de movimento' },
      9: { value: 3.5, description: '+250% velocidade de movimento' },
      10: { value: 4.0, description: '+300% velocidade de movimento' }
    }
  },
  ricochet: {
    id: 'ricochet',
    name: 'Ricochete',
    description: 'Projéteis ricocheteiam para inimigos próximos',
    maxLevel: 2,
    icon: '⚡',
    effects: {
      1: { value: 1, description: 'Projéteis ricocheteiam 1 vez (50% dano)' },
      2: { value: 1, description: 'Projéteis ricocheteiam 1 vez (100% dano)' }
    }
  },
  ammo_capacity: {
    id: 'ammo_capacity',
    name: 'Capacidade de Munição',
    description: 'Aumenta a quantidade máxima de munição',
    maxLevel: 10,
    icon: '📦',
    effects: {
      1: { value: 15, description: '+15 munição máxima' },
      2: { value: 30, description: '+30 munição máxima' },
      3: { value: 45, description: '+45 munição máxima' },
      4: { value: 60, description: '+60 munição máxima' },
      5: { value: 75, description: '+75 munição máxima' },
      6: { value: 90, description: '+90 munição máxima' },
      7: { value: 105, description: '+105 munição máxima' },
      8: { value: 120, description: '+120 munição máxima' },
      9: { value: 135, description: '+135 munição máxima' },
      10: { value: 150, description: '+150 munição máxima' }
    }
  }
};

/**
 * Opção de skill para seleção
 */
export interface SkillOption {
  type: SkillType;
  currentLevel: number;
  nextLevel: number;
  config: SkillConfig;
}

/**
 * Gera 3 opções aleatórias de skills para o jogador escolher
 */
export function generateSkillOptions(playerSkills: PlayerSkill[]): SkillOption[] {
  // Definir chances de raridade
  const rarityChances: { rarity: SkillRarity; chance: number }[] = [
    { rarity: 'lendaria', chance: 0.10 }, // 10%
    { rarity: 'epica', chance: 0.25 },    // 25%
    { rarity: 'rara', chance: 0.65 }      // 65%
  ];

  // Sorteia raridade
  const roll = Math.random();
  let selectedRarity: SkillRarity = 'rara';
  let acc = 0;
  for (const entry of rarityChances) {
    acc += entry.chance;
    if (roll < acc) {
      selectedRarity = entry.rarity;
      break;
    }
  }

  // Criar mapa de skills do player para lookup rápido
  const playerSkillsMap = new Map<SkillType, number>();
  playerSkills.forEach(skill => {
    playerSkillsMap.set(skill.type, skill.level);
  });

  // Filtrar skills disponíveis pela raridade sorteada
  const availableSkills: SkillOption[] = [];
  Object.values(SKILLS_CONFIG).forEach(config => {
    const currentLevel = playerSkillsMap.get(config.id) || 0;
    const nextLevel = currentLevel + 1;
    const rarity = SKILL_RARITY_MAP[config.id];
    if (rarity === selectedRarity && nextLevel <= config.maxLevel) {
      availableSkills.push({
        type: config.id,
        currentLevel,
        nextLevel,
        config
      });
    }
  });

  // Se não houver skills daquela raridade, fallback para rara
  if (availableSkills.length === 0 && selectedRarity !== 'rara') {
    Object.values(SKILLS_CONFIG).forEach(config => {
      const currentLevel = playerSkillsMap.get(config.id) || 0;
      const nextLevel = currentLevel + 1;
      const rarity = SKILL_RARITY_MAP[config.id];
      if (rarity === 'rara' && nextLevel <= config.maxLevel) {
        availableSkills.push({
          type: config.id,
          currentLevel,
          nextLevel,
          config
        });
      }
    });
  }

  // Embaralhar e pegar até 3 opções
  const shuffled = availableSkills.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

/**
 * Calcula o multiplicador de dano baseado nas skills do player
 */
export function calculateDamageMultiplier(skills: PlayerSkill[]): number {
  const damageSkill = skills.find(skill => skill.type === 'damage_boost');
  if (!damageSkill) return 1.0;
  
  const effect = SKILLS_CONFIG.damage_boost.effects[damageSkill.level];
  return effect ? effect.value : 1.0;
}

/**
 * Calcula o multiplicador de velocidade de ataque baseado nas skills do player
 */
export function calculateAttackSpeedMultiplier(skills: PlayerSkill[]): number {
  const speedSkill = skills.find(skill => skill.type === 'attack_speed');
  if (!speedSkill) return 1.0;
  
  const effect = SKILLS_CONFIG.attack_speed.effects[speedSkill.level];
  return effect ? effect.value : 1.0;
}

/**
 * Retorna o número de projéteis por disparo baseado na skill multi_shot
 */
export function getMultiShotCount(skills: PlayerSkill[]): number {
  const multiShotSkill = skills.find(skill => skill.type === 'multi_shot');
  if (!multiShotSkill) return 1;
  
  const effect = SKILLS_CONFIG.multi_shot.effects[multiShotSkill.level];
  return effect ? effect.value : 1;
}

/**
 * Verifica se o player tem a skill de tiro duplo (para compatibilidade)
 */
export function hasMultiShot(skills: PlayerSkill[]): boolean {
  return getMultiShotCount(skills) > 1;
}

/**
 * Calcula o HP máximo adicional baseado nas skills do player
 */
export function calculateMaxHealthBonus(skills: PlayerSkill[]): number {
  const healthSkill = skills.find(skill => skill.type === 'max_health_boost');
  if (!healthSkill) return 0;
  
  const effect = SKILLS_CONFIG.max_health_boost.effects[healthSkill.level];
  return effect ? effect.value : 0;
}

/**
 * Calcula o multiplicador de velocidade de movimento baseado nas skills do player
 */
export function calculateMoveSpeedMultiplier(skills: PlayerSkill[]): number {
  const speedSkill = skills.find(skill => skill.type === 'move_speed');
  if (!speedSkill) return 1.0;
  
  const effect = SKILLS_CONFIG.move_speed.effects[speedSkill.level];
  return effect ? effect.value : 1.0;
}

/**
 * Calcula a capacidade máxima de munição adicional baseada nas skills do player
 */
export function calculateAmmoCapacityBonus(skills: PlayerSkill[]): number {
  const ammoSkill = skills.find(skill => skill.type === 'ammo_capacity');
  if (!ammoSkill) return 0;
  
  const effect = SKILLS_CONFIG.ammo_capacity.effects[ammoSkill.level];
  return effect ? effect.value : 0;
}

/**
 * Sistema de Ondas - Configurações de progressão do jogo
 */
export interface WaveConfig {
  startTime: number;          // Tempo em segundos quando a onda começa
  endTime: number;            // Tempo em segundos quando a onda termina
  enemyTypes: EnemyWaveConfig[];  // Configurações de inimigos para esta onda
  description: string;        // Descrição da onda
}

export interface EnemyWaveConfig {
  type: Enemy['type'];        // Tipo do inimigo
  spawnRate: number;          // Intervalo entre spawns em ms
  maxConcurrent: number;      // Máximo de inimigos deste tipo na tela
  healthMultiplier: number;   // Multiplicador de vida
  speedMultiplier: number;    // Multiplicador de velocidade
  canShoot: boolean;          // Se pode atirar
}

export interface BossWaveConfig {
  time: number;               // Tempo exato para spawn (em segundos)
  type: Enemy['type'];        // Tipo do boss
  healthMultiplier: number;   // Multiplicador de vida
  description: string;        // Descrição do boss fight
  freezeTime: boolean;        // Se congela o timer durante a luta
}

/**
 * Configuração completa do sistema de ondas
 * Duração total: 6 minutos (360 segundos)
 * Boss 1: 2:59 (179 segundos)
 * Boss Final: 5:59 (359 segundos)
 */
export const WAVE_SYSTEM_CONFIG = {
  totalDuration: 360, // 6 minutos em segundos
  
  // Marcos de boss fights
  bosses: [
    {
      time: 179, // 2:59
      type: 'boss' as const,
      healthMultiplier: 1.0,
      description: 'Boss Intermediário',
      freezeTime: true
    },
    {
      time: 359, // 5:59  
      type: 'boss' as const,
      healthMultiplier: 2.5,
      description: 'Boss Final',
      freezeTime: true
    }
  ] as BossWaveConfig[],
  
  // Ondas de inimigos progressivas
  waves: [
    // Onda 1: 0-60s - Tutorial, inimigos muito fracos
    {
      startTime: 0,
      endTime: 60,
      description: 'Primeiros Contatos',
      enemyTypes: [
        {
          type: 'basic' as const,
          spawnRate: 3000,
          maxConcurrent: 2,
          healthMultiplier: 0.5, // 10 HP (morrem com 1 tiro)
          speedMultiplier: 0.7,
          canShoot: false
        }
      ]
    },
    
    // Onda 2: 60-120s - Intensifica um pouco
    {
      startTime: 60,
      endTime: 120,
      description: 'Chegada dos Reforços',
      enemyTypes: [
        {
          type: 'basic' as const,
          spawnRate: 2000,
          maxConcurrent: 3,
          healthMultiplier: 1.0, // 20 HP (2 tiros)
          speedMultiplier: 0.8,
          canShoot: false
        },
        {
          type: 'fast' as const,
          spawnRate: 8000,
          maxConcurrent: 1,
          healthMultiplier: 1.0, // 10 HP
          speedMultiplier: 1.0,
          canShoot: false
        }
      ]
    },
    
    // Onda 3: 120-179s - Antes do primeiro boss
    {
      startTime: 120,
      endTime: 179,
      description: 'Preparação para o Boss',
      enemyTypes: [
        {
          type: 'basic' as const,
          spawnRate: 1500,
          maxConcurrent: 4,
          healthMultiplier: 1.5, // 30 HP (3 tiros)
          speedMultiplier: 0.9,
          canShoot: false
        },
        {
          type: 'fast' as const,
          spawnRate: 6000,
          maxConcurrent: 2,
          healthMultiplier: 1.2, // 12 HP
          speedMultiplier: 1.1,
          canShoot: false
        }
      ]
    },
    
    // Onda 4: 179-240s - Após primeiro boss, introduz inimigos que atiram
    {
      startTime: 179,
      endTime: 240,
      description: 'Contraataque',
      enemyTypes: [
        {
          type: 'basic' as const,
          spawnRate: 2000,
          maxConcurrent: 3,
          healthMultiplier: 1.2, // 24 HP
          speedMultiplier: 0.8,
          canShoot: true // Agora atiram!
        },
        {
          type: 'fast' as const,
          spawnRate: 5000,
          maxConcurrent: 2,
          healthMultiplier: 1.0,
          speedMultiplier: 1.2,
          canShoot: false
        },
        {
          type: 'heavy' as const,
          spawnRate: 15000,
          maxConcurrent: 1,
          healthMultiplier: 0.8, // 40 HP
          speedMultiplier: 1.5,
          canShoot: true
        }
      ]
    },
    
    // Onda 5: 240-300s - Intensifica
    {
      startTime: 240,
      endTime: 300,
      description: 'Ofensiva Pesada',
      enemyTypes: [
        {
          type: 'basic' as const,
          spawnRate: 1200,
          maxConcurrent: 5,
          healthMultiplier: 1.5, // 30 HP
          speedMultiplier: 1.0,
          canShoot: true
        },
        {
          type: 'fast' as const,
          spawnRate: 4000,
          maxConcurrent: 3,
          healthMultiplier: 1.3, // 13 HP
          speedMultiplier: 1.3,
          canShoot: false
        },
        {
          type: 'heavy' as const,
          spawnRate: 12000,
          maxConcurrent: 2,
          healthMultiplier: 1.0, // 50 HP
          speedMultiplier: 1.2,
          canShoot: true
        }
      ]
    },
    
    // Onda 6: 300-359s - Final intenso antes do boss final
    {
      startTime: 300,
      endTime: 359,
      description: 'Último Assalto',
      enemyTypes: [
        {
          type: 'basic' as const,
          spawnRate: 800,
          maxConcurrent: 6,
          healthMultiplier: 2.0, // 40 HP (4 tiros)
          speedMultiplier: 1.1,
          canShoot: true
        },
        {
          type: 'fast' as const,
          spawnRate: 3000,
          maxConcurrent: 4,
          healthMultiplier: 1.5, // 15 HP
          speedMultiplier: 1.4,
          canShoot: true
        },
        {
          type: 'heavy' as const,
          spawnRate: 8000,
          maxConcurrent: 3,
          healthMultiplier: 1.2, // 60 HP
          speedMultiplier: 1.0,
          canShoot: true
        }
      ]
    }
  ] as WaveConfig[]
};

/**
 * Calcula a onda atual baseada no tempo de jogo
 */
export function getCurrentWave(gameTime: number): WaveConfig | null {
  for (const wave of WAVE_SYSTEM_CONFIG.waves) {
    if (gameTime >= wave.startTime && gameTime < wave.endTime) {
      return wave;
    }
  }
  return null;
}

/**
 * Verifica se deve spawnar um boss no tempo atual
 */
export function shouldSpawnBoss(gameTime: number): BossWaveConfig | null {
  for (const boss of WAVE_SYSTEM_CONFIG.bosses) {
    if (Math.abs(gameTime - boss.time) < 0.5) { // Tolerância de 0.5 segundos
      return boss;
    }
  }
  return null;
}

/**
 * Verifica se o jogo foi completado (vitória)
 */
export function isGameVictorious(gameTime: number): boolean {
  return gameTime >= WAVE_SYSTEM_CONFIG.totalDuration;
}

/**
 * Configurações de debug/desenvolvimento
 */
export const DEBUG_CONFIG = {
  showPlayerRange: false,     // Mostrar range de ataque do player
  showEnemyRanges: false,     // Mostrar ranges de ataque dos inimigos
  showCollisionBoxes: false,  // Mostrar hitboxes
  showFPS: false,            // Mostrar FPS counter
  showGameInfo: false        // Mostrar informações de debug do jogo
};
