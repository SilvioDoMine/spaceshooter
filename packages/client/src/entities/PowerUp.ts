import * as THREE from 'three';
import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { assetManager } from '../services/AssetManager';
import { POWERUP_CONFIG } from '@spaceshooter/shared';
import type { PowerUp as PowerUpData } from '@spaceshooter/shared';

export class PowerUp extends Entity {
  private powerUpType: PowerUpData['type'];
  private config: typeof POWERUP_CONFIG[keyof typeof POWERUP_CONFIG];
  private createdAt: number;

  constructor(
    eventBus: EventBus,
    id: string,
    powerUpType: PowerUpData['type'],
    initialPosition: Position
  ) {
    const config = POWERUP_CONFIG[powerUpType];
    
    if (!config) {
      console.error(`❌ PowerUp config not found for type: ${powerUpType}`);
      throw new Error(`PowerUp config not found for type: ${powerUpType}`);
    }
    
    super(eventBus, id, initialPosition, { x: 0, y: -config.speed });
    
    this.powerUpType = powerUpType;
    this.config = config;
    this.createdAt = Date.now();
    
    // Create visual after all properties are set
    this.createVisual();
  }

  protected setupEventHandlers(): void {
    // Power-ups don't need to listen to specific events
    // They just move and check for player collision
  }

  protected createVisual(): void {
    if (!this.config) {
      console.error('❌ PowerUp config not found for type:', this.powerUpType);
      return;
    }
    
    // Criar objeto visual (diferente por tipo) - exactly like main2.ts
    let geometry: THREE.BufferGeometry;
    const size = this.config.size || 0.2;
    
    switch (this.powerUpType) {
      case 'ammo':
        // Triângulo (usando ConeGeometry com poucos segmentos)
        geometry = new THREE.ConeGeometry(size, size * 1.5, 3);
        break;
      case 'health':
        geometry = new THREE.SphereGeometry(size, 8, 6);
        break;
      case 'shield':
        geometry = new THREE.OctahedronGeometry(size);
        break;
      default:
        geometry = new THREE.BoxGeometry(size, size, size);
    }
    
    // Get material from AssetManager
    const material = assetManager.getPowerUpMaterial(this.powerUpType);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Adicionar rotação para efeito visual
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    
    this.object.add(mesh);
    
    // Create collision visualizer for power-up
    const radius = this.config.radius || (this.config.size || 0.2);
    this.createCollisionVisualizer(radius);
    
    this.eventBus.emit('scene:add-object', { object: this.object });
  }

  protected onUpdate(deltaTime: number): void {
    if (!this.isActive) return;

    this.updateVisualEffects();
    this.checkExpiry();
    this.checkBoundsAndDestroy();
    this.checkPlayerCollision();
  }

  private updateVisualEffects(): void {
    const currentTime = Date.now();
    
    this.object.rotation.x += 0.02;
    this.object.rotation.y += 0.03;
    
    const pulseScale = 1 + Math.sin(currentTime * 0.005) * 0.1;
    this.object.scale.setScalar(pulseScale);
  }

  private checkExpiry(): void {
    const currentTime = Date.now();
    const lifetime = this.config?.lifetime || 10000; // default 10 seconds
    if (currentTime - this.createdAt > lifetime) {
      this.destroy();
    }
  }

  private checkBoundsAndDestroy(): void {
    const bounds = { minX: -10, maxX: 10, minY: -6, maxY: 10 };
    
    if (!this.checkBounds(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)) {
      this.destroy();
    }
  }

  private checkPlayerCollision(): void {
    const size = this.config?.size || 0.2;
    const effect = this.config?.effect || 0;
    
    this.eventBus.emit('collision:powerup-player', {
      powerUpId: this.id,
      type: this.powerUpType,
      position: this.position,
      radius: size,
      effect: effect
    });
  }

  public getPowerUpType(): PowerUpData['type'] {
    return this.powerUpType;
  }

  public getEffect(): number {
    return this.config?.effect || 0;
  }

  protected onDestroy(): void {
    this.eventBus.emit('scene:remove-object', { object: this.object });
  }

  public static spawnPowerUp(eventBus: EventBus): PowerUp {
    const currentTime = Date.now();
    const powerUpId = `powerup_${currentTime}_${Math.random()}`;
    
    // Determinar tipo de power-up (70% ammo, 25% health, 5% shield)
    const rand = Math.random();
    let powerUpType: PowerUpData['type'];
    if (rand < 0.7) {
      powerUpType = 'ammo';
    } else if (rand < 0.95) {
      powerUpType = 'health';
    } else {
      powerUpType = 'shield';
    }
    
    const spawnPosition: Position = {
      x: (Math.random() - 0.5) * 8, // Random X entre -4 e 4 (same as main2.ts)
      y: 6 // Spawn no topo (same as main2.ts)
    };
    
    const powerUp = new PowerUp(eventBus, powerUpId, powerUpType, spawnPosition);
    
    console.log(`PowerUp spawned: ${powerUpType}`, powerUpId);
    
    return powerUp;
  }
}