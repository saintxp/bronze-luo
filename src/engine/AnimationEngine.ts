/**
 * 铜声·识洛 — Animation Engine
 *
 * Promise-based tween and keyframe sequence playback.
 * Uses GSAP internally for rich easing curves and multi-property animation.
 * Legacy Tween/KeyframeSequence API preserved for backward compatibility.
 */

import gsap from "gsap";
import { type EasingFn, getEasing } from "../utils/easing";

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
			const { from, to, duration, onUpdate, easing = "linear" } = this.config;

			const easeFn: EasingFn =
				typeof easing === "function" ? easing : getEasing(easing);

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

/* ═══════════════════════════════════════════════
   §2  GSAP-Powered Animation Methods
   ═══════════════════════════════════════════════ */

/**
 * Animate multiple properties of a target object simultaneously.
 * Returns a Promise that resolves when complete.
 *
 * Usage:
 * ```ts
 * const obj = { x: 0, y: 0, scale: 1, alpha: 0 };
 * await animateTo(obj, { x: 100, y: 50, scale: 1.2, alpha: 1, duration: 0.5, ease: 'back.out(1.7)' });
 * ```
 */
export function animateTo(
	target: gsap.TweenTarget,
	vars: gsap.TweenVars,
): Promise<void> {
	return new Promise((resolve) => {
		gsap.to(target, {
			...vars,
			onComplete: () => {
				(vars.onComplete as (() => void) | undefined)?.();
				resolve();
			},
		});
	});
}

/**
 * Animate from specific values to current values.
 * Returns a Promise that resolves when complete.
 */
export function animateFrom(
	target: gsap.TweenTarget,
	vars: gsap.TweenVars,
): Promise<void> {
	return new Promise((resolve) => {
		gsap.from(target, {
			...vars,
			onComplete: () => {
				(vars.onComplete as (() => void) | undefined)?.();
				resolve();
			},
		});
	});
}

/**
 * Create a GSAP timeline for complex sequenced animations.
 * Returns a Promise that resolves when the timeline completes.
 *
 * Usage:
 * ```ts
 * await animateTimeline((tl) => {
 *   tl.to(stamp, { scale: 1.2, duration: 0.3 })
 *     .to(stamp, { scale: 1, duration: 0.2 })
 *     .to(stamp, { alpha: 0, duration: 0.4 }, '+=0.5');
 * });
 * ```
 */
export function animateTimeline(
	buildFn: (tl: gsap.core.Timeline) => void,
	defaults?: gsap.TimelineVars,
): Promise<void> {
	return new Promise((resolve) => {
		const tl = gsap.timeline({
			...defaults,
			onComplete: () => {
				(defaults?.onComplete as (() => void) | undefined)?.();
				resolve();
			},
		});
		buildFn(tl);
	});
}

/**
 * Map a game easing name to the closest GSAP ease string.
 * Falls back to 'power2.out' for unknown names.
 */
export function toGsapEase(name: string): string {
	const map: Record<string, string> = {
		linear: "none",
		"ease-in": "power2.in",
		"ease-out": "power2.out",
		"ease-in-out": "power2.inOut",
		"ease-out-back": "back.out(1.7)",
		"ease-out-elastic": "elastic.out(1, 0.5)",
		"ease-out-bounce": "bounce.out",
		"ease-out-expo": "expo.out",
		"ease-out-cubic": "cubic.out",
		"ease-in-out-cubic": "cubic.inOut",
	};
	return map[name] ?? "power2.out";
}
