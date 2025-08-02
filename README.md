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

O cliente será executado em `http://localhost:5173` (Vite dev server).

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
│   ├── client/     # Frontend (Vite + Three.js)
│   ├── server/     # Backend (Node.js + TypeScript)
│   └── shared/     # Código compartilhado
└── package.json    # Configuração do monorepo
```

## Tecnologias

- **TypeScript** - Linguagem principal
- **Vite** - Build tool do cliente
- **Three.js** - Engine 3D
- **Yarn Workspaces** - Gerenciamento do monorepo