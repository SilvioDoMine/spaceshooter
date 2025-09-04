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

  // Shader para efeito de distorção temporal
  private vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uProgress;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      // Distorção temporal no vértice
      vec3 distortedPosition = position;
      float dist = length(position.xy);
      float warpFactor = uProgress * 0.3;
      
      // Ondulação temporal
      distortedPosition.z += sin(dist * 5.0 - uTime * 4.0) * warpFactor * 0.1;
      distortedPosition.xy *= (1.0 - warpFactor * 0.2);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(distortedPosition, 1.0);
    }
  `;

  private fragmentShader = `
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uColor;
    uniform float uIntensity;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(uv, center);
      
      // Efeito de ripple visível mas suave
      float ripple1 = sin(dist * 18.0 - uTime * 7.0);
      float ripple2 = sin(dist * 30.0 - uTime * 10.0) * 0.7;
      
      float rippleEffect = (ripple1 + ripple2) * 0.4 + 0.6;
      
      // Gradiente radial mais definido
      float radial = 1.0 - smoothstep(0.1, 0.7, dist);
      
      // Pulso temporal mais visível
      float pulse = sin(uTime * 4.0) * 0.15 + 0.85;
      
      // Combinar efeitos 
      float intensity = radial * rippleEffect * pulse * uProgress * uIntensity;
      
      // Cor branca brilhante
      vec3 finalColor = uColor * intensity;
      
      // Alpha mais alto para ser visível mas ainda sutil
      gl_FragColor = vec4(finalColor, intensity * 0.6);
    }
  `;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.createMesh();
  }

  private createMesh(): void {
    // Geometria circular pequena mas visível
    const geometry = new THREE.PlaneGeometry(2.0, 2.0, 24, 24);
    
    // Material com shader personalizado para distorção temporal
    this.material = new THREE.ShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(0xffffff) }, // Cor branca
        uIntensity: { value: 0.8 } // Aumentar intensidade para ficar visível
      },
      transparent: true,
      blending: THREE.AdditiveBlending, // Volta pro blending aditivo pra ser mais visível
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 10; // Renderizar na frente
    this.mesh.position.z = 0.1; // Posicionar ligeiramente na frente
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