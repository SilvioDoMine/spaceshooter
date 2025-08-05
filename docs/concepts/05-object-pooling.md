# Object Pooling para Performance

## O que é Object Pooling?

Object Pooling é uma técnica onde você **reutiliza objetos** ao invés de criar/destruir constantemente. É essencial em games onde você tem muitos objetos temporários (projéteis, explosões, partículas).

## Por que é Crucial no Seu SpaceShooter?

### Problema: Garbage Collection Hell
```typescript
// ❌ PROBLEMA: Cria/destrói objetos constantemente
class Game {
  bullets: Bullet[] = [];
  
  shoot() {
    // Cria novo objeto TODA VEZ que atira
    this.bullets.push(new Bullet(player.x, player.y, -5));
  }
  
  update() {
    this.bullets = this.bullets.filter(bullet => {
      if (bullet.y < 0) {
        // Objeto é coletado pelo Garbage Collector
        return false; // Remove da array
      }
      return true;
    });
  }
}

// Resultado: Com 60fps e atirando 10x/segundo:
// - 600 objetos criados por segundo
// - 600 objetos destruídos por segundo
// - Garbage Collector ativa constantemente
// - Frame drops e stuttering
```

### Solução: Object Pool
```typescript
// ✅ SOLUÇÃO: Reutiliza objetos
class BulletPool {
  private available: Bullet[] = [];
  private active: Bullet[] = [];
  
  constructor(size: number) {
    // Cria objetos UMA VEZ no início
    for (let i = 0; i < size; i++) {
      this.available.push(new Bullet());
    }
  }
  
  get(): Bullet | null {
    if (this.available.length === 0) return null;
    
    const bullet = this.available.pop()!;
    this.active.push(bullet);
    return bullet;
  }
  
  release(bullet: Bullet) {
    const index = this.active.indexOf(bullet);
    if (index > -1) {
      this.active.splice(index, 1);
      bullet.reset(); // Limpa estado
      this.available.push(bullet);
    }
  }
  
  getActive(): Bullet[] {
    return this.active;
  }
}
```

## Implementação Genérica para Seu Jogo

### Pool Genérico Reutilizável
```typescript
interface Poolable {
  reset(): void;           // Limpa o estado do objeto
  isActive(): boolean;     // Ainda está sendo usado?
}

class ObjectPool<T extends Poolable> {
  private available: T[] = [];
  private active: T[] = [];
  private createFn: () => T;
  
  constructor(createFunction: () => T, initialSize: number = 50) {
    this.createFn = createFunction;
    
    // Pré-aloca objetos
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }
  
  get(): T | null {
    // Tenta reutilizar objeto existente
    if (this.available.length > 0) {
      const obj = this.available.pop()!;
      this.active.push(obj);
      return obj;
    }
    
    // Se pool vazio, cria novo (ou retorna null se preferir)
    console.warn('Pool exhausted, creating new object');
    const newObj = this.createFn();
    this.active.push(newObj);
    return newObj;
  }
  
  release(obj: T) {
    const index = this.active.indexOf(obj);
    if (index > -1) {
      this.active.splice(index, 1);
      obj.reset();
      this.available.push(obj);
    }
  }
  
  update() {
    // Remove objetos inativos automaticamente
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obj = this.active[i];
      if (!obj.isActive()) {
        this.release(obj);
      }
    }
  }
  
  getActive(): T[] {
    return this.active;
  }
  
  getStats(): { active: number; available: number; total: number } {
    return {
      active: this.active.length,
      available: this.available.length,
      total: this.active.length + this.available.length
    };
  }
}
```

## Objetos Pooláveis do Seu SpaceShooter

### 1. **Bullet (Projétil)**
```typescript
class Bullet implements Poolable {
  x = 0;
  y = 0;
  dx = 0;
  dy = 0;
  damage = 0;
  sprite = '';
  active = false;
  timeToLive = 0; // Tempo até expirar
  
  init(x: number, y: number, dx: number, dy: number, damage: number = 25) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.damage = damage;
    this.active = true;
    this.timeToLive = 3000; // 3 segundos
  }
  
  update(deltaTime: number) {
    if (!this.active) return;
    
    this.x += this.dx * deltaTime;
    this.y += this.dy * deltaTime;
    this.timeToLive -= deltaTime;
    
    // Remove se sair da tela ou expirar
    if (this.y < -50 || this.y > canvas.height + 50 || 
        this.x < -50 || this.x > canvas.width + 50 ||
        this.timeToLive <= 0) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(this.x - 2, this.y - 8, 4, 16);
  }
  
  // Interface Poolable
  reset() {
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.damage = 0;
    this.active = false;
    this.timeToLive = 0;
  }
  
  isActive(): boolean {
    return this.active;
  }
  
  getBounds(): Rectangle {
    return {
      x: this.x - 2,
      y: this.y - 8,
      width: 4,
      height: 16
    };
  }
}
```

### 2. **Explosion (Explosão)**
```typescript
class Explosion implements Poolable {
  x = 0;
  y = 0;
  scale = 0;
  maxScale = 1;
  active = false;
  animationSpeed = 0;
  currentFrame = 0;
  totalFrames = 8;
  
  init(x: number, y: number, scale: number = 1) {
    this.x = x;
    this.y = y;
    this.maxScale = scale;
    this.scale = 0;
    this.active = true;
    this.currentFrame = 0;
    this.animationSpeed = 15; // frames por segundo
  }
  
  update(deltaTime: number) {
    if (!this.active) return;
    
    // Anima expansão
    this.scale = Math.min(this.maxScale, this.scale + deltaTime * 2);
    
    // Anima frames
    this.currentFrame += this.animationSpeed * deltaTime / 1000;
    
    if (this.currentFrame >= this.totalFrames) {
      this.active = false;
    }
  }
  
  render(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    
    const frame = Math.floor(this.currentFrame);
    const alpha = 1 - (this.currentFrame / this.totalFrames);
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    
    // Desenha círculos concêntricos simulando explosão
    for (let i = 0; i < 3; i++) {
      const radius = (frame + i) * 5;
      const intensity = 1 - i * 0.3;
      
      ctx.fillStyle = `rgba(255, ${255 - i * 50}, 0, ${intensity * alpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  reset() {
    this.x = 0;
    this.y = 0;
    this.scale = 0;
    this.maxScale = 1;
    this.active = false;
    this.currentFrame = 0;
  }
  
  isActive(): boolean {
    return this.active;
  }
}
```

### 3. **Particle (Partícula)**
```typescript
class Particle implements Poolable {
  x = 0;
  y = 0;
  dx = 0;
  dy = 0;
  life = 0;
  maxLife = 0;
  color = '#FFFFFF';
  size = 1;
  active = false;
  
  init(x: number, y: number, angle: number, speed: number, life: number, color: string = '#FFFFFF') {
    this.x = x;
    this.y = y;
    this.dx = Math.cos(angle) * speed;
    this.dy = Math.sin(angle) * speed;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = Math.random() * 3 + 1;
    this.active = true;
  }
  
  update(deltaTime: number) {
    if (!this.active) return;
    
    this.x += this.dx * deltaTime;
    this.y += this.dy * deltaTime;
    this.life -= deltaTime;
    
    // Fade out
    if (this.life <= 0) {
      this.active = false;
    }
    
    // Gravity effect
    this.dy += 100 * deltaTime / 1000; // pixels/s²
  }
  
  render(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    
    const alpha = this.life / this.maxLife;
    const size = this.size * alpha;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - size/2, this.y - size/2, size, size);
    ctx.restore();
  }
  
  reset() {
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.active = false;
  }
  
  isActive(): boolean {
    return this.active;
  }
}
```

## Pool Manager Centralizado

```typescript
class PoolManager {
  private static pools = new Map<string, ObjectPool<any>>();
  
  static createPool<T extends Poolable>(
    name: string, 
    createFn: () => T, 
    initialSize: number = 50
  ) {
    this.pools.set(name, new ObjectPool(createFn, initialSize));
  }
  
  static getPool<T extends Poolable>(name: string): ObjectPool<T> | null {
    return this.pools.get(name) || null;
  }
  
  static get<T extends Poolable>(poolName: string): T | null {
    const pool = this.getPool<T>(poolName);
    return pool ? pool.get() : null;
  }
  
  static release<T extends Poolable>(poolName: string, obj: T) {
    const pool = this.getPool<T>(poolName);
    pool?.release(obj);
  }
  
  static updateAll() {
    for (const pool of this.pools.values()) {
      pool.update();
    }
  }
  
  static getStats(): { [poolName: string]: any } {
    const stats: any = {};
    for (const [name, pool] of this.pools.entries()) {
      stats[name] = pool.getStats();
    }
    return stats;
  }
  
  static init() {
    // Inicializa todos os pools do jogo
    this.createPool('bullets', () => new Bullet(), 100);
    this.createPool('explosions', () => new Explosion(), 20);
    this.createPool('particles', () => new Particle(), 200);
    this.createPool('enemyBullets', () => new EnemyBullet(), 50);
    this.createPool('powerUps', () => new PowerUp(), 10);
  }
}
```

## Usando os Pools no Seu Jogo

### Sistema de Projéteis
```typescript
class WeaponSystem {
  static shoot(x: number, y: number, direction: number = -1) {
    const bullet = PoolManager.get<Bullet>('bullets');
    if (bullet) {
      bullet.init(x, y, 0, direction * 300, 25); // 300 pixels/s
      AudioManager.playSound('shoot');
    } else {
      console.warn('Bullet pool exhausted!');
    }
  }
  
  static update(deltaTime: number) {
    const bulletPool = PoolManager.getPool<Bullet>('bullets');
    if (bulletPool) {
      bulletPool.getActive().forEach(bullet => bullet.update(deltaTime));
    }
  }
  
  static render(ctx: CanvasRenderingContext2D) {
    const bulletPool = PoolManager.getPool<Bullet>('bullets');
    if (bulletPool) {
      bulletPool.getActive().forEach(bullet => bullet.render(ctx));
    }
  }
}
```

### Sistema de Explosões
```typescript
class ExplosionSystem {
  static createExplosion(x: number, y: number, scale: number = 1) {
    const explosion = PoolManager.get<Explosion>('explosions');
    if (explosion) {
      explosion.init(x, y, scale);
      AudioManager.playSound('explosion');
      
      // Cria partículas também
      this.createParticles(x, y, 15);
    }
  }
  
  static createParticles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const particle = PoolManager.get<Particle>('particles');
      if (particle) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = Math.random() * 200 + 100;
        const life = Math.random() * 1000 + 500;
        const colors = ['#FF4444', '#FF8844', '#FFAA44', '#FFFF44'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particle.init(x, y, angle, speed, life, color);
      }
    }
  }
  
  static update(deltaTime: number) {
    const explosionPool = PoolManager.getPool<Explosion>('explosions');
    const particlePool = PoolManager.getPool<Particle>('particles');
    
    explosionPool?.getActive().forEach(explosion => explosion.update(deltaTime));
    particlePool?.getActive().forEach(particle => particle.update(deltaTime));
  }
  
  static render(ctx: CanvasRenderingContext2D) {
    const explosionPool = PoolManager.getPool<Explosion>('explosions');
    const particlePool = PoolManager.getPool<Particle>('particles');
    
    explosionPool?.getActive().forEach(explosion => explosion.render(ctx));
    particlePool?.getActive().forEach(particle => particle.render(ctx));
  }
}
```

## Setup no Game Loop

```typescript
class Game {
  constructor() {
    // Inicializa pools uma única vez
    PoolManager.init();
  }
  
  update(deltaTime: number) {
    // Atualiza todos os pools automaticamente
    PoolManager.updateAll();
    
    // Sistemas específicos
    WeaponSystem.update(deltaTime);
    ExplosionSystem.update(deltaTime);
  }
  
  render(ctx: CanvasRenderingContext2D) {
    WeaponSystem.render(ctx);
    ExplosionSystem.render(ctx);
  }
  
  // Debug: Mostra estatísticas dos pools
  showPoolStats() {
    const stats = PoolManager.getStats();
    console.table(stats);
  }
}
```

## Profiling e Otimização

### Debug Overlay
```typescript
class DebugRenderer {
  static renderPoolStats(ctx: CanvasRenderingContext2D) {
    const stats = PoolManager.getStats();
    let y = 10;
    
    ctx.fillStyle = '#00FF00';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    
    for (const [poolName, poolStats] of Object.entries(stats)) {
      const text = `${poolName}: ${poolStats.active}/${poolStats.total}`;
      ctx.fillText(text, 10, y);
      y += 15;
    }
  }
}
```

### Monitoramento de Performance
```typescript
class PerformanceMonitor {
  private static frameCount = 0;
  private static lastTime = 0;
  private static fps = 0;
  
  static update(timestamp: number) {
    this.frameCount++;
    
    if (timestamp - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = timestamp;
      
      // Log estatísticas a cada segundo
      console.log(`FPS: ${this.fps}`, PoolManager.getStats());
    }
  }
}
```

## Pegadinhas Comuns

❌ **Pool muito pequeno**
```typescript
// Pool de 10 bullets para jogo que dispara 20/segundo = problemas!
this.createPool('bullets', () => new Bullet(), 10);
```

❌ **Esquecer de resetar estado**
```typescript
reset() {
  // ❌ Esqueceu de limpar arrays internas ou referencias
  this.targets = []; // ✅ Limpe tudo!
}
```

❌ **Pool infinito**
```typescript
get(): T {
  if (this.available.length === 0) {
    return this.createFn(); // ❌ Pode causar memory leak
  }
  // ✅ Retorne null ou tenha limite máximo
}
```

## Dicas de Tamanho de Pool

- **Bullets**: 50-200 (dependendo da cadência de tiro)
- **Particles**: 100-500 (muitas partículas = visual melhor)
- **Explosions**: 10-30 (poucas explosões simultâneas)
- **Enemies**: 20-50 (poucos inimigos ativos)

## Exercícios Práticos

1. **Implemente BulletPool** - Substitua criação manual
2. **Adicione ExplosionPool** - Efeitos visuais pooled
3. **Crie sistema de partículas** - Para juice visual
4. **Meça performance** - Antes/depois do pooling

## Próximos Passos

1. **Identifique** objetos temporários no seu jogo
2. **Implemente** pools para os mais críticos (bullets primeiro)
3. **Meça** impacto na performance
4. **Expanda** para outros objetos conforme necessário
5. **Leia** sobre Performance Optimization (próximo artigo)

---
*Object Pooling é o primeiro passo para performance profissional em games!*