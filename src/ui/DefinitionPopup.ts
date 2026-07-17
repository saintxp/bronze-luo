/**
 * 铜声·识洛 — Definition popup (释义弹窗)
 *
 * Displays a ≤4-character definition popup on the UI canvas.
 * Two modes:
 *   - Horizontal: pill-shaped, ink text on paper background (original)
 *   - Vertical: traditional Chinese calligraphy layout with vertical text
 *
 * Styled with InkView Design System: warm paper background,
 * ink text. Auto-fades after configurable duration.
 *
 * Vertical text ported from InkPainting (MIT):
 * github.com/TanShilongMario/InkPainting
 */

import type { CanvasManager } from "../engine/CanvasManager";
import { CANVAS_WIDTH, CANVAS_HEIGHT, INK } from "../utils/constants";
import { createLogger } from "../utils/logger";
import { drawVerticalText } from "./InkPaintingUtils";

const log = createLogger("DefinitionPopup");
const POPUP_DISPLAY_DURATION = 2500; // ms — total visible time
const FADE_DURATION = 300; // ms — fade in/out

export interface PopupConfig {
	text: string; // ≤4 characters (e.g. "铸", "宅兹", "礼成")
	subtitle?: string; // optional subtitle / romanization
	x?: number;
	y?: number;
	/** Layout mode: 'horizontal' (pill) or 'vertical' (calligraphy) */
	layout?: "horizontal" | "vertical";
}

interface ActivePopup {
	config: PopupConfig;
	startTime: number;
}

export class DefinitionPopup {
	private canvasManager: CanvasManager;
	private active: ActivePopup[] = [];

	constructor(canvasManager: CanvasManager) {
		this.canvasManager = canvasManager;
	}

	/**
	 * Show a definition popup.
	 * @param config — text (≤4 chars), optional subtitle, position, layout mode
	 */
	show(config: PopupConfig): void {
		if (config.text.length > 4) {
			log.warn(`Definition text too long: "${config.text}" (max 4 chars)`);
		}
		this.active.push({
			config,
			startTime: performance.now(),
		});
	}

	/**
	 * Render active popups on the UI canvas.
	 * Called each frame from the game loop.
	 */
	render(now: number): void {
		const ctx = this.canvasManager.getContext("ui");
		if (!ctx || this.active.length === 0) return;

		const toRemove: number[] = [];

		for (let i = 0; i < this.active.length; i++) {
			const popup = this.active[i];
			const elapsed = now - popup.startTime;

			if (elapsed > POPUP_DISPLAY_DURATION) {
				toRemove.push(i);
				continue;
			}

			// Fade in → hold → fade out
			let alpha = 1;
			if (elapsed < FADE_DURATION) {
				alpha = elapsed / FADE_DURATION;
			} else if (elapsed > POPUP_DISPLAY_DURATION - FADE_DURATION) {
				alpha = (POPUP_DISPLAY_DURATION - elapsed) / FADE_DURATION;
			}

			const x = popup.config.x ?? CANVAS_WIDTH / 2;
			const y = popup.config.y ?? CANVAS_HEIGHT / 2 + 80;

			ctx.save();
			ctx.globalAlpha = alpha;

			if (popup.config.layout === "vertical") {
				this.renderVertical(ctx, popup.config, x, y);
			} else {
				this.renderHorizontal(ctx, popup.config, x, y);
			}

			ctx.restore();
		}

		// Remove expired (reverse order)
		for (let i = toRemove.length - 1; i >= 0; i--) {
			this.active.splice(toRemove[i], 1);
		}
	}

	/** Horizontal pill-shaped popup (original style) */
	private renderHorizontal(
		ctx: CanvasRenderingContext2D,
		config: PopupConfig,
		x: number,
		y: number,
	): void {
		// Measure text width for pill size
		ctx.font = 'bold 24px "PingFang SC", "Noto Sans SC", serif';
		const textWidth = ctx.measureText(config.text).width;
		const pillW = Math.max(textWidth + 48, 80);
		const pillH = 48;
		const pillR = 24;

		// Shadow
		ctx.shadowColor = "rgba(0,0,0,0.1)";
		ctx.shadowBlur = 8;

		// Pill background — InkView paper
		ctx.fillStyle = INK.paper;
		ctx.beginPath();
		ctx.moveTo(x - pillW / 2 + pillR, y - pillH / 2);
		ctx.lineTo(x + pillW / 2 - pillR, y - pillH / 2);
		ctx.arcTo(
			x + pillW / 2,
			y - pillH / 2,
			x + pillW / 2,
			y - pillH / 2 + pillR,
			pillR,
		);
		ctx.lineTo(x + pillW / 2, y + pillH / 2 - pillR);
		ctx.arcTo(
			x + pillW / 2,
			y + pillH / 2,
			x + pillW / 2 - pillR,
			y + pillH / 2,
			pillR,
		);
		ctx.lineTo(x - pillW / 2 + pillR, y + pillH / 2);
		ctx.arcTo(
			x - pillW / 2,
			y + pillH / 2,
			x - pillW / 2,
			y + pillH / 2 - pillR,
			pillR,
		);
		ctx.lineTo(x - pillW / 2, y - pillH / 2 + pillR);
		ctx.arcTo(
			x - pillW / 2,
			y - pillH / 2,
			x - pillW / 2 + pillR,
			y - pillH / 2,
			pillR,
		);
		ctx.closePath();
		ctx.fill();
		ctx.shadowBlur = 0;

		// Ink border (subtle)
		ctx.globalAlpha *= 0.3;
		ctx.strokeStyle = INK.line;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.globalAlpha /= 0.3; // restore

		// Main text
		ctx.fillStyle = INK.text;
		ctx.font = 'bold 24px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(config.text, x, y - (config.subtitle ? 6 : 0));

		// Subtitle (smaller, below)
		if (config.subtitle) {
			ctx.fillStyle = INK.muted;
			ctx.font = '12px "PingFang SC", "Noto Sans SC", sans-serif';
			ctx.fillText(config.subtitle, x, y + 22);
		}
	}

	/** Vertical calligraphy popup (竖排题词) */
	private renderVertical(
		ctx: CanvasRenderingContext2D,
		config: PopupConfig,
		x: number,
		y: number,
	): void {
		// Background panel — semi-transparent paper
		const panelW = 100;
		const textLen = config.text.replace(/[\s/]/g, "").length;
		const panelH = Math.max(textLen * 42 + 60, 120);

		ctx.fillStyle = `rgba(255,250,240,0.92)`; // InkView paper at 92%
		ctx.shadowColor = "rgba(0,0,0,0.08)";
		ctx.shadowBlur = 12;

		// Rounded rect
		const r = 8;
		const px = x - panelW / 2;
		const py = y - panelH / 2;
		ctx.beginPath();
		ctx.moveTo(px + r, py);
		ctx.lineTo(px + panelW - r, py);
		ctx.arcTo(px + panelW, py, px + panelW, py + r, r);
		ctx.lineTo(px + panelW, py + panelH - r);
		ctx.arcTo(px + panelW, py + panelH, px + panelW - r, py + panelH, r);
		ctx.lineTo(px + r, py + panelH);
		ctx.arcTo(px, py + panelH, px, py + panelH - r, r);
		ctx.lineTo(px, py + r);
		ctx.arcTo(px, py, px + r, py, r);
		ctx.closePath();
		ctx.fill();
		ctx.shadowBlur = 0;

		// Subtle ink border
		ctx.strokeStyle = `${INK.line}26`; // ~15% opacity
		ctx.lineWidth = 1;
		ctx.stroke();

		// Cinnabar accent line at top
		ctx.fillStyle = `${INK.cinnabar}40`; // ~25% opacity
		ctx.fillRect(px + 12, py + 6, panelW - 24, 2);

		// Vertical text — right-to-left, top-to-bottom
		drawVerticalText(ctx, x + 10, py + 20, {
			text: config.text,
			fontSize: 36,
			color: INK.text,
			jitter: 0.6,
			alphaVariation: 0.1,
		});

		// Subtitle at bottom if present
		if (config.subtitle) {
			ctx.fillStyle = INK.muted;
			ctx.font = '12px "PingFang SC", "Noto Sans SC", sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.fillText(config.subtitle, x, py + panelH - 8);
		}
	}

	clear(): void {
		this.active = [];
	}
}
