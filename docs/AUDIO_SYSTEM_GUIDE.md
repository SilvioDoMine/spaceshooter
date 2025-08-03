# AudioSystem Guide

## Visão Geral

O AudioSystem é responsável por gerenciar todo o áudio do jogo, incluindo carregamento, cache e reprodução de efeitos sonoros. O sistema possui fallback automático para sons sintéticos quando arquivos de áudio não estão disponíveis.

## Características

- **Carregamento assíncrono** de arquivos de áudio
- **Cache inteligente** para evitar recarregamentos
- **Fallback automático** para sons sintéticos
- **Controle de volume** individual e global
- **Inicialização lazy** (após primeira interação do usuário)
- **Compatibilidade com políticas de autoplay** dos browsers

## Uso Básico

```typescript
import { AudioSystem } from './systems/AudioSystem';

// Criar instância
const audioSystem = new AudioSystem();

// Inicializar (após interação do usuário)
await audioSystem.initialize();

// Carregar sons
await audioSystem.loadSound('shoot', '/assets/sounds/shoot.wav');
await audioSystem.loadSound('explosion', '/assets/sounds/explosion.wav');

// Reproduzir som
audioSystem.playSound('shoot', { volume: 0.3 });
```

## Carregamento em Lote

```typescript
// Carregar múltiplos sons
const soundManifest = {
  'shoot': '/assets/sounds/shoot.wav',
  'explosion': '/assets/sounds/explosion.wav',
  'hit': '/assets/sounds/hit.wav'
};

await audioSystem.loadSounds(soundManifest);
```

## Sons Sintéticos

Quando um arquivo de áudio não pode ser carregado, o sistema automaticamente gera um som sintético baseado no nome:

- **shoot**: Tom puro de 800Hz, 100ms
- **explosion**: Ruído branco, 300ms
- **hit**: Tom puro de 400Hz, 200ms

```typescript
// Criar som sintético personalizado
const buffer = audioSystem.createSyntheticSound('custom');
```

## Controles de Volume

```typescript
// Volume global (0.0 a 1.0)
audioSystem.setVolume(0.5);

// Volume individual por som
audioSystem.playSound('shoot', { volume: 0.3 });

// Habilitar/desabilitar áudio
audioSystem.setEnabled(false);
```

## Estados e Verificações

```typescript
// Verificar se está inicializado
if (audioSystem.isInitialized()) {
  audioSystem.playSound('shoot');
}

// Verificar se está habilitado
if (audioSystem.isEnabled()) {
  console.log('Áudio está ativo');
}
```

## Integração no Jogo

No Space Shooter, o AudioSystem é integrado da seguinte forma:

```typescript
// main.ts
let audioSystem: AudioSystem;

async function init() {
  // Criar sistema
  audioSystem = new AudioSystem();
  
  // Carregar sons do manifest
  await audioSystem.loadSounds(GAME_ASSETS.sounds);
}

function onInputChange(action: string, pressed: boolean) {
  // Inicializar na primeira interação
  if (!audioSystem.isInitialized()) {
    audioSystem.initialize();
  }
  
  if (action === 'shoot' && pressed) {
    audioSystem.playSound('shoot', { volume: 0.3 });
  }
}
```

## Eventos de Jogo

O sistema reproduz sons automaticamente para:

- **Tiro**: Quando jogador atira (`shoot`)
- **Explosão**: Quando inimigo é destruído (`explosion`)
- **Impacto**: Quando jogador leva dano (`hit`)

## Performance

- **Cache automático**: Sons carregados ficam em memória
- **Reutilização de buffers**: Sem reload desnecessário
- **Cleanup automático**: Sources são liberadas após reprodução
- **Fallback leve**: Sons sintéticos usam mínima CPU

## Limitações

- **Políticas de autoplay**: Requer interação do usuário primeiro
- **Formato de arquivos**: Suporta formatos padrão do browser (WAV, MP3, OGG)
- **Memória**: Sons ficam em cache até disposal
- **Concorrência**: Múltiplas reproduções simultâneas do mesmo som

## Troubleshooting

### Som não reproduz
1. Verificar se `initialize()` foi chamado
2. Verificar se houve interação do usuário
3. Verificar se áudio está habilitado (`isEnabled()`)

### Arquivo não carrega
- O sistema automaticamente usará fallback sintético
- Verificar console para mensagens de erro
- Verificar se o arquivo existe no path correto

### Performance baixa
- Evitar carregar muitos sons grandes
- Usar formatos otimizados (OGG/MP3 comprimidos)
- Considerar unload de sons não utilizados

## API Completa

### Métodos Principais
- `initialize()`: Inicializa o contexto de áudio
- `loadSound(name, url)`: Carrega um som individual
- `loadSounds(manifest)`: Carrega múltiplos sons
- `playSound(name, options)`: Reproduz um som
- `setVolume(volume)`: Define volume global
- `setEnabled(enabled)`: Habilita/desabilita áudio
- `dispose()`: Limpa recursos

### Métodos de Verificação
- `isInitialized()`: Verifica se foi inicializado
- `isEnabled()`: Verifica se áudio está habilitado

### Opções de Reprodução
```typescript
interface PlayOptions {
  volume?: number;  // 0.0 a 1.0
  loop?: boolean;   // Repetir som
}
```