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

## 🎮 Gameplay e Mecânicas

### Como jogar o jogo atual?
1. Execute `yarn dev:client`
2. Acesse `http://localhost:3000`
3. Use **WASD** para mover a nave
4. **Espaço** para atirar projéteis
5. Destrua inimigos que descem do topo da tela

### Quais são os tipos de inimigos e suas características?
- **🔴 Basic (Vermelho)**: 20 HP, velocidade 1.5 - mais comum (70% spawn)
- **🟠 Fast (Laranja)**: 10 HP, velocidade 2.5 - rápido (20% spawn)  
- **🟣 Heavy (Roxo)**: 50 HP, velocidade 0.8 - resistente (10% spawn)

### Como funciona o sistema de dano?
- Cada projétil causa **10 de dano**
- **Basic**: 2 hits para destruir (20 HP ÷ 10 damage)
- **Fast**: 1 hit para destruir (10 HP ÷ 10 damage)
- **Heavy**: 5 hits para destruir (50 HP ÷ 10 damage)

### Por que alguns inimigos aparecem mais que outros?
O sistema usa probabilidades baseadas em balanceamento:
- **70% Basic**: Forma a base do gameplay
- **20% Fast**: Adiciona desafio de precisão
- **10% Heavy**: Teste de DPS e paciência

### Com que frequência aparecem inimigos?
- **Spawn rate**: 1 inimigo a cada 2 segundos
- **Posição**: Aleatória no eixo X, sempre no topo (Y=6)
- **Movimento**: Descida vertical em direção ao jogador

### Como ajustar a dificuldade do jogo?
Edite `packages/shared/src/index.ts`:

**Para tornar mais fácil:**
```typescript
// Aumentar dano dos projéteis
PROJECTILE_CONFIG.damage = 20; // era 10

// Diminuir vida dos inimigos
ENEMY_CONFIG.basic.health = 10; // era 20

// Menos inimigos
ENEMY_CONFIG.basic.spawnRate = 4000; // era 2000 (4s em vez de 2s)
```

**Para tornar mais difícil:**
```typescript
// Diminuir dano
PROJECTILE_CONFIG.damage = 5;

// Aumentar vida
ENEMY_CONFIG.heavy.health = 100;

// Mais inimigos
ENEMY_CONFIG.basic.spawnRate = 1000; // 1s entre spawns
```

### Por que a nave parece pequena/grande demais?
A escala da nave pode ser ajustada em `main.ts`:
```typescript
// Linha ~78
playerShip.scale.setScalar(0.3); // Diminua para menor, aumente para maior
```

### Por que os inimigos/projéteis se movem muito rápido/devagar?
As velocidades são configuráveis:

**Projéteis:**
```typescript
// packages/shared/src/index.ts
PROJECTILE_CONFIG.speed = 15; // Unidades por segundo
```

**Inimigos:**
```typescript
ENEMY_CONFIG.basic.speed = 1.5;  // Ajuste conforme necessário
ENEMY_CONFIG.fast.speed = 2.5;   
ENEMY_CONFIG.heavy.speed = 0.8;  
```

**Nave do jogador:**
```typescript
// packages/client/src/main.ts, linha ~231
const speed = 0.08; // Velocidade de movimento
```

---

## 🐛 Problemas Técnicos e Troubleshooting

### Não estou vendo a nave na tela
**Possíveis causas:**
1. **Modelo não encontrado**: Verifique se existe `public/assets/models/ship.glb`
2. **Fallback não aparece**: Deveria aparecer um cubo verde
3. **Erro de carregamento**: Verifique console (F12) para erros

**Soluções:**
```bash
# Verificar se asset existe
ls packages/client/public/assets/models/

# Se não existir, o fallback (cubo verde) deve aparecer
# Se nem o fallback aparece, verifique console para erros
```

### Controles não respondem
1. **Foco da página**: Clique na tela do jogo
2. **Console errors**: Verifique F12 para erros JavaScript
3. **Teste teclas alternativas**: Use arrow keys em vez de WASD

### Inimigos/projéteis não aparecem
**Debug steps:**
1. Abra console (F12)
2. Procure por logs:
   - "Projectile fired!" quando atirar
   - "Enemy spawned: [tipo]" a cada 2 segundos
3. Se não vê logs, há erro no código

### Colisões não funcionam
**Verificações:**
1. Console deve mostrar "Collision: [projectile] hit [enemy]"
2. Se não há logs de colisão, verifique se ambos estão sendo renderizados
3. Teste atirando diretamente em inimigos

### Performance baixa / FPS baixo
**Soluções imediatas:**
- Feche outras abas do browser
- Use browser atualizado (Chrome/Firefox)
- Verifique se hardware acceleration está habilitado

**Para desenvolvimento:**
```typescript
// Limitar número máximo de entidades
const MAX_PROJECTILES = 20;
const MAX_ENEMIES = 10;

// No código, adicione verificações antes de criar novos
if (projectiles.size >= MAX_PROJECTILES) return;
```

### Erro "Cannot resolve @spaceshooter/shared"
```bash
# Build o shared package
yarn workspace @spaceshooter/shared build

# Regenerar SDKs do Yarn
yarn dlx @yarnpkg/sdks vscode

# Restart TypeScript server no VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Hot reload não funciona
```bash
# Reinicie o servidor
yarn dev:client

# Se ainda não funcionar, limpe cache
rm -rf packages/client/node_modules/.vite
yarn dev:client
```

---

## 📊 Debug e Monitoramento

### Como ver informações de debug em tempo real?
Abra o console do browser (F12) para monitorar:
- **"Projectile fired!"**: Confirma que tiro foi disparado
- **"Enemy spawned: [tipo]"**: Confirma spawn de inimigos
- **"Collision detected"**: Confirma detecção de colisões
- **"Enemy destroyed"**: Confirma destruição de inimigos

### Como verificar quantas entidades estão ativas?
Adicione no console:
```javascript
// Cole no console do browser para debug
setInterval(() => {
  console.log(`Projéteis: ${projectiles.size}, Inimigos: ${enemies.size}`);
}, 2000);
```

### Como verificar performance?
**Ferramentas do browser:**
1. **F12 → Performance tab**: Profile de FPS e render time
2. **F12 → Memory tab**: Uso de memória e vazamentos
3. **console.time/timeEnd**: Medir tempo de funções específicas

### Como reportar bugs?
**Informações necessárias:**
1. **Comportamento esperado vs atual**
2. **Passos para reproduzir**
3. **Console logs** (copie erros em vermelho)
4. **Screenshots** se problema visual
5. **Sistema**: SO, browser, versão

**Exemplo de bug report:**
```
Título: Inimigos não aparecem após 5 minutos

Esperado: Inimigos devem continuar aparecendo
Atual: Param de aparecer após ~5 minutos

Passos:
1. yarn dev:client
2. Jogue por 5+ minutos
3. Inimigos param de spawnar

Console errors: 
[Copie aqui qualquer erro do console]

Sistema: macOS 13, Chrome 118
```

---

## 🔮 Futuras Features e Extensibilidade

### Que funcionalidades estão planejadas?
**Próximas implementações:**
- **Score System**: Pontuação por inimigos destruídos
- **Audio System**: Sons de tiro, explosão, música de fundo
- **UI/HUD**: Interface com vida, pontos, munição
- **Particle Effects**: Explosões e efeitos visuais
- **Power-ups**: Itens que melhoram a nave

**Médio prazo:**
- **Multiplayer**: Modo cooperativo e competitivo
- **Diferentes naves**: Características únicas
- **Boss battles**: Inimigos grandes com padrões especiais
- **Wave system**: Ondas progressivas de dificuldade

### Como adicionar novos tipos de inimigos?
1. **Atualizar interface:**
```typescript
// packages/shared/src/index.ts
type: 'basic' | 'fast' | 'heavy' | 'sniper'; // Adicione novo tipo
```

2. **Adicionar configuração:**
```typescript
ENEMY_CONFIG = {
  // ... tipos existentes
  sniper: {
    health: 15,
    speed: 1.0,
    size: 0.25,
    color: 0x00ff00,  // Verde
    spawnRate: 6000
  }
};
```

3. **Atualizar lógica de spawn:**
```typescript
// Em spawnEnemy(), adicionar nova probabilidade
if (rand < 0.6) enemyType = 'basic';        // 60%
else if (rand < 0.8) enemyType = 'fast';    // 20% 
else if (rand < 0.95) enemyType = 'heavy';  // 15%
else enemyType = 'sniper';                  // 5%
```

### Como adicionar diferentes tipos de projéteis?
Similar aos inimigos, mas para projéteis:
1. Estender interface `Projectile` com campo `type`
2. Criar `PROJECTILE_TYPES_CONFIG`
3. Atualizar lógica de disparo para alternar tipos
4. Diferentes visuais (cores, formas, tamanhos)

### Como contribuir com o projeto?
1. **Fork** o repositório no GitHub
2. **Clone** sua fork localmente
3. **Branch** para sua feature: `git checkout -b minha-feature`
4. **Implemente** seguindo padrões existentes
5. **Teste** thoroughly
6. **Commit** com mensagens descritivas
7. **Push** e crie **Pull Request**

**Padrões de código:**
- Use JSDoc para funções públicas
- Siga nomenclatura existente (camelCase)
- Mantenha interfaces no shared package
- Adicione console.logs para debug quando apropriado

---

<!-- Adicione novas perguntas abaixo desta linha -->