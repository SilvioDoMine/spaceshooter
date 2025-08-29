import * as THREE from 'three';

/**
 * Helper para visualização de collision boxes em modo debug
 */
export class CollisionDebugHelper {
  private static collisionMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ff00,
    transparent: true,
    opacity: 0.8
  });

  private static collisionGeometryCache = new Map<string, THREE.BufferGeometry>();

  /**
   * Cria ou obtém uma geometria de wireframe para collision circle
   */
  private static getCollisionGeometry(radius: number): THREE.BufferGeometry {
    const key = `circle_${radius}`;
    
    if (!this.collisionGeometryCache.has(key)) {
      // Create a circle using BufferGeometry and points
      const geometry = new THREE.BufferGeometry();
      const points = [];
      const segments = 32;
      
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(
          Math.cos(theta) * radius,
          Math.sin(theta) * radius,
          0
        );
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      this.collisionGeometryCache.set(key, geometry);
    }
    
    return this.collisionGeometryCache.get(key)!;
  }

  /**
   * Cria um collision circle visualizador para uma entidade
   */
  public static createCollisionVisualizer(
    radius: number
  ): THREE.LineLoop {
    const geometry = this.getCollisionGeometry(radius);
    const collisionCircle = new THREE.LineLoop(geometry, this.collisionMaterial);
    
    // Marcar como collision visualizer para identificação
    (collisionCircle as any).isCollisionVisualizer = true;
    collisionCircle.visible = false; // Inicialmente invisível
    
    return collisionCircle;
  }

  /**
   * Atualiza a visibilidade de todos os collision visualizers em uma cena
   */
  public static setCollisionVisibility(scene: THREE.Scene, visible: boolean): void {
    scene.traverse((object) => {
      if ((object as any).isCollisionVisualizer && (object instanceof THREE.LineLoop || object instanceof THREE.Mesh)) {
        object.visible = visible;
      }
    });
  }

  /**
   * Remove todos os collision visualizers de uma cena
   */
  public static removeAllCollisionVisualizers(scene: THREE.Scene): void {
    const toRemove: THREE.Object3D[] = [];
    
    scene.traverse((object) => {
      if ((object as any).isCollisionVisualizer && (object instanceof THREE.LineLoop || object instanceof THREE.Mesh)) {
        toRemove.push(object);
      }
    });
    
    toRemove.forEach(object => {
      if (object.parent) {
        object.parent.remove(object);
      }
    });
  }

  /**
   * Atualiza a posição e escala do collision visualizer baseado na entidade pai
   */
  public static updateCollisionVisualizer(
    visualizer: THREE.LineLoop,
    entity: THREE.Object3D
  ): void {
    // Copiar transformações da entidade pai
    visualizer.position.copy(entity.position);
    visualizer.rotation.copy(entity.rotation);
    visualizer.scale.copy(entity.scale);
  }

  /**
   * Limpa cache de geometrias (chamado no dispose)
   */
  public static dispose(): void {
    this.collisionGeometryCache.forEach((geometry) => {
      geometry.dispose();
    });
    this.collisionGeometryCache.clear();
    
    if (this.collisionMaterial) {
      this.collisionMaterial.dispose();
    }
  }
}