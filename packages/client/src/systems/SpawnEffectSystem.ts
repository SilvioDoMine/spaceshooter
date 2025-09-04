import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { SpawnEffect } from '../effects/SpawnEffect';

/**
 * Sistema de gerenciamento dos efeitos de spawn de inimigos
 */
export class SpawnEffectSystem {
  private eventBus: EventBus;
  private scene: THREE.Scene;
  private activeEffects: Map<string, SpawnEffect> = new Map();
  private effectGroup: THREE.Group;

  constructor(eventBus: EventBus, scene: THREE.Scene) {
    this.eventBus = eventBus;
    this.scene = scene;
    this.effectGroup = new THREE.Group();
    this.effectGroup.name = 'spawn-effects';
    this.scene.add(this.effectGroup);

    this.setupEventListeners();
    console.log('🌀 SpawnEffectSystem initialized');
  }

  private setupEventListeners(): void {
    // Escutar solicitações de spawn com efeito
    this.eventBus.on('spawn:request-effect', (data: {
      position: { x: number; y: number; z: number };
      onComplete?: () => void;
      id?: string;
    }) => {
      console.log(`🌀 SpawnEffectSystem: Received spawn effect request at (${data.position.x.toFixed(2)}, ${data.position.y.toFixed(2)}, ${data.position.z.toFixed(2)})`);
      this.createSpawnEffect(data.position, data.onComplete, data.id);
    });

    // Escutar limpeza de efeitos
    this.eventBus.on('spawn:clear-effects', () => {
      this.clearAllEffects();
    });
  }

  private createSpawnEffect(
    position: { x: number; y: number; z: number },
    onComplete?: () => void,
    id?: string
  ): void {
    const effectId = id || `spawn_${Date.now()}_${Math.random()}`;
    
    // Criar novo efeito
    const effect = new SpawnEffect(this.eventBus);
    const mesh = effect.getMesh();
    
    if (mesh) {
      this.effectGroup.add(mesh);
      this.activeEffects.set(effectId, effect);
      
      // Iniciar efeito
      effect.start(position, () => {
        // Callback quando o efeito termina
        this.removeEffect(effectId);
        if (onComplete) {
          onComplete();
        }
      });
    }
  }

  private removeEffect(effectId: string): void {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      const mesh = effect.getMesh();
      if (mesh) {
        this.effectGroup.remove(mesh);
      }
      effect.dispose();
      this.activeEffects.delete(effectId);
    }
  }

  private clearAllEffects(): void {
    for (const [id, effect] of this.activeEffects) {
      const mesh = effect.getMesh();
      if (mesh) {
        this.effectGroup.remove(mesh);
      }
      effect.dispose();
    }
    this.activeEffects.clear();
  }

  public update(deltaTime: number): void {
    // Atualizar todos os efeitos ativos
    for (const effect of this.activeEffects.values()) {
      effect.update(deltaTime);
    }
  }

  public getActiveEffectsCount(): number {
    return this.activeEffects.size;
  }

  public dispose(): void {
    this.clearAllEffects();
    this.scene.remove(this.effectGroup);
    console.log('🌀 SpawnEffectSystem disposed');
  }
}