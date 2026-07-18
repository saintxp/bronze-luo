/**
 * 铜声·识洛 — HudMenu 暂停菜单 / 设置面板 (stage-js)
 *
 * A stage-js mounted overlay above the Map layer (z-index 6).
 * ESC key or pause button toggles it; opening pauses the ChapterManager.
 *
 * Layout (1920×1080 viewbox, "in" fit — same letterboxing as CanvasManager):
 *   backdrop  — full-screen ink wash, click to resume
 *   panel     — rice-paper rounded rect with cinnabar border +「暂停」title
 *   buttons   — 继续 / 重玩本章 / 回到首页
 *   toggle    — 音效 开/关 (AudioManager master gain)
 */

import {
	mount,
	component,
	memoizeDraw,
	type Component,
	type Root,
	type Sprite,
} from "stage-js";
import { AudioManager } from "../audio/AudioManager";
import { getCachedPaperTexture } from "./InkPaintingUtils";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../utils/constants";
import { createLogger } from "../utils/logger";

const log = createLogger("HudMenu");

/* ───────── InkView palette ───────── */
const INK = {
	bg: "#f6f1e6",
	paper: "#fffaf0",
	paperDeep: "#eee3d0",
	text: "#201c18",
	muted: "#6f675d",
	line: "#2a2723",
	cinnabar: "#b64232",
	wash: "rgba(32,28,24,0.55)",
};

const FONT = '"PingFang SC", "Noto Sans SC", serif';

export interface HudMenuCallbacks {
	/** Pause or resume chapter updates. */
	onPauseChange: (paused: boolean) => void;
	/** Restart the current chapter. */
	onRestartChapter: () => void;
	/** Navigate back to the start page. */
	onHome: () => void;
}

/* ───────── Panel layout (viewbox coords) ───────── */
const PANEL = { x: 700, y: 240, w: 520, h: 600 };
const BTN_W = 400;
const BTN_H = 72;
const BTN_X = 760;
const BTN_RESUME_Y = 420;
const BTN_RESTART_Y = 530;
const BTN_HOME_Y = 640;
const BTN_MUTE_Y = 745;
const BTN_MUTE_H = 56;

export class HudMenu {
	private root: Root;
	private canvas: HTMLCanvasElement;
	private menuLayer: Component;
	private callbacks: HudMenuCallbacks;
	private btnMute: Sprite | null = null;
	private _open = false;

	constructor(container: HTMLElement, callbacks: HudMenuCallbacks) {
		this.callbacks = callbacks;

		// Stage canvas — positioned over the game canvas block, above map layer.
		// stage-js viewbox aligns content top-left, so the canvas must match the
		// game canvas rect exactly (CanvasManager.getDisplayRect) — done in resize().
		this.canvas = document.createElement("canvas");
		this.canvas.style.position = "absolute";
		this.canvas.style.zIndex = "6";
		this.canvas.style.pointerEvents = "none";
		container.appendChild(this.canvas);

		this.root = mount({ canvas: this.canvas });
		this.root.viewbox(CANVAS_WIDTH, CANVAS_HEIGHT, "fill");

		this.menuLayer = this.buildMenu();
		this.menuLayer.visible(false);
		this.root.append(this.menuLayer);

		log.info("HudMenu initialized (stage-js)");
	}

	/**
	 * Align the stage canvas 1:1 with the game canvas block so viewbox
	 * coordinates and pointer mapping match the game exactly.
	 */
	resize(rect: {
		left: number;
		top: number;
		width: number;
		height: number;
	}): void {
		this.canvas.style.left = `${rect.left}px`;
		this.canvas.style.top = `${rect.top}px`;
		this.canvas.style.width = `${rect.width}px`;
		this.canvas.style.height = `${rect.height}px`;
		this.root.resizeCanvas();
	}

	get isOpen(): boolean {
		return this._open;
	}

	/* ───────── Component builders ───────── */

	private drawButton(
		label: string,
		w: number,
		h: number,
		opts: { accent?: boolean } = {},
	): Sprite {
		return memoizeDraw((ratio, texture) => {
			texture.setSize(w, h, ratio);
			const ctx = texture.getContext("2d");
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

			// Paper-deep body + ink border
			ctx.fillStyle = INK.paperDeep;
			roundRectPath(ctx, 0, 0, w, h, 8);
			ctx.fill();
			ctx.strokeStyle = opts.accent ? INK.cinnabar : INK.line;
			ctx.lineWidth = 1.5;
			ctx.stroke();

			ctx.fillStyle = INK.text;
			ctx.font = `26px ${FONT}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(label, w / 2, h / 2 + 1);
		}).size(w, h);
	}

	private buildMenu(): Component {
		// Container component
		const menu = component();

		// Backdrop — full viewbox ink wash, click to resume
		const backdrop = memoizeDraw((ratio, texture) => {
			texture.setSize(CANVAS_WIDTH, CANVAS_HEIGHT, ratio);
			const ctx = texture.getContext("2d");
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			ctx.fillStyle = INK.wash;
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		}).size(CANVAS_WIDTH, CANVAS_HEIGHT);
		backdrop.pin({ offsetX: 0, offsetY: 0 });
		backdrop.on("click", () => this.close());
		menu.append(backdrop);

		// Panel — paper texture + cinnabar border + title
		const panel = memoizeDraw((ratio, texture) => {
			texture.setSize(PANEL.w, PANEL.h, ratio);
			const ctx = texture.getContext("2d");
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

			// Rice paper fill (clipped to rounded rect)
			ctx.save();
			roundRectPath(ctx, 0, 0, PANEL.w, PANEL.h, 14);
			ctx.clip();
			const paper = getCachedPaperTexture();
			ctx.drawImage(paper, 0, 0, PANEL.w, PANEL.h);
			// Subtle warm tint
			ctx.fillStyle = "rgba(246,241,230,0.35)";
			ctx.fillRect(0, 0, PANEL.w, PANEL.h);
			ctx.restore();

			// Cinnabar border
			ctx.strokeStyle = INK.cinnabar;
			ctx.lineWidth = 2;
			roundRectPath(ctx, 1, 1, PANEL.w - 2, PANEL.h - 2, 13);
			ctx.stroke();

			// Title
			ctx.fillStyle = INK.text;
			ctx.font = `bold 44px ${FONT}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("暂停", PANEL.w / 2, 78);

			// Divider
			ctx.strokeStyle = "rgba(42,39,35,0.25)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(60, 128);
			ctx.lineTo(PANEL.w - 60, 128);
			ctx.stroke();

			// Corner seal accent
			ctx.fillStyle = INK.cinnabar;
			ctx.font = `20px ${FONT}`;
			ctx.textAlign = "right";
			ctx.fillText("识洛", PANEL.w - 28, PANEL.h - 30);
		}).size(PANEL.w, PANEL.h);
		panel.pin({ offsetX: PANEL.x, offsetY: PANEL.y });
		menu.append(panel);

		// Buttons
		const btnResume = this.drawButton("继续", BTN_W, BTN_H, { accent: true });
		btnResume.pin({ offsetX: BTN_X, offsetY: BTN_RESUME_Y });
		btnResume.on("click", () => {
			this.close();
			return true; // stop propagation to backdrop
		});
		menu.append(btnResume);

		const btnRestart = this.drawButton("重玩本章", BTN_W, BTN_H);
		btnRestart.pin({ offsetX: BTN_X, offsetY: BTN_RESTART_Y });
		btnRestart.on("click", () => {
			this.callbacks.onRestartChapter();
			this.close();
			return true;
		});
		menu.append(btnRestart);

		const btnHome = this.drawButton("回到首页", BTN_W, BTN_H);
		btnHome.pin({ offsetX: BTN_X, offsetY: BTN_HOME_Y });
		btnHome.on("click", () => {
			this.close();
			this.callbacks.onHome();
			return true;
		});
		menu.append(btnHome);

		// Audio toggle — memoizer redraws when muted flips
		this.btnMute = memoizeDraw(
			(ratio, texture) => {
				const w = BTN_W;
				const h = BTN_MUTE_H;
				texture.setSize(w, h, ratio);
				const ctx = texture.getContext("2d");
				ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

				const muted = AudioManager.instance.muted;
				ctx.fillStyle = muted ? "#e4d8c4" : INK.paperDeep;
				roundRectPath(ctx, 0, 0, w, h, 8);
				ctx.fill();
				ctx.strokeStyle = INK.line;
				ctx.lineWidth = 1.5;
				ctx.stroke();

				ctx.fillStyle = muted ? INK.muted : INK.text;
				ctx.font = `22px ${FONT}`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(muted ? "音效：关" : "音效：开", w / 2, h / 2 + 1);
			},
			() => AudioManager.instance.muted,
		).size(BTN_W, BTN_MUTE_H);
		this.btnMute.pin({ offsetX: BTN_X, offsetY: BTN_MUTE_Y });
		this.btnMute.on("click", () => {
			AudioManager.instance.setMuted(!AudioManager.instance.muted);
			// Force stage-js to prerender the memoized texture so the label redraws.
			this.btnMute!.pin("alpha", this.btnMute!.pin("alpha"));
			return true;
		});
		menu.append(this.btnMute);

		return menu;
	}

	/* ───────── Open / close ───────── */

	open(): void {
		if (this._open) return;
		this._open = true;
		this.menuLayer.visible(true);
		this.menuLayer.pin("alpha", 0);
		this.menuLayer.tween(200).pin({ alpha: 1 });
		this.canvas.style.pointerEvents = "auto";
		this.callbacks.onPauseChange(true);
		log.info("HudMenu opened");
	}

	close(): void {
		if (!this._open) return;
		this._open = false;
		this.menuLayer.visible(false);
		this.canvas.style.pointerEvents = "none";
		this.callbacks.onPauseChange(false);
		log.info("HudMenu closed");
	}

	toggle(): void {
		if (this._open) {
			this.close();
		} else {
			this.open();
		}
	}

	destroy(): void {
		this.root.unmount();
		this.canvas.remove();
	}
}

/* ───────── Helpers ───────── */

function roundRectPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): void {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}
