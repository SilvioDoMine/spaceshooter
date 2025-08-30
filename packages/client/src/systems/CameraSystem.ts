import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import { WorldBounds, CameraConfig, DEFAULT_WORLD_BOUNDS, DEFAULT_CAMERA_CONFIG, clamp } from '@spaceshooter/shared';

/**
 * Sistema de Câmera com seguimento do jogador e limites de mundo
 * 
 * Responsável por:
 * - Seguir o jogador de forma suave
 * - Respeitar os limites do mundo
 * - Manter o jogador centralizado quando possível
 * - Permitir que o jogador saia do centro apenas nas bordas do mundo
 */
export class CameraSystem {
  private eventBus: EventBus;
  private camera: THREE.PerspectiveCamera;
  private worldBounds: WorldBounds;
  private cameraConfig: CameraConfig;
  
  // Estado da câmera
  private currentPosition: { x: number; y: number; z: number };
  private targetPosition: { x: number; y: number; z: number };
  
  // Posição do jogador
  private playerPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  
  // Limites da visualização da câmera
  private viewportSize: { width: number; height: number };

  constructor(eventBus: EventBus, camera: THREE.PerspectiveCamera) {
    this.eventBus = eventBus;
    this.camera = camera;
    this.worldBounds = { ...DEFAULT_WORLD_BOUNDS };
    this.cameraConfig = { ...DEFAULT_CAMERA_CONFIG };
    
    // Posição inicial da câmera
    this.currentPosition = { x: 0, y: 0, z: 5 };
    this.targetPosition = { x: 0, y: 0, z: 5 };
    
    // Calcular o tamanho do viewport baseado na câmera
    this.viewportSize = this.calculateViewportSize();
    
    this.setupEventListeners();
    this.updateCameraPosition();
    
    console.log('📷 Camera system initialized with world bounds:', this.worldBounds);
  }

  private setupEventListeners(): void {
    // Escutar mudanças na posição do jogador
    this.eventBus.on('debug:update', (data: any) => {
      if (data.playerPos) {
        // Parse player position string "(x, y, z)" 
        const match = data.playerPos.match(/\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
        if (match) {
          this.playerPosition = {
            x: parseFloat(match[1]),
            y: parseFloat(match[2]),
            z: parseFloat(match[3])
          };
        }
      }
    });

    // Escutar mudanças no resize da janela
    window.addEventListener('resize', () => {
      this.viewportSize = this.calculateViewportSize();
    });
  }

  private calculateViewportSize(): { width: number; height: number } {
    // Calcular o tamanho do viewport baseado na distância da câmera e field of view
    const distance = this.currentPosition.z;
    const vFOV = this.camera.fov * Math.PI / 180; // Converter para radians
    const height = 2 * Math.tan(vFOV / 2) * distance;
    const width = height * this.camera.aspect;
    
    return { width, height };
  }

  /**
   * Atualiza a lógica da câmera a cada frame
   */
  public update(deltaTime: number): void {
    if (!this.cameraConfig.followPlayer) return;

    // Calcular posição ideal da câmera (centralizada no jogador)
    let idealCameraX = this.playerPosition.x;
    let idealCameraY = this.playerPosition.y;

    // Aplicar limites do mundo à câmera
    const halfViewWidth = this.viewportSize.width / 2;
    const halfViewHeight = this.viewportSize.height / 2;

    // Limites onde a câmera pode se mover
    const minCameraX = this.worldBounds.minX + halfViewWidth;
    const maxCameraX = this.worldBounds.maxX - halfViewWidth;
    const minCameraY = this.worldBounds.minY + halfViewHeight;
    const maxCameraY = this.worldBounds.maxY - halfViewHeight;

    // Se o mundo é menor que o viewport, centralizar a câmera no mundo
    if (this.worldBounds.width <= this.viewportSize.width) {
      idealCameraX = (this.worldBounds.minX + this.worldBounds.maxX) / 2;
    } else {
      // Aplicar limites à posição ideal da câmera
      idealCameraX = clamp(idealCameraX, minCameraX, maxCameraX);
    }

    if (this.worldBounds.height <= this.viewportSize.height) {
      idealCameraY = (this.worldBounds.minY + this.worldBounds.maxY) / 2;
    } else {
      // Aplicar limites à posição ideal da câmera
      idealCameraY = clamp(idealCameraY, minCameraY, maxCameraY);
    }

    // Definir posição alvo
    this.targetPosition.x = idealCameraX;
    this.targetPosition.y = idealCameraY;
    this.targetPosition.z = this.currentPosition.z; // Z permanece fixo

    // Aplicar suavização (smoothing)
    const smoothingFactor = 1 - Math.pow(1 - this.cameraConfig.smoothing, deltaTime * 60);
    
    this.currentPosition.x += (this.targetPosition.x - this.currentPosition.x) * smoothingFactor;
    this.currentPosition.y += (this.targetPosition.y - this.currentPosition.y) * smoothingFactor;
    
    // Atualizar posição da câmera
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    this.camera.position.set(
      this.currentPosition.x,
      this.currentPosition.y,
      this.currentPosition.z
    );
  }

  /**
   * Define novos limites do mundo
   */
  public setWorldBounds(bounds: WorldBounds): void {
    this.worldBounds = { ...bounds };
    this.viewportSize = this.calculateViewportSize();
    console.log('📷 World bounds updated:', this.worldBounds);
  }

  /**
   * Define nova configuração da câmera
   */
  public setCameraConfig(config: CameraConfig): void {
    this.cameraConfig = { ...config };
    console.log('📷 Camera config updated:', this.cameraConfig);
  }

  /**
   * Obtém os limites atuais do mundo
   */
  public getWorldBounds(): WorldBounds {
    return { ...this.worldBounds };
  }

  /**
   * Obtém a configuração atual da câmera
   */
  public getCameraConfig(): CameraConfig {
    return { ...this.cameraConfig };
  }

  /**
   * Obtém a posição atual da câmera
   */
  public getCurrentPosition(): { x: number; y: number; z: number } {
    return { ...this.currentPosition };
  }

  /**
   * Obtém o tamanho atual do viewport
   */
  public getViewportSize(): { width: number; height: number } {
    return { ...this.viewportSize };
  }

  /**
   * Força a câmera a uma posição específica (sem suavização)
   */
  public setCameraPosition(x: number, y: number, z?: number): void {
    this.currentPosition.x = x;
    this.currentPosition.y = y;
    if (z !== undefined) {
      this.currentPosition.z = z;
    }
    this.targetPosition = { ...this.currentPosition };
    this.updateCameraPosition();
  }

  /**
   * Obtém informações de debug da câmera
   */
  public getDebugInfo() {
    return {
      currentPosition: this.currentPosition,
      targetPosition: this.targetPosition,
      playerPosition: this.playerPosition,
      viewportSize: this.viewportSize,
      worldBounds: this.worldBounds,
      cameraConfig: this.cameraConfig
    };
  }

  public dispose(): void {
    window.removeEventListener('resize', () => {
      this.viewportSize = this.calculateViewportSize();
    });
  }
}