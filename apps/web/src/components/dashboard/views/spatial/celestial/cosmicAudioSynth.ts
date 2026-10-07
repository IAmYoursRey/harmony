/**
 * Cosmic Ambient Audio Synthesizer (Zero-Dependency Web Audio API)
 * Generates an ethereal, warm sci-fi deep-space ambient soundscape inspired by Interstellar.
 */

export class CosmicAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private masterGain: GainNode | null = null;
  private activeNodes: { stop?: () => void; disconnect: () => void }[] = [];

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isPlaying(): boolean {
    return this.isRunning;
  }

  public async toggle(): Promise<boolean> {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      await this.start();
      return true;
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      const ctx = this.initContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      this.isRunning = true;
      const now = ctx.currentTime;

      // Master output gain with smooth exponential fade-in
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.22, now + 2.5);
      masterGain.connect(ctx.destination);
      this.masterGain = masterGain;

      // Resonant Lowpass Filter for warm cosmic sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(2.2, now);
      filter.connect(masterGain);

      // Slow LFO for filter cutoff breathing (0.04 Hz period = ~25 seconds cycle)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.04, now);
      lfoGain.gain.setValueAtTime(160, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);
      this.activeNodes.push(lfo);

      // Cosmic Harmony Chords (Amaj9 voicing: A1, A2, E3, C#4, G#4)
      const chordFrequencies = [
        { freq: 55.0, type: 'sine' as OscillatorType, gain: 0.35 },    // Deep A1 Sub-bass
        { freq: 110.0, type: 'triangle' as OscillatorType, gain: 0.22 }, // Warm A2 Body
        { freq: 164.81, type: 'sine' as OscillatorType, gain: 0.18 }, // E3 Fifth
        { freq: 277.18, type: 'triangle' as OscillatorType, gain: 0.14 }, // C#4 Major 3rd
        { freq: 415.30, type: 'sine' as OscillatorType, gain: 0.08 }, // G#4 Maj7 ethereal shimmer
      ];

      chordFrequencies.forEach((voice, idx) => {
        const osc = ctx.createOscillator();
        const voiceGain = ctx.createGain();

        osc.type = voice.type;
        // Subtle detuning for analog shimmer
        const detuneCents = (idx % 2 === 0 ? 1 : -1) * (2.5 + idx * 1.2);
        osc.frequency.setValueAtTime(voice.freq, now);
        osc.detune.setValueAtTime(detuneCents, now);

        voiceGain.gain.setValueAtTime(voice.gain, now);

        // Slow subtle chorus/vibrato LFO per voice
        const voiceLfo = ctx.createOscillator();
        const voiceLfoGain = ctx.createGain();
        voiceLfo.frequency.setValueAtTime(0.08 + idx * 0.03, now);
        voiceLfoGain.gain.setValueAtTime(1.2, now);
        voiceLfo.connect(voiceLfoGain);
        voiceLfoGain.connect(osc.frequency);
        voiceLfo.start(now);
        this.activeNodes.push(voiceLfo);

        osc.connect(voiceGain);
        voiceGain.connect(filter);
        osc.start(now);
        this.activeNodes.push(osc);
      });

      // Subtle Solar Wind White Noise (soft cosmic microwave background)
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter approximation
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.08;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(380, now);
      noiseFilter.Q.setValueAtTime(1.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.035, now);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseSource.start(now);
      this.activeNodes.push(noiseSource);

    } catch (err) {
      console.warn('Cosmic audio synth initialization error:', err);
      this.isRunning = false;
    }
  }

  public stop(): void {
    if (!this.isRunning || !this.ctx || !this.masterGain) {
      this.isRunning = false;
      return;
    }

    try {
      const now = this.ctx.currentTime;
      // Smooth fade-out to prevent clicks
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      const nodesToStop = [...this.activeNodes];
      this.activeNodes = [];

      setTimeout(() => {
        nodesToStop.forEach((n) => {
          try {
            if (n.stop) n.stop();
            n.disconnect();
          } catch {
            // Ignore already stopped nodes
          }
        });
        this.isRunning = false;
      }, 1300);
    } catch {
      this.isRunning = false;
    }
  }

  public setVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0.0001, Math.min(1.0, volume));
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }
}

export const cosmicAudio = new CosmicAudioSynthesizer();
