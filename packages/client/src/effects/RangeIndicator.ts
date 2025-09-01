import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { PLAYER_CONFIG } from '@spaceshooter/shared';

/**
 * Indicador visual de range de arma do player
 */
export class RangeIndicator {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private isVisible: boolean = PLAYER_CONFIG.weapon.showRange;
  private eventBus: EventBus;
  private currentRadius: number = 4.0;


  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.createMesh();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Escutar mudanças na configuração de debug
    this.eventBus.on('debug:range-visibility-changed', (data) => {
      this.setVisible(data.showPlayerRange);
    });

    // Escutar mudanças no range do player
    this.eventBus.on('player:range-changed', (data) => {
      this.setRadius(data.range);
    });
  }

  private createMesh(): void {
    // Criar um anel bem fino
    const geometry = new THREE.RingGeometry(this.currentRadius - 0.025, this.currentRadius, 64);
    
    // Usar material básico com mais transparência
    this.material = new THREE.MeshBasicMaterial({
      color: 0x6699ff, // Azul suave
      transparent: true,
      opacity: 0.3, // Mais transparente
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 100; // Renderizar na frente para garantir visibilidade
    this.mesh.position.set(0, 0, -0.1); // Posição ligeiramente abaixo do player
    this.mesh.visible = this.isVisible;
    
    console.log(`🎯 RangeIndicator created - radius: ${this.currentRadius}, visible: ${this.isVisible}, position: (${this.mesh.position.x}, ${this.mesh.position.y}, ${this.mesh.position.z})`);
  }

  private updateScale(): void {
    if (this.mesh && this.material) {
      // Recreate geometry with new radius (anel bem fino)
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.RingGeometry(this.currentRadius - 0.025, this.currentRadius, 64);
      console.log(`🎯 RangeIndicator radius updated to: ${this.currentRadius}`);
    }
  }

  public setRadius(radius: number): void {
    this.currentRadius = radius;
    this.updateScale();
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.mesh) {
      this.mesh.visible = visible;
      console.log(`🎯 RangeIndicator visibility set to: ${visible}`);
    }
  }

  public setPosition(x: number, y: number, z: number): void {
    if (this.mesh) {
      // Handle NaN values by using 0 as default
      const safeX = isNaN(x) ? 0 : x;
      const safeY = isNaN(y) ? 0 : y;
      const safeZ = isNaN(z) ? 0 : z;
      
      // Posicionar ligeiramente abaixo do player (no "chão")
      this.mesh.position.set(safeX, safeY, safeZ - 0.1);
      if (Math.random() < 0.01) { // Log ocasional para não spam
        console.log(`🎯 RangeIndicator position: (${safeX.toFixed(2)}, ${safeY.toFixed(2)}, ${(safeZ - 0.1).toFixed(2)})`);
      }
    }
  }

  public getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  public isRangeVisible(): boolean {
    return this.isVisible;
  }

  public update(deltaTime: number): void {
    // Simples animação de opacidade para dar um efeito sutil
    if (this.material) {
      const time = Date.now() * 0.002;
      this.material.opacity = 0.3 + Math.sin(time) * 0.05; // Base mais baixa e variação menor
    }
  }

  public dispose(): void {
    if (this.mesh) {
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
      this.mesh.geometry.dispose();
      if (this.material) {
        this.material.dispose();
      }
      this.mesh = null;
      this.material = null;
    }
  }
}