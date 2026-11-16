class SimulationAudioManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtor();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType = "sine",
    gainLevel = 0.08,
    delaySec = 0,
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(30, freqEnd),
        now + durationSec,
      );
      gain.gain.setValueAtTime(gainLevel, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch {
      // Audio playback can fail cleanly under strict headless autoplay policies
    }
  }

  public playPickup(): void {
    this.playTone(520, 880, 0.14, "triangle", 0.08, 0);
    this.playTone(760, 1140, 0.16, "sine", 0.06, 0.08);
  }

  public playUnlock(): void {
    this.playTone(440, 660, 0.12, "square", 0.05, 0);
    this.playTone(660, 990, 0.16, "triangle", 0.07, 0.09);
  }

  public playExtinguish(): void {
    this.playTone(320, 110, 0.28, "sawtooth", 0.05, 0);
  }

  public playHit(heavy = false): void {
    if (heavy) {
      this.playTone(170, 52, 0.26, "sawtooth", 0.12, 0);
    } else {
      this.playTone(210, 95, 0.12, "square", 0.05, 0);
    }
  }

  public playThunder(): void {
    this.playTone(130, 42, 0.55, "sawtooth", 0.11, 0);
  }

  public playRescue(): void {
    this.playTone(480, 720, 0.14, "sine", 0.08, 0);
    this.playTone(720, 960, 0.18, "sine", 0.08, 0.1);
  }

  public playSuccess(): void {
    this.playTone(523, 523, 0.14, "triangle", 0.08, 0);
    this.playTone(659, 659, 0.14, "triangle", 0.08, 0.13);
    this.playTone(784, 1046, 0.28, "triangle", 0.09, 0.26);
  }

  public playFail(): void {
    this.playTone(310, 190, 0.25, "sawtooth", 0.08, 0);
    this.playTone(190, 85, 0.35, "sawtooth", 0.08, 0.2);
  }
}

export const simulationAudio = new SimulationAudioManager();

