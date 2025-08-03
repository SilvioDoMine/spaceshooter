# Spaceshooter JS Game

Jogo spaceshooter desenvolvido em TypeScript com arquitetura de monorepo.

## Pré-requisitos

- **Node.js** (versão 18 ou superior)
- **Yarn** (versão 4+)

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone <url-do-repositorio>
cd spaceshooter
yarn setup
```

**OU** faça o setup manual:

```bash
git clone <url-do-repositorio>
cd spaceshooter
yarn install
yarn build:shared  # IMPORTANTE: Build do shared primeiro
```

## Executando o projeto

### Cliente apenas (frontend)

```bash
yarn dev:client
```

O cliente será executado em `http://localhost:3000` (Vite dev server).

### Servidor apenas (backend)

```bash
yarn dev:server
```

O servidor será executado em modo de desenvolvimento com hot reload.

### Cliente e servidor juntos

```bash
yarn dev
```

Executa simultaneamente o cliente e servidor em modo de desenvolvimento.

## Build

Para fazer build de todos os pacotes:

```bash
yarn build
```

**Builds individuais** (útil para desenvolvimento):

```bash
yarn build:shared   # Build apenas do shared (necessário primeiro)
yarn build:client   # Build apenas do client
yarn build:server   # Build apenas do server
```

## Estrutura do projeto

```
spaceshooter/
├── packages/
│   ├── client/           # Frontend (Vite + Three.js)
│   │   ├── public/
│   │   │   └── assets/   # Assets estáticos (modelos, texturas, sons)
│   │   └── src/
│   │       ├── systems/  # RenderingSystem, InputSystem
│   │       ├── assets/   # AssetLoader, manifesto
│   │       └── main.ts   # Entry point
│   ├── server/           # Backend (Node.js + TypeScript)
│   └── shared/           # Código compartilhado (entidades, física)
├── docs/                 # Documentação
└── package.json          # Configuração do monorepo
```

## Estado Atual

### ✅ **JOGO COMPLETO** - Single Player
- **Monorepo** com Yarn Workspaces
- **RenderingSystem** com Three.js (scene, camera, renderer, iluminação)
- **InputSystem** com mapeamento WASD/Espaço/P/Escape
- **AssetLoader** com cache e carregamento de modelos 3D
- **Nave controlável** carregada de arquivo GLB (escala otimizada)
- **Sistema de Tiro** com projéteis, cooldown e cleanup automático
- **Sistema de Inimigos** com 3 tipos (Basic, Fast, Heavy)
- **Collision Detection** entre projéteis e inimigos
- **Gameplay Loop** funcional (atirar, destruir inimigos, vida, dano)
- **🆕 AudioSystem** com efeitos sonoros (sons sintéticos)
- **🆕 ParticleSystem** com efeitos visuais de explosão
- **🆕 GameStateManager** com estados (Menu/Playing/Paused/GameOver)
- **🆕 MenuSystem** com telas completas
- **🆕 UISystem/HUD** com vida, munição e pontuação
- **🆕 Sistema de Estatísticas** (precisão, tempo vivo, kills)
- **🆕 PowerUp System** com coleta de recursos (munição, vida)
- **Mobile-friendly** sem zoom

### 🚧 Em Desenvolvimento
- Sistema de física avançado
- Fases/waves progressivas
- Boss battles

### 📋 Próximos Passos
- **Multiplayer networking** (Fase 3)
- **Performance optimizations**
- **Advanced gameplay features**

## Tecnologias

- **TypeScript** - Linguagem principal
- **Vite** - Build tool do cliente
- **Three.js** - Engine 3D para renderização
- **Yarn Workspaces** - Gerenciamento do monorepo

## 🎮 Como Jogar

### Início
1. Execute `yarn dev:client`
2. Acesse `http://localhost:3000`
3. **🆕 Menu Principal** aparece com opções
4. Clique **"Iniciar Jogo"** para começar

### Gameplay Completo
- **Movimento**: Use **WASD** para mover a nave 3D
- **Ataque**: **Espaço** para atirar projéteis (munição limitada: 30 balas)
- **🆕 Audio**: Ouça efeitos sonoros de tiro, explosão, impacto e coleta
- **🆕 Efeitos Visuais**: Veja partículas de explosão quando inimigos morrem
- **🆕 HUD**: Monitore vida (barra visual), munição e pontuação
- **🆕 Power-ups**: Colete recursos que aparecem na tela
- **🆕 Pause**: Pressione **P** para pausar/despausar

### Controles
- **W/A/S/D**: Movimento da nave
- **Espaço**: Atirar (cooldown de 200ms)
- **P**: Pausar/Despausar
- **Escape**: Pause alternativo

### Sistema de Combate
- **🔴 Basic (Vermelho)**: 20 HP, velocidade 1.5, **10 pontos**, dano 10 HP (70% spawn)
- **🟠 Fast (Laranja)**: 10 HP, velocidade 2.5, **25 pontos**, dano 15 HP (20% spawn)
- **🟣 Heavy (Roxo)**: 50 HP, velocidade 0.8, **50 pontos**, dano 25 HP (10% spawn)

### 🆕 Sistema de Power-ups
- **📦 Ammo (Verde, Cubo)**: Recarrega +15 balas (70% spawn a cada 5s)
- **❤️ Health (Rosa, Esfera)**: Restaura +25 HP (25% spawn a cada 20s)
- **🛡️ Shield (Azul, Octaedro)**: Proteção temporária (5% spawn, futuro)

### Objetivos
- **Destrua inimigos** atirando neles para ganhar pontos
- **Evite colisões** - inimigos causam dano baseado no tipo
- **🆕 Colete power-ups** - recarregue munição e restaure vida
- **Gerencie recursos** - munição limitada, vida preciosa
- **Sobreviva o máximo possível** - quando vida chega a 0, é game over

### 🆕 Game Over
- **Estatísticas detalhadas**: pontuação final, tempo vivo, inimigos destruídos
- **Precisão de tiro**: percentual de acertos
- **Opções**: Jogar novamente ou voltar ao menu principal