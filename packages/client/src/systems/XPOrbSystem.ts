/**
 * XPOrbSystem - Sistema de orbes de XP com auto-merge e otimização
 * Gerencia criação, merge automático e coleta de orbes de experiência
 */

import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

export interface XPOrbConfig {
  xpValue: number;
  position: THREE.Vector3;
  color: THREE.Color;
  tier: number; // 1: 1-50, 2: 51-150, 3: 151+
}

export interface XPOrb {
  id: string;
  xpValue: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  tier: number;
  createdAt: number;
  
  // Lifecycle
  get isDead(): boolean;
  dispose(): void;
}

class XPOrbImpl implements XPOrb {
  id: string;
  xpValue: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  tier: number;
  createdAt: number;
  
  constructor(config: XPOrbConfig, geometry: THREE.BufferGeometry, glowGeometry: THREE.BufferGeometry) {
    this.id = Math.random().toString(36).substring(2, 11);
    this.xpValue = config.xpValue;
    this.position = config.position.clone();
    this.tier = config.tier;
    this.createdAt = performance.now();
    
    // Create main orb mesh
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.9
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(config.position);
    
    // Create glow effect
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.copy(config.position);
    this.glowMesh.scale.setScalar(1.5); // Glow is slightly larger
    
    // Set scale based on tier
    const scale = this.getScaleByTier();
    this.mesh.scale.setScalar(scale);
    this.glowMesh.scale.setScalar(scale * 1.5);
  }
  
  private getScaleByTier(): number {
    switch (this.tier) {
      case 1: return 0.4;  // Small orbs (1-50 XP)
      case 2: return 0.6;  // Medium orbs (51-150 XP)  
      case 3: return 0.8;  // Large orbs (151+ XP)
      default: return 0.4;
    }
  }
  
  get isDead(): boolean {
    return false; // XP orbs don't expire unless collected
  }
  
  dispose(): void {
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
    if (this.glowMesh.material instanceof THREE.Material) {
      this.glowMesh.material.dispose();
    }
  }
}

export class XPOrbSystem {
  private orbs: Map<string, XPOrb> = new Map();
  private spatialGrid: Map<string, Set<string>> = new Map(); // Grid key -> Set of orb IDs
  private scene!: THREE.Scene;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  
  // Geometries (shared for performance)
  private orbGeometry!: THREE.SphereGeometry;
  private glowGeometry!: THREE.SphereGeometry;
  
  // Configuration
  private readonly MERGE_DISTANCE = 0.8; // Distance for auto-merge (mais restritivo)
  private readonly COLLECT_DISTANCE = 0.8; // Distance for collection (igual aos power ups)
  private readonly GRID_SIZE = 4; // Spatial grid cell size
  private readonly MAX_ORBS_PER_AREA = 50; // Max orbs before forced merge
  // Removed MAX_ORBS_PER_ENEMY - now controlled by enemy configuration
  
  // Color tiers
  private static readonly TIER_COLORS: { [key: number]: THREE.Color } = {
    1: new THREE.Color(0x00ff00), // Green (1-50 XP)
    2: new THREE.Color(0x0088ff), // Blue (51-150 XP)
    3: new THREE.Color(0xff8800)  // Orange (151+ XP)
  };
  
  private eventBus: EventBus;
  private isActive: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }
  
  private initialize(data: { scene: THREE.Scene }): void {
    this.scene = data.scene;
    
    // Create shared geometries (menores)
    this.orbGeometry = new THREE.SphereGeometry(0.08, 8, 6);
    this.glowGeometry = new THREE.SphereGeometry(0.08, 6, 4);
    
    this.setupStateListeners();
    this.eventBus.emit('xp-orbs:ready', {});
  }
  
  private setupStateListeners(): void {
    this.eventBus.on('game:started', () => this.activate());
    this.eventBus.on('game:paused', () => this.deactivate()); 
    this.eventBus.on('game:resumed', () => this.activate());
    this.eventBus.on('game:over', () => this.deactivate());
    this.eventBus.on('game:exit', () => this.deactivate());
  }
  
  private activate(): void {
    this.isActive = true;
  }
  
  private deactivate(): void {
    this.isActive = false;
    // Clear all orbs when game ends
    this.clear();
  }

  private setupEventListeners(): void {
    this.eventBus.on('renderer:ready', (data) => {
      this.initialize(data);
    });
    
    // Listen for enemy deaths to create orbs
    this.eventBus.on('enemy:destroyed', (data) => {
      if (data.position && data.xp && data.xpOrbCount) {
        const basePosition = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
        this.createMultipleXPOrbs(basePosition, data.xp, data.xpOrbCount);
      }
    });
    
    // Listen for player position updates
    this.eventBus.on('player:position-changed', (data) => {
      this.playerPosition.set(data.position.x, data.position.y, data.position.z);
    });
    
    // Listen for clear events (like particles:clear pattern)
    this.eventBus.on('xp-orbs:clear', () => {
      this.clear();
    });
  }
  
  /**
   * Create multiple XP orbs at scattered positions
   */
  createMultipleXPOrbs(basePosition: THREE.Vector3, totalXP: number, orbCount: number): void {
    if (!this.isActive) return;
    
    // Calculate XP per orb based on what the enemy configured
    const xpPerOrb = Math.ceil(totalXP / orbCount);
    
    // Random spread patterns for variety
    const randomPattern = Math.random();
    let finalSpread: number;
    
    if (randomPattern < 0.4) {
      // 40% chance: Tight cluster (orbes bem juntinhos)
      finalSpread = Math.random() * 0.4 + 0.1; // 0.1 to 0.5
    } else if (randomPattern < 0.7) {
      // 30% chance: Medium spread (espalhamento médio)
      finalSpread = Math.random() * 0.5 + 0.4; // 0.4 to 0.9
    } else {
      // 30% chance: Wide spread (bem espalhado)
      finalSpread = Math.random() * 0.6 + 0.8; // 0.8 to 1.4
    }
    
    // Create orbs with completely random positions
    for (let i = 0; i < orbCount; i++) {
      // Completely random angle (not evenly distributed)
      const angle = Math.random() * Math.PI * 2;
      
      // Random radius with bias toward center for clustering effect
      const radiusRandom = Math.random();
      const radius = Math.pow(radiusRandom, 1.5) * finalSpread; // Power curve biases toward center
      
      // Additional random scatter
      const scatterX = (Math.random() - 0.5) * 0.3;
      const scatterY = (Math.random() - 0.5) * 0.3;
      
      const scatteredPosition = basePosition.clone().add(new THREE.Vector3(
        Math.cos(angle) * radius + scatterX,
        Math.sin(angle) * radius + scatterY,
        (Math.random() - 0.5) * 0.1 // Smaller Z variation
      ));
      
      // Create orb with calculated XP value
      this.createXPOrb(scatteredPosition, xpPerOrb);
    }
    
    console.log(`💎 Enemy dropped ${orbCount} orbs (${xpPerOrb} XP each) = ${totalXP} total XP`);
  }

  /**
   * Create a new XP orb at the specified position
   */
  createXPOrb(position: THREE.Vector3, xpValue: number): void {
    if (!this.isActive) return;
    
    // Check for nearby orbs to merge with (só merge com muitos orbes)
    const nearbyOrbs = this.findNearbyOrbs(position, this.MERGE_DISTANCE);
    const newTier = this.getTierByXP(xpValue);
    
    // Só faz merge se tiver muitos orbes do mesmo tier próximos
    const sameTierOrbs = nearbyOrbs.filter(orb => orb.tier === newTier);
    
    if (sameTierOrbs.length >= 4) { // Precisa de pelo menos 4 orbes próximos
      // Find the best orb to merge with
      const targetOrb = sameTierOrbs[0];
      if (targetOrb) {
        this.mergeOrbs(targetOrb, xpValue);
        return;
      }
    }
    
    // Create new orb
    const tier = this.getTierByXP(xpValue);
    const color = XPOrbSystem.TIER_COLORS[tier];
    
    const config: XPOrbConfig = {
      xpValue,
      position: position.clone(),
      color: color.clone(),
      tier
    };
    
    const orb = new XPOrbImpl(config, this.orbGeometry, this.glowGeometry);
    
    // Add to scene
    this.scene.add(orb.mesh);
    this.scene.add(orb.glowMesh);
    
    // Add to collections
    this.orbs.set(orb.id, orb);
    this.addToSpatialGrid(orb);
  }
  
  private getTierByXP(xp: number): number {
    if (xp <= 50) return 1;
    if (xp <= 150) return 2;
    return 3;
  }
  
  private findNearbyOrbs(position: THREE.Vector3, distance: number): XPOrb[] {
    const nearby: XPOrb[] = [];
    const gridKeys = this.getGridKeysInRadius(position, distance);
    
    for (const gridKey of gridKeys) {
      const orbIds = this.spatialGrid.get(gridKey);
      if (!orbIds) continue;
      
      for (const orbId of orbIds) {
        const orb = this.orbs.get(orbId);
        if (!orb) continue;
        
        if (orb.position.distanceTo(position) <= distance) {
          nearby.push(orb);
        }
      }
    }
    
    return nearby;
  }
  
  private findBestMergeTarget(nearbyOrbs: XPOrb[], newXP: number): XPOrb | null {
    const newTier = this.getTierByXP(newXP);
    
    // Prefer orbs of the same tier, then lower tiers
    const sameTierOrbs = nearbyOrbs.filter(orb => orb.tier === newTier);
    if (sameTierOrbs.length > 0) {
      return sameTierOrbs[0];
    }
    
    const lowerTierOrbs = nearbyOrbs.filter(orb => orb.tier < newTier);
    if (lowerTierOrbs.length > 0) {
      return lowerTierOrbs[0];
    }
    
    return nearbyOrbs[0];
  }
  
  private mergeOrbs(targetOrb: XPOrb, additionalXP: number): void {
    const oldTier = targetOrb.tier;
    targetOrb.xpValue += additionalXP;
    
    const newTier = this.getTierByXP(targetOrb.xpValue);
    
    if (newTier !== oldTier) {
      // Update tier, color and scale
      targetOrb.tier = newTier;
      const newColor = XPOrbSystem.TIER_COLORS[newTier];
      const newScale = this.getScaleByTier(newTier);
      
      // Update materials
      (targetOrb.mesh.material as THREE.MeshBasicMaterial).color.copy(newColor);
      (targetOrb.glowMesh.material as THREE.MeshBasicMaterial).color.copy(newColor);
      
      // Update scale with smooth animation
      const targetScale = newScale;
      const glowTargetScale = newScale * 1.5;
      
      // Simple scaling animation
      this.animateScale(targetOrb.mesh, targetScale);
      this.animateScale(targetOrb.glowMesh, glowTargetScale);
    }
    
    // Create merge particle effect
    this.eventBus.emit('particles:hit', {
      position: targetOrb.position
    });
  }
  
  private getScaleByTier(tier: number): number {
    switch (tier) {
      case 1: return 0.4;
      case 2: return 0.6;
      case 3: return 0.8;
      default: return 0.4;
    }
  }
  
  private animateScale(mesh: THREE.Mesh, targetScale: number): void {
    const currentScale = mesh.scale.x;
    const duration = 200; // ms
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const scale = currentScale + (targetScale - currentScale) * progress;
      mesh.scale.setScalar(scale);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  private addToSpatialGrid(orb: XPOrb): void {
    const gridKey = this.getGridKey(orb.position);
    if (!this.spatialGrid.has(gridKey)) {
      this.spatialGrid.set(gridKey, new Set());
    }
    this.spatialGrid.get(gridKey)!.add(orb.id);
  }
  
  private removeFromSpatialGrid(orb: XPOrb): void {
    const gridKey = this.getGridKey(orb.position);
    const orbSet = this.spatialGrid.get(gridKey);
    if (orbSet) {
      orbSet.delete(orb.id);
      if (orbSet.size === 0) {
        this.spatialGrid.delete(gridKey);
      }
    }
  }
  
  private getGridKey(position: THREE.Vector3): string {
    const x = Math.floor(position.x / this.GRID_SIZE);
    const y = Math.floor(position.y / this.GRID_SIZE);
    return `${x},${y}`;
  }
  
  private getGridKeysInRadius(position: THREE.Vector3, radius: number): string[] {
    const keys: string[] = [];
    const cellsToCheck = Math.ceil(radius / this.GRID_SIZE) + 1;
    
    const centerX = Math.floor(position.x / this.GRID_SIZE);
    const centerY = Math.floor(position.y / this.GRID_SIZE);
    
    for (let x = centerX - cellsToCheck; x <= centerX + cellsToCheck; x++) {
      for (let y = centerY - cellsToCheck; y <= centerY + cellsToCheck; y++) {
        keys.push(`${x},${y}`);
      }
    }
    
    return keys;
  }
  
  /**
   * Update system - handle collection and animations
   */
  update(deltaTime: number): void {
    if (!this.isActive || this.orbs.size === 0) return;
    
    // Check for orb collection
    this.checkOrbCollection();
    
    // Animate orb floating and glowing
    this.animateOrbs(deltaTime);
  }
  
  private checkOrbCollection(): void {
    const orbsToCollect: XPOrb[] = [];
    
    this.orbs.forEach(orb => {
      const distance = orb.position.distanceTo(this.playerPosition);
      if (distance <= this.COLLECT_DISTANCE) {
        orbsToCollect.push(orb);
      }
    });
    
    // Collect orbs
    orbsToCollect.forEach(orb => {
      this.collectOrb(orb);
    });
  }
  
  private collectOrb(orb: XPOrb): void {
    // Emit XP gain event
    this.eventBus.emit('player:gain-xp', {
      amount: orb.xpValue,
      position: orb.position
    });
    
    // Create collection particle effect
    this.eventBus.emit('particles:hit', {
      position: orb.position
    });
    
    // Play collection sound
    this.eventBus.emit('audio:play', {
      soundId: 'powerup',
      options: { volume: 0.3 }
    });
    
    // Remove orb
    this.removeOrb(orb);
  }
  
  private removeOrb(orb: XPOrb): void {
    // Remove from scene
    this.scene.remove(orb.mesh);
    this.scene.remove(orb.glowMesh);
    
    // Remove from collections
    this.removeFromSpatialGrid(orb);
    this.orbs.delete(orb.id);
    
    // Dispose resources
    orb.dispose();
  }
  
  private animateOrbs(deltaTime: number): void {
    const time = performance.now() * 0.001;
    
    this.orbs.forEach(orb => {
      // Floating animation
      const floatOffset = Math.sin(time * 2 + orb.createdAt * 0.001) * 0.1;
      orb.mesh.position.y = orb.position.y + floatOffset;
      orb.glowMesh.position.y = orb.position.y + floatOffset;
      
      // Rotation
      orb.mesh.rotation.y += deltaTime * 2;
      orb.glowMesh.rotation.y += deltaTime * 1.5;
      
      // Pulsing glow
      const pulse = (Math.sin(time * 4 + orb.createdAt * 0.002) + 1) * 0.5;
      const glowMaterial = orb.glowMesh.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.2 + pulse * 0.3;
    });
  }
  
  /**
   * Clear all orbs (game over, etc.)
   */
  clear(): void {
    const orbsToRemove = Array.from(this.orbs.values());
    orbsToRemove.forEach(orb => {
      this.removeOrb(orb);
    });
  }
  
  /**
   * Dispose system resources
   */
  dispose(): void {
    this.clear();
    this.orbGeometry.dispose();
    this.glowGeometry.dispose();
  }
  
  /**
   * Get system statistics
   */
  getStats(): { totalOrbs: number; totalXP: number; orbsByTier: { [tier: number]: number } } {
    const orbsByTier: { [tier: number]: number } = { 1: 0, 2: 0, 3: 0 };
    let totalXP = 0;
    
    this.orbs.forEach(orb => {
      orbsByTier[orb.tier]++;
      totalXP += orb.xpValue;
    });
    
    return {
      totalOrbs: this.orbs.size,
      totalXP,
      orbsByTier
    };
  }
}