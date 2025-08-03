# ParticleSystem Guide

## Visão Geral

O ParticleSystem é responsável por criar e gerenciar efeitos visuais de partículas no jogo, como explosões, impactos e outros efeitos especiais. Utiliza Three.js para renderização 3D de partículas individuais.

## Características

- **Efeitos pré-configurados** (explosão, impacto)
- **Configuração customizável** de partículas
- **Animação automática** com interpolação
- **Cleanup automático** quando partículas expiram
- **Performance otimizada** com reutilização de geometria
- **Efeitos visuais** (mudança de cor, escala, transparência)

## Uso Básico

```typescript
import { ParticleSystem } from './systems/ParticleSystem';
import * as THREE from 'three';

// Criar sistema (precisa da scene do Three.js)
const particleSystem = new ParticleSystem(scene);

// Criar efeito de explosão
const position = new THREE.Vector3(0, 0, 0);
particleSystem.createExplosion(position);

// Criar efeito de impacto
particleSystem.createHitEffect(position);

// Atualizar no loop do jogo (chamado a cada frame)
function animate() {
  particleSystem.update(deltaTime);
  // ... resto do loop
}
```

## Efeitos Pré-configurados

### Explosão
- **15 partículas** em direções aleatórias
- **Cor**: Laranja → Vermelho escuro
- **Duração**: 1 segundo
- **Velocidade**: 2-6 unidades/segundo
- **Tamanho**: 0.05-0.15 unidades

```typescript
particleSystem.createExplosion(new THREE.Vector3(x, y, z));
```

### Impacto/Hit
- **8 partículas** em direções aleatórias
- **Cor**: Amarelo → Laranja
- **Duração**: 0.5 segundos
- **Velocidade**: 1-3 unidades/segundo
- **Tamanho**: 0.03-0.08 unidades

```typescript
particleSystem.createHitEffect(new THREE.Vector3(x, y, z));
```

## Configuração Customizada

```typescript
import { ParticleConfig } from './systems/ParticleSystem';

const customConfig: ParticleConfig = {
  count: 20,
  lifetime: 2000, // 2 segundos em milliseconds
  speed: { min: 1, max: 5 },
  size: { min: 0.1, max: 0.3 },
  color: {
    start: new THREE.Color(0x00ff00), // Verde
    end: new THREE.Color(0x0000ff)   // Azul
  }
};

// Criar efeito customizado
particleSystem.createParticleEffect(position, customConfig);
```

## Integração no Jogo

No Space Shooter, o ParticleSystem é usado para:

```typescript
// main.ts
let particleSystem: ParticleSystem;

async function init() {
  // Criar sistema após RenderingSystem
  particleSystem = new ParticleSystem(renderingSystem.scene);
}

function animate() {
  // Atualizar sempre (mesmo quando pausado para efeitos de menu)
  if (particleSystem) {
    particleSystem.update(0.016); // ~60fps
  }
}

// Quando inimigo é destruído
if (enemyHealth <= 0) {
  const explosionPos = new THREE.Vector3(enemy.x, enemy.y, 0);
  particleSystem.createExplosion(explosionPos);
}

// Quando jogador leva dano
if (playerHit) {
  const hitPos = new THREE.Vector3(player.x, player.y, 0);
  particleSystem.createHitEffect(hitPos);
}
```

## Sistema de Animação

Cada partícula passa por várias fases durante sua vida:

### 1. Criação
- Posição inicial definida
- Velocidade aleatória em direção esférica
- Tamanho e cor iniciais

### 2. Movimento
- Posição atualizada baseada na velocidade
- Rotação automática para dinamismo

### 3. Interpolação Visual
- **Escala**: Diminui 50% durante a vida
- **Cor**: Interpola de cor inicial para final
- **Transparência**: Fade out linear

### 4. Cleanup
- Partícula removida automaticamente quando expira
- Materiais liberados para evitar vazamentos de memória

## Performance

### Otimizações Implementadas
- **Geometria compartilhada**: Uma SphereGeometry para todas as partículas
- **Material individual**: Permite cores diferentes por partícula
- **Cleanup automático**: Evita acúmulo de objetos na scene
- **Batch updates**: Todas as partículas atualizadas em um loop

### Monitoramento
```typescript
// Verificar número de partículas ativas
const activeCount = particleSystem.getActiveParticleCount();
console.log(`Partículas ativas: ${activeCount}`);
```

## Configurações Avançadas

### ParticleConfig Interface
```typescript
interface ParticleConfig {
  count: number;                    // Número de partículas
  lifetime: number;                 // Duração em milliseconds
  speed: { min: number; max: number }; // Velocidade aleatória
  size: { min: number; max: number };  // Tamanho aleatório
  color: {                            // Cores de interpolação
    start: THREE.Color;
    end: THREE.Color;
  };
}
```

### Particle Interface
```typescript
interface Particle {
  mesh: THREE.Mesh;           // Objeto 3D
  velocity: THREE.Vector3;    // Vetor velocidade
  createdAt: number;          // Timestamp de criação
  lifetime: number;           // Duração total
  initialSize: number;        // Tamanho inicial
}
```

## Métodos da API

### Principais
- `createExplosion(position)`: Efeito de explosão
- `createHitEffect(position)`: Efeito de impacto
- `createParticleEffect(position, config)`: Efeito customizado
- `update(deltaTime)`: Atualizar animações
- `clear()`: Limpar todas as partículas
- `dispose()`: Liberar recursos
- `getActiveParticleCount()`: Contar partículas ativas

### Utilitários Internos
- `randomBetween(min, max)`: Número aleatório
- Material management automático
- Interpolação de cores automática

## Troubleshooting

### Partículas não aparecem
1. Verificar se scene foi passada corretamente
2. Verificar se `update()` está sendo chamado
3. Verificar posição das partículas na scene

### Performance baixa
1. Limitar número de efeitos simultâneos
2. Reduzir `count` nas configurações
3. Diminuir `lifetime` para cleanup mais rápido
4. Usar `clear()` quando necessário

### Vazamentos de memória
- O sistema automaticamente libera materiais
- Chamar `dispose()` ao final da aplicação
- Evitar criação de muitos efeitos em loops tight

## Exemplos de Uso

### Efeito de Power-up
```typescript
const powerUpConfig: ParticleConfig = {
  count: 10,
  lifetime: 1500,
  speed: { min: 0.5, max: 2 },
  size: { min: 0.02, max: 0.06 },
  color: {
    start: new THREE.Color(0xffff00), // Amarelo
    end: new THREE.Color(0xffffff)   // Branco
  }
};

particleSystem.createParticleEffect(position, powerUpConfig);
```

### Efeito de Morte do Jogador
```typescript
const deathConfig: ParticleConfig = {
  count: 30,
  lifetime: 2000,
  speed: { min: 1, max: 8 },
  size: { min: 0.1, max: 0.4 },
  color: {
    start: new THREE.Color(0xff0000), // Vermelho
    end: new THREE.Color(0x000000)   // Preto
  }
};

particleSystem.createParticleEffect(playerPosition, deathConfig);
```