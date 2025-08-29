import { Position } from '../entities/Entity';

/**
 * Utilities para detecção de colisão
 */
export class CollisionUtils {
  /**
   * Verifica colisão circular entre dois objetos usando soma dos radius
   * @param pos1 Posição do primeiro objeto
   * @param radius1 Radius do primeiro objeto
   * @param pos2 Posição do segundo objeto  
   * @param radius2 Radius do segundo objeto
   * @returns true se houver colisão (bordas se tocando)
   */
  public static checkCircularCollision(
    pos1: Position,
    radius1: number,
    pos2: Position,
    radius2: number
  ): boolean {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const collisionDistance = radius1 + radius2;
    
    return distance < collisionDistance;
  }

  /**
   * Calcula a distância entre dois pontos
   */
  public static getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Verifica se um ponto está dentro de um círculo
   */
  public static isPointInCircle(
    point: Position, 
    circleCenter: Position, 
    circleRadius: number
  ): boolean {
    return this.getDistance(point, circleCenter) < circleRadius;
  }

  /**
   * Encontra a entidade mais próxima que colide com o objeto dado
   */
  public static findClosestCollision<T extends { getPosition(): Position }>(
    sourcePos: Position,
    sourceRadius: number,
    targets: Map<string, T> | T[],
    getRadius: (target: T) => number
  ): { target: T; id?: string; distance: number } | null {
    let closestCollision: { target: T; id?: string; distance: number } | null = null;
    let minDistance = Infinity;

    const checkTarget = (target: T, id?: string) => {
      const targetPos = target.getPosition();
      const targetRadius = getRadius(target);
      
      if (this.checkCircularCollision(sourcePos, sourceRadius, targetPos, targetRadius)) {
        const distance = this.getDistance(sourcePos, targetPos);
        if (distance < minDistance) {
          minDistance = distance;
          closestCollision = { target, id, distance };
        }
      }
    };

    if (targets instanceof Map) {
      targets.forEach((target, id) => checkTarget(target, id));
    } else {
      targets.forEach((target, index) => checkTarget(target, index.toString()));
    }

    return closestCollision;
  }
}