# Setup Troubleshooting Guide

## Problemas Comuns de Instalação

### 1. Command not found: `yarn build`

**Erro**:
```
Command not found; did you mean one of:
  0. yarn workspaces list [--since] [-R,--recursive] [--no-private] [-v,--verbose] [--json]
  1. yarn workspaces focus [--json] [--production] [-A,--all] ...
```

**Solução**:
O comando `yarn build` existe no arquivo package.json. Este erro geralmente indica que:

1. **Você não está na pasta raiz do projeto**:
   ```bash
   cd spaceshooter  # Certifique-se de estar na pasta raiz
   yarn build
   ```

2. **O package.json não foi encontrado**:
   ```bash
   ls -la  # Verificar se existe package.json na pasta atual
   ```

3. **Cache corrompido do Yarn**:
   ```bash
   yarn cache clean
   yarn install
   yarn build
   ```

### 2. Build do Shared Package Falha

**Erro**:
```
error TS2688: Cannot find type definition file for 'node_modules/@types'
```

**Solução**:
```bash
# Limpar e reinstalar dependências
rm -rf node_modules
rm -rf packages/*/node_modules
yarn install

# Build específico do shared
yarn build:shared
```

### 3. Yarn Version Incompatível

**Erro**:
```
This project is configured to use Yarn 4.x but you're using Yarn 1.x
```

**Solução**:
```bash
# Instalar Yarn 4 globalmente
npm install -g yarn@4

# OU usar o Yarn que vem com o projeto
corepack enable
yarn --version  # Deve mostrar 4.x
```

### 4. Node.js Version Incompatível

**Erro**:
```
error @spaceshooter/client@0.0.1: The engine "node" is incompatible
```

**Solução**:
1. **Verificar versão do Node.js**:
   ```bash
   node --version  # Deve ser 18.x ou superior
   ```

2. **Instalar Node.js 18+ usando nvm**:
   ```bash
   # Instalar nvm (se não tiver)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Reiniciar terminal e instalar Node.js 18
   nvm install 18
   nvm use 18
   ```

### 5. TypeScript Compilation Errors

**Erro**:
```
error TS2307: Cannot find module '@spaceshooter/shared'
```

**Solução**:
```bash
# O shared deve ser compilado ANTES dos outros packages
yarn build:shared
yarn build:client
yarn build:server

# OU use o comando que faz na ordem correta
yarn build
```

### 6. Workspace Dependencies Não Resolvem

**Erro**:
```
error An unexpected error occurred: "workspace:^ not found"
```

**Solução**:
```bash
# Instalar dependências do workspace
yarn install

# Se persistir, limpar cache
yarn cache clean
rm -rf node_modules packages/*/node_modules
yarn install
```

## Setup Passo-a-Passo

### 1. Setup Completo (Recomendado)

```bash
git clone <repository-url>
cd spaceshooter
yarn setup  # Instala dependências + build do shared
```

### 2. Setup Manual

```bash
git clone <repository-url>
cd spaceshooter

# Instalar dependências
yarn install

# Build do shared (OBRIGATÓRIO primeiro)
yarn build:shared

# Verificar se funcionou
yarn dev:client  # Deve abrir o jogo
```

### 3. Desenvolvimento

```bash
# Para desenvolvimento do cliente apenas
yarn dev:client

# Para desenvolvimento do servidor apenas  
yarn dev:server

# Para desenvolvimento completo (cliente + servidor)
yarn dev
```

## Verificação do Setup

Execute estes comandos para verificar se tudo está funcionando:

```bash
# 1. Verificar versões
node --version    # >= 18.0.0
yarn --version    # >= 4.0.0

# 2. Verificar estrutura do projeto
ls -la packages/  # Deve mostrar: client, server, shared

# 3. Verificar se shared foi compilado
ls -la packages/shared/dist/  # Deve conter arquivos .js e .d.ts

# 4. Testar cliente
yarn dev:client  # Deve abrir em http://localhost:3000

# 5. Verificar se não há erros TypeScript
yarn build  # Deve completar sem erros
```

## Estrutura Esperada Após Setup

```
spaceshooter/
├── package.json              ✓ Scripts de build configurados
├── node_modules/             ✓ Dependências instaladas
├── packages/
│   ├── shared/
│   │   ├── dist/            ✓ Arquivos compilados
│   │   └── src/
│   ├── client/
│   │   └── src/
│   └── server/
│       └── src/
└── docs/
```

## Scripts Disponíveis

```bash
# Setup inicial
yarn setup           # Instala dependências + build shared

# Desenvolvimento
yarn dev             # Cliente + Servidor
yarn dev:client      # Apenas cliente
yarn dev:server      # Apenas servidor

# Build
yarn build           # Build completo (ordem correta)
yarn build:shared    # Build apenas shared
yarn build:client    # Build apenas cliente  
yarn build:server    # Build apenas servidor
```

## Problemas Específicos por OS

### Linux/Ubuntu
```bash
# Se tiver erro de permissão
sudo chown -R $USER:$USER ~/.yarn
chmod +x node_modules/.bin/*
```

### macOS
```bash
# Se Yarn não for encontrado após instalação
echo 'export PATH="$HOME/.yarn/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Windows
```powershell
# Execute como Administrador se tiver problemas de permissão
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Ainda com Problemas?

1. **Verifique o log completo** do comando que falhou
2. **Limpe tudo e recomece**:
   ```bash
   rm -rf node_modules packages/*/node_modules packages/*/dist
   yarn cache clean
   yarn setup
   ```
3. **Verifique se está usando as versões corretas**:
   - Node.js 18+
   - Yarn 4+
4. **Procure por issues semelhantes** no repositório do projeto