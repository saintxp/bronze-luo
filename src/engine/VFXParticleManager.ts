/**
 * 铜声·识洛 — VFX Particle Manager
 *
 * Wraps Proton engine for chapter-specific particle effects on the VFX canvas.
 * Each effect is a pre-configured emitter that can be triggered by chapters.
 *
 * Bronze effects from art bible:
 * 1. 铜液飞溅 (copper splash) — 序章+二里头, copper gold droplets
 * 2. 编钟声波 (bell soundwave) — 周·礼成, expanding ring particles
 * 3. 塔焚火星 (tower fire sparks) — 烬, rising embers
 * 4. 镜碎碎片 (mirror shards) — 千秋镜, radiating fragments
 * 5. 牡丹花瓣 (peony petals) — 归田, drifting petals
 *
 * Dependencies: proton-engine (7.1.5), GSAP (3.15.0)
 */

import Proton, {
  Emitter,
  Rate,
  Span,
  Mass,
  Radius,
  Life,
  Velocity,
  Color,
  Alpha,
  Scale,
  Gravity,
  RandomDrift,
  CanvasRenderer,
} from 'proton-engine';
import { BRONZE } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('VFXParticles');

export type ParticleEffectId =
  | 'copperSplash'
  | 'bellSoundwave'
  | 'towerEmbers'
  | 'mirrorShards'
  | 'peonyPetals';

interface ParticleEffect {
  emitter: Emitter;
  duration: number; // ms — how long to emit
}

export class VFXParticleManager {
  private proton: Proton;
  private renderer: CanvasRenderer;
  private effects: Map<ParticleEffectId, () => ParticleEffect> = new Map();
  private activeTimers: number[] = [];
  private _running = false;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.proton = new Proton();
    this.renderer = new CanvasRenderer(canvas);
    this.proton.addRenderer(this.renderer);

    this.registerEffects();
  }

  /** Register all pre-configured effects */
  private registerEffects(): void {
    // 1. 铜液飞溅 — copper gold droplets splashing outward
    this.effects.set('copperSplash', () => {
      const emitter = new Emitter();
      emitter.rate = new Rate(new Span(8, 16), new Span(0.05, 0.15));
      emitter.addInitialize(new Mass(1, 3));
      emitter.addInitialize(new Radius(2, 8));
      emitter.addInitialize(new Life(0.6, 1.4));
      emitter.addInitialize(new Velocity(new Span(80, 180), new Span(0, 360), 'polar'));
      emitter.addBehaviour(new Color(BRONZE.copper, BRONZE.gold));
      emitter.addBehaviour(new Alpha(1, 0));
      emitter.addBehaviour(new Scale(1, 0.3));
      emitter.addBehaviour(new Gravity(3));
      return { emitter, duration: 800 };
    });

    // 2. 编钟声波 — expanding ring of particles
    this.effects.set('bellSoundwave', () => {
      const emitter = new Emitter();
      emitter.rate = new Rate(new Span(20, 40), new Span(0.02, 0.06));
      emitter.addInitialize(new Mass(1));
      emitter.addInitialize(new Radius(1.5, 4));
      emitter.addInitialize(new Life(0.8, 1.6));
      emitter.addInitialize(new Velocity(new Span(100, 220), new Span(0, 360), 'polar'));
      emitter.addBehaviour(new Color(BRONZE.green, BRONZE.ritualWhite));
      emitter.addBehaviour(new Alpha(0.8, 0));
      emitter.addBehaviour(new Scale(0.5, 1.5));
      return { emitter, duration: 600 };
    });

    // 3. 塔焚火星 — rising embers with random drift
    this.effects.set('towerEmbers', () => {
      const emitter = new Emitter();
      emitter.rate = new Rate(new Span(4, 10), new Span(0.08, 0.2));
      emitter.addInitialize(new Mass(1, 2));
      emitter.addInitialize(new Radius(1, 5));
      emitter.addInitialize(new Life(1.5, 3.0));
      emitter.addInitialize(new Velocity(new Span(20, 60), new Span(250, 290), 'polar'));
      emitter.addBehaviour(new Color(BRONZE.vermillion, BRONZE.rust));
      emitter.addBehaviour(new Alpha(0.9, 0));
      emitter.addBehaviour(new Scale(1, 0.2));
      emitter.addBehaviour(new Gravity(-1.5)); // negative = upward
      emitter.addBehaviour(new RandomDrift(15, 10, 15, 0.08));
      return { emitter, duration: 2000 };
    });

    // 4. 镜碎碎片 — radiating mirror shards
    this.effects.set('mirrorShards', () => {
      const emitter = new Emitter();
      emitter.rate = new Rate(new Span(12, 24), new Span(0.02, 0.08));
      emitter.addInitialize(new Mass(1, 3));
      emitter.addInitialize(new Radius(2, 10));
      emitter.addInitialize(new Life(0.5, 1.2));
      emitter.addInitialize(new Velocity(new Span(120, 300), new Span(0, 360), 'polar'));
      emitter.addBehaviour(new Color(BRONZE.cinnabar, BRONZE.limeWhite));
      emitter.addBehaviour(new Alpha(1, 0));
      emitter.addBehaviour(new Scale(1, 0.1));
      emitter.addBehaviour(new Gravity(2));
      return { emitter, duration: 500 };
    });

    // 5. 牡丹花瓣 — drifting petals with gentle fall
    this.effects.set('peonyPetals', () => {
      const emitter = new Emitter();
      emitter.rate = new Rate(new Span(2, 5), new Span(0.15, 0.4));
      emitter.addInitialize(new Mass(1, 2));
      emitter.addInitialize(new Radius(4, 12));
      emitter.addInitialize(new Life(2.0, 4.0));
      emitter.addInitialize(new Velocity(new Span(10, 40), new Span(160, 200), 'polar'));
      emitter.addBehaviour(new Color(BRONZE.cinnabar, BRONZE.gold));
      emitter.addBehaviour(new Alpha(0.7, 0));
      emitter.addBehaviour(new Scale(0.8, 1.2));
      emitter.addBehaviour(new Gravity(0.8));
      emitter.addBehaviour(new RandomDrift(30, 5, 30, 0.05));
      return { emitter, duration: 3000 };
    });
  }

  /**
   * Trigger a particle effect at the given position.
   * @param id — effect identifier
   * @param x — emission center x
   * @param y — emission center y
   */
  trigger(id: ParticleEffectId, x: number, y: number): void {
    const factory = this.effects.get(id);
    if (!factory) {
      log.warn(`Unknown particle effect: ${id}`);
      return;
    }

    const { emitter, duration } = factory();
    emitter.p.x = x;
    emitter.p.y = y;
    emitter.emit();

    this.proton.addEmitter(emitter);
    this.ensureRunning();

    // Stop emitting after duration, then remove emitter after particles die
    const stopTimer = window.setTimeout(() => {
      emitter.stop();
      const removeTimer = window.setTimeout(() => {
        this.proton.removeEmitter(emitter);
      }, 4000); // wait for particles to finish
      this.activeTimers.push(removeTimer);
    }, duration);
    this.activeTimers.push(stopTimer);

    log.info(`Triggered: ${id} at (${x}, ${y})`);
  }

  /** Start the update loop if not already running */
  private ensureRunning(): void {
    if (this._running) return;
    this._running = true;

    const tick = () => {
      if (this.proton.emitters.length === 0) {
        this._running = false;
        return;
      }
      this.proton.update();
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /** Stop all effects and clean up */
  destroy(): void {
    this._running = false;
    cancelAnimationFrame(this.rafId);
    this.activeTimers.forEach(clearTimeout);
    this.activeTimers = [];
    this.proton.destroy();
  }
}
