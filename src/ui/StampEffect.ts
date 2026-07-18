/**
 * 铜声·识洛 — Stamp effect (朱砂印章)
 *
 * Renders a cinnabar seal stamp animation on the UI canvas
 * when a puzzle is solved. Uses InkPainting's seal rendering
 * for authentic 阴刻/阳刻 (yin/yang carving) with edge weathering.
 *
 * Animation: scale-in with slight rotation → bounce settle → hold → fade.
 * Auto-triggers from 'puzzle:solved' events (non-tutorial chapters).
 *
 * InkView Design System: cinnabar red for stamps, multiply blend.
 * Ported from InkPainting (MIT): github.com/TanShilongMario/InkPainting
 */

import type { CanvasManager } from "../engine/CanvasManager";
import { CANVAS_WIDTH, CANVAS_HEIGHT, STAMP_SIZE } from "../utils/constants";
import { renderSeal, type SealCarve } from "./InkPaintingUtils";
import gsap from "gsap";
const STAMP_ANIM_DURATION = 0.55; // s — scale-in with bounce
const STAMP_HOLD_DURATION = 1.0; // s — hold visible
const STAMP_FADE_DURATION = 0.35; // s — fade out

export interface StampConfig {
	/** 1–4 characters for the seal (e.g. "铸", "礼成", "宅兹中国") */
	text?: string;
	/** Carving style: 'yin' (white on red) or 'yang' (red on white) */
	carve?: SealCarve;
	x?: number;
	y?: number;
	/** Stamp pixel size (default: STAMP_SIZE from constants) */
	size?: number;
}

interface ActiveStamp {
	config: Required<Pick<StampConfig, "text" | "carve" | "size">> & StampConfig;
	startTime: number;
	sealCanvas: HTMLCanvasElement;
	rotation: number;

	/** GSAP-animated properties — read each frame */
	scale: number;
	alpha: number;
}

export class StampEffect {
	private canvasManager: CanvasManager;
	private active: ActiveStamp[] = [];

	constructor(canvasManager: CanvasManager) {
		this.canvasManager = canvasManager;
	}

	/**
	 * Show a cinnabar seal stamp at the given position.
	 * Pre-renders the seal to an offscreen canvas for performance.
	 */
	showStamp(config: StampConfig): void {
		const text = config.text ?? "识";
		const carve = config.carve ?? "yin";
		// Default: 2.5× STAMP_SIZE (150px) — large enough to read the carving,
		// small enough to not occlude the solved scene behind it.
		const size = config.size ?? Math.round(STAMP_SIZE * 2.5);

		// Pre-render seal to offscreen canvas
		const sealCanvas = renderSeal({
			text,
			carve,
			size,
		});

		// Slight random rotation for natural hand-stamped feel (±2.3°)
		const rotation = (Math.random() - 0.5) * 0.08;

		const stamp: ActiveStamp = {
			config: { ...config, text, carve, size },
			startTime: performance.now(),
			sealCanvas,
			rotation,
			scale: 0,
			alpha: 0,
		};

		// GSAP timeline: pop in → hold → fade out
		gsap.to(stamp, {
			scale: 1.15,
			alpha: 1,
			duration: STAMP_ANIM_DURATION * 0.7,
			ease: "back.out(1.8)",
			onComplete: () => {
				gsap.to(stamp, {
					scale: 1,
					duration: STAMP_ANIM_DURATION * 0.3,
					ease: "power2.out",
				});
			},
		});

		gsap.to(stamp, {
			alpha: 0,
			duration: STAMP_FADE_DURATION,
			delay: STAMP_ANIM_DURATION + STAMP_HOLD_DURATION,
			ease: "power2.in",
		});

		// Auto-remove after full animation
		const totalDuration =
			(STAMP_ANIM_DURATION + STAMP_HOLD_DURATION + STAMP_FADE_DURATION) * 1000;
		setTimeout(() => {
			const idx = this.active.indexOf(stamp);
			if (idx !== -1) this.active.splice(idx, 1);
		}, totalDuration + 100);

		this.active.push(stamp);
	}

	/**
	 * Render active stamps on the UI canvas.
	 * Called each frame from the game loop.
	 */
	render(_now: number): void {
		const ctx = this.canvasManager.getContext("ui");
		if (!ctx || this.active.length === 0) return;

		for (let i = 0; i < this.active.length; i++) {
			const stamp = this.active[i];

			if (stamp.alpha <= 0.001 && stamp.scale <= 0.001) continue;

			// Default placement: right-of-center, like a collector's seal
			// stamped on the margin of a painting — never dead-center
			// where it would block the puzzle the player just solved.
			const x = stamp.config.x ?? CANVAS_WIDTH * 0.76;
			const y = stamp.config.y ?? CANVAS_HEIGHT * 0.42;

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(stamp.scale, stamp.scale);
			ctx.rotate(stamp.rotation);

			const displaySize = stamp.config.size ?? STAMP_SIZE * 4;
			const half = displaySize / 2;
			ctx.globalCompositeOperation = "source-over";
			ctx.globalAlpha = stamp.alpha * 0.95;
			ctx.drawImage(stamp.sealCanvas, -half, -half, displaySize, displaySize);

			ctx.restore();
		}
	}

	clear(): void {
		this.active = [];
	}
}
