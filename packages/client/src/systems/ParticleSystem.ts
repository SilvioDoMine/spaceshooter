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
}

export class ParticleSystem {
  private particles: Set<Particle> = new Set();
  private scene: THREE.Scene;
  private particleGeometry: THREE.SphereGeometry;
  
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
    
    // Notificar que ParticleSystem está pronto
    this.eventBus.emit('particles:ready', {});
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
    const currentTime = Date.now();

    for (let i = 0; i < config.count; i++) {
      // Criar material individual para cada partícula
      const material = new THREE.MeshBasicMaterial({
        color: config.color.start.clone(),
        transparent: true,
        opacity: 1
      });

      // Criar mesh da partícula
      const mesh = new THREE.Mesh(this.particleGeometry, material);
      
      // Tamanho aleatório
      const size = this.randomBetween(config.size.min, config.size.max);
      mesh.scale.setScalar(size);
      
      // Posição inicial
      mesh.position.copy(position);
      
      // Velocidade aleatória em direção esférica
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      
      const speed = this.randomBetween(config.speed.min, config.speed.max);
      velocity.multiplyScalar(speed);

      // Criar partícula
      const particle: Particle = {
        mesh,
        velocity,
        createdAt: currentTime,
        lifetime: config.lifetime,
        initialSize: size
      };

      // Adicionar à cena e rastreamento
      this.scene.add(mesh);
      this.particles.add(particle);
    }
  }

  /**
   * Atualiza todas as partículas ativas
   * Deve ser chamado a cada frame
   */
  update(deltaTime: number): void {
    const currentTime = Date.now();
    const particlesToRemove: Particle[] = [];

    this.particles.forEach(particle => {
      const age = currentTime - particle.createdAt;
      const normalizedAge = age / particle.lifetime;

      // Verificar se partícula expirou
      if (normalizedAge >= 1) {
        particlesToRemove.push(particle);
        return;
      }

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

    // Remover partículas expiradas
    particlesToRemove.forEach(particle => {
      this.scene.remove(particle.mesh);
      
      // Limpar material para evitar vazamentos de memória
      if (particle.mesh.material instanceof THREE.Material) {
        particle.mesh.material.dispose();
      }
      
      this.particles.delete(particle);
    });
  }

  /**
   * Limpa todas as partículas ativas
   */
  clear(): void {
    this.particles.forEach(particle => {
      this.scene.remove(particle.mesh);
      if (particle.mesh.material instanceof THREE.Material) {
        particle.mesh.material.dispose();
      }
    });
    this.particles.clear();
  }

  /**
   * Libera recursos do sistema
   */
  dispose(): void {
    this.clear();
    this.particleGeometry.dispose();
  }

  /**
   * Retorna o número de partículas ativas
   */
  getActiveParticleCount(): number {
    return this.particles.size;
  }

  /**
   * Gera número aleatório entre min e max
   */
  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}