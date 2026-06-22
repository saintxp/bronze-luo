/**
 * 铜声·识洛 — Tween animation engine
 *
 * Promise-based tween and keyframe sequence playback.
 * Each tween returns a Promise that resolves on completion.
 */

import { type EasingFn, getEasing } from '../utils/easing';

export interface TweenConfig {
  from: number;
  to: number;
  duration: number; // ms
  easing?: string | EasingFn;
  onUpdate?: (value: number) => void;
}

/**
 * A single tween (one value over time).
 * Usage: await new Tween({ from: 0, to: 1, duration: 500 }).play()
 */
export class Tween {
  private config: TweenConfig;
  private _cancelled = false;

  constructor(config: TweenConfig) {
    this.config = config;
  }

  get cancelled(): boolean {
    return this._cancelled;
  }

  cancel(): void {
    this._cancelled = true;
  }

  play(): Promise<number> {
    return new Promise((resolve) => {
      const {
        from,
        to,
        duration,
        onUpdate,
        easing = 'linear',
      } = this.config;

      const easeFn: EasingFn =
        typeof easing === 'function' ? easing : getEasing(easing);

      const start = performance.now();
      const range = to - from;

      const tick = (now: number) => {
        if (this._cancelled) return resolve(from);

        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const value = from + easeFn(t) * range;

        onUpdate?.(value);

        if (t >= 1) return resolve(to);

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }
}

export interface Keyframe {
  value: number;
  duration: number; // ms
  easing?: string | EasingFn;
}

/**
 * A sequence of keyframes played in order.
 * Usage: await new KeyframeSequence(0, [
 *   { value: 1, duration: 300 },
 *   { value: 0, duration: 300 },
 * ]).play(onUpdate)
 */
export class KeyframeSequence {
  private start: number;
  private keyframes: Keyframe[];
  private _cancelled = false;
  private tweens: Tween[] = [];

  constructor(start: number, keyframes: Keyframe[]) {
    this.start = start;
    this.keyframes = keyframes;
  }

  cancel(): void {
    this._cancelled = true;
    this.tweens.forEach((t) => t.cancel());
  }

  async play(onUpdate: (value: number) => void): Promise<number> {
    let current = this.start;

    for (const kf of this.keyframes) {
      if (this._cancelled) break;

      const tween = new Tween({
        from: current,
        to: kf.value,
        duration: kf.duration,
        easing: kf.easing,
        onUpdate,
      });

      this.tweens.push(tween);
      current = await tween.play();
    }

    return current;
  }
}
