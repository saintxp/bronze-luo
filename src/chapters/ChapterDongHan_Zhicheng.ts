/**
 * 铜声·识洛 — Chapter DongHan Zhicheng 叁·东汉·纸成
 *
 * Puzzle: 水帘对位 (P1, 6 frames)
 * Three grids: water tank (overhead fiber pattern), curtain (bamboo mat),
 * water surface (reflection). Player drags curtain to align fibers at 90°
 * for proper filtration. 4 snap angles: 0°/30°/60°/90° (90° = correct).
 *
 * Frame flow:
 *   TANK (auto) → CURTAIN_APPEAR (auto) → PUZZLE (interactive drag)
 *   → FIBERS_ATTACH (auto) → REFLECTION (auto) → STAMP「纸成」
 *
 * Palette: vermillion #C23B22, gold accent #D4A843
 * Contains white hair from Zhou era (暗线: 水的第一种面貌·液态·浸入)
 * Stamp: 「纸成」
 */

import { ChapterBase } from "./ChapterBase";
import type { CanvasManager } from "../engine/CanvasManager";
import type { DragHandler } from "../engine/DragHandler";
import type { StampEffect } from "../ui/StampEffect";
import { eventBus } from "../utils/EventBus";
import {
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	SNAP_THRESHOLD,
} from "../utils/constants";
import { type Vec2, vec2Distance } from "../utils/math";
import { createLogger } from "../utils/logger";

const log = createLogger("ChapterZhicheng");

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Layout ───────── */
const TANK_POS: Vec2 = { x: CX - 120, y: CY - 120 };
const TANK_SIZE = { w: 240, h: 180 };

// Curtain (bamboo mat) — draggable grid
const CURTAIN_START: Vec2 = { x: CX + 100, y: CY - 80 };
const CURTAIN_SIZE = { w: 100, h: 160 };

// The 4 snap positions produce different angles (rotation implied by position)
// We simulate "angle" by which edge faces the tank
const SNAP_ANGLES = [
	{ pos: { x: CX - 115, y: CY - 118 }, label: "90° — 正确" }, // correct
	{ pos: { x: CX - 115, y: CY - 80 }, label: "60°" },
	{ pos: { x: CX - 60, y: CY - 118 }, label: "30°" },
	{ pos: { x: CX + 50, y: CY - 118 }, label: "0°" },
];
const CORRECT_INDEX = 0;

/* ───────── Frame enum ───────── */
enum ZhichengFrame {
	TANK,
	CURTAIN_APPEAR,
	PUZZLE,
	FIBERS_ATTACH,
	WATER_REFLECTION,
	STAMP,
}

export class ChapterDongHanZhicheng extends ChapterBase {
	private canvasManager: CanvasManager;
	private dragHandler: DragHandler;
	private stampEffect: StampEffect;
	private frame: ZhichengFrame = ZhichengFrame.TANK;
	private frameTimer = 0;
	private skipRender = false;

	// Curtain drag state
	private curtainPos: Vec2 = { ...CURTAIN_START };
	private snappedIndex = -1;
	private puzzleSolved = false;

	// Fibers animation
	private fibersAlpha = 0;

	// Reflection animation
	private reflectionAlpha = 0;

	// Hair in pulp
	private hairAlpha = 0;

	private readonly AUTO_TANK = 2000;
	private readonly AUTO_FIBERS = 1500;
	private readonly AUTO_REFLECTION = 2000;
	private readonly STAMP_DURATION = 2000;

	constructor(
		canvasManager: CanvasManager,
		dragHandler: DragHandler,
		stampEffect: StampEffect,
	) {
		super("donghan-zhicheng");
		this.canvasManager = canvasManager;
		this.dragHandler = dragHandler;
		this.stampEffect = stampEffect;
	}

	init(): void {
		this.puzzles = [];
		log.info("Zhicheng chapter initialized");
	}

	enter(): void {
		super.enter();
		this.resetState();
		this.frame = ZhichengFrame.TANK;
		log.info("Zhicheng entered — 纸成");
	}

	exit(): void {
		super.exit();
		this.teardownInteraction();
	}

	private resetState(): void {
		this.frameTimer = 0;
		this.skipRender = false;
		this.curtainPos = { ...CURTAIN_START };
		this.snappedIndex = -1;
		this.puzzleSolved = false;
		this.fibersAlpha = 0;
		this.reflectionAlpha = 0;
		this.hairAlpha = 0;
	}

	/* ───────── Update loop ───────── */
	update(dt: number): void {
		if (this.skipRender) return;
		this.frameTimer += dt;

		switch (this.frame) {
			case ZhichengFrame.TANK:
				if (this.frameTimer >= this.AUTO_TANK) this.advanceToCurtain();
				break;
			case ZhichengFrame.FIBERS_ATTACH:
				this.fibersAlpha = Math.min(1, this.frameTimer / 800);
				if (this.frameTimer >= this.AUTO_FIBERS) this.advanceToReflection();
				break;
			case ZhichengFrame.WATER_REFLECTION:
				this.reflectionAlpha = Math.min(1, this.frameTimer / 1000);
				this.hairAlpha = Math.max(
					0,
					Math.min(1, (this.frameTimer - 500) / 1000),
				);
				if (this.frameTimer >= this.AUTO_REFLECTION) this.advanceToStamp();
				break;
			case ZhichengFrame.STAMP:
				if (this.frameTimer >= this.STAMP_DURATION) this.advanceToComplete();
				break;
		}

		this.renderFrame();
	}

	/* ───────── Transitions ───────── */
	private advanceToCurtain(): void {
		this.frame = ZhichengFrame.CURTAIN_APPEAR;
		this.frameTimer = 0;
		// Auto-advance to puzzle after brief display
		setTimeout(() => {
			if (this.frame === ZhichengFrame.CURTAIN_APPEAR) this.advanceToPuzzle();
		}, 1500);
		log.info("Zhicheng: TANK → CURTAIN");
	}

	private advanceToPuzzle(): void {
		this.frame = ZhichengFrame.PUZZLE;
		this.frameTimer = 0;
		this.setupCurtainDrag();
		log.info("Zhicheng: CURTAIN → PUZZLE");
	}

	private advanceToFibers(): void {
		this.teardownInteraction();
		this.frame = ZhichengFrame.FIBERS_ATTACH;
		this.frameTimer = 0;
		this.fibersAlpha = 0;
		this.puzzleSolved = true;
		log.info("Zhicheng: PUZZLE → FIBERS");
	}

	private advanceToReflection(): void {
		this.frame = ZhichengFrame.WATER_REFLECTION;
		this.frameTimer = 0;
		this.reflectionAlpha = 0;
		this.hairAlpha = 0;
		log.info("Zhicheng: FIBERS → REFLECTION");
	}

	private advanceToStamp(): void {
		this.frame = ZhichengFrame.STAMP;
		this.frameTimer = 0;
		this.stampEffect.showStamp({ text: "纸成" });
		log.info("Zhicheng: REFLECTION → STAMP");
	}

	private advanceToComplete(): void {
		this.skipRender = true;
		eventBus.emit("chapter:complete", { chapterId: "donghan-zhicheng" });
		log.info("Zhicheng → COMPLETE");
	}

	/* ───────── Interaction ───────── */
	private teardownInteraction(): void {
		this.dragHandler.detach();
		this.dragHandler.onDrag(() => {});
		this.dragHandler.onDragEnd(() => {});
	}

	private setupCurtainDrag(): void {
		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;

		this.dragHandler.attach(canvas);
		this.dragHandler.setMode("element");

		this.dragHandler.registerElement({
			id: "curtain",
			getPos: () => this.curtainPos,
			setPos: (pos) => {
				this.curtainPos = pos;
			},
			getSize: () => CURTAIN_SIZE,
		});

		this.dragHandler.onDragEnd(() => {
			if (this.puzzleSolved) return;
			const curtainCenter: Vec2 = {
				x: this.curtainPos.x + CURTAIN_SIZE.w / 2,
				y: this.curtainPos.y + CURTAIN_SIZE.h / 2,
			};
			for (let i = 0; i < SNAP_ANGLES.length; i++) {
				const snapCenter: Vec2 = {
					x: SNAP_ANGLES[i].pos.x + CURTAIN_SIZE.w / 2,
					y: SNAP_ANGLES[i].pos.y + CURTAIN_SIZE.h / 2,
				};
				if (vec2Distance(curtainCenter, snapCenter) < SNAP_THRESHOLD + 20) {
					this.snappedIndex = i;
					this.curtainPos = { ...SNAP_ANGLES[i].pos };
					if (i === CORRECT_INDEX) {
						this.advanceToFibers();
					} else {
						setTimeout(() => {
							if (!this.puzzleSolved) {
								this.snappedIndex = -1;
								this.curtainPos = { ...CURTAIN_START };
							}
						}, 800);
					}
					return;
				}
			}
		});
	}

	/* ───────── Rendering ───────── */
	private renderFrame(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const ctx = this.canvasManager.getContext("bg");
		if (!ctx) return;

		// Warm workshop background
		this.drawWorkshopBg(ctx);

		switch (this.frame) {
			case ZhichengFrame.TANK:
				this.renderTank(ctx, false);
				break;
			case ZhichengFrame.CURTAIN_APPEAR:
				this.renderTank(ctx, true);
				break;
			case ZhichengFrame.PUZZLE:
				this.renderPuzzle(ctx);
				break;
			case ZhichengFrame.FIBERS_ATTACH:
				this.renderFibersAttach(ctx);
				break;
			case ZhichengFrame.WATER_REFLECTION:
				this.renderReflection(ctx);
				break;
			case ZhichengFrame.STAMP:
				this.renderStampFrame(ctx);
				break;
		}
	}

	private drawWorkshopBg(ctx: CanvasRenderingContext2D): void {
		const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
		grad.addColorStop(0, "#f0e8d8");
		grad.addColorStop(1, "#d8c8b0");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}

	/* ───────── Tank frame ───────── */
	private renderTank(
		ctx: CanvasRenderingContext2D,
		showCurtain: boolean,
	): void {
		const tx = TANK_POS.x;
		const ty = TANK_POS.y;
		const tw = TANK_SIZE.w;
		const th = TANK_SIZE.h;

		// Water tank
		ctx.fillStyle = "#c8c0b0";
		ctx.fillRect(tx, ty, tw, th);

		// Tank rim (wood/bronze)
		ctx.strokeStyle = "#8B8070";
		ctx.lineWidth = 4;
		ctx.strokeRect(tx, ty, tw, th);

		// Water surface (pulp suspension)
		ctx.fillStyle = "rgba(180,200,190,0.5)";
		ctx.fillRect(tx + 4, ty + 4, tw - 8, th - 8);

		// Fiber strands in water (horizontal by default)
		ctx.strokeStyle = "rgba(240,232,216,0.7)";
		ctx.lineWidth = 1;
		for (let y = ty + 20; y < ty + th - 20; y += 15) {
			const wobble = Math.sin(y * 0.1 + performance.now() / 1500) * 5;
			ctx.beginPath();
			ctx.moveTo(tx + 20 + wobble, y);
			ctx.lineTo(tx + tw - 20 + wobble, y);
			ctx.stroke();
		}

		// Curtain on puzzle layer if visible
		if (showCurtain && this.frame === ZhichengFrame.CURTAIN_APPEAR) {
			const pCtx = this.canvasManager.getContext("puzzle");
			if (pCtx) {
				pCtx.fillStyle = "#d8c8a8";
				pCtx.fillRect(
					CURTAIN_START.x,
					CURTAIN_START.y,
					CURTAIN_SIZE.w,
					CURTAIN_SIZE.h,
				);
				// Bamboo strips (vertical lines)
				pCtx.strokeStyle = "#a09070";
				pCtx.lineWidth = 1;
				for (
					let bx = CURTAIN_START.x + 10;
					bx < CURTAIN_START.x + CURTAIN_SIZE.w;
					bx += 8
				) {
					pCtx.beginPath();
					pCtx.moveTo(bx, CURTAIN_START.y + 10);
					pCtx.lineTo(bx, CURTAIN_START.y + CURTAIN_SIZE.h - 10);
					pCtx.stroke();
				}
			}
		}

		// Label
		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("水槽 · 纸浆悬浮", CX, ty + th + 40);
	}

	/* ───────── Puzzle frame ───────── */
	private renderPuzzle(ctx: CanvasRenderingContext2D): void {
		this.renderTank(ctx, false);
		this.renderSnapZones(ctx);

		// Draggable curtain on puzzle layer
		const pCtx = this.canvasManager.getContext("puzzle");
		if (pCtx) {
			const cx = this.curtainPos.x;
			const cy = this.curtainPos.y;
			const cw = CURTAIN_SIZE.w;
			const ch = CURTAIN_SIZE.h;

			// Curtain body
			pCtx.fillStyle = "#d8c8a8";
			pCtx.fillRect(cx, cy, cw, ch);
			pCtx.strokeStyle = "#8B8070";
			pCtx.lineWidth = 1.5;
			pCtx.strokeRect(cx, cy, cw, ch);

			// Bamboo strips (vertical by default, player rotates by finding right snap)
			pCtx.strokeStyle = "#a09070";
			pCtx.lineWidth = 1;
			for (let bx = cx + 8; bx < cx + cw; bx += 8) {
				pCtx.beginPath();
				pCtx.moveTo(bx, cy + 10);
				pCtx.lineTo(bx, cy + ch - 10);
				pCtx.stroke();
			}

			// Snap glow
			if (this.snappedIndex >= 0 && this.snappedIndex !== CORRECT_INDEX) {
				pCtx.strokeStyle = "rgba(194,59,34,0.6)";
				pCtx.lineWidth = 2;
				pCtx.strokeRect(cx - 2, cy - 2, cw + 4, ch + 4);
			}
		}
	}

	private renderSnapZones(ctx: CanvasRenderingContext2D): void {
		SNAP_ANGLES.forEach((snap, i) => {
			const pulse = 0.3 + 0.2 * Math.sin(performance.now() / 600 + i);
			ctx.strokeStyle = `rgba(194,59,34,${pulse})`;
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 6]);
			ctx.strokeRect(snap.pos.x, snap.pos.y, CURTAIN_SIZE.w, CURTAIN_SIZE.h);
			ctx.setLineDash([]);
		});
	}

	/* ───────── Fibers attach frame ───────── */
	private renderFibersAttach(ctx: CanvasRenderingContext2D): void {
		const tx = TANK_POS.x;
		const ty = TANK_POS.y;
		const tw = TANK_SIZE.w;
		const th = TANK_SIZE.h;

		// Water tank
		ctx.fillStyle = "#c8c0b0";
		ctx.fillRect(tx, ty, tw, th);
		ctx.strokeStyle = "#8B8070";
		ctx.lineWidth = 4;
		ctx.strokeRect(tx, ty, tw, th);

		// Water surface
		ctx.fillStyle = "rgba(180,200,190,0.5)";
		ctx.fillRect(tx + 4, ty + 4, tw - 8, th - 8);

		// Fibers neatly aligned (90° — vertical, matching curtain strips)
		ctx.strokeStyle = `rgba(240,232,216,${0.3 + this.fibersAlpha * 0.5})`;
		ctx.lineWidth = 1.5;
		for (let x = tx + 20; x < tx + tw - 20; x += 12) {
			ctx.beginPath();
			ctx.moveTo(x, ty + 20);
			ctx.lineTo(x, ty + th - 20);
			ctx.stroke();
		}

		// Curtain at correct position (faded)
		const snap = SNAP_ANGLES[CORRECT_INDEX];
		ctx.fillStyle = `rgba(216,200,168,${this.fibersAlpha})`;
		ctx.strokeStyle = `rgba(139,128,112,${this.fibersAlpha})`;
		ctx.lineWidth = 1;
		ctx.strokeRect(snap.pos.x, snap.pos.y, CURTAIN_SIZE.w, CURTAIN_SIZE.h);

		// Golden alignment glow
		const glow = ctx.createRadialGradient(
			snap.pos.x + CURTAIN_SIZE.w / 2,
			snap.pos.y + CURTAIN_SIZE.h / 2,
			0,
			snap.pos.x + CURTAIN_SIZE.w / 2,
			snap.pos.y + CURTAIN_SIZE.h / 2,
			120,
		);
		glow.addColorStop(0, `rgba(212,168,67,${0.3 * this.fibersAlpha})`);
		glow.addColorStop(1, "rgba(212,168,67,0)");
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(
			snap.pos.x + CURTAIN_SIZE.w / 2,
			snap.pos.y + CURTAIN_SIZE.h / 2,
			120,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		// Label
		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("纤维整齐附着 · 90°", CX, ty + th + 40);
	}

	/* ───────── Water reflection frame ───────── */
	private renderReflection(ctx: CanvasRenderingContext2D): void {
		this.drawWorkshopBg(ctx);

		const tx = TANK_POS.x;
		const ty = TANK_POS.y;
		const tw = TANK_SIZE.w;
		const th = TANK_SIZE.h;

		// Tank with aligned fibers
		ctx.fillStyle = "#c8c0b0";
		ctx.fillRect(tx, ty, tw, th);
		ctx.strokeStyle = "#8B8070";
		ctx.lineWidth = 4;
		ctx.strokeRect(tx, ty, tw, th);

		// Water with rippling reflection
		ctx.fillStyle = "rgba(160,190,200,0.5)";
		ctx.fillRect(tx + 4, ty + 4, tw - 8, th - 8);

		// Reflection: inverted tank below
		if (this.reflectionAlpha > 0.01) {
			const refY = ty + th + 40;
			ctx.save();
			ctx.globalAlpha = this.reflectionAlpha * 0.5;
			ctx.fillStyle = "rgba(180,200,190,0.3)";
			ctx.fillRect(tx, refY, tw, th * 0.6);
			// Ripple effect
			ctx.strokeStyle = "rgba(200,220,220,0.3)";
			ctx.lineWidth = 1;
			for (let rl = 0; rl < 6; rl++) {
				const ry = refY + rl * 15;
				const rwobble = Math.sin(rl * 1.5 + performance.now() / 2000) * 20;
				ctx.beginPath();
				ctx.moveTo(tx + rwobble, ry);
				ctx.lineTo(tx + tw - rwobble, ry);
				ctx.stroke();
			}
			ctx.restore();
		}

		// White hair in pulp (暗线: 水的第一种面貌)
		if (this.hairAlpha > 0.01) {
			ctx.save();
			ctx.globalAlpha = this.hairAlpha;
			ctx.strokeStyle = "rgba(240,235,220,0.7)";
			ctx.lineWidth = 1;
			const hairX = tx + tw / 2;
			const hairY = ty + th / 2;
			// Single white hair strand
			ctx.beginPath();
			ctx.moveTo(hairX - 15, hairY - 10);
			ctx.quadraticCurveTo(hairX + 10, hairY - 20, hairX + 30, hairY);
			ctx.quadraticCurveTo(hairX + 50, hairY + 10, hairX + 60, hairY - 15);
			ctx.stroke();
			ctx.restore();
		}

		// Label
		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		if (this.hairAlpha > 0.5) {
			ctx.fillText("纸浆里的白发 · 从周抄入汉", CX, ty + th + 140);
		} else {
			ctx.fillText("水面倒影 · 自动吻合", CX, ty + th + 140);
		}
	}

	/* ───────── Stamp frame ───────── */
	private renderStampFrame(ctx: CanvasRenderingContext2D): void {
		this.drawWorkshopBg(ctx);

		ctx.fillStyle = "#C23B22";
		ctx.font = '36px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("纸成", CX, CY - 20);

		ctx.fillStyle = "#6f675d";
		ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
		ctx.fillText("—— 东汉 · 蔡伦造纸 ——", CX, CY + 40);
	}
}
