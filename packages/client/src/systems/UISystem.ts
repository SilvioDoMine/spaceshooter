import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { UISkillModal } from './UISkillModal';

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
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  // UI Elements
  private hudGroup!: THREE.Group;
  private scoreText?: THREE.Sprite;
  private ammoText?: THREE.Sprite;
  private levelText?: THREE.Sprite;
  private xpBar?: THREE.Mesh;
  private xpBarBg?: THREE.Mesh;
  private skillModal?: THREE.Group;
  private skillOptions: any[] = [];
  private skillModalKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private htmlSkillModal: UISkillModal;
  // Boss health bar
  private bossHealthBarGroup?: THREE.Group;
  private bossHealthBar?: THREE.Mesh;
  private bossHealthBarBg?: THREE.Mesh;
  private bossNameText?: THREE.Sprite;

  // Canvas global não mais necessário - cada sprite tem seu próprio canvas
  
  // State
  private currentScore: number = 0;
  private currentHealth: number = 100;
  private maxHealth: number = 100;
  private currentAmmo: number = 30;
  private maxAmmo: number = 30;
  private currentLevel: number = 1;
  private currentXP: number = 0;
  private xpToNext: number = 100;
  private xpProgress: number = 0;

  private eventBus: EventBus;

  constructor(eventBus: EventBus, renderingSystem?: THREE.Scene & THREE.WebGLRenderer) {
    this.eventBus = eventBus;
    this.htmlSkillModal = new UISkillModal((skillType) => this.selectSkill(skillType));
    this.setupEventListeners();
  }
  
  public setRenderingSystem(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  this.initialize({ renderer });
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

  // Removido: não há mais barra de vida no HUD

    this.eventBus.on('ui:update-ammo', (data: { current: number; max: number }) => {
      this.updateAmmo(data.current, data.max);
    });

    this.eventBus.on('ui:update-score', (data: { score: number }) => {
      this.updateScore(data.score);
    });

    this.eventBus.on('ui:update-level', (data: { level: number; currentXP: number; xpToNext: number; progress: number }) => {
      this.updateLevel(data.level, data.currentXP, data.xpToNext, data.progress);
    });

    this.eventBus.on('ui:level-up-effect', (data: { oldLevel: number; newLevel: number; currentXP: number }) => {
      this.showLevelUpEffect(data.oldLevel, data.newLevel);
    });

    this.eventBus.on('ui:show-skill-selection', (data: { skillOptions: any[] }) => {
      this.showSkillSelectionModal(data.skillOptions);
    });

    this.eventBus.on('game:started', () => {
      this.resetUI();
    });

    // Remover barra do boss ao terminar o jogo
    this.eventBus.on('game:over', () => {
      this.hideBossHealthBar();
    });

    // Boss events
    this.eventBus.on('boss:spawned', (data: { bossId: string; boss: any }) => {
      this.showBossHealthBar(data.boss);
    });

    this.eventBus.on('boss:defeated', (data: { enemyId: string }) => {
      this.hideBossHealthBar();
    });

    this.eventBus.on('boss:damage-taken', (data: { health: number; maxHealth: number }) => {
      this.updateBossHealthBar(data.health, data.maxHealth);
    });
  }

  private createUIElements(): void {
    const aspect = window.innerWidth / window.innerHeight;
    const baseScale = 0.15;
    // Score (top-left)
    this.scoreText = this.createTextSprite(`Score: ${this.currentScore}`);
    this.scoreText.position.set(-aspect * 0.9, 0.85, 0);
    this.scoreText.scale.setScalar(baseScale);
    this.hudGroup.add(this.scoreText);
    // Ammo (top-right)
    this.ammoText = this.createTextSprite(`Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
    this.ammoText.position.set(aspect * 0.9, 0.85, 0);
    this.ammoText.scale.setScalar(baseScale);
    this.hudGroup.add(this.ammoText);
    // Level text (top-center, below score/ammo)
    this.levelText = this.createTextSprite(`Level ${this.currentLevel}`);
    this.levelText.position.set(0, 0.7, 0);
    this.levelText.scale.setScalar(baseScale * 0.7);
    this.hudGroup.add(this.levelText);
    // XP bar background (below level text)
    const xpBarWidth = Math.min(aspect * 0.3, 0.5);
    const xpBarBgGeometry = new THREE.PlaneGeometry(xpBarWidth, 0.025);
    const xpBarBgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x222244,
      transparent: true,
      opacity: 0.8
    });
    this.xpBarBg = new THREE.Mesh(xpBarBgGeometry, xpBarBgMaterial);
    this.xpBarBg.position.set(0, 0.6, 0);
    this.hudGroup.add(this.xpBarBg);
    // XP bar (foreground)
    const xpBarGeometry = new THREE.PlaneGeometry(xpBarWidth, 0.025);
    const xpBarMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4444ff,
      transparent: true,
      opacity: 0.9
    });
    this.xpBar = new THREE.Mesh(xpBarGeometry, xpBarMaterial);
    this.xpBar.position.set(0, 0.6, 0.001);
    this.hudGroup.add(this.xpBar);
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
    this.currentLevel = 1;
    this.currentXP = 0;
    this.xpToNext = 100;
    this.xpProgress = 0;
    
    // Update all UI elements
    if (this.scoreText) {
      this.updateTextSprite(this.scoreText, `Score: ${this.currentScore}`);
    }
    
  if (this.ammoText) {
      this.updateTextSprite(this.ammoText, `Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
    }
    
    if (this.levelText) {
      this.updateTextSprite(this.levelText, `Level ${this.currentLevel}`, '#ffffff');
    }
    
    // Update health bar
  // healthBar removido
    
    // Update XP bar
    if (this.xpBar) {
      this.xpBar.scale.x = Math.max(0, this.xpProgress / 100);
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
  
  // updateHealth removido: barra de vida do HUD não existe mais
  
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
  
  public updateLevel(level: number, currentXP: number, xpToNext: number, progress: number): void {
    this.currentLevel = level;
    this.currentXP = currentXP;
    this.xpToNext = xpToNext;
    this.xpProgress = progress;
    
    // Update level text
    if (this.levelText) {
      this.updateTextSprite(this.levelText, `Level ${level}`, '#ffffff');
    }
    
    // Update XP bar
    if (this.xpBar) {
      const xpBarScale = Math.max(0, progress / 100);
      this.xpBar.scale.x = xpBarScale;
      
      // Update XP bar position to keep it left-aligned
      const barWidth = Math.min(window.innerWidth / window.innerHeight * 0.3, 0.5);
      this.xpBar.position.x = -barWidth * 0.5 * (1 - xpBarScale);
    }
  }
  
  public showLevelUpEffect(oldLevel: number, newLevel: number): void {
    // Create a temporary level up text that fades out
    const levelUpText = this.createTextSprite(`LEVEL UP! ${newLevel}`, '#ffff00');
    levelUpText.position.set(0, 0.2, 0.1);
    levelUpText.scale.setScalar(0.25);
    this.hudGroup.add(levelUpText);
    
    // Animate the level up text
    let opacity = 1.0;
    let scale = 0.25;
    const animate = () => {
      opacity -= 0.02;
      scale += 0.002;
      
      if (levelUpText.material && 'opacity' in levelUpText.material) {
        (levelUpText.material as any).opacity = opacity;
      }
      levelUpText.scale.setScalar(scale);
      
      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.hudGroup.remove(levelUpText);
        // Dispose of the temporary text
        if (levelUpText.material) {
          (levelUpText.material as THREE.Material).dispose();
        }
      }
    };
    animate();
  }
  
  public showSkillSelectionModal(skillOptions: any[]): void {
    this.skillOptions = skillOptions;
    
    // Pause the game completely while modal is open
  this.eventBus.emit('game:pause-for-skill-selection', {});
    console.log('⏸️ Game paused for skill selection');
    
    // Show HTML modal
    this.htmlSkillModal.show(skillOptions);
  }
  
  
  private selectSkill(skillType: string): void {
    // Emit skill selection event
    this.eventBus.emit('ui:skill-selected', { skillType });
    
    this.skillOptions = [];
    
    // Resume game after skill selection
  this.eventBus.emit('game:resume-after-skill-selection', {});
    console.log('▶️ Game resumed after skill selection');
    
    // Grant 0.5 seconds of invulnerability
    this.eventBus.emit('player:set-invulnerable', { duration: 0.5 });
    console.log('🛡️ Player granted 0.5s invulnerability');
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
      || this.ammoText === undefined
      || this.levelText === undefined
      || this.xpBar === undefined
      || this.xpBarBg === undefined
    ) {
      console.warn('One or more UI elements not initialized yet, skipping update');
      return;
    }

    // Update positions
    this.scoreText.position.x = -aspect * 0.9;
    this.scoreText.scale.setScalar(baseScale);
    this.ammoText.position.x = aspect * 0.9;
    this.ammoText.scale.setScalar(baseScale);
    this.levelText.scale.setScalar(baseScale * 0.7);
    // Update XP bar width
    const barWidth = Math.min(aspect * 0.3, 0.5);
    const originalWidth = Math.min(window.innerWidth / window.innerHeight * 0.3, 0.5);
    this.xpBarBg.scale.x = barWidth / originalWidth;
    this.xpBar.scale.x = (barWidth / originalWidth) * (this.xpProgress / 100);
    this.xpBar.position.x = -barWidth * 0.5 * (1 - (this.xpProgress / 100));
  }
  
  
  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Dispose HTML skill modal
    this.htmlSkillModal.dispose();
    
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
  
  // getHealth removido: barra de vida do HUD não existe mais
  
  public getAmmo(): { current: number; max: number } {
    return { current: this.currentAmmo, max: this.maxAmmo };
  }

  // Boss health bar methods
  public showBossHealthBar(boss: any): void {
    if (this.bossHealthBarGroup) {
      this.hideBossHealthBar();
    }

    const aspect = window.innerWidth / window.innerHeight;
    this.bossHealthBarGroup = new THREE.Group();

    // Boss name text
    this.bossNameText = this.createTextSprite('BOSS', '#ff0080');
    this.bossNameText.position.set(0, -0.6, 0);
    this.bossNameText.scale.setScalar(0.12);
    this.bossHealthBarGroup.add(this.bossNameText);

    // Health bar background
    const barWidth = Math.min(aspect * 0.8, 1.2); // Barra bem grande
    const barHeight = 0.04;
    const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.8
    });
    this.bossHealthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
    this.bossHealthBarBg.position.set(0, -0.7, 0);
    this.bossHealthBarGroup.add(this.bossHealthBarBg);

    // Health bar foreground (red)
    const fgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
    const fgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    });
    this.bossHealthBar = new THREE.Mesh(fgGeometry, fgMaterial);
    this.bossHealthBar.position.set(0, -0.7, 0.001);
    this.bossHealthBarGroup.add(this.bossHealthBar);

    this.hudGroup.add(this.bossHealthBarGroup);
    console.log('👹 Boss health bar displayed in HUD');
  }

  public updateBossHealthBar(health: number, maxHealth: number): void {
    if (!this.bossHealthBar || !this.bossHealthBarBg) return;

    const healthPercentage = Math.max(0, health / maxHealth);
    
    // Update health bar scale
    this.bossHealthBar.scale.x = healthPercentage;
    
    // Adjust position to keep it left-aligned
    const aspect = window.innerWidth / window.innerHeight;
    const barWidth = Math.min(aspect * 0.8, 1.2);
    this.bossHealthBar.position.x = -barWidth * 0.5 * (1 - healthPercentage);
    
    console.log(`👹 Boss health updated: ${health}/${maxHealth} (${(healthPercentage * 100).toFixed(1)}%)`);
  }

  public hideBossHealthBar(): void {
    if (this.bossHealthBarGroup) {
      this.hudGroup.remove(this.bossHealthBarGroup);
      
      // Dispose materials and geometries
      this.bossHealthBarGroup.traverse((object) => {
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
      
      this.bossHealthBarGroup = undefined;
      this.bossHealthBar = undefined;
      this.bossHealthBarBg = undefined;
      this.bossNameText = undefined;
      
      console.log('👹 Boss health bar hidden from HUD');
    }
  }
}