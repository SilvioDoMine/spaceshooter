import { Position } from '../entities/Entity';
import * as THREE from 'three';

/**
 * Define um círculo de colisão individual
 */
export interface CollisionCircle {
  /** Posição relativa ao centro do objeto */
  offset: { x: number; y: number };
  /** Raio do círculo */
  radius: number;
  /** Nome para debug (opcional) */
  name?: string;
}

/**
 * Define um conjunto de círculos de colisão para um objeto
 */
export interface CompoundCollisionShape {
  circles: CollisionCircle[];
}

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

  /**
   * Verifica colisão entre um retângulo e um círculo
   * @param rectPos Posição do centro do retângulo
   * @param rectWidth Largura do retângulo
   * @param rectHeight Altura do retângulo
   * @param circlePos Posição do centro do círculo
   * @param circleRadius Raio do círculo
   * @returns true se houver colisão
   */
  public static checkRectangleCircleCollision(
    rectPos: Position,
    rectWidth: number,
    rectHeight: number,
    circlePos: Position,
    circleRadius: number
  ): boolean {
    // Calcular a distância do círculo até as bordas do retângulo
    const halfWidth = rectWidth / 2;
    const halfHeight = rectHeight / 2;
    
    // Distância absoluta do centro do círculo ao centro do retângulo
    const dx = Math.abs(circlePos.x - rectPos.x);
    const dy = Math.abs(circlePos.y - rectPos.y);
    
    // Se o círculo está muito longe em qualquer eixo, não há colisão
    if (dx > halfWidth + circleRadius || dy > halfHeight + circleRadius) {
      return false;
    }
    
    // Se o círculo está próximo o suficiente em ambos os eixos, há colisão
    if (dx <= halfWidth || dy <= halfHeight) {
      return true;
    }
    
    // Verificar colisão nos cantos do retângulo
    const cornerDx = dx - halfWidth;
    const cornerDy = dy - halfHeight;
    const cornerDistanceSquared = cornerDx * cornerDx + cornerDy * cornerDy;
    
    return cornerDistanceSquared <= circleRadius * circleRadius;
  }

  /**
   * Verifica colisão entre dois retângulos (AABB - Axis-Aligned Bounding Box)
   * @param pos1 Posição do centro do primeiro retângulo
   * @param width1 Largura do primeiro retângulo
   * @param height1 Altura do primeiro retângulo
   * @param pos2 Posição do centro do segundo retângulo
   * @param width2 Largura do segundo retângulo
   * @param height2 Altura do segundo retângulo
   * @returns true se houver colisão
   */
  public static checkRectangleCollision(
    pos1: Position, width1: number, height1: number,
    pos2: Position, width2: number, height2: number
  ): boolean {
    const halfWidth1 = width1 / 2;
    const halfHeight1 = height1 / 2;
    const halfWidth2 = width2 / 2;
    const halfHeight2 = height2 / 2;
    
    return (
      Math.abs(pos1.x - pos2.x) < halfWidth1 + halfWidth2 &&
      Math.abs(pos1.y - pos2.y) < halfHeight1 + halfHeight2
    );
  }

  /**
   * Verifica colisão entre compound shape (múltiplos círculos) e um círculo simples
   * @param compoundPos Posição do objeto com compound shape
   * @param compoundShape Conjunto de círculos de colisão
   * @param circlePos Posição do círculo simples
   * @param circleRadius Raio do círculo simples
   * @returns true se qualquer círculo do compound colidir com o círculo simples
   */
  public static checkCompoundCircleCollision(
    compoundPos: Position,
    compoundShape: CompoundCollisionShape,
    circlePos: Position,
    circleRadius: number
  ): boolean {
    return compoundShape.circles.some(circle => {
      // Calcular posição absoluta do círculo considerando o offset
      const absolutePos = {
        x: compoundPos.x + circle.offset.x,
        y: compoundPos.y + circle.offset.y
      };
      
      return this.checkCircularCollision(
        absolutePos,
        circle.radius,
        circlePos,
        circleRadius
      );
    });
  }

  /**
   * Verifica colisão entre dois compound shapes
   * @param pos1 Posição do primeiro objeto
   * @param shape1 Compound shape do primeiro objeto
   * @param pos2 Posição do segundo objeto  
   * @param shape2 Compound shape do segundo objeto
   * @returns true se qualquer círculo do primeiro colidir com qualquer círculo do segundo
   */
  public static checkCompoundCompoundCollision(
    pos1: Position,
    shape1: CompoundCollisionShape,
    pos2: Position,
    shape2: CompoundCollisionShape
  ): boolean {
    for (const circle1 of shape1.circles) {
      const absolutePos1 = {
        x: pos1.x + circle1.offset.x,
        y: pos1.y + circle1.offset.y
      };
      
      for (const circle2 of shape2.circles) {
        const absolutePos2 = {
          x: pos2.x + circle2.offset.x,
          y: pos2.y + circle2.offset.y
        };
        
        if (this.checkCircularCollision(
          absolutePos1,
          circle1.radius,
          absolutePos2,
          circle2.radius
        )) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Obtém todos os círculos de colisão de um compound shape em posições absolutas
   * @param compoundPos Posição do objeto
   * @param compoundShape Compound shape
   * @returns Array de círculos com posições absolutas
   */
  public static getAbsoluteCollisionCircles(
    compoundPos: Position,
    compoundShape: CompoundCollisionShape
  ): Array<{ pos: Position; radius: number; name?: string }> {
    return compoundShape.circles.map(circle => ({
      pos: {
        x: compoundPos.x + circle.offset.x,
        y: compoundPos.y + circle.offset.y
      },
      radius: circle.radius,
      name: circle.name
    }));
  }
}