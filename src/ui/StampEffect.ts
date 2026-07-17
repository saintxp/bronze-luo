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
import { eventBus } from "../utils/EventBus";
import { CANVAS_WIDTH, CANVAS_HEIGHT, STAMP_SIZE } from "../utils/constants";
import { createLogger } from "../utils/logger";
import { renderSeal, type SealCarve } from "./InkPaintingUtils";

const log = createLogger("StampEffect");
const STAMP_ANIM_DURATION = 600; // ms — scale-in + settle
const STAMP_HOLD_DURATION = 1200; // ms — hold visible after animation
const STAMP_FADE_DURATION = 400; // ms — fade out

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
	rotation: number; // slight random rotation
}

export class StampEffect {
	private canvasManager: CanvasManager;
	private active: ActiveStamp[] = [];

	constructor(canvasManager: CanvasManager) {
		this.canvasManager = canvasManager;

		// Auto-trigger on puzzle:solved (skip tutorial)
		eventBus.on(
			"puzzle:solved",
			(payload: { chapterId: string; puzzleId: string }) => {
				if (payload.chapterId === "tutorial") return;
				log.info(`Stamp triggered for: ${payload.puzzleId}`);
				this.showStamp({});
			},
		);
	}

	/**
	 * Show a cinnabar seal stamp at the given position.
	 * Pre-renders the seal to an offscreen canvas for performance.
	 */
	showStamp(config: StampConfig): void {
		const text = config.text ?? "识";
		const carve = config.carve ?? "yin";
		const size = config.size ?? STAMP_SIZE * 2; // render at 2× for crisp impression

		// Pre-render seal to offscreen canvas
		const sealCanvas = renderSeal({
			text,
			carve,
			size,
		});

		// Slight random rotation for natural hand-stamped feel (±2.3°)
		const rotation = (Math.random() - 0.5) * 0.08;

		this.active.push({
			config: { ...config, text, carve, size },
			startTime: performance.now(),
			sealCanvas,
			rotation,
		});
	}

	/**
	 * Render active stamps on the UI canvas.
	 * Called each frame from the game loop.
	 */
	render(now: number): void {
		const ctx = this.canvasManager.getContext("ui");
		if (!ctx || this.active.length === 0) return;

		const totalDuration =
			STAMP_ANIM_DURATION + STAMP_HOLD_DURATION + STAMP_FADE_DURATION;
		const toRemove: number[] = [];

		for (let i = 0; i < this.active.length; i++) {
			const stamp = this.active[i];
			const elapsed = now - stamp.startTime;

			if (elapsed > totalDuration) {
				toRemove.push(i);
				continue;
			}

			const x = stamp.config.x ?? CANVAS_WIDTH / 2;
			const y = stamp.config.y ?? CANVAS_HEIGHT / 2;

			// Three-phase animation: scale-in → hold → fade-out
			let scale: number;
			let alpha: number;

			if (elapsed < STAMP_ANIM_DURATION) {
				// Phase 1: Scale-in with bounce (ease-out-back)
				const t = elapsed / STAMP_ANIM_DURATION;
				// ease-out-back: overshoot to 1.15 then settle to 1.0
				const c1 = 1.70158;
				const c3 = c1 + 1;
				const eased = 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
				scale = eased;
				alpha = Math.min(t * 2, 1); // quick fade-in during first half
			} else if (elapsed < STAMP_ANIM_DURATION + STAMP_HOLD_DURATION) {
				// Phase 2: Hold at full
				scale = 1;
				alpha = 1;
			} else {
				// Phase 3: Fade out
				const fadeT =
					(elapsed - STAMP_ANIM_DURATION - STAMP_HOLD_DURATION) /
					STAMP_FADE_DURATION;
				scale = 1;
				alpha = 1 - fadeT;
			}

			ctx.save();
			ctx.translate(x, y);
			ctx.scale(scale, scale);
			ctx.rotate(stamp.rotation);

			// Draw seal impression with multiply blend
			const displaySize = stamp.config.size ?? STAMP_SIZE * 2;
			const half = displaySize / 2;
			ctx.globalCompositeOperation = "multiply";
			ctx.globalAlpha = alpha * 0.82; // authentic cinnabar opacity
			ctx.drawImage(stamp.sealCanvas, -half, -half, displaySize, displaySize);

			ctx.restore();
		}

		// Remove expired stamps (reverse order)
		for (let i = toRemove.length - 1; i >= 0; i--) {
			this.active.splice(toRemove[i], 1);
		}
	}

	clear(): void {
		this.active = [];
	}
}
