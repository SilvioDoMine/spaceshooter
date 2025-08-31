import * as THREE from 'three';
import { Entity, Position } from './Entity';
import { EventBus } from '../core/EventBus';
import { assetManager } from '../services/AssetManager';
import { ENEMY_CONFIG } from '@spaceshooter/shared';
import type { Enemy as EnemyData } from '@spaceshooter/shared';

export class Enemy extends Entity {
  private enemyType: EnemyData['type'];
  private health: number;
  private maxHealth: number;
  private config: typeof ENEMY_CONFIG[keyof typeof ENEMY_CONFIG];
  
  // Barra de vida do inimigo
  private healthBarGroup?: THREE.Group;
  private healthBarBackground?: THREE.Mesh;
  private healthBarForeground?: THREE.Mesh;
  
  // Sistema de tiro
  private lastShotTime: number = 0;

  constructor(
    eventBus: EventBus,
    id: string,
    enemyType: EnemyData['type'],
    initialPosition: Position
  ) {
    const config = ENEMY_CONFIG[enemyType];
    if (!config) {
      console.error(`❌ Enemy config not found for type: ${enemyType}`);
      throw new Error(`Enemy config not found for type: ${enemyType}`);
    }
    // Inicializa com velocidade zero, será calculada no update
    super(eventBus, id, initialPosition, { x: 0, y: 0 });
    this.enemyType = enemyType;
    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;
    this.createVisual();
  }

  protected setupEventHandlers(): void {
    const unsubscribeProjectileHit = this.eventBus.on('projectile:hit', (data) => {
      if (data.targetId === this.id) {
        this.takeDamage(data.damage);
      }
    });

    this.addCleanupFunction(unsubscribeProjectileHit);
  }

  protected createVisual(): void {
    if (!this.config) {
      console.error('❌ Enemy config not found for type:', this.enemyType);
      return;
    }
    
    const size = this.config.size || 0.3;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = assetManager.getEnemyMaterial(this.enemyType);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.object.add(mesh);
    
    // Create collision visualizer for enemy
    const radius = this.config.radius || (this.config.size || 0.3);
    this.createCollisionVisualizer(radius);
    
    this.eventBus.emit('scene:add-object', { object: this.object });
  }

  protected onUpdate(deltaTime: number): void {
    if (!this.isActive) return;

    // Persegue o jogador
    const game = (window as any).game;
    if (game && typeof game.getEntitySystem === 'function') {
      const entitySystem = game.getEntitySystem();
      if (entitySystem && typeof entitySystem.getPlayer === 'function') {
        const player = entitySystem.getPlayer();
        if (player && typeof player.getPosition === 'function') {
          const playerPos = player.getPosition();
          const dx = playerPos.x - this.position.x;
          const dy = playerPos.y - this.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.01) {
            this.velocity.x = (dx / dist) * this.config.speed;
            this.velocity.y = (dy / dist) * this.config.speed;
          }
        }
      }
    }
    // Move
    this.setPosition({
      x: this.position.x + this.velocity.x * deltaTime,
      y: this.position.y + this.velocity.y * deltaTime
    });

    // Atualiza posição da barra de vida
    this.updateHealthBarPosition();

    // Sistema de tiro (se configurado)
    this.tryShoot(deltaTime);

    this.checkPlayerCollision();
  }

  private checkBoundsAndDestroy(): void {
    // Remove inimigo se sair muito longe do mapa
    const bounds = { minX: -15, maxX: 15, minY: -12, maxY: 12 };
    if (!this.checkBounds(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)) {
      this.destroy();
    }
  }

  private handleEscape(): void {
    const escapePenalty = this.getEscapePenalty();
    
    console.log(`🏃 Enemy ${this.enemyType} escaping! Damage: ${escapePenalty}`);
    
    // Emit enemy escape event - other systems will handle the consequences
    this.eventBus.emit('enemy:escaped', { 
      damage: escapePenalty,
      enemyType: this.enemyType,
      enemyId: this.id
    });

    this.eventBus.emit('audio:play', { soundId: 'hit', options: { volume: 0.3 } });
    
    this.eventBus.emit('particles:hit', {
      position: { x: 0, y: -3, z: 0 }
    });
    
    console.log(`Enemy ${this.enemyType} escaped! -${escapePenalty} HP`);
    
    this.destroy();
  }

  private getEscapePenalty(): number {
    switch (this.enemyType) {
      case 'basic': return 5;
      case 'fast': return 8;
      case 'heavy': return 15;
      default: return 5;
    }
  }

  private checkPlayerCollision(): void {
    this.eventBus.emit('collision:check', {
      entityId: this.id,
      entityType: 'enemy',
      position: this.position,
      radius: this.config.radius,
      damage: this.getCollisionDamage()
    });
  }

  private getCollisionDamage(): number {
    switch (this.enemyType) {
      case 'basic': return 10;
      case 'fast': return 15;
      case 'heavy': return 25;
      default: return 10;
    }
  }

  public takeDamage(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);
    
    // Se for boss, emite evento para atualizar barra do HUD
    if (this.enemyType === 'boss') {
      this.eventBus.emit('boss:damage-taken', {
        health: this.health,
        maxHealth: this.maxHealth
      });
    }
    
    // Mostra a barra de vida quando o inimigo toma dano
    if (this.health < this.maxHealth && this.health > 0) {
      this.showHealthBar();
    }
    
    if (this.health <= 0) {
      this.onDeath();
      return true;
    }
    
    return false;
  }

  public getEnemyType(): EnemyData['type'] {
    return this.enemyType;
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  private onDeath(): void {
    const scorePoints = this.getScoreValue();
    const xpReward = this.config.xpDrop;
    
    // Emit enemy death event - other systems will handle score/rewards
    this.eventBus.emit('enemy:destroyed', { 
      points: scorePoints,
      xp: xpReward,
      xpOrbCount: this.config.xpOrbCount,
      enemyType: this.enemyType,
      enemyId: this.id,
      position: { x: this.position.x, y: this.position.y, z: 0 }
    });
    
    this.eventBus.emit('audio:play', { soundId: 'explosion', options: { volume: 0.4 } });
    
    this.eventBus.emit('particles:explosion', {
      position: { x: this.position.x, y: this.position.y, z: 0 }
    });

    console.log(`Enemy ${this.enemyType} destroyed! +${scorePoints} points`);
    
    this.destroy();
  }

  private getScoreValue(): number {
    switch (this.enemyType) {
      case 'basic': return 10;
      case 'fast': return 25;
      case 'heavy': return 50;
      default: return 10;
    }
  }

  private createGradientTexture(width: number, height: number): THREE.CanvasTexture {
    // Criar canvas para o gradiente
    const canvas = document.createElement('canvas');
    const canvasWidth = 256; // Resolução da textura
    const canvasHeight = 32;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    const context = canvas.getContext('2d')!;
    
    // Criar gradiente vertical totalmente vermelho (cima para baixo) para indicar inimigo
    const gradient = context.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#ff0000'); // Vermelho puro no topo
    gradient.addColorStop(0.5, '#dd0000'); // Vermelho puro no meio
    gradient.addColorStop(1, '#aa0000'); // Vermelho puro escuro embaixo (sombra)
    
    // Preencher o canvas com o gradiente
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Criar textura Three.js
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    return texture;
  }

  private createEnemyHealthBar(): void {
    const group = new THREE.Group();
    
    // Dimensões da barra de vida do inimigo (igual ao player)
    const barWidth = 0.7; // Mesma largura do player (mais curta)
    const barHeight = 0.08; // Mesma altura do player
    
    // Borda preta (mesma espessura do player)
    const borderThickness = 0.02; // Mesma espessura do player
    const borderGeom = new THREE.PlaneGeometry(barWidth + borderThickness * 2, barHeight + borderThickness * 2);
    const borderMat = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: false, 
      depthTest: false 
    });
    const border = new THREE.Mesh(borderGeom, borderMat);
    border.position.z = -0.002;
    border.renderOrder = 9997;
    group.add(border);
    
    // Fundo cinza escuro para mostrar barra total quando danificado
    const bgGeom = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMat = new THREE.MeshBasicMaterial({ 
      color: 0x333333, // Cinza escuro como os segmentos vazios do player
      transparent: false, 
      depthTest: false 
    });
    this.healthBarBackground = new THREE.Mesh(bgGeom, bgMat);
    this.healthBarBackground.position.z = -0.001;
    this.healthBarBackground.renderOrder = 9998;
    group.add(this.healthBarBackground);
    
    // Barra de vida com gradiente laranja-vermelho (foreground)
    const fgGeom = new THREE.PlaneGeometry(barWidth, barHeight * 0.9);
    const gradientTexture = this.createGradientTexture(barWidth, barHeight * 0.9);
    const fgMat = new THREE.MeshBasicMaterial({ 
      map: gradientTexture,
      transparent: false, 
      depthTest: false 
    });
    this.healthBarForeground = new THREE.Mesh(fgGeom, fgMat);
    this.healthBarForeground.position.z = 0.001;
    this.healthBarForeground.renderOrder = 9999;
    group.add(this.healthBarForeground);
    
    // Posição acima do inimigo
    const enemySize = this.config.size || 0.3;
    group.position.set(this.position.x, this.position.y + enemySize * 0.8, 0);
    group.rotation.set(0, 0, 0); // Sempre reta
    group.renderOrder = 10000;
    
    this.healthBarGroup = group;
    this.eventBus.emit('scene:add-object', { object: group });
  }
  
  private showHealthBar(): void {
    if (!this.healthBarGroup) {
      this.createEnemyHealthBar();
    }
    this.updateHealthBar();
  }
  
  private updateHealthBar(): void {
    if (!this.healthBarGroup || !this.healthBarForeground) return;
    
    const healthPercentage = this.health / this.maxHealth;
    
    // Atualiza a escala da barra vermelha baseada na vida
    this.healthBarForeground.scale.x = Math.max(0, healthPercentage);
    
    // Ajusta posição para manter alinhamento à esquerda
    const barWidth = 0.7; // Mesma largura do player (mais curta)
    const originalX = 0;
    this.healthBarForeground.position.x = originalX - (barWidth * (1 - healthPercentage)) / 2;
  }
  
  private updateHealthBarPosition(): void {
    if (this.healthBarGroup) {
      const enemySize = this.config.size || 0.3;
      this.healthBarGroup.position.set(
        this.position.x, 
        this.position.y + enemySize * 0.8, 
        0
      );
    }
  }
  
  private hideHealthBar(): void {
    if (this.healthBarGroup) {
      this.eventBus.emit('scene:remove-object', { object: this.healthBarGroup });
      this.healthBarGroup = undefined;
      this.healthBarBackground = undefined;
      this.healthBarForeground = undefined;
    }
  }

  protected onDestroy(): void {
    // Remove a barra de vida ao destruir o inimigo
    this.hideHealthBar();
    this.eventBus.emit('scene:remove-object', { object: this.object });
  }

  private tryShoot(deltaTime: number): void {
    // Verifica se essa entidade pode atirar
    const projectileConfig = this.config.projectile;
    if (!projectileConfig || !projectileConfig.canShoot) {
      return;
    }

    const currentTime = Date.now() / 1000; // em segundos
    const cooldownTime = projectileConfig.cooldown || 2.0;

    // Verifica cooldown
    if (currentTime - this.lastShotTime < cooldownTime) {
      return;
    }

    // Busca o jogador
    const game = (window as any).game;
    if (!game || typeof game.getEntitySystem !== 'function') {
      return;
    }

    const entitySystem = game.getEntitySystem();
    if (!entitySystem || typeof entitySystem.getPlayer !== 'function') {
      return;
    }

    const player = entitySystem.getPlayer();
    if (!player || typeof player.getPosition !== 'function') {
      return;
    }

    const playerPos = player.getPosition();
    const dx = playerPos.x - this.position.x;
    const dy = playerPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Verifica se está dentro do alcance
    if (projectileConfig.shootRange && distance > projectileConfig.shootRange) {
      return;
    }

    // Calcula direção para o jogador
    if (distance > 0.01) {
      const speed = projectileConfig.speed || 8;
      const velocity = {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed
      };

      // Cria o projétil
      this.eventBus.emit('entity:shoot', {
        ownerId: this.id,
        position: { x: this.position.x, y: this.position.y },
        velocity: velocity,
        damage: projectileConfig.damage || 10,
        config: {
          size: projectileConfig.size,
          radius: projectileConfig.radius,
          color: projectileConfig.color,
          lifetime: projectileConfig.lifetime
        }
      });

      this.lastShotTime = currentTime;
      console.log(`💥 ${this.enemyType} shot at player! Distance: ${distance.toFixed(2)}`);
    }
  }

  public static spawnEnemy(eventBus: EventBus): Enemy {
    const currentTime = Date.now();
    const enemyId = `enemy_${currentTime}_${Math.random()}`;
    const rand = Math.random();
    let enemyType: EnemyData['type'];
    if (rand < 0.7) {
      enemyType = 'basic';
    } else if (rand < 0.9) {
      enemyType = 'fast';
    } else {
      enemyType = 'heavy';
    }
    // Spawn em uma borda aleatória do mapa
    const edge = Math.floor(Math.random() * 4); // 0:top, 1:bottom, 2:left, 3:right
    let x = 0, y = 0;
    const bounds = { minX: -10, maxX: 10, minY: -7.5, maxY: 7.5 };
    if (edge === 0) { // topo
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      y = bounds.maxY;
    } else if (edge === 1) { // baixo
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      y = bounds.minY;
    } else if (edge === 2) { // esquerda
      x = bounds.minX;
      y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    } else { // direita
      x = bounds.maxX;
      y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    }
    const spawnPosition: Position = { x, y };
    const enemy = new Enemy(eventBus, enemyId, enemyType, spawnPosition);
    console.log(`Enemy spawned: ${enemyType} at (${spawnPosition.x.toFixed(1)}, ${spawnPosition.y.toFixed(1)})`);
    return enemy;
  }

  public static spawnBoss(eventBus: EventBus): Enemy {
    const currentTime = Date.now();
    const bossId = `boss_${currentTime}_${Math.random()}`;
    const enemyType: EnemyData['type'] = 'boss';
    
    // Spawn boss em uma borda aleatória do mapa
    const edge = Math.floor(Math.random() * 4); // 0:top, 1:bottom, 2:left, 3:right
    let x = 0, y = 0;
    const bounds = { minX: -10, maxX: 10, minY: -7.5, maxY: 7.5 };
    if (edge === 0) { // topo
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      y = bounds.maxY;
    } else if (edge === 1) { // baixo
      x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      y = bounds.minY;
    } else if (edge === 2) { // esquerda
      x = bounds.minX;
      y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    } else { // direita
      x = bounds.maxX;
      y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
    }
    
    const spawnPosition: Position = { x, y };
    const boss = new Enemy(eventBus, bossId, enemyType, spawnPosition);
    console.log(`👹 BOSS spawned at (${spawnPosition.x.toFixed(1)}, ${spawnPosition.y.toFixed(1)})!`);
    return boss;
  }
}