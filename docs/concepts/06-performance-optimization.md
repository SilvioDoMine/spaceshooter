# Performance Optimization para Games

## Por que Performance Importa?

Em games, performance é **experiência do usuário**. Frame drops, stuttering e lag quebram completamente a imersão. Seu SpaceShooter precisa rodar a 60fps consistente para parecer profissional.

## Medindo Performance

### FPS Counter Básico
```typescript
class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private frameTime = 0;
  private worstFrameTime = 0;
  
  update(timestamp: number) {
    const deltaTime = timestamp - this.lastTime;
    this.frameTime = deltaTime;
    
    if (deltaTime > this.worstFrameTime) {
      this.worstFrameTime = deltaTime;
    }
    
    this.frameCount++;
    
    if (timestamp - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
      this.worstFrameTime = 0; // Reset worst frame
    }
    
    this.lastTime = timestamp;
  }
  
  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#00FF00';
    ctx.font = '16px monospace';
    ctx.fillText(`FPS: ${this.fps}`, 10, 30);
    ctx.fillText(`Frame: ${this.frameTime.toFixed(2)}ms`, 10, 50);
    ctx.fillText(`Worst: ${this.worstFrameTime.toFixed(2)}ms`, 10, 70);
  }
}
```

### Profiler Simples
```typescript
class Profiler {
  private static measurements = new Map<string, number[]>();
  private static startTimes = new Map<string, number>();
  
  static start(label: string) {
    this.startTimes.set(label, performance.now());
  }
  
  static end(label: string) {
    const startTime = this.startTimes.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      
      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }
      
      const measurements = this.measurements.get(label)!;
      measurements.push(duration);
      
      // Mantém só os últimos 60 measurements
      if (measurements.length > 60) {
        measurements.shift();
      }
      
      this.startTimes.delete(label);
    }
  }
  
  static getStats(label: string) {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) return null;
    
    const sum = measurements.reduce((a, b) => a + b, 0);
    const avg = sum / measurements.length;
    const max = Math.max(...measurements);
    const min = Math.min(...measurements);
    
    return { avg, max, min, count: measurements.length };
  }
  
  static renderStats(ctx: CanvasRenderingContext2D) {
    let y = 100;
    ctx.fillStyle = '#FFFF00';
    ctx.font = '12px monospace';
    
    for (const [label, _] of this.measurements) {
      const stats = this.getStats(label);
      if (stats) {
        ctx.fillText(`${label}: ${stats.avg.toFixed(2)}ms (max: ${stats.max.toFixed(2)})`, 10, y);
        y += 15;
      }
    }
  }
}

// Uso:
Profiler.start('update');
// ... código de update ...
Profiler.end('update');
```

## Otimizações Fundamentais

### 1. **Culling (Não Processar o Invisível)**

#### View Frustum Culling
```typescript
class Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  margin: number = 50; // Margem para objetos parcialmente visíveis
  
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  
  contains(obj: { x: number; y: number; width?: number; height?: number }): boolean {
    const objWidth = obj.width || 32;
    const objHeight = obj.height || 32;
    
    return !(
      obj.x + objWidth < this.x - this.margin ||
      obj.x > this.x + this.width + this.margin ||
      obj.y + objHeight < this.y - this.margin ||
      obj.y > this.y + this.height + this.margin
    );
  }
}

class RenderSystem {
  private viewport: Viewport;
  
  render(entities: Entity[], ctx: CanvasRenderingContext2D) {
    let rendered = 0;
    let culled = 0;
    
    for (const entity of entities) {
      if (this.viewport.contains(entity)) {
        entity.render(ctx);
        rendered++;
      } else {
        culled++;
      }
    }
    
    console.log(`Rendered: ${rendered}, Culled: ${culled}`);
  }
}
```

#### Distance-Based Culling
```typescript
class DistanceCuller {
  static shouldRender(obj: GameObject, camera: Camera, maxDistance: number): boolean {
    const dx = obj.x - camera.x;
    const dy = obj.y - camera.y;
    const distanceSquared = dx * dx + dy * dy;
    
    // Usa distância ao quadrado para evitar Math.sqrt()
    return distanceSquared <= maxDistance * maxDistance;
  }
}
```

### 2. **Spatial Partitioning (QuadTree)**

```typescript
class QuadTree {
  private bounds: Rectangle;
  private objects: GameObject[] = [];
  private children: QuadTree[] = [];
  private maxObjects = 10;
  private maxLevels = 5;
  private level = 0;
  
  constructor(bounds: Rectangle, level: number = 0) {
    this.bounds = bounds;
    this.level = level;
  }
  
  clear() {
    this.objects = [];
    this.children = [];
  }
  
  split() {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;
    
    this.children[0] = new QuadTree({ x: x + subWidth, y: y, width: subWidth, height: subHeight }, this.level + 1);
    this.children[1] = new QuadTree({ x: x, y: y, width: subWidth, height: subHeight }, this.level + 1);
    this.children[2] = new QuadTree({ x: x, y: y + subHeight, width: subWidth, height: subHeight }, this.level + 1);
    this.children[3] = new QuadTree({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, this.level + 1);
  }
  
  getIndex(bounds: Rectangle): number {
    let index = -1;
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;
    
    const topQuad = bounds.y < horizontalMidpoint && bounds.y + bounds.height < horizontalMidpoint;
    const bottomQuad = bounds.y > horizontalMidpoint;
    
    if (bounds.x < verticalMidpoint && bounds.x + bounds.width < verticalMidpoint) {
      if (topQuad) index = 1;
      else if (bottomQuad) index = 2;
    } else if (bounds.x > verticalMidpoint) {
      if (topQuad) index = 0;
      else if (bottomQuad) index = 3;
    }
    
    return index;
  }
  
  insert(obj: GameObject) {
    if (this.children.length > 0) {
      const index = this.getIndex(obj.getBounds());
      if (index !== -1) {
        this.children[index].insert(obj);
        return;
      }
    }
    
    this.objects.push(obj);
    
    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (this.children.length === 0) {
        this.split();
      }
      
      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i].getBounds());
        if (index !== -1) {
          this.children[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }
  
  retrieve(bounds: Rectangle): GameObject[] {
    const returnObjects: GameObject[] = [];
    const index = this.getIndex(bounds);
    
    if (index !== -1 && this.children.length > 0) {
      returnObjects.push(...this.children[index].retrieve(bounds));
    }
    
    returnObjects.push(...this.objects);
    return returnObjects;
  }
}

// Uso para collision detection eficiente
class CollisionSystem {
  private quadTree: QuadTree;
  
  update(entities: GameObject[]) {
    // Reconstrói quadtree a cada frame
    this.quadTree.clear();
    
    for (const entity of entities) {
      this.quadTree.insert(entity);
    }
    
    // Verifica colisões só entre objetos próximos
    for (const entity of entities) {
      const nearby = this.quadTree.retrieve(entity.getBounds());
      
      for (const other of nearby) {
        if (entity !== other && this.checkCollision(entity, other)) {
          this.handleCollision(entity, other);
        }
      }
    }
  }
}
```

### 3. **Level of Detail (LOD)**

```typescript
class LODRenderer {
  static renderEnemy(enemy: Enemy, distanceToCamera: number, ctx: CanvasRenderingContext2D) {
    if (distanceToCamera < 200) {
      // High detail: sprite completo + animação
      enemy.renderHighDetail(ctx);
    } else if (distanceToCamera < 500) {
      // Medium detail: sprite simples
      enemy.renderMediumDetail(ctx);
    } else {
      // Low detail: só um pixel colorido
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x, enemy.y, 2, 2);
    }
  }
}
```

### 4. **Batching de Renderização**

```typescript
class SpriteBatcher {
  private batches = new Map<string, { positions: number[]; count: number }>();
  
  add(sprite: string, x: number, y: number) {
    if (!this.batches.has(sprite)) {
      this.batches.set(sprite, { positions: [], count: 0 });
    }
    
    const batch = this.batches.get(sprite)!;
    batch.positions.push(x, y);
    batch.count++;
  }
  
  render(ctx: CanvasRenderingContext2D) {
    for (const [spriteName, batch] of this.batches) {
      const image = AssetManager.getImage(spriteName);
      
      for (let i = 0; i < batch.positions.length; i += 2) {
        const x = batch.positions[i];
        const y = batch.positions[i + 1];
        ctx.drawImage(image, x, y);
      }
    }
    
    this.clear();
  }
  
  clear() {
    for (const batch of this.batches.values()) {
      batch.positions.length = 0;
      batch.count = 0;
    }
  }
}
```

### 5. **Canvas Optimization**

```typescript
class CanvasOptimizer {
  // Usa off-screen canvas para sprites complexos
  static createSpriteCache(width: number, height: number): CanvasRenderingContext2D {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d')!;
  }
  
  // Evita state changes desnecessários
  static setContextState(ctx: CanvasRenderingContext2D, state: any) {
    if (ctx.fillStyle !== state.fillStyle) {
      ctx.fillStyle = state.fillStyle;
    }
    if (ctx.font !== state.font) {
      ctx.font = state.font;
    }
    // ... outras propriedades
  }
  
  // Usa transform ao invés de translate/rotate repetidas
  static renderWithTransform(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, callback: () => void) {
    ctx.save();
    ctx.setTransform(
      Math.cos(rotation), Math.sin(rotation),
      -Math.sin(rotation), Math.cos(rotation),
      x, y
    );
    callback();
    ctx.restore();
  }
}
```

## Otimizações Específicas do SpaceShooter

### 1. **Background Scrolling Otimizado**
```typescript
class OptimizedBackground {
  private layers: BackgroundLayer[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    // Pré-renderiza background em canvas off-screen
    this.canvas = document.createElement('canvas');
    this.canvas.width = gameWidth;
    this.canvas.height = gameHeight * 2; // Double buffer
    this.ctx = this.canvas.getContext('2d')!;
    
    this.generateStarField();
  }
  
  private generateStarField() {
    // Gera uma vez só, reutiliza
    this.ctx.fillStyle = '#000011';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const brightness = Math.random();
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      this.ctx.fillRect(x, y, 1, 1);
    }
  }
  
  render(gameCtx: CanvasRenderingContext2D, scrollY: number) {
    // Só redesenha se necessário
    const sourceY = scrollY % this.canvas.height;
    
    gameCtx.drawImage(
      this.canvas,
      0, sourceY, gameWidth, gameHeight,
      0, 0, gameWidth, gameHeight
    );
  }
}
```

### 2. **Particle System Otimizado**
```typescript
class OptimizedParticleSystem {
  private particles: Float32Array; // Usa typed arrays para performance
  private particleCount = 0;
  private maxParticles = 1000;
  
  // Cada partícula: [x, y, dx, dy, life, maxLife] = 6 floats
  private readonly PARTICLE_SIZE = 6;
  
  constructor() {
    this.particles = new Float32Array(this.maxParticles * this.PARTICLE_SIZE);
  }
  
  spawn(x: number, y: number, dx: number, dy: number, life: number) {
    if (this.particleCount >= this.maxParticles) return;
    
    const index = this.particleCount * this.PARTICLE_SIZE;
    this.particles[index] = x;
    this.particles[index + 1] = y;
    this.particles[index + 2] = dx;
    this.particles[index + 3] = dy;
    this.particles[index + 4] = life;
    this.particles[index + 5] = life;
    
    this.particleCount++;
  }
  
  update(deltaTime: number) {
    let writeIndex = 0;
    
    for (let readIndex = 0; readIndex < this.particleCount * this.PARTICLE_SIZE; readIndex += this.PARTICLE_SIZE) {
      // Update particle
      this.particles[readIndex] += this.particles[readIndex + 2] * deltaTime;     // x += dx
      this.particles[readIndex + 1] += this.particles[readIndex + 3] * deltaTime; // y += dy
      this.particles[readIndex + 4] -= deltaTime;                                 // life -= deltaTime
      
      // Keep alive particles
      if (this.particles[readIndex + 4] > 0) {
        if (writeIndex !== readIndex) {
          // Compact array
          for (let i = 0; i < this.PARTICLE_SIZE; i++) {
            this.particles[writeIndex + i] = this.particles[readIndex + i];
          }
        }
        writeIndex += this.PARTICLE_SIZE;
      }
    }
    
    this.particleCount = writeIndex / this.PARTICLE_SIZE;
  }
  
  render(ctx: CanvasRenderingContext2D) {
    // Batch render all particles with same style
    ctx.fillStyle = '#FFAA44';
    
    for (let i = 0; i < this.particleCount * this.PARTICLE_SIZE; i += this.PARTICLE_SIZE) {
      const x = this.particles[i];
      const y = this.particles[i + 1];
      const life = this.particles[i + 4];
      const maxLife = this.particles[i + 5];
      
      const alpha = life / maxLife;
      const size = 2 * alpha;
      
      if (alpha > 0.1) { // Culling de partículas quase invisíveis
        ctx.globalAlpha = alpha;
        ctx.fillRect(x - size/2, y - size/2, size, size);
      }
    }
    
    ctx.globalAlpha = 1;
  }
}
```

### 3. **Asset Loading Otimizado**
```typescript
class AssetManager {
  private static images = new Map<string, HTMLImageElement>();
  private static sounds = new Map<string, HTMLAudioElement>();
  private static loading = new Set<string>();
  
  static async preloadImages(imageList: string[]) {
    const promises = imageList.map(src => this.loadImage(src));
    await Promise.all(promises);
  }
  
  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.images.has(src)) {
        resolve(this.images.get(src)!);
        return;
      }
      
      if (this.loading.has(src)) {
        // Já está carregando, espera
        const checkLoaded = () => {
          if (this.images.has(src)) {
            resolve(this.images.get(src)!);
          } else {
            setTimeout(checkLoaded, 10);
          }
        };
        checkLoaded();
        return;
      }
      
      this.loading.add(src);
      const img = new Image();
      
      img.onload = () => {
        this.images.set(src, img);
        this.loading.delete(src);
        resolve(img);
      };
      
      img.onerror = () => {
        this.loading.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  }
  
  static getImage(src: string): HTMLImageElement | null {
    return this.images.get(src) || null;
  }
}
```

## Monitoramento Avançado

### Memory Usage Monitor
```typescript
class MemoryMonitor {
  static getMemoryInfo() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  }
  
  static renderMemoryInfo(ctx: CanvasRenderingContext2D) {
    const memory = this.getMemoryInfo();
    if (memory) {
      ctx.fillStyle = '#FF00FF';
      ctx.font = '12px monospace';
      ctx.fillText(`Memory: ${memory.used}MB / ${memory.total}MB`, 10, 200);
    }
  }
}
```

### Performance Budget
```typescript
class PerformanceBudget {
  private static budgets = {
    update: 8,    // 8ms para update (60fps = 16.67ms total)
    render: 6,    // 6ms para render
    audio: 1,     // 1ms para audio
    input: 0.5    // 0.5ms para input
  };
  
  static checkBudget(phase: string, actualTime: number) {
    const budget = this.budgets[phase as keyof typeof this.budgets];
    
    if (actualTime > budget) {
      console.warn(`Performance budget exceeded: ${phase} took ${actualTime.toFixed(2)}ms (budget: ${budget}ms)`);
    }
  }
}

// Uso no game loop:
const startTime = performance.now();
game.update(deltaTime);
PerformanceBudget.checkBudget('update', performance.now() - startTime);
```

## Checklist de Otimização

### ✅ **Básico (Sempre Faça)**
- [ ] Object Pooling para bullets/particles
- [ ] View frustum culling
- [ ] Evitar criação de objetos no game loop
- [ ] Pré-calcular valores constantes

### ✅ **Intermediário**
- [ ] QuadTree para collision detection
- [ ] Sprite batching
- [ ] LOD para objetos distantes
- [ ] Background pré-renderizado

### ✅ **Avançado**
- [ ] Typed arrays para dados numéricos
- [ ] Web Workers para IA/physics pesadas
- [ ] OffscreenCanvas
- [ ] WebGL para efeitos visuais

## Ferramentas de Debug

### 1. **Performance Overlay**
```typescript
class PerformanceOverlay {
  static render(ctx: CanvasRenderingContext2D) {
    // FPS
    PerformanceMonitor.render(ctx);
    
    // Profiler stats
    Profiler.renderStats(ctx);
    
    // Memory usage
    MemoryMonitor.renderMemoryInfo(ctx);
    
    // Object counts
    const stats = PoolManager.getStats();
    let y = 250;
    ctx.fillStyle = '#00FFFF';
    ctx.font = '12px monospace';
    
    for (const [poolName, poolStats] of Object.entries(stats)) {
      ctx.fillText(`${poolName}: ${poolStats.active}`, 10, y);
      y += 15;
    }
  }
}
```

### 2. **Performance Recording**
```typescript
class PerformanceRecorder {
  private static recording = false;
  private static data: any[] = [];
  
  static startRecording() {
    this.recording = true;
    this.data = [];
  }
  
  static record(frameData: any) {
    if (this.recording) {
      this.data.push({
        timestamp: performance.now(),
        ...frameData
      });
    }
  }
  
  static stopRecording() {
    this.recording = false;
    
    // Analisa dados
    const avgFps = this.data.reduce((sum, frame) => sum + frame.fps, 0) / this.data.length;
    const minFps = Math.min(...this.data.map(frame => frame.fps));
    
    console.log(`Recording Results:
      Average FPS: ${avgFps.toFixed(2)}
      Minimum FPS: ${minFps}
      Frame drops: ${this.data.filter(frame => frame.fps < 55).length}
      Total frames: ${this.data.length}
    `);
    
    return this.data;
  }
}
```

## Exercícios Práticos

1. **Implemente FPS counter** - Monitore performance atual
2. **Adicione view culling** - Não renderize objetos fora da tela
3. **Otimize collision detection** - Use spatial partitioning
4. **Profile seu código** - Identifique gargalos
5. **Implemente object pooling** - Para todos os objetos temporários

## Próximos Passos

1. **Meça** performance atual do seu jogo
2. **Identifique** os maiores gargalos
3. **Implemente** otimizações uma por vez
4. **Teste** impacto de cada otimização
5. **Leia** sobre Input Handling (próximo artigo)

---
*Performance não é sobre micro-otimizações - é sobre arquitetura inteligente!*