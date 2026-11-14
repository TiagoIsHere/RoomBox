import { useCallback, useEffect, useState } from 'react';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  public volume: number = 0.45;

  constructor() {
    const savedMute = localStorage.getItem('roombox_sound_muted');
    if (savedMute !== null) {
      this.muted = savedMute === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    localStorage.setItem('roombox_sound_muted', String(mute));
  }

  // 1. PS1 Menu Click / Blip: Crisp low-fi sine/triangle blip on button clicks and folder selection
  public playBlip(pitchMultiplier = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc2.type = 'sine';

    const baseFreq = 660 * pitchMultiplier;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.055);

    osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 0.055);

    gain.gain.setValueAtTime(this.volume * 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.07);
    osc2.stop(now + 0.07);
  }

  // 2. Paper Rustle: Filtered white-noise burst when dragging/dropping files, opening inspector card, or checking off a to-do
  public playPaperRustle() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.14;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Envelope with slight double crinkle
      const env = Math.sin((i / bufferSize) * Math.PI) * (0.6 + 0.4 * Math.sin(i * 0.04));
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1950, now);
    filter.frequency.linearRampToValueAtTime(2800, now + duration);
    filter.Q.setValueAtTime(2.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // 3. Chime / Back Tone: Classic descending/ascending two-tone PS1 navigation sound
  public playChime(direction: 'forward' | 'back' | 'celebrate' = 'forward') {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes =
      direction === 'forward'
        ? [523.25, 783.99] // C5 -> G5
        : direction === 'back'
        ? [659.25, 440.0] // E5 -> A4
        : [523.25, 659.25, 783.99, 1046.5]; // Celebrate C5-E5-G5-C6

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.065;
      const dur = direction === 'celebrate' ? 0.18 : 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(this.volume * 0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + dur + 0.01);
    });
  }

  // Preview audio synth for demo audio files
  public playDemoMelody(freqs: number[]) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    freqs.forEach((freq, idx) => {
      const start = now + idx * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(this.volume * 0.22, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  }
}

export const soundEngine = new SoundEngine();

export function useSoundEffects() {
  const [muted, setMutedState] = useState<boolean>(soundEngine.muted);

  useEffect(() => {
    setMutedState(soundEngine.muted);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !soundEngine.muted;
    soundEngine.setMuted(next);
    setMutedState(next);
    if (!next) {
      soundEngine.playBlip(1.2);
    }
  }, []);

  const playBlip = useCallback((pitch = 1.0) => soundEngine.playBlip(pitch), []);
  const playPaperRustle = useCallback(() => soundEngine.playPaperRustle(), []);
  const playChime = useCallback(
    (dir: 'forward' | 'back' | 'celebrate' = 'forward') => soundEngine.playChime(dir),
    []
  );
  const playDemoMelody = useCallback((freqs: number[]) => soundEngine.playDemoMelody(freqs), []);

  return {
    muted,
    toggleMute,
    playBlip,
    playPaperRustle,
    playChime,
    playDemoMelody,
  };
}
