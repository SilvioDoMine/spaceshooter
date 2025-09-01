import * as THREE from 'three';
import { EventBus } from '../core/EventBus';

/**
 * Efeito visual de spawn de inimigo com buraco negro
 */
export class SpawnEffect {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private startTime: number = 0;
  private duration: number = 0.8; // 0.8 segundos de animação
  private isActive: boolean = false;
  private eventBus: EventBus;
  private onComplete: (() => void) | null = null;

  // Shader para efeito de buraco negro
  private vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private fragmentShader = `
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uColor;
    uniform float uIntensity;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // Função de ruído
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    // Função para criar espiral
    float spiral(vec2 uv, float time) {
      vec2 center = vec2(0.5, 0.5);
      vec2 toCenter = center - uv;
      float distance = length(toCenter);
      float angle = atan(toCenter.y, toCenter.x);
      
      // Criar espiral
      float spiral = sin(angle * 6.0 - time * 8.0 + distance * 20.0);
      
      return spiral;
    }
    
    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(uv, center);
      
      // Efeito de buraco negro - distorção radial
      float blackHoleStrength = uProgress * uIntensity;
      float warp = blackHoleStrength / (dist * dist + 0.1);
      
      // Rotacionar UVs em direção ao centro
      vec2 toCenter = center - uv;
      float angle = atan(toCenter.y, toCenter.x);
      float rotatedAngle = angle + warp * uTime * 3.0;
      
      // Nova posição distorcida
      vec2 warpedUv = center + vec2(cos(rotatedAngle), sin(rotatedAngle)) * dist;
      
      // Espiral
      float spiralPattern = spiral(warpedUv, uTime);
      
      // Gradiente radial
      float radialGrad = 1.0 - smoothstep(0.0, 0.5, dist);
      
      // Combinar efeitos
      float finalAlpha = radialGrad * spiralPattern * uProgress;
      finalAlpha = max(finalAlpha, radialGrad * 0.3 * uProgress); // Garantir visibilidade mínima
      
      // Cor com intensidade baseada na distância
      vec3 finalColor = uColor * (1.0 + warp * 2.0);
      
      // Efeito de borda brilhante
      float edge = smoothstep(0.4, 0.5, dist) * (1.0 - smoothstep(0.5, 0.6, dist));
      finalColor += edge * vec3(0.5, 0.8, 1.0) * uProgress * 2.0;
      
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.createMesh();
  }

  private createMesh(): void {
    // Geometria circular para o efeito (maior para ser mais visível)
    const geometry = new THREE.PlaneGeometry(3.0, 3.0, 32, 32);
    
    // Material com shader personalizado
    this.material = new THREE.ShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(0xff4400) }, // Cor laranja brilhante para ser mais visível
        uIntensity: { value: 2.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide // Renderizar ambos os lados
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 100; // Renderizar por cima de outros elementos
    this.mesh.position.z = 0.1; // Posicionar ligeiramente à frente
  }

  public start(position: { x: number; y: number; z: number }, onComplete?: () => void): void {
    if (!this.mesh || !this.material) return;

    this.isActive = true;
    this.startTime = Date.now();
    this.onComplete = onComplete || null;

    // Posicionar o efeito
    this.mesh.position.set(position.x, position.y, position.z - 0.1);
    
    // Reset uniforms
    this.material.uniforms.uTime.value = 0.0;
    this.material.uniforms.uProgress.value = 0.0;

    console.log(`🌀 Spawn effect started at (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
  }

  public update(deltaTime: number): void {
    if (!this.isActive || !this.material) return;

    const elapsed = (Date.now() - this.startTime) / 1000; // em segundos
    const progress = Math.min(elapsed / this.duration, 1.0);

    // Atualizar uniforms do shader
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uProgress.value = progress;

    // Finalizar efeito
    if (progress >= 1.0) {
      this.isActive = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  public getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  public isActiveEffect(): boolean {
    return this.isActive;
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
    this.isActive = false;
  }
}