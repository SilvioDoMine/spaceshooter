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
  private originalRadius: number = 4.0; // Store the original radius
  
  // Ammo-based visual states
  private currentAmmo: number = 30;
  private maxAmmo: number = 30;
  private ammoState: 'normal' | 'warning' | 'urgent' | 'desperate' | 'empty' = 'normal';
  private fadeTarget: number = 0.3; // Target opacity
  private currentOpacity: number = 0.3; // Current opacity for smooth transitions
  
  // Animation state for circle contraction
  private radiusTarget: number = 4.0; // Target radius for smooth transitions
  private isContracting: boolean = false; // Track if we're in contraction mode


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

    // Escutar mudanças na munição para efeitos visuais
    this.eventBus.on('ui:update-ammo', (data) => {
      this.updateAmmoState(data.current, data.max);
    });

    // Também escutar eventos diretos de munição do player
    this.eventBus.on('player:ammo-changed', (data) => {
      this.updateAmmoState(data.current, data.max);
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
    this.originalRadius = radius; // Store the original radius
    this.currentRadius = radius;
    this.radiusTarget = radius;
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
    if (!this.material) return;

    // Smooth opacity transitions
    const lerpSpeed = 3.0; // Speed of opacity transitions
    this.currentOpacity = THREE.MathUtils.lerp(this.currentOpacity, this.fadeTarget, deltaTime * lerpSpeed);
    
    // Smooth radius transitions for contraction effect
    const radiusLerpSpeed = 4.0; // Slightly faster than opacity for nice sync
    const previousRadius = this.currentRadius;
    this.currentRadius = THREE.MathUtils.lerp(this.currentRadius, this.radiusTarget, deltaTime * radiusLerpSpeed);
    
    // Update geometry if radius changed significantly
    if (Math.abs(previousRadius - this.currentRadius) > 0.01) {
      this.updateScale();
    }

    // Apply different visual effects based on ammo state
    const time = Date.now() * 0.001;
    
    // Always keep the same beautiful blue color
    this.material.color.setHex(0x6699ff);
    
    switch (this.ammoState) {
      case 'normal':
        // Normal subtle pulse - just like the original
        const normalPulse = 0.02 * Math.sin(time * 2);
        this.material.opacity = this.currentOpacity + normalPulse;
        break;
        
      case 'warning':
        // 10 bullets - start gentle pulsing
        const warningPulse = Math.sin(time * 3); // 3 Hz
        const warningVariation = 0.08; // Gentle but noticeable
        this.material.opacity = this.currentOpacity + (warningVariation * warningPulse);
        break;
        
      case 'urgent':
        // 6 bullets - more intense pulsing  
        const urgentPulse = Math.sin(time * 5); // 5 Hz - faster
        const urgentVariation = 0.15; // More visible
        this.material.opacity = this.currentOpacity + (urgentVariation * urgentPulse);
        break;
        
      case 'desperate':
        // 3 bullets - very intense pulsing
        const desperatePulse = Math.sin(time * 8); // 8 Hz - very fast
        const desperateVariation = 0.25; // Maximum intensity
        this.material.opacity = this.currentOpacity + (desperateVariation * desperatePulse);
        break;
        
      case 'empty':
        // Fade out completely while contracting
        this.material.opacity = this.currentOpacity;
        
        // Start contraction if not already started
        if (!this.isContracting) {
          this.isContracting = true;
          this.radiusTarget = 0.1; // Contract to almost nothing
        }
        break;
    }
    
    // Ensure opacity stays within bounds
    this.material.opacity = Math.max(0, Math.min(1, this.material.opacity));
  }

  private updateAmmoState(current: number, max: number): void {
    this.currentAmmo = current;
    this.maxAmmo = max;
    
    const ammoPercentage = current / max;
    const previousState = this.ammoState;
    
    // Simple bullet-based system - exact counts
    if (current <= 0) {
      this.ammoState = 'empty';
      this.fadeTarget = 0.0; // Fade out completely
    } else if (current <= 3) { // 1-3 bullets: DESPERATE pulsing
      this.ammoState = 'desperate';
      this.fadeTarget = 0.4; // More visible
      // If we were contracting, expand back to normal
      if (this.isContracting) {
        this.isContracting = false;
        this.radiusTarget = this.originalRadius;
      }
    } else if (current <= 6) { // 4-6 bullets: Urgent pulsing
      this.ammoState = 'urgent'; 
      this.fadeTarget = 0.35; // Slightly more visible
      // Ensure we're at full size
      if (this.isContracting) {
        this.isContracting = false;
        this.radiusTarget = this.originalRadius;
      }
    } else if (current <= 10) { // 7-10 bullets: Start warning pulsing
      this.ammoState = 'warning';
      this.fadeTarget = 0.32; // Just a bit more visible
      // Ensure we're at full size
      if (this.isContracting) {
        this.isContracting = false;
        this.radiusTarget = this.originalRadius;
      }
    } else { // 11+ bullets: Normal
      this.ammoState = 'normal';
      this.fadeTarget = 0.3; // Normal visibility
      // Ensure we're at full size
      if (this.isContracting) {
        this.isContracting = false;
        this.radiusTarget = this.originalRadius;
      }
    }
    
    // Log state changes for debugging
    if (previousState !== this.ammoState) {
      console.log(`🎯 RangeIndicator state changed: ${previousState} → ${this.ammoState} (ammo: ${current}/${max})`);
    }
  }

  // Public method to manually set ammo state (optional, for external control)
  public setAmmoState(current: number, max: number): void {
    this.updateAmmoState(current, max);
  }

  // Get current ammo state for debugging
  public getAmmoState(): { state: string, current: number, max: number, opacity: number } {
    return {
      state: this.ammoState,
      current: this.currentAmmo,
      max: this.maxAmmo,
      opacity: this.currentOpacity
    };
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