# FAQ - Perguntas e Respostas

## Desenvolvimento e Ferramentas

### Por que eu precisaria do Vite nesse projeto?

O Vite não é estritamente necessário, mas oferece várias vantagens para desenvolvimento com Three.js:

**Principais benefícios:**
- **Hot reload** - Mudanças no código atualizam automaticamente no browser
- **ES modules** - Suporte nativo a `import/export` sem configuração
- **Dev server** - Servidor local com CORS configurado (importante para carregar assets)
- **Build otimizado** - Bundling e minificação automática para produção

**Alternativas:**
- **Desenvolvimento simples**: Servir arquivos direto via `python -m http.server` ou Live Server do VS Code
- **Webpack**: Mais configuração, mas mais controle
- **Parcel**: Similar ao Vite, zero config
- **Rollup**: Apenas para build, sem dev server

**Para seu projeto**, você poderia começar sem bundler:
```html
<!-- index.html -->
<script type="module">
  import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
  // seu código aqui
</script>
```

Mas conforme o projeto crescer, você vai querer:
- Múltiplos arquivos JS organizados
- Importar assets (texturas, modelos)
- Otimização para produção

Vite é a opção mais simples para isso, mas você pode decidir depois se precisar.

### Quão difícil seria permitir esse projeto aceitar tanto JavaScript quanto TypeScript ao mesmo tempo?

É bem tranquilo misturar JS e TS no mesmo projeto! O TypeScript foi feito justamente para isso - migração gradual.

**Como funciona:**
- Arquivos `.ts` podem importar `.js` normalmente
- Arquivos `.js` podem importar `.ts` (o bundler resolve)
- Cada arquivo mantém sua própria "personalidade"

**Setup necessário:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "allowJs": true,           // Permite arquivos .js
    "checkJs": false,          // Não verifica tipos em .js
    "moduleResolution": "node",
    "target": "es2020",
    "module": "esnext"
  },
  "include": ["src/**/*.ts", "src/**/*.js"]
}
```

**Exemplo prático:**
```javascript
// player.js (JavaScript puro)
export class Player {
  constructor() {
    this.health = 100;
  }
}
```

```typescript
// enemy.ts (TypeScript)
import { Player } from './player.js';

interface EnemyConfig {
  health: number;
  speed: number;
}

export class Enemy {
  constructor(config: EnemyConfig) {
    // Pode usar Player normalmente
  }
}
```

**Vantagens:**
- Migração gradual conforme você se sente confortável
- Aprende TS aos poucos
- Pode começar tipando só as partes críticas
- Refatoração incremental

**Com Vite**, isso funciona out-of-the-box. É uma estratégia muito boa para aprender TS sem pressão!

---

### Qual a diferença entre Yarn, Yarn Workspaces e como seria efetivo para nosso projeto?

**Yarn vs NPM:**
- Yarn e NPM são gerenciadores de pacotes equivalentes
- Yarn é geralmente mais rápido e tem melhor cache
- Para projeto simples, tanto faz

**Yarn Workspaces vs Projeto Simples:**

**Projeto Simples (recomendado para começar):**
```
spaceshooter/
├── package.json
├── src/
│   ├── shared/     # Código compartilhado (entidades, physics)
│   ├── client/     # Código só do cliente (rendering, UI)
│   └── server/     # Código só do servidor (networking, auth)
└── build/
    ├── client/     # Build do cliente
    └── server/     # Build do servidor
```

**Yarn Workspaces (para projetos maiores):**
```
spaceshooter/
├── package.json           # Configuração principal
├── packages/
│   ├── shared/
│   │   ├── package.json   # Dependências específicas
│   │   └── src/
│   ├── client/
│   │   ├── package.json
│   │   └── src/
│   └── server/
│       ├── package.json
│       └── src/
```

**Vantagens do Yarn Workspaces:**
- Dependências compartilhadas (economiza espaço)
- Builds independentes por package
- Versionamento separado
- Publicação independente no NPM

**Para nosso projeto espacial:**
- **Comece simples**: Uma pasta com subpastas
- **Evolua para Workspaces** quando tiver:
  - Servidor separado rodando
  - Diferentes dependências cliente/servidor
  - Equipe maior trabalhando

**Setup Yarn Workspaces** (quando chegar a hora):
```json
// package.json raiz
{
  "name": "spaceshooter-monorepo",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:client": "yarn workspace client dev",
    "dev:server": "yarn workspace server dev",
    "build": "yarn workspaces run build"
  }
}
```

**Conclusão**: Comece simples, evolua conforme necessidade!

---

### Por que usar dependencies vs devDependencies? Tudo não vai ser buildado com Vite mesmo?

Ótima pergunta! A diferença é importante mesmo em monorepos:

**dependencies vs devDependencies:**
- **`dependencies`**: Código que VAI PARA PRODUÇÃO
- **`devDependencies`**: Ferramentas que só usamos durante desenvolvimento

**Exemplo prático no nosso projeto:**

**Cliente (packages/client):**
```json
{
  "dependencies": {
    "@spaceshooter/shared": "*",  // Código que vai pro build final
    "three": "^0.155.0"          // Three.js vai pro bundle do browser
  },
  "devDependencies": {
    "vite": "^4.4.0",            // Só pra desenvolvimento
    "@types/three": "^0.155.0"   // Tipos TS - removidos no build
  }
}
```

**Servidor (packages/server):**
```json
{
  "dependencies": {
    "@spaceshooter/shared": "*",  // Código compartilhado
    "express": "^4.18.0",        // Express roda em produção
    "ws": "^8.13.0"              // WebSockets em produção
  },
  "devDependencies": {
    "nodemon": "^3.0.0",         // Só pra development (hot reload)
    "@types/express": "^4.17.0"  // Tipos TS
  }
}
```

**Por que isso importa:**

1. **Cliente (Vite build)**: Vite só inclui `dependencies` no bundle final
2. **Servidor (Node.js)**: Em produção, só instala `dependencies` com `yarn install --production`
3. **Docker/Deploy**: Economiza espaço não instalando ferramentas de dev
4. **Performance**: Bundle menor = carregamento mais rápido

**Regra prática:**
- Se o código RODA em produção → `dependencies`
- Se é ferramenta de desenvolvimento → `devDependencies`
- Tipos TypeScript → sempre `devDependencies`

**Exemplo de deploy:**
```bash
# Produção - só instala o necessário
yarn install --production

# Development - instala tudo
yarn install
```

Vite é inteligente e só bundla o que realmente precisa das `dependencies`!

---

## Configuração e Setup

### Por que minha IDE reclama que não encontra o módulo '@spaceshooter/shared'?

Este é um problema comum em workspaces com TypeScript. O código **funciona** em runtime, mas a IDE não reconhece os tipos.

**Soluções testadas:**

1. **Regenerar Yarn SDKs** (primeira tentativa):
```bash
yarn dlx @yarnpkg/sdks vscode
```

2. **Configurar VS Code** (`.vscode/settings.json`):
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.tsdk": ".yarn/sdks/typescript/lib"
}
```

3. **Restart TypeScript Server**:
   - `Cmd+Shift+P` → "TypeScript: Restart TS Server"

4. **Configuração do package shared**:
```json
// packages/shared/package.json
{
  "main": "./src/index.ts",    // Aponta direto pro fonte
  "types": "./src/index.ts"    // Tipos no mesmo lugar
}
```

**Por que isso acontece:**
- Yarn Workspaces usa links simbólicos
- TypeScript precisa saber onde encontrar os tipos
- IDEs precisam dos SDKs do Yarn para entender a estrutura

**Solução que funcionou**: Configuração correta do `main` e `types` no shared + restart do TS Server.

### Por que só o cliente tem node_modules mas server e shared não?

**Isso é normal e correto!** Com Yarn Workspaces:

**Estratégia de hoisting:**
- Yarn **eleva** dependências compartilhadas para a raiz
- Só cria `node_modules` locais quando necessário

**Por que client tem node_modules:**
- **Vite** precisa de algumas dependências locais para funcionar
- Ferramentas de build often precisam de acesso direto aos módulos

**Server e shared sem node_modules:**
- Usam dependências da raiz (`typescript`, etc.)
- Mais eficiente em espaço e velocidade
- Evita duplicação desnecessária

**Vantagens desta arquitetura:**
- ⚡ Instalação mais rápida
- 💾 Menos espaço em disco
- 🔧 Gerenciamento centralizado de versões
- 🚀 Cache mais eficiente

**Não mexa nisso!** É assim que workspaces modernos funcionam.

### Quando devo usar TypeScript vs JavaScript no projeto?

Depois de configurar o setup híbrido, aqui estão as recomendações:

**Use TypeScript para:**
- **Shared code** (tipos compartilhados, interfaces)
- **Game logic** complexa (física, colisões, IA)
- **APIs** e contratos entre cliente/servidor
- **Configurações** importantes (game config, constants)

**Use JavaScript para:**
- **Protótipos** rápidos e experimentação
- **Glue code** simples entre componentes
- **Quando estiver aprendendo** algo novo
- **Assets** e utilitários simples

**Estratégia de migração:**
1. Comece com `.js` se não souber como tipar
2. Adicione `.ts` quando precisar de tipos
3. Refatore `.js` → `.ts` quando entender o padrão
4. Use `// @ts-check` em `.js` para verificação básica

**Exemplo prático:**
```javascript
// utils.js - JavaScript simples
export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
```

```typescript
// gameState.ts - TypeScript para estruturas importantes
interface GameState {
  score: number;
  level: number;
  playerPosition: Vector3;
}

export class GameStateManager {
  private state: GameState;
  // ...
}
```

### Como atualizar dependências no workspace?

**Comando correto para cada situação:**

```bash
# Instalar nova dependência em workspace específico
yarn workspace @spaceshooter/client add three
yarn workspace @spaceshooter/server add express

# Instalar devDependency
yarn workspace @spaceshooter/client add -D @types/three

# Atualizar dependência específica
yarn workspace @spaceshooter/client up three

# Atualizar todas as dependências de um workspace
yarn workspace @spaceshooter/client up

# Remover dependência
yarn workspace @spaceshooter/client remove three

# Verificar dependências outdated
yarn workspaces run outdated
```

**Regenerar tipos após mudanças:**
```bash
# Sempre execute após mudanças de dependências
yarn dlx @yarnpkg/sdks vscode
```

**Troubleshooting comum:**
- Se imports não funcionam → restart TS server
- Se tipos não aparecem → regenerar SDKs
- Se builds falham → verificar se shared está buildado

---

<!-- Adicione novas perguntas abaixo desta linha -->