import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { RenderingSystem } from './RenderingSystem';
import { WorldBounds, DEFAULT_WORLD_BOUNDS } from '@spaceshooter/shared';

interface Star {
  mesh: THREE.Mesh;
  speed: number;
  layer: number;
}

export class BackgroundSystem {
  private eventBus: EventBus;
  private stars: Star[] = [];
  private renderingSystem?: RenderingSystem;
  private baseScrollSpeed: number = 2;
  private starField?: THREE.Group;
  private worldBounds: WorldBounds;
  private backgroundSize: { width: number; height: number };

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.worldBounds = { ...DEFAULT_WORLD_BOUNDS };
    
    // Create a background that's 3x larger than the world bounds
    this.backgroundSize = {
      width: this.worldBounds.width * 3,
      height: this.worldBounds.height * 3
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('renderer:ready', () => {
      this.initializeStarField();
    });
  }

  public setRenderingSystem(renderingSystem: RenderingSystem): void {
    this.renderingSystem = renderingSystem;
  }

  private initializeStarField(): void {
    if (!this.renderingSystem) return;

    this.starField = new THREE.Group();
    this.createExtendedStarField();
    this.renderingSystem.addToScene(this.starField);

    console.log('✅ Extended star field initialized', {
      worldBounds: this.worldBounds,
      backgroundSize: this.backgroundSize
    });
  }

  private createExtendedStarField(): void {
    if (!this.starField) return;

    // Create stationary stars that cover the extended background area
    // Background extends beyond world bounds so camera can see outside the playable area
    
    // Create multiple layers at different depths
    this.createStaticStarLayer(300, 0.15, -50, 0.1); // Far distant stars
    this.createStaticStarLayer(200, 0.1, -30, 0.3);  // Medium distant stars  
    this.createStaticStarLayer(150, 0.08, -20, 0.5); // Closer stars
    
    // Add nebula-like background elements
    this.createNebulaBackground();
  }

  private createStaticStarLayer(count: number, baseSize: number, zPosition: number, layerIndex: number): void {
    if (!this.starField) return;

    for (let i = 0; i < count; i++) {
      // Create stars with size variation based on distance
      const size = baseSize + (Math.random() * 0.03);
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      
      // Star colors
      const starColors = [0xffffee, 0xeeeeff, 0xffeeee, 0xeeffee, 0xffffff, 0xeef4ff];
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      
      // Opacity based on distance
      const distanceFactor = Math.abs(zPosition) / 50;
      const opacity = Math.max(0.3, 0.9 - (distanceFactor * 0.3));
      
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: opacity
      });
      
      const star = new THREE.Mesh(geometry, material);
      
      // Position stars across the extended background area
      const halfBgWidth = this.backgroundSize.width / 2;
      const halfBgHeight = this.backgroundSize.height / 2;
      
      star.position.set(
        (Math.random() - 0.5) * this.backgroundSize.width,
        (Math.random() - 0.5) * this.backgroundSize.height,
        zPosition + (Math.random() - 0.5) * 2
      );
      
      // Slight scale variation
      const scale = 0.8 + Math.random() * 0.4;
      star.scale.setScalar(scale);
      
      this.starField.add(star);
      this.stars.push({
        mesh: star,
        speed: 0, // Static stars don't move
        layer: Math.floor(zPosition)
      });
    }
  }

  private createNebulaBackground(): void {
    if (!this.starField) return;
    
    // Create a few large, subtle nebula-like background elements
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.PlaneGeometry(20, 15);
      
      // Create gradient texture for nebula effect
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d')!;
      
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      const colors = ['#001122', '#000835', '#001155', '#000011'];
      const nebulaColor = colors[Math.floor(Math.random() * colors.length)];
      gradient.addColorStop(0, nebulaColor);
      gradient.addColorStop(1, 'transparent');
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.1 + Math.random() * 0.1,
        blending: THREE.AdditiveBlending
      });
      
      const nebula = new THREE.Mesh(geometry, material);
      
      nebula.position.set(
        (Math.random() - 0.5) * this.backgroundSize.width,
        (Math.random() - 0.5) * this.backgroundSize.height,
        -60 - Math.random() * 10
      );
      
      nebula.rotation.z = Math.random() * Math.PI * 2;
      
      this.starField.add(nebula);
    }
  }

  public update(deltaTime: number): void {
    if (this.stars.length === 0) return;

    // Only update star twinkling effect - no movement since stars are static
    this.stars.forEach((star) => {
      // Subtle twinkling effect for distant stars
      if (star.mesh.material instanceof THREE.MeshBasicMaterial && star.layer < -25) {
        const time = Date.now() * 0.0003; // Slow twinkling
        const distanceFactor = Math.abs(star.layer) / 50;
        const baseOpacity = Math.max(0.3, 0.9 - (distanceFactor * 0.3));
        const twinkle = baseOpacity + 0.15 * Math.sin(time + star.mesh.position.x * 0.05 + star.mesh.position.y * 0.03);
        star.mesh.material.opacity = Math.max(0.2, twinkle);
      }
    });
  }

  public setScrollSpeed(speed: number): void {
    this.baseScrollSpeed = speed;
  }

  /**
   * Update world bounds and regenerate background if necessary
   */
  public setWorldBounds(bounds: WorldBounds): void {
    this.worldBounds = { ...bounds };
    this.backgroundSize = {
      width: this.worldBounds.width * 3,
      height: this.worldBounds.height * 3
    };
    
    console.log('🌌 Background updated for new world bounds:', this.worldBounds);
  }

  /**
   * Get current world bounds
   */
  public getWorldBounds(): WorldBounds {
    return { ...this.worldBounds };
  }

  public dispose(): void {
    this.stars.forEach((star) => {
      if (star.mesh.geometry) star.mesh.geometry.dispose();
      if (star.mesh.material instanceof THREE.Material) {
        star.mesh.material.dispose();
      }
    });

    if (this.starField && this.renderingSystem) {
      this.renderingSystem.removeFromScene(this.starField);
    }

    this.stars = [];
  }
}