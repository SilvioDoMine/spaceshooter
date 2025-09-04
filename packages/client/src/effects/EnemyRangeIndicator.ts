import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

/**
 * Indicador visual de range de ataque de inimigos
 * Similar ao RangeIndicator do player, mas com cor vermelha
 */
export class EnemyRangeIndicator {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private isVisible: boolean = false;
  private eventBus: EventBus;
  private currentRadius: number = 2.0;
  private enemyColor: number = 0xff4444; // Vermelho por padrão

  constructor(eventBus: EventBus, radius: number = 2.0, color: number = 0xff4444) {
    this.eventBus = eventBus;
    this.currentRadius = radius;
    this.enemyColor = color;
    this.createMesh();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Escutar mudanças na configuração de debug
    this.eventBus.on('debug:range-visibility-changed', (data) => {
      this.setVisible(data.showEnemyRanges);
    });
  }

  private createMesh(): void {
    // Criar um anel bem fino
    const geometry = new THREE.RingGeometry(this.currentRadius - 0.025, this.currentRadius, 32);
    
    // Usar material básico com cor do inimigo
    this.material = new THREE.MeshBasicMaterial({
      color: this.enemyColor,
      transparent: true,
      opacity: 0.4, // Ligeiramente mais opaco que o do player
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 99; // Renderizar atrás do player range
    this.mesh.position.set(0, 0, -0.05); // Posição ligeiramente acima do player range
    this.mesh.visible = this.isVisible;
  }

  private updateScale(): void {
    if (this.mesh && this.material) {
      // Recreate geometry with new radius
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.RingGeometry(this.currentRadius - 0.025, this.currentRadius, 32);
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
    }
  }

  public setPosition(x: number, y: number, z: number): void {
    if (this.mesh) {
      // Handle NaN values by using 0 as default
      const safeX = isNaN(x) ? 0 : x;
      const safeY = isNaN(y) ? 0 : y;
      const safeZ = isNaN(z) ? 0 : z;
      
      // Posicionar ligeiramente acima do player range
      this.mesh.position.set(safeX, safeY, safeZ - 0.05);
    }
  }

  public setColor(color: number): void {
    this.enemyColor = color;
    if (this.material) {
      this.material.color.setHex(color);
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
      const time = Date.now() * 0.003; // Velocidade diferente do player
      this.material.opacity = 0.4 + Math.sin(time) * 0.08; // Mais variação que o player
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