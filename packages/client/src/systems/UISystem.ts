import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

/**
 * Sistema de UI/HUD totalmente em Three.js
 * 
 * Cria e gerencia elementos de interface do usuário usando sprites e text geometry
 * diretamente na cena 3D, sem HTML/CSS externo.
 * 
 * Características:
 * - HUD overlay usando ortographic camera
 * - Text sprites para score, vida, munição
 * - Barras de vida visuais
 * - Posicionamento responsivo
 * - Performance otimizada para 60fps
 * 
 * @example
 * ```typescript
 * const uiSystem = new UISystem(renderingSystem);
 * uiSystem.updateScore(1500);
 * uiSystem.updateHealth(75, 100);
 * uiSystem.updateAmmo(24, 30);
 * ```
 */
export class UISystem {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  
  // UI Elements
  private hudGroup: THREE.Group;
  private scoreText?: THREE.Sprite;
  private healthText?: THREE.Sprite;
  private ammoText?: THREE.Sprite;
  private healthBar?: THREE.Mesh;
  private healthBarBg?: THREE.Mesh;

  // Canvas global não mais necessário - cada sprite tem seu próprio canvas
  
  // State
  private currentScore: number = 0;
  private currentHealth: number = 100;
  private maxHealth: number = 100;
  private currentAmmo: number = 30;
  private maxAmmo: number = 30;

  private eventBus: EventBus;

  constructor(eventBus: EventBus, renderingSystem?: THREE.Scene & THREE.WebGLRenderer) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }
  
  public setRenderingSystem(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
    this.initialize({ scene, renderer });
  }
  
  private initialize(data: { renderer: THREE.WebGLRenderer }): void {
    this.renderer = data.renderer;
    this.scene = new THREE.Scene();
    
    // Setup ortographic camera para UI overlay
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(
      -aspect, aspect, 1, -1, 0.1, 10
    );
    this.camera.position.z = 1;
    
    // Canvas individual será criado para cada texto
    
    // Inicializar UI elements
    this.hudGroup = new THREE.Group();
    this.scene.add(this.hudGroup);
    
    this.createUIElements();
    
    // Handler para resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Registrar UI scene no RenderingSystem
    this.eventBus.emit('renderer:register-ui-scene', {
      scene: this.scene,
      camera: this.camera
    });
    
    // Notificar que UI está pronta
    this.eventBus.emit('ui:ready', {});
  }

  private setupEventListeners(): void {
    this.eventBus.on('renderer:ready', (data) => {
      this.initialize(data);
    });

    this.eventBus.on('ui:update-health', (data: { current: number; max?: number }) => {
      this.updateHealth(data.current, data.max);
    });

    this.eventBus.on('ui:update-ammo', (data: { current: number; max: number }) => {
      this.updateAmmo(data.current, data.max);
    });

    this.eventBus.on('ui:update-score', (data: { score: number }) => {
      this.updateScore(data.score);
    });

    this.eventBus.on('game:started', () => {
      this.resetUI();
    });
  }

  private createUIElements(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const baseScale = 0.15; // Fixed base scale instead of responsive
    
    // Score (top-left)
    this.scoreText = this.createTextSprite(`Score: ${this.currentScore}`);
    this.scoreText.position.set(-aspect * 0.9, 0.85, 0);
    this.scoreText.scale.setScalar(baseScale);
    this.hudGroup.add(this.scoreText);
    
    // Health text (top-center) with correct initial color
    const healthPercent = (this.currentHealth / this.maxHealth) * 100;
    let healthColor = '#00ff00'; // Green
    if (healthPercent < 50) healthColor = '#ffff00'; // Yellow
    if (healthPercent < 25) healthColor = '#ff0000'; // Red
    
    this.healthText = this.createTextSprite(`Health: ${this.currentHealth}/${this.maxHealth}`, healthColor);
    this.healthText.position.set(0, 0.85, 0);
    this.healthText.scale.setScalar(baseScale);
    this.hudGroup.add(this.healthText);
    
    // Health bar background (top-center, below text)
    const barWidth = Math.min(aspect * 0.3, 0.5);
    const healthBarBgGeometry = new THREE.PlaneGeometry(barWidth, 0.05);
    const healthBarBgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x330000,
      transparent: true,
      opacity: 0.8
    });
    this.healthBarBg = new THREE.Mesh(healthBarBgGeometry, healthBarBgMaterial);
    this.healthBarBg.position.set(0, 0.65, 0);
    this.hudGroup.add(this.healthBarBg);
    
    // Health bar (foreground)
    const healthBarGeometry = new THREE.PlaneGeometry(barWidth, 0.05);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.9
    });
    this.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    this.healthBar.position.set(0, 0.65, 0.001); // Slightly in front
    this.hudGroup.add(this.healthBar);
    
    // Ammo (top-right)
    this.ammoText = this.createTextSprite(`Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
    this.ammoText.position.set(aspect * 0.9, 0.85, 0);
    this.ammoText.scale.setScalar(baseScale);
    this.hudGroup.add(this.ammoText);
  }
  
  private createTextSprite(text: string, color: string = '#ffffff'): THREE.Sprite {
    // Criar canvas específico para cada texto com tamanho dinâmico
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // Setup font temporário para medir texto
    const fontSize = 64;
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    
    // Medir texto para definir tamanho do canvas
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.4; // Altura com padding
    
    // Definir tamanho do canvas baseado no texto
    canvas.width = Math.ceil(textWidth + 40); // Padding horizontal
    canvas.height = Math.ceil(textHeight + 20); // Padding vertical
    
    // Reconfigurar context após mudança de tamanho
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add text shadow for better readability
    context.shadowColor = 'rgba(0, 0, 0, 0.9)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    // Draw text centralizado
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      alphaTest: 0.1
    });
    
    const sprite = new THREE.Sprite(material);
    
    // Store canvas reference for updates
    (sprite as any).textCanvas = canvas;
    (sprite as any).textContext = context;
    
    return sprite;
  }
  
  private updateTextSprite(sprite: THREE.Sprite, text: string, color: string = '#ffffff'): void {
    // Get canvas específico do sprite
    const canvas = (sprite as any).textCanvas as HTMLCanvasElement;
    const context = (sprite as any).textContext as CanvasRenderingContext2D;
    
    if (!canvas || !context) {
      console.warn('Canvas not found for sprite, recreating...');
      // Recriar sprite se canvas não existir
      const newSprite = this.createTextSprite(text, color);
      sprite.material = newSprite.material;
      (sprite as any).textCanvas = (newSprite as any).textCanvas;
      (sprite as any).textContext = (newSprite as any).textContext;
      return;
    }
    
    // Setup font para medir novo texto
    const fontSize = 64;
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    
    // Medir novo texto
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.4;
    
    // Redimensionar canvas se necessário
    const newWidth = Math.ceil(textWidth + 40);
    const newHeight = Math.ceil(textHeight + 20);
    
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
    }
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reconfigurar context após clear/resize
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add text shadow
    context.shadowColor = 'rgba(0, 0, 0, 0.9)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    // Draw text
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Update texture - Sempre recriar a textura para garantir atualização
    const material = sprite.material as THREE.SpriteMaterial;
    
    // Dispose da textura antiga se existir
    if (material.map) {
      material.map.dispose();
    }
    
    // Criar nova textura
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    material.map = texture;
  }
  
  // Public methods para atualizar UI state
  
  public resetUI(): void {
    console.log('🔄 Resetting UI to initial values');
    
    // Reset all values to initial state
    this.currentScore = 0;
    this.currentHealth = 100;
    this.maxHealth = 100;
    this.currentAmmo = 30;
    this.maxAmmo = 30;
    
    // Update all UI elements
    if (this.scoreText) {
      this.updateTextSprite(this.scoreText, `Score: ${this.currentScore}`);
    }
    
    if (this.healthText) {
      const healthPercent = (this.currentHealth / this.maxHealth) * 100;
      let healthColor = '#00ff00'; // Green
      if (healthPercent < 50) healthColor = '#ffff00'; // Yellow
      if (healthPercent < 25) healthColor = '#ff0000'; // Red
      
      this.updateTextSprite(this.healthText, `Health: ${this.currentHealth}/${this.maxHealth}`, healthColor);
    }
    
    if (this.ammoText) {
      this.updateTextSprite(this.ammoText, `Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
    }
    
    // Update health bar
    if (this.healthBar) {
      const healthBarScale = Math.max(0, this.currentHealth / this.maxHealth);
      this.healthBar.scale.setX(healthBarScale);
    }
  }
  
  public updateScore(score: number): void {
    if (this.scoreText === undefined) {
      console.warn('Score text not initialized yet, skipping update');
      return;
    }

    this.currentScore = score;
    this.updateTextSprite(this.scoreText, `Score: ${score}`, '#ffffff');
  }
  
  public addScore(points: number): void {
    if (this.scoreText === undefined) {
      console.warn('Score text not initialized yet, skipping update');
      return;
    }

    this.currentScore += points;
    this.updateTextSprite(this.scoreText, `Score: ${this.currentScore}`);
  }
  
  public updateHealth(current: number, max?: number): void {
    console.log(`Atualizando saúde: ${current}/${max}`);

    if (
      this.healthBar === undefined 
      || this.healthBarBg === undefined
      || this.healthText === undefined
    ) {
      console.warn('Health bar not initialized yet, skipping update');
      return;
    }

    this.currentHealth = Math.max(0, current);
    if (max !== undefined) {
      this.maxHealth = max;
    }
    
    // Update health text with color
    const healthPercent = (this.currentHealth / this.maxHealth) * 100;
    let healthColor = '#00ff00'; // Green
    if (healthPercent < 50) healthColor = '#ffff00'; // Yellow
    if (healthPercent < 25) healthColor = '#ff0000'; // Red
    
    this.updateTextSprite(
      this.healthText,
      `Health: ${this.currentHealth}/${this.maxHealth}`,
      healthColor
    );
    
    // Update health bar
    const healthBarScale = Math.max(0, this.currentHealth / this.maxHealth);
    this.healthBar.scale.x = healthBarScale;
    this.healthBar.position.x = -0.2 * (1 - healthBarScale);
    
    // Update health bar color
    const healthBarMaterial = this.healthBar.material as THREE.MeshBasicMaterial;
    if (healthPercent > 50) {
      healthBarMaterial.color.setHex(0x00ff00);
    } else if (healthPercent > 25) {
      healthBarMaterial.color.setHex(0xffff00);
    } else {
      healthBarMaterial.color.setHex(0xff0000);
    }
  }
  
  public updateAmmo(current: number, max: number): void {    
    // Update ammo text with color
    const ammoPercent = (current / max) * 100;
    let ammoColor = '#ffffff';
    if (ammoPercent < 30) ammoColor = '#ffff00';
    if (ammoPercent === 0) ammoColor = '#ff0000';

    if (this.ammoText === undefined) {
      console.warn('Ammo text not initialized yet, skipping update');
      return;
    }

    this.updateTextSprite(
      this.ammoText,
      `Ammo: ${current}/${max}`,
      ammoColor
    );
  }

  private onWindowResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.updateProjectionMatrix();
    
    // Reposicionar elementos com escala fixa
    const baseScale = 0.15;

    if (
      this.scoreText === undefined 
      || this.healthText === undefined 
      || this.healthBar === undefined
      || this.healthBarBg === undefined
      || this.ammoText === undefined
    ) {
      console.warn('One or more UI elements not initialized yet, skipping update');
      return;
    }

    // Update positions
    this.scoreText.position.x = -aspect * 0.9;
    this.scoreText.scale.setScalar(baseScale);
    
    this.healthText.scale.setScalar(baseScale);
    
    this.ammoText.position.x = aspect * 0.9;
    this.ammoText.scale.setScalar(baseScale);
    
    // Update health bar width
    const barWidth = Math.min(aspect * 0.3, 0.5);
    const originalWidth = Math.min(window.innerWidth / window.innerHeight * 0.3, 0.5);
    this.healthBarBg.scale.x = barWidth / originalWidth;
    this.healthBar.scale.x = (barWidth / originalWidth) * (this.currentHealth / this.maxHealth);
    this.healthBar.position.x = -barWidth * 0.5 * (1 - (this.currentHealth / this.maxHealth));
  }
  
  
  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Dispose materials and geometries
    this.hudGroup.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
    
    this.scene.clear();
  }
  
  // Getters para estado atual
  public getScore(): number {
    return this.currentScore;
  }
  
  public getHealth(): { current: number; max: number } {
    return { current: this.currentHealth, max: this.maxHealth };
  }
  
  public getAmmo(): { current: number; max: number } {
    return { current: this.currentAmmo, max: this.maxAmmo };
  }
}