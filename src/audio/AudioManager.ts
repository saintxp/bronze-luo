/**
 * 铜声·识洛 — Audio manager
 *
 * Wraps Web Audio API for game audio playback.
 * Phase 2: OscillatorNode placeholder tones (no real audio files).
 * Future: Will load and play .mp3/.wav assets.
 */

import { createLogger } from '../utils/logger';

const log = createLogger('AudioManager');

export interface PlayToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play a single tone.
   */
  playTone(options: PlayToneOptions): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime + (options.delay ?? 0);

      osc.type = options.type ?? 'sine';
      osc.frequency.setValueAtTime(options.frequency, startTime);
      gain.gain.setValueAtTime(options.volume ?? 0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + options.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + options.duration);
    } catch (e) {
      log.warn('Audio playback failed:', e);
    }
  }

  /**
   * Play a frequency sweep (for effects like "copper liquid bubbling").
   */
  playSweep(fromFreq: number, toFreq: number, duration: number): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fromFreq, startTime);
      osc.frequency.linearRampToValueAtTime(toFreq, startTime + duration);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      log.warn('Sweep playback failed:', e);
    }
  }

  /** Singleton instance */
  static readonly instance = new AudioManager();
}
