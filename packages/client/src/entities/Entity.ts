import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { PLAYER_CONFIG } from '@spaceshooter/shared';
import { CollisionDebugHelper } from '../utils/CollisionDebugHelper';
import { CollisionUtils } from '../utils/CollisionUtils';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export abstract class Entity {
  protected eventBus: EventBus;
  protected object: THREE.Group;
  protected id: string;
  protected position: Position;
  protected velocity: Velocity;
  protected isActive: boolean = true;
  private cleanupFunctions: Array<() => void> = [];
  
  // Collision debug
  protected collisionVisualizer?: THREE.LineLoop;
  protected collisionRadius: number = 1;

  constructor(
    eventBus: EventBus,
    id: string,
    initialPosition: Position,
    initialVelocity: Velocity = { x: 0, y: 0 }
  ) {
    this.eventBus = eventBus;
    this.id = id;
    this.position = { ...initialPosition };
    this.velocity = { ...initialVelocity };
    this.object = new THREE.Group();
    
    this.setupEventHandlers();
    this.setupCollisionDebug();
    // createVisual will be called by subclass after initialization
    this.updateObjectPosition();
  }

  protected abstract setupEventHandlers(): void;
  protected abstract createVisual(): void;

  public getId(): string {
    return this.id;
  }

  public getPosition(): Position {
    return { ...this.position };
  }

  public getObject(): THREE.Group {
    return this.object;
  }

  public setPosition(position: Position): void {
    this.position = { ...position };
    this.updateObjectPosition();
  }

  public setVelocity(velocity: Velocity): void {
    this.velocity = { ...velocity };
  }

  public getVelocity(): Velocity {
    return { ...this.velocity };
  }

  public isEntityActive(): boolean {
    return this.isActive;
  }

  public getRadius(): number {
    return this.collisionRadius;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.updateObjectPosition();

    this.onUpdate(deltaTime);
  }

  protected onUpdate(_deltaTime: number): void {
    // Override in subclasses for specific update logic
  }

  private updateObjectPosition(): void {
    this.object.position.set(this.position.x, this.position.y, 0);
  }

  protected addCleanupFunction(cleanup: () => void): void {
    this.cleanupFunctions.push(cleanup);
  }

  public destroy(): void {
    this.isActive = false;
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    this.onDestroy();
  }

  protected onDestroy(): void {
    // Cleanup collision visualizer
    if (this.collisionVisualizer && this.collisionVisualizer.parent) {
      this.collisionVisualizer.parent.remove(this.collisionVisualizer);
    }
    // Override in subclasses for specific cleanup logic
  }
  
  private setupCollisionDebug(): void {
    // Listen for collision debug toggle
    this.addCleanupFunction(
      this.eventBus.on('debug:collision-visibility-toggle', (data: { visible: boolean }) => {
        this.setCollisionVisibility(data.visible);
      })
    );
  }
  
  protected createCollisionVisualizer(radius?: number): void {
    if (radius) this.collisionRadius = radius;
    
    this.collisionVisualizer = CollisionDebugHelper.createCollisionVisualizer(
      this.collisionRadius
    );
    this.object.add(this.collisionVisualizer);
    
    // Set initial visibility based on current debug state
    this.updateCollisionVisibilityFromGlobalState();
  }
  
  private updateCollisionVisibilityFromGlobalState(): void {
    // Check if game is available globally and get debug state
    const game = (window as any).game;
    if (game && this.collisionVisualizer) {
      try {
        const isVisible = game.getDebugSystem().isCollisionDebugEnabled();
        this.collisionVisualizer.visible = isVisible;
      } catch (error) {
        // DebugSystem not ready yet, default to false
        this.collisionVisualizer.visible = false;
      }
    }
  }
  
  protected setCollisionVisibility(visible: boolean): void {
    if (this.collisionVisualizer) {
      this.collisionVisualizer.visible = visible;
    }
  }
  
  protected updateCollisionVisualizerSize(radius: number): void {
    if (this.collisionVisualizer) {
      this.object.remove(this.collisionVisualizer);
    }
    this.createCollisionVisualizer(radius);
  }

  protected checkBounds(minX: number, maxX: number, minY: number, maxY: number): boolean {
    return this.position.x >= minX && 
           this.position.x <= maxX && 
           this.position.y >= minY && 
           this.position.y <= maxY;
  }

  protected isCollidingWith(other: Entity, thisRadius: number = PLAYER_CONFIG.radius, otherRadius: number = PLAYER_CONFIG.radius): boolean {
    return CollisionUtils.checkCircularCollision(
      this.position,
      thisRadius,
      other.position,
      otherRadius
    );
  }
}