/**
 * ParticleSystem - Sistema de partículas para efeitos visuais
 * Gerencia criação e animação de partículas para explosões e outros efeitos
 */

import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

export interface ParticleConfig {
  count: number;
  lifetime: number;
  speed: { min: number; max: number };
  size: { min: number; max: number };
  color: { start: THREE.Color; end: THREE.Color };
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  createdAt: number;
  lifetime: number;
  initialSize: number;
  
  // Lifecycle management
  get isDead(): boolean;
  reset(config: ParticleConfig, position: THREE.Vector3): void;
}

export class ParticleImpl implements Particle {
  mesh!: THREE.Mesh;
  velocity!: THREE.Vector3;
  createdAt!: number;
  lifetime!: number;
  initialSize!: number;
  
  constructor(geometry: THREE.BufferGeometry) {
    this.mesh = new THREE.Mesh(geometry);
    this.velocity = new THREE.Vector3();
  }
  
  get isDead(): boolean {
    return (performance.now() - this.createdAt) > this.lifetime;
  }
  
  reset(config: ParticleConfig, position: THREE.Vector3): void {
    this.createdAt = performance.now();
    this.lifetime = config.lifetime;
    this.initialSize = Math.random() * (config.size.max - config.size.min) + config.size.min;
    
    // Reset position
    this.mesh.position.copy(position);
    
    // Reset velocity
    const speed = Math.random() * (config.speed.max - config.speed.min) + config.speed.min;
    const angle = Math.random() * Math.PI * 2;
    this.velocity.set(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      0
    );
    
    // Reset scale
    this.mesh.scale.setScalar(this.initialSize);
    
    // Reset color
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.color.copy(config.color.start);
    material.opacity = 1.0;
  }
}

export class ParticleSystem {
  private activeParticles: Set<Particle> = new Set();
  private particlePool: Particle[] = [];
  private scene!: THREE.Scene;
  private particleGeometry!: THREE.SphereGeometry;
  
  // State management
  private isActive: boolean = false;
  private readonly POOL_SIZE = 50; // Pre-allocate particles
  
  // Configurações pré-definidas para diferentes tipos de efeitos
  private static readonly EXPLOSION_CONFIG: ParticleConfig = {
    count: 15,
    lifetime: 1000, // 1 segundo
    speed: { min: 2, max: 6 },
    size: { min: 0.05, max: 0.15 },
    color: { 
      start: new THREE.Color(0xff4400), // Laranja
      end: new THREE.Color(0x880000)    // Vermelho escuro
    }
  };

  private static readonly HIT_CONFIG: ParticleConfig = {
    count: 8,
    lifetime: 500, // 0.5 segundos
    speed: { min: 1, max: 3 },
    size: { min: 0.03, max: 0.08 },
    color: { 
      start: new THREE.Color(0xffff00), // Amarelo
      end: new THREE.Color(0xff8800)    // Laranja
    }
  };

  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }
  
  private initialize(scene: THREE.Scene): void {
    this.scene = scene;
    // Geometria reutilizada para todas as partículas
    this.particleGeometry = new THREE.SphereGeometry(1, 8, 6);
    
    // Pre-allocate particle pool
    this.createParticlePool();
    
    // Setup state listeners
    this.setupStateListeners();
    
    // Notificar que ParticleSystem está pronto
    this.eventBus.emit('particles:ready', {});
  }
  
  private createParticlePool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const particle = new ParticleImpl(this.particleGeometry);
      // Create material for each particle
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 1.0
      });
      particle.mesh.material = material;
      this.particlePool.push(particle);
    }
  }
  
  private setupStateListeners(): void {
    this.eventBus.on('game:started', () => this.activate());
    this.eventBus.on('game:paused', () => this.deactivate());
    this.eventBus.on('game:resumed', () => this.activate());
    this.eventBus.on('game:over', () => this.deactivate());
    this.eventBus.on('game:exit', () => this.deactivate());
  }
  
  private activate(): void {
    this.isActive = true;
    console.log('ParticleSystem activated');
  }
  
  private deactivate(): void {
    this.isActive = false;
    console.log('ParticleSystem deactivated');
  }

  private setupEventListeners(): void {
    this.eventBus.on('renderer:ready', (data) => {
      this.initialize(data.scene);
    });
    
    this.eventBus.on('particles:explosion', (data) => {
      const position = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
      this.createExplosion(position);
    });
    
    this.eventBus.on('particles:hit', (data) => {
      const position = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
      this.createHitEffect(position);
    });
    
    this.eventBus.on('particles:update', (data) => {
      this.update(data.deltaTime);
    });
    
    this.eventBus.on('particles:clear', () => {
      this.clear();
    });
    
    this.eventBus.on('particles:debug-stats', () => {
      const stats = this.getStats();
      console.log(`🎆 Particles: ${stats.active} active, ${stats.pooled} pooled, ${stats.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });
  }

  /**
   * Cria um efeito de explosão na posição especificada
   */
  createExplosion(position: THREE.Vector3): void {
    this.createParticleEffect(position, ParticleSystem.EXPLOSION_CONFIG);
  }

  /**
   * Cria um efeito de hit/impacto na posição especificada
   */
  createHitEffect(position: THREE.Vector3): void {
    this.createParticleEffect(position, ParticleSystem.HIT_CONFIG);
  }

  /**
   * Cria um efeito de partículas personalizado
   */
  createParticleEffect(position: THREE.Vector3, config: ParticleConfig): void {
    if (!this.isActive) {
      return; // Don't create particles when inactive
    }
    
    for (let i = 0; i < config.count; i++) {
      // Get particle from pool
      const particle = this.getParticleFromPool();
      if (!particle) {
        console.warn('Particle pool exhausted');
        break;
      }
      
      // Add small random offset to position
      const offsetPosition = position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      ));
      
      // Reset particle with new config
      particle.reset(config, offsetPosition);
      
      // Add to scene and active particles
      this.scene.add(particle.mesh);
      this.activeParticles.add(particle);
    }
  }
  
  /**
   * Get particle from pool or create new one if pool is empty
   */
  private getParticleFromPool(): Particle | null {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    
    // Pool exhausted, create new particle (emergency fallback)
    console.warn('Creating new particle - pool exhausted');
    const particle = new ParticleImpl(this.particleGeometry);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1.0
    });
    particle.mesh.material = material;
    return particle;
  }
  
  /**
   * Return particle to pool
   */
  private returnParticleToPool(particle: Particle): void {
    // Remove from scene
    this.scene.remove(particle.mesh);
    
    // Reset material opacity
    const material = particle.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 1.0;
    
    // Return to pool
    this.particlePool.push(particle);
    
    // Remove from active particles
    this.activeParticles.delete(particle);
  }

  /**
   * Atualiza todas as partículas ativas com early exit e lifecycle-aware updates
   * Deve ser chamado a cada frame
   */
  update(deltaTime: number): void {
    // Early exit if inactive or no particles
    if (!this.isActive || this.activeParticles.size === 0) {
      return;
    }

    const particlesToRemove: Particle[] = [];

    this.activeParticles.forEach(particle => {
      // Use built-in isDead check
      if (particle.isDead) {
        particlesToRemove.push(particle);
        return;
      }

      // Calculate normalized age
      const age = performance.now() - particle.createdAt;
      const normalizedAge = age / particle.lifetime;

      // Atualizar posição
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );

      // Atualizar escala (diminui com o tempo)
      const scaleMultiplier = 1 - normalizedAge * 0.5;
      particle.mesh.scale.setScalar(particle.initialSize * scaleMultiplier);

      // Atualizar cor e transparência
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      
      // Interpolação de cor
      const startColor = ParticleSystem.EXPLOSION_CONFIG.color.start;
      const endColor = ParticleSystem.EXPLOSION_CONFIG.color.end;
      material.color.lerpColors(startColor, endColor, normalizedAge);
      
      // Fade out
      material.opacity = 1 - normalizedAge;

      // Adicionar rotação aleatória
      particle.mesh.rotation.x += 0.1 * deltaTime;
      particle.mesh.rotation.y += 0.1 * deltaTime;
    });

    // Remover partículas expiradas e retornar ao pool
    particlesToRemove.forEach(particle => {
      this.returnParticleToPool(particle);
    });
  }

  /**
   * Limpa todas as partículas ativas e retorna ao pool
   */
  clear(): void {
    const particlesToClear = Array.from(this.activeParticles);
    particlesToClear.forEach(particle => {
      this.returnParticleToPool(particle);
    });
  }

  /**
   * Libera recursos do sistema
   */
  dispose(): void {
    this.clear();
    
    // Dispose all pooled particles
    this.particlePool.forEach(particle => {
      if (particle.mesh.material instanceof THREE.Material) {
        particle.mesh.material.dispose();
      }
    });
    this.particlePool.clear();
    
    this.particleGeometry.dispose();
  }

  /**
   * Retorna estatísticas do sistema de partículas
   */
  getStats(): { active: number; pooled: number; total: number; isActive: boolean } {
    return {
      active: this.activeParticles.size,
      pooled: this.particlePool.length,
      total: this.activeParticles.size + this.particlePool.length,
      isActive: this.isActive
    };
  }
  
  /**
   * Retorna o número de partículas ativas
   */
  getActiveParticleCount(): number {
    return this.activeParticles.size;
  }

  /**
   * Gera número aleatório entre min e max
   */
  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}