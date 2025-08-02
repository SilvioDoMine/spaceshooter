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

---

<!-- Adicione novas perguntas abaixo desta linha -->