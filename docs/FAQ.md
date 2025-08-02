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

<!-- Adicione novas perguntas abaixo desta linha -->