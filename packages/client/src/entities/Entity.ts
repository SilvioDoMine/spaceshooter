import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

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
    // Override in subclasses for specific cleanup logic
  }

  protected checkBounds(minX: number, maxX: number, minY: number, maxY: number): boolean {
    return this.position.x >= minX && 
           this.position.x <= maxX && 
           this.position.y >= minY && 
           this.position.y <= maxY;
  }

  protected isCollidingWith(other: Entity, radius: number = 0.5): boolean {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius;
  }
}