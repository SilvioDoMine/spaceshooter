import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { RenderingSystem } from './RenderingSystem';

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

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
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
    this.createProceduralStars();
    this.renderingSystem.addToScene(this.starField);

    console.log('✅ Procedural star field initialized');
  }

  private createProceduralStars(): void {
    if (!this.starField) return;

    // Criar camadas com foco na profundidade e horizonte
    this.createDistantStarLayer(150, 0.15, -50, 0.1); // Estrelas muito distantes, pequenas no horizonte
    this.createDistantStarLayer(80, 0.1, -30, 0.3);   // Estrelas distantes médias
    this.createDistantStarLayer(50, 0.08, -20, 0.5);  // Estrelas mais próximas, muito pequenas
  }

  private createDistantStarLayer(count: number, baseSize: number, zPosition: number, speedMultiplier: number): void {
    if (!this.starField) return;

    for (let i = 0; i < count; i++) {
      // Criar estrelas com tamanhos variados baseados na distância
      const distanceFactor = Math.abs(zPosition) / 50; // Quanto mais longe, maior o fator
      const size = baseSize + (Math.random() * 0.05); // Variação muito pequena no tamanho
      
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      
      // Cores mais suaves para estrelas distantes
      const starColors = [0xffffee, 0xeeeeff, 0xffeeee, 0xeeffee, 0xffffff];
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      
      // Opacidade baseada na distância - mais distante = mais transparente
      const opacity = Math.max(0.2, 0.8 - (distanceFactor * 0.4));
      
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: opacity
      });
      
      const star = new THREE.Mesh(geometry, material);
      
      // Distribuição mais ampla para estrelas distantes
      const spread = 80 + (distanceFactor * 40);
      star.position.set(
        (Math.random() - 0.5) * spread,
        Math.random() * 60 - 10, // Foco mais no horizonte
        zPosition + (Math.random() - 0.5) * 3
      );
      
      // Escala ligeiramente variada
      const scale = 0.9 + Math.random() * 0.2;
      star.scale.setScalar(scale);
      
      this.starField.add(star);
      this.stars.push({
        mesh: star,
        speed: speedMultiplier,
        layer: Math.floor(zPosition)
      });
    }
  }

  public update(deltaTime: number): void {
    if (this.stars.length === 0) return;

    this.stars.forEach((star) => {
      const moveDistance = this.baseScrollSpeed * star.speed * deltaTime;
      star.mesh.position.y -= moveDistance;

      // Reposicionar estrela quando sair da tela
      if (star.mesh.position.y < -20) {
        star.mesh.position.y = 50;
        
        // Reposicionar baseado na camada/distância
        const distanceFactor = Math.abs(star.layer) / 50;
        const spread = 80 + (distanceFactor * 40);
        star.mesh.position.x = (Math.random() - 0.5) * spread;
      }

      // Brilho sutil apenas para estrelas mais distantes
      if (star.mesh.material instanceof THREE.MeshBasicMaterial && star.layer < -25) {
        const time = Date.now() * 0.0005; // Brilho mais lento
        const baseOpacity = Math.max(0.2, 0.8 - (Math.abs(star.layer) / 50 * 0.4));
        const twinkle = baseOpacity + 0.1 * Math.sin(time + star.mesh.position.x * 0.1);
        star.mesh.material.opacity = Math.max(0.1, twinkle);
      }
    });
  }

  public setScrollSpeed(speed: number): void {
    this.baseScrollSpeed = speed;
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