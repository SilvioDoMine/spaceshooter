# PowerUp System Guide

## Visão Geral

O PowerUp System adiciona elementos de coleta e gerenciamento de recursos ao jogo. Os power-ups aparecem periodicamente na tela e podem ser coletados pelo jogador para obter benefícios como recarga de munição, restauração de vida ou proteção temporária.

## Características

- **Spawn automático** baseado em timers independentes
- **3 tipos diferentes** com efeitos únicos
- **Formas visuais distintas** para fácil identificação
- **Efeitos de coleta** (visual, sonoro, feedback)
- **Tempo de vida limitado** (desaparecem se não coletados)
- **Animações** (rotação, pulsação, movimento)

## Tipos de Power-ups

### 📦 Ammo (Munição)
- **Forma**: Cubo verde metálico
- **Efeito**: +15 balas (não ultrapassa máximo de 30)
- **Spawn**: 70% de chance, a cada 5 segundos
- **Tempo de vida**: 10 segundos
- **Uso**: Recarrega munição quando jogador está com pouca

### ❤️ Health (Vida)
- **Forma**: Esfera rosa metálica
- **Efeito**: +25 HP (não ultrapassa máximo de 100)
- **Spawn**: 25% de chance, a cada 20 segundos
- **Tempo de vida**: 12 segundos
- **Uso**: Restaura vida quando jogador está ferido

### 🛡️ Shield (Escudo)
- **Forma**: Octaedro azul metálico
- **Efeito**: Proteção temporária por 5 segundos
- **Spawn**: 5% de chance, a cada 30 segundos
- **Tempo de vida**: 8 segundos
- **Status**: Planejado para implementação futura

## Implementação Técnica

### Entidade PowerUp (Shared)

```typescript
export interface PowerUp {
  id: string;              // Identificador único
  position: Vector2D;      // Posição atual no mundo
  velocity: Vector2D;      // Velocidade de movimento
  type: 'ammo' | 'health' | 'shield';  // Tipo determina o efeito
  createdAt: number;       // Timestamp de criação
}
```

### Configurações (Shared)

```typescript
export const POWERUP_CONFIG = {
  ammo: {
    effect: 15,             // +15 balas
    speed: 1.0,             // Velocidade lenta
    size: 0.2,              // Tamanho pequeno
    color: 0x00ff00,        // Verde
    spawnRate: 5000,        // A cada 5 segundos
    lifetime: 10000         // 10 segundos para coletar
  },
  // ... outras configurações
};
```

## Sistema de Spawn

### Mecânica de Spawn
- **Timer independente** para cada tipo
- **Posição aleatória** no topo da tela (eixo X)
- **Movimento descendente** em velocidade constante
- **Probabilidade diferente** para cada tipo

### Algoritmo de Seleção
```typescript
function spawnPowerUp() {
  const rand = Math.random();
  let powerUpType: PowerUp['type'];
  
  if (rand < 0.7) {
    powerUpType = 'ammo';      // 70% chance
  } else if (rand < 0.95) {
    powerUpType = 'health';    // 25% chance
  } else {
    powerUpType = 'shield';    // 5% chance
  }
}
```

## Efeitos Visuais

### Geometrias por Tipo
- **Ammo**: `THREE.BoxGeometry` (cubo)
- **Health**: `THREE.SphereGeometry` (esfera)
- **Shield**: `THREE.OctahedronGeometry` (octaedro)

### Animações
```typescript
// Rotação contínua
object.rotation.x += 0.02;
object.rotation.y += 0.03;

// Efeito de pulsação
const pulseScale = 1 + Math.sin(currentTime * 0.005) * 0.1;
object.scale.setScalar(pulseScale);
```

### Material
```typescript
const material = renderingSystem.createTexturedMaterial({
  color: config.color,
  roughness: 0.1,
  metalness: 0.8  // Brilho metálico para destaque
});
```

## Sistema de Colisão

### Detecção de Colisão
```typescript
function checkPowerUpPlayerCollisions() {
  powerUps.forEach((powerUp, powerUpId) => {
    const dx = powerUpData.position.x - playerShip.position.x;
    const dy = powerUpData.position.y - playerShip.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const playerRadius = 0.3;
    const powerUpRadius = POWERUP_CONFIG[powerUpData.type].size;
    const collisionDistance = playerRadius + powerUpRadius;
    
    if (distance < collisionDistance) {
      // Colisão detectada - aplicar efeito
      applyPowerUpEffect(powerUpData.type);
    }
  });
}
```

### Aplicação de Efeitos
```typescript
function applyPowerUpEffect(powerUpType: PowerUp['type']) {
  const config = POWERUP_CONFIG[powerUpType];
  
  switch (powerUpType) {
    case 'ammo':
      playerAmmo = Math.min(playerMaxAmmo, playerAmmo + config.effect);
      uiSystem.updateAmmo(playerAmmo, playerMaxAmmo);
      break;
      
    case 'health':
      playerHealth = Math.min(playerMaxHealth, playerHealth + config.effect);
      uiSystem.updateHealth(playerHealth, playerMaxHealth);
      break;
      
    case 'shield':
      // TODO: Implementar sistema de escudo
      break;
  }
}
```

## Efeitos de Feedback

### Efeito Sonoro
- **Som**: `powerup` (tom crescente de 600Hz, 400ms)
- **Volume**: 0.4
- **Característica**: Pitch modulation crescente para efeito positivo

```typescript
// AudioSystem - Som sintético para power-up
case 'powerup':
  const pitchMod = 1 + (t / duration) * 0.5; // Pitch sobe 50%
  channelData[i] = Math.sin(2 * Math.PI * frequency * pitchMod * t) * envelope * 0.25;
```

### Efeito Visual
- **Partículas**: Reutiliza `createHitEffect()` na posição de coleta
- **Cores**: Baseadas no tipo de power-up coletado
- **Duração**: Efeito rápido para feedback imediato

### Console Feedback
```typescript
console.log(`Munição recarregada! +${config.effect} balas (Total: ${playerAmmo})`);
console.log(`Vida restaurada! +${config.effect} HP (Total: ${playerHealth})`);
```

## Integração no Game Loop

### Atualização por Frame
```typescript
function animate() {
  if (gameStateManager.isPlaying()) {
    updatePowerUps();                    // Movimento e expiração
    checkPowerUpPlayerCollisions();      // Detecção de coleta
    trySpawnPowerUp();                   // Spawn baseado em timer
  }
}
```

### Limpeza no Reset
```typescript
function resetGame() {
  // Clear all power-ups
  powerUps.forEach(powerUp => {
    renderingSystem.removeFromScene(powerUp.object);
  });
  powerUps.clear();
  
  lastPowerUpSpawnTime = 0;  // Reset timer
}
```

## Balanceamento

### Frequência de Spawn
- **Ammo**: Frequente (5s) - recurso mais necessário
- **Health**: Moderado (20s) - recurso valioso
- **Shield**: Raro (30s) - power-up especial

### Valores de Efeito
- **Ammo**: +15 balas (50% da capacidade máxima)
- **Health**: +25 HP (25% da vida máxima)
- **Shield**: 5 segundos (duração balanceada)

### Tempo de Vida
- **Balanceado** para dar tempo suficiente para coleta
- **Limitado** para criar urgência e decisões táticas
- **Variável** por tipo baseado no valor do power-up

## Expansões Futuras

### Novos Tipos de Power-up
```typescript
// Exemplos de novos power-ups
'speed': {           // Velocidade temporária
  effect: 3000,      // 3 segundos
  color: 0xffff00    // Amarelo
},
'multishot': {       // Tiro múltiplo temporário
  effect: 5000,      // 5 segundos
  color: 0xff00ff    // Magenta
},
'piercing': {        // Projéteis perfurantes
  effect: 10,        // 10 tiros especiais
  color: 0x00ffff    // Cyan
}
```

### Melhorias do Sistema
- **Animações de spawn** (fade in, scale up)
- **Efeitos de trilha** durante movimento
- **Som ambiente** quando power-up está próximo
- **Indicador visual** quando power-up está expirando
- **Combo system** para múltiplas coletas

## Performance

### Otimizações Implementadas
- **Geometria compartilhada** por tipo
- **Cleanup automático** de objetos expirados
- **Update eficiente** usando forEach otimizado
- **Collision detection** apenas quando necessário

### Monitoramento
```typescript
console.log(`PowerUps ativos: ${powerUps.size}`);
console.log(`Tempo desde último spawn: ${Date.now() - lastPowerUpSpawnTime}ms`);
```

## Troubleshooting

### Power-ups não aparecem
1. Verificar se `trySpawnPowerUp()` está sendo chamado no loop
2. Verificar timer de spawn (`lastPowerUpSpawnTime`)
3. Verificar se está no estado PLAYING

### Power-ups não são coletados
1. Verificar colisão detection no loop
2. Verificar raios de colisão (player + powerup)
3. Verificar se `applyPowerUpEffect()` está sendo chamado

### Efeitos não funcionam
1. Verificar limites máximos (ammo, health)
2. Verificar atualização da UI
3. Verificar console logs dos efeitos

## API Resumida

### Funções Principais
- `spawnPowerUp()`: Cria novo power-up
- `trySpawnPowerUp()`: Controla timing de spawn
- `updatePowerUps()`: Atualiza movimento e animações
- `checkPowerUpPlayerCollisions()`: Detecta coletas
- `applyPowerUpEffect(type)`: Aplica benefício do power-up

### Configuração
- `POWERUP_CONFIG`: Configurações por tipo
- `powerUps: Map<string, {object, data}>`: Tracking ativo
- `lastPowerUpSpawnTime`: Controle de timing

O PowerUp System adiciona uma camada estratégica importante ao gameplay, incentivando movimento ativo do jogador e criando momentos de decisão táctica sobre quando e quais power-ups coletar.