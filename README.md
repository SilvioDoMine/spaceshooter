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
yarn install
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

### ✅ Implementado
- **Monorepo** com Yarn Workspaces
- **RenderingSystem** com Three.js (scene, camera, renderer, iluminação)
- **InputSystem** com mapeamento WASD/Espaço/P
- **AssetLoader** com cache e carregamento de modelos 3D
- **Nave controlável** carregada de arquivo GLB (escala otimizada)
- **Sistema de Tiro** com projéteis, cooldown e cleanup automático
- **Sistema de Inimigos** com 3 tipos (Basic, Fast, Heavy)
- **Collision Detection** entre projéteis e inimigos
- **Gameplay Loop** funcional (atirar, destruir inimigos)
- **Mobile-friendly** sem zoom

### 🚧 Em Desenvolvimento
- Sistema de pontuação
- Sistema de física avançado
- Audio system

### 📋 Próximos Passos
- Sistema de áudio
- Interface do usuário (HUD)
- Multiplayer networking

## Tecnologias

- **TypeScript** - Linguagem principal
- **Vite** - Build tool do cliente
- **Three.js** - Engine 3D para renderização
- **Yarn Workspaces** - Gerenciamento do monorepo

## Como Jogar (Estado Atual)

1. Execute `yarn dev:client`
2. Acesse `http://localhost:3000`
3. Use **WASD** para mover a nave
4. **Espaço** para atirar projéteis (esferas azuis)
5. **Destrua os inimigos** que descem do topo da tela
6. **Sobreviva o máximo possível**

### Controles
- **W/↑**: Mover para cima
- **A/←**: Mover para esquerda  
- **S/↓**: Mover para baixo
- **D/→**: Mover para direita
- **Espaço**: Atirar (cooldown de 50ms)
- **P/Esc**: Pause

### Inimigos
- **🔴 Basic (Vermelho)**: 20 HP, velocidade 1.5, mais comum (70%)
- **🟠 Fast (Laranja)**: 10 HP, velocidade 2.5, rápido (20%)
- **🟣 Heavy (Roxo)**: 50 HP, velocidade 0.8, resistente (10%)

### Gameplay
- Inimigos aparecem automaticamente a cada 2 segundos
- Cada projétil causa 10 de dano
- Destrua inimigos atirando neles
- Evite que inimigos cheguem até você