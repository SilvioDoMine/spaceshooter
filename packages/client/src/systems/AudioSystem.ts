/**
 * AudioSystem - Sistema de áudio para o Space Shooter
 * Gerencia carregamento, cache e reprodução de efeitos sonoros
 */

export interface AudioConfig {
  volume: number;
  enabled: boolean;
}

export interface Sound {
  name: string;
  buffer: AudioBuffer;
  volume?: number;
  loop?: boolean;
}

export class AudioSystem {
  private context: AudioContext;
  private sounds: Map<string, AudioBuffer> = new Map();
  private config: AudioConfig = {
    volume: 0.5,
    enabled: true
  };
  private initialized: boolean = false;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * Inicializa o sistema de áudio
   * Deve ser chamado após interação do usuário devido a políticas do browser
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      this.initialized = true;
      console.log('AudioSystem inicializado');
    } catch (error) {
      console.error('Erro ao inicializar AudioSystem:', error);
    }
  }

  /**
   * Carrega um arquivo de áudio
   */
  async loadSound(name: string, url: string): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      this.sounds.set(name, audioBuffer);
      console.log(`Som carregado: ${name}`);
    } catch (error) {
      console.warn(`Arquivo de som ${name} não encontrado, usando som sintético`);
      // Fallback: criar som sintético
      const syntheticBuffer = this.createSyntheticSound(name);
      if (syntheticBuffer) {
        this.sounds.set(name, syntheticBuffer);
      }
    }
  }

  /**
   * Cria sons sintéticos para desenvolvimento quando arquivos não existem
   */
  private createSyntheticSound(name: string): AudioBuffer | null {
    try {
      const sampleRate = this.context.sampleRate;
      let duration: number;
      let frequency: number;

      // Configurações específicas por tipo de som
      switch (name) {
        case 'shoot':
          duration = 0.1; // 100ms
          frequency = 800;
          break;
        case 'explosion':
          duration = 0.3; // 300ms
          frequency = 200;
          break;
        case 'hit':
          duration = 0.2; // 200ms
          frequency = 400;
          break;
        case 'powerup':
          duration = 0.4; // 400ms
          frequency = 600;
          break;
        default:
          duration = 0.1;
          frequency = 500;
      }

      const frameCount = sampleRate * duration;
      const buffer = this.context.createBuffer(1, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);

      // Gerar onda com envelope
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 5); // Decay exponencial
        
        if (name === 'explosion') {
          // Ruído para explosão
          channelData[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        } else if (name === 'powerup') {
          // Tom crescente para power-up (efeito positivo)
          const pitchMod = 1 + (t / duration) * 0.5; // Pitch sobe 50%
          channelData[i] = Math.sin(2 * Math.PI * frequency * pitchMod * t) * envelope * 0.25;
        } else {
          // Tom puro para tiro e hit
          channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.2;
        }
      }

      console.log(`Som sintético criado: ${name}`);
      return buffer;
    } catch (error) {
      console.error(`Erro ao criar som sintético ${name}:`, error);
      return null;
    }
  }

  /**
   * Carrega múltiplos sons de uma vez
   */
  async loadSounds(soundsManifest: Record<string, string>): Promise<void> {
    const loadPromises = Object.entries(soundsManifest).map(([name, url]) =>
      this.loadSound(name, url)
    );
    
    await Promise.all(loadPromises);
  }

  /**
   * Reproduz um som
   */
  playSound(name: string, options: { volume?: number; loop?: boolean } = {}): AudioBufferSourceNode | null {
    if (!this.config.enabled || !this.initialized) return null;

    const buffer = this.sounds.get(name);
    if (!buffer) {
      console.warn(`Som não encontrado: ${name}`);
      return null;
    }

    try {
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();

      source.buffer = buffer;
      source.loop = options.loop || false;
      
      const volume = (options.volume ?? 1) * this.config.volume;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      source.start();
      return source;
    } catch (error) {
      console.error(`Erro ao reproduzir som ${name}:`, error);
      return null;
    }
  }

  /**
   * Para todos os sons em reprodução
   */
  stopAllSounds(): void {
    // Para implementar se necessário - precisaria rastrear sources ativas
  }

  /**
   * Define o volume geral
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Habilita/desabilita áudio
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Retorna se o áudio está habilitado
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Retorna se o sistema está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.sounds.clear();
    if (this.context.state !== 'closed') {
      this.context.close();
    }
  }
}