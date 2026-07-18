/**
 * 铜声·识洛 — Chapter DongHan Tuo 叁·东汉·托
 *
 * Puzzle: 敲→反光→逃邙山 (P1, 5 frames, 2-stage drag)
 *
 * Stage 1 "刀背敲手":
 *   党锢之祸中,逃亡者之间的暗号——刀背（钝脊）轻敲
 *   伸出掌心的生命线 → 金属反光映出月光 → 光路指向邙山逃路
 *   Visual: realistic Chinese knife (刀, blunt back on top, sharp edge
 *   below, wooden handle on right) → drag to palm with visible life-line
 *   → pulsing target zone shows exactly where to place it.
 *
 * Stage 2 "反光引路":
 *   Drag the reflection glow to the Mangshan mountain path.
 *
 * 纸态: 拒水 (translucent cold-white paper)
 * 暗线: 手印三部曲① + 牡丹第二环(野生牡丹) + 北邙第一环(泪眼)
 *
 * Frame flow:
 *   PAPER_SHIFT (auto, 纸态切换) → STAGE1 (interactive, 刀背→掌纹)
 *   → REFLECTION (auto) → STAGE2 (interactive, 反光→山路)
 *   → STAMP「托」
 *
 * Palette: translucent white, cinnabar
 * Stamp: 「托」
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

const log = createLogger("ChapterTuo");

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Layout ───────── */

// Stage 1: knife back → palm
//
// Narrative: 党锢之祸 — the knife-back knock is a secret signal.
// Blunt spine taps the life-line of an outstretched palm → metallic
// flash reflects moonlight → the light traces the escape to Mangshan.

// Palm — on the left half, hand silhouette facing up
const PALM_CENTER: Vec2 = { x: CX - 160, y: CY + 30 };
// Knife — Chinese straight-backed blade (刀)
// Handle on the right, blunt back on top, sharp edge below
const KNIFE_W = 140;
const KNIFE_H = 24;
const KNIFE_START: Vec2 = { x: CX + 100, y: CY - 100 };
// Target: knife-back rests across the palm, aligned with the life-line
const KNIFE_TARGET: Vec2 = {
	x: PALM_CENTER.x - KNIFE_W / 2,
	y: PALM_CENTER.y - 40,
};

// Stage 2: reflection → Mangshan path
const REFLECTION_START: Vec2 = { x: CX, y: CY + 150 };
const REFLECTION_W = 60;
const REFLECTION_H = 40;
const MANGSHAN_TARGET: Vec2 = { x: CX + 160, y: CY - 120 };
const PATH_W = 80;
const PATH_H = 60;

/* ───────── Frame enum ───────── */
enum TuoFrame {
	PAPER_SHIFT,
	STAGE1,
	REFLECTION_APPEAR,
	STAGE2,
	STAMP,
}

export class ChapterDongHanTuo extends ChapterBase {
	private canvasManager: CanvasManager;
	private dragHandler: DragHandler;
	private stampEffect: StampEffect;
	private frame: TuoFrame = TuoFrame.PAPER_SHIFT;
	private frameTimer = 0;
	private skipRender = false;

	// Stage 1 state
	private knifePos: Vec2 = { ...KNIFE_START };
	private stage1Solved = false;

	// Stage 2 state
	private reflPos: Vec2 = { ...REFLECTION_START };
	private stage2Solved = false;

	// Paper shift animation
	private paperShiftAlpha = 0;

	// Reflection glow
	private reflectionGlowAlpha = 0;

	// Wild peony (牡丹第二环)
	private peonyAlpha = 0;

	// Tear pool (北邙第一环)
	private tearAlpha = 0;

	private readonly AUTO_SHIFT = 2000;
	private readonly AUTO_REFLECTION = 1500;
	private readonly STAMP_DURATION = 2500;

	constructor(
		canvasManager: CanvasManager,
		dragHandler: DragHandler,
		stampEffect: StampEffect,
	) {
		super("donghan-tuo");
		this.canvasManager = canvasManager;
		this.dragHandler = dragHandler;
		this.stampEffect = stampEffect;
	}

	init(): void {
		this.puzzles = [];
		log.info("Tuo chapter initialized");
	}

	enter(): void {
		super.enter();
		this.resetState();
		this.frame = TuoFrame.PAPER_SHIFT;
		log.info("Tuo entered — 托");
	}

	exit(): void {
		super.exit();
		this.teardownInteraction();
	}

	private resetState(): void {
		this.frameTimer = 0;
		this.skipRender = false;
		this.knifePos = { ...KNIFE_START };
		this.stage1Solved = false;
		this.reflPos = { ...REFLECTION_START };
		this.stage2Solved = false;
		this.paperShiftAlpha = 0;
		this.reflectionGlowAlpha = 0;
		this.peonyAlpha = 0;
		this.tearAlpha = 0;
	}

	/* ───────── Update loop ───────── */
	update(dt: number): void {
		if (this.skipRender) return;
		this.frameTimer += dt;

		switch (this.frame) {
			case TuoFrame.PAPER_SHIFT:
				this.paperShiftAlpha = Math.min(1, this.frameTimer / 1200);
				if (this.frameTimer >= this.AUTO_SHIFT) this.advanceToStage1();
				break;
			case TuoFrame.REFLECTION_APPEAR:
				this.reflectionGlowAlpha = Math.min(1, this.frameTimer / 800);
				if (this.frameTimer >= this.AUTO_REFLECTION) this.advanceToStage2();
				break;
			case TuoFrame.STAMP:
				this.peonyAlpha = Math.min(1, this.frameTimer / 1000);
				this.tearAlpha = Math.max(
					0,
					Math.min(1, (this.frameTimer - 800) / 1200),
				);
				if (this.frameTimer >= this.STAMP_DURATION) this.advanceToComplete();
				break;
		}

		this.renderFrame();
	}

	/* ───────── Transitions ───────── */
	private advanceToStage1(): void {
		this.frame = TuoFrame.STAGE1;
		this.frameTimer = 0;
		this.setupKnifeDrag();
		log.info("Tuo: PAPER_SHIFT → STAGE1 (刀背敲手)");
	}

	private advanceToReflection(): void {
		this.teardownInteraction();
		this.frame = TuoFrame.REFLECTION_APPEAR;
		this.frameTimer = 0;
		this.reflectionGlowAlpha = 0;
		this.stage1Solved = true;
		log.info("Tuo: STAGE1 → REFLECTION");
	}

	private advanceToStage2(): void {
		this.frame = TuoFrame.STAGE2;
		this.frameTimer = 0;
		this.setupReflectionDrag();
		log.info("Tuo: REFLECTION → STAGE2 (反光→邙山)");
	}

	private advanceToStamp(): void {
		this.teardownInteraction();
		this.frame = TuoFrame.STAMP;
		this.frameTimer = 0;
		this.peonyAlpha = 0;
		this.tearAlpha = 0;
		this.stage2Solved = true;
		this.stampEffect.showStamp({ text: "托" });
		log.info("Tuo: STAGE2 → STAMP");
	}

	private advanceToComplete(): void {
		this.skipRender = true;
		eventBus.emit("chapter:complete", { chapterId: "donghan-tuo" });
		log.info("Tuo → COMPLETE");
	}

	/* ───────── Interaction ───────── */
	private teardownInteraction(): void {
		this.dragHandler.detach();
		this.dragHandler.onDrag(() => {});
		this.dragHandler.onDragEnd(() => {});
	}

	private setupKnifeDrag(): void {
		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;

		this.dragHandler.attach(canvas);
		this.dragHandler.setMode("element");

		this.dragHandler.registerElement({
			id: "knife",
			getPos: () => this.knifePos,
			setPos: (pos) => {
				this.knifePos = pos;
			},
			getSize: () => ({ w: KNIFE_W, h: KNIFE_H }),
		});

		this.dragHandler.onDragEnd(() => {
			if (this.stage1Solved) return;
			const knifeCenter: Vec2 = {
				x: this.knifePos.x + KNIFE_W / 2,
				y: this.knifePos.y + KNIFE_H / 2,
			};
			const targetCenter: Vec2 = {
				x: KNIFE_TARGET.x + KNIFE_W / 2,
				y: KNIFE_TARGET.y + KNIFE_H / 2,
			};
			if (vec2Distance(knifeCenter, targetCenter) < SNAP_THRESHOLD + 15) {
				this.knifePos = { ...KNIFE_TARGET };
				this.advanceToReflection();
			}
		});
	}

	private setupReflectionDrag(): void {
		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;

		this.dragHandler.attach(canvas);
		this.dragHandler.setMode("element");

		this.dragHandler.registerElement({
			id: "reflection",
			getPos: () => this.reflPos,
			setPos: (pos) => {
				this.reflPos = pos;
			},
			getSize: () => ({ w: REFLECTION_W, h: REFLECTION_H }),
		});

		this.dragHandler.onDragEnd(() => {
			if (this.stage2Solved) return;
			const reflCenter: Vec2 = {
				x: this.reflPos.x + REFLECTION_W / 2,
				y: this.reflPos.y + REFLECTION_H / 2,
			};
			const targetCenter: Vec2 = {
				x: MANGSHAN_TARGET.x + PATH_W / 2,
				y: MANGSHAN_TARGET.y + PATH_H / 2,
			};
			if (vec2Distance(reflCenter, targetCenter) < SNAP_THRESHOLD + 20) {
				this.reflPos = { ...MANGSHAN_TARGET };
				this.advanceToStamp();
			}
		});
	}

	/* ───────── Rendering ───────── */
	private renderFrame(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const ctx = this.canvasManager.getContext("bg");
		if (!ctx) return;

		this.drawColdPaperBg(ctx);

		switch (this.frame) {
			case TuoFrame.PAPER_SHIFT:
				this.renderPaperShift(ctx);
				break;
			case TuoFrame.STAGE1:
				this.renderStage1(ctx);
				break;
			case TuoFrame.REFLECTION_APPEAR:
				this.renderReflectionAppear(ctx);
				break;
			case TuoFrame.STAGE2:
				this.renderStage2(ctx);
				break;
			case TuoFrame.STAMP:
				this.renderStampFrame(ctx);
				break;
		}
	}

	private drawColdPaperBg(ctx: CanvasRenderingContext2D): void {
		const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
		grad.addColorStop(0, "#e8e4e0");
		grad.addColorStop(0.5, "#d8d4d0");
		grad.addColorStop(1, "#c8c4c0");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Moisture spots (paper dampening — 拒水态)
		ctx.fillStyle = "rgba(180,190,200,0.15)";
		for (let i = 0; i < 5; i++) {
			const mx = ((i * 317 + 83) * 3) % CANVAS_WIDTH;
			const my = ((i * 239 + 47) * 2) % CANVAS_HEIGHT;
			const mr = 20 + i * 12;
			ctx.beginPath();
			ctx.arc(mx, my, mr, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	/* ───────── Paper shift frame ───────── */
	private renderPaperShift(ctx: CanvasRenderingContext2D): void {
		const shiftGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
		const warm = `rgba(240,232,216,${1 - this.paperShiftAlpha})`;
		const cold = `rgba(216,212,208,${this.paperShiftAlpha})`;
		shiftGrad.addColorStop(0, warm);
		shiftGrad.addColorStop(1, cold);
		ctx.fillStyle = shiftGrad;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		ctx.fillStyle = "rgba(111,103,93,0.6)";
		ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("纸态切换 · 拒水", CX, CY);
	}

	/* ═══════════════════════════════════════
	   Stage 1: 刀背敲手 — drag knife to palm
	   ═══════════════════════════════════════ */

	/** Draw a realistic Chinese knife (刀) on the puzzle canvas.
	 *  Handle right, blunt back (刀背) on top, sharp edge below.
	 *  The knife back is highlighted to make the interaction obvious. */
	private drawKnife(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		isTarget = false,
	): void {
		const handleW = h + 12;

		// ── Blade body (wide, steel grey) ──
		const bladeX = x;
		const bladeY = y;
		const bladeW = w - handleW + 8; // blade overlaps handle slightly

		ctx.fillStyle = "#b0b0b8"; // steel
		ctx.fillRect(bladeX, bladeY, bladeW, h);

		// Blade edge — thin dark line at bottom (sharp side)
		ctx.strokeStyle = "#5a5a60";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(bladeX, bladeY + h);
		ctx.lineTo(bladeX + bladeW, bladeY + h - 2);
		ctx.stroke();

		// ── Knife back (刀背) — thick dark line at TOP ──
		// This is the key visual: the blunt spine the player must align
		ctx.strokeStyle = isTarget ? "#C23B22" : "#3a3530";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(bladeX, bladeY + 2);
		ctx.lineTo(bladeX + bladeW, bladeY);
		ctx.stroke();

		// "刀背" label on the spine
		ctx.fillStyle = isTarget ? "#C23B22" : "rgba(60,50,40,0.7)";
		ctx.font = '10px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("刀背", bladeX + bladeW / 3, bladeY - 4);

		// ── Handle (wood, right side) ──
		const hx = bladeX + bladeW - 6;
		const hy = y - 4;
		ctx.fillStyle = "#5a4030";
		ctx.fillRect(hx, hy, handleW, h + 8);

		// Handle binding (wrapped cord texture)
		ctx.strokeStyle = "rgba(80,50,30,0.4)";
		ctx.lineWidth = 1;
		for (let i = 0; i < 5; i++) {
			const by = hy + 6 + i * (h / 4);
			ctx.beginPath();
			ctx.moveTo(hx, by);
			ctx.lineTo(hx + handleW, by);
			ctx.stroke();
		}

		// Blade edge label
		ctx.fillStyle = "rgba(90,90,96,0.6)";
		ctx.font = '9px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("刃", bladeX + bladeW * 0.7, bladeY + h + 10);
	}

	/** Draw an open palm with life-line, waiting for the knife back. */
	private drawPalm(ctx: CanvasRenderingContext2D): void {
		const px = PALM_CENTER.x;
		const py = PALM_CENTER.y;

		// ── Hand silhouette (palm + 4 fingers + thumb) ──
		// Palm body
		ctx.fillStyle = "rgba(210,190,175,0.25)";
		ctx.beginPath();
		ctx.ellipse(px, py, 35, 55, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(194,59,34,0.2)";
		ctx.lineWidth = 2;
		ctx.stroke();

		// Fingers — 4 parallel lines extending up
		ctx.strokeStyle = "rgba(194,59,34,0.18)";
		ctx.lineWidth = 2;
		const fingerBaseX = px - 20;
		const fingerBaseY = py - 35;
		for (let f = 0; f < 4; f++) {
			const fx = fingerBaseX + f * 13;
			ctx.beginPath();
			ctx.moveTo(fx, fingerBaseY);
			ctx.lineTo(fx - 3, fingerBaseY - 40 + f * 5);
			ctx.stroke();
		}

		// Thumb — outward curve on the left
		ctx.beginPath();
		ctx.moveTo(px - 30, py - 15);
		ctx.quadraticCurveTo(px - 50, py - 25, px - 45, py - 40);
		ctx.stroke();

		// ── Life line (生命线) — the target for the knife back ──
		// Curves from upper-left to lower-right across the palm
		ctx.strokeStyle = "#C23B22";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(px - 28, py - 12);
		ctx.quadraticCurveTo(px + 5, py + 8, px + 28, py + 18);
		ctx.stroke();

		// Life line glow (subtle)
		ctx.strokeStyle = "rgba(194,59,34,0.12)";
		ctx.lineWidth = 8;
		ctx.beginPath();
		ctx.moveTo(px - 28, py - 12);
		ctx.quadraticCurveTo(px + 5, py + 8, px + 28, py + 18);
		ctx.stroke();
	}

	private renderStage1(ctx: CanvasRenderingContext2D): void {
		// ── Context title ──
		ctx.fillStyle = "rgba(194,59,34,0.5)";
		ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.fillText("党锢之祸 · 望门投止", CX, CY - 280);

		// ── Palm (fixed, on BG canvas) ──
		this.drawPalm(ctx);

		// ── Target zone — pulsing dashed rectangle at KNIFE_TARGET ──
		const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 600);
		ctx.strokeStyle = `rgba(194,59,34,${0.3 + pulse * 0.35})`;
		ctx.lineWidth = 2;
		ctx.setLineDash([8, 6]);
		ctx.strokeRect(
			KNIFE_TARGET.x - 4,
			KNIFE_TARGET.y - 4,
			KNIFE_W + 8,
			KNIFE_H + 8,
		);
		ctx.setLineDash([]);

		// Target label
		ctx.fillStyle = `rgba(194,59,34,${0.3 + pulse * 0.5})`;
		ctx.font = '12px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText(
			"← 刀背贴此 →",
			KNIFE_TARGET.x + KNIFE_W / 2,
			KNIFE_TARGET.y - 10,
		);

		// ── Guide arrow from knife start to target (BG canvas) ──
		const guideAlpha = 0.2 + pulse * 0.15;
		ctx.strokeStyle = `rgba(194,59,34,${guideAlpha})`;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 8]);
		ctx.beginPath();
		const sx = KNIFE_START.x + KNIFE_W / 2;
		const sy = KNIFE_START.y + KNIFE_H / 2;
		const tx = KNIFE_TARGET.x + KNIFE_W / 2;
		const ty = KNIFE_TARGET.y + KNIFE_H / 2;
		ctx.moveTo(sx, sy);
		ctx.quadraticCurveTo(tx + 80, sy, tx, ty);
		ctx.stroke();
		ctx.setLineDash([]);

		// Small arrowhead at knife start
		ctx.fillStyle = `rgba(194,59,34,${guideAlpha})`;
		ctx.font = "16px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText("↘", sx + 10, sy + 18);

		// ── Draggable knife on puzzle canvas ──
		const pCtx = this.canvasManager.getContext("puzzle");
		if (pCtx) {
			this.drawKnife(pCtx, this.knifePos.x, this.knifePos.y, KNIFE_W, KNIFE_H);
		}

		// ── Instruction (two-line narrative) ──
		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("刀背轻敲掌心  →  反光引路逃邙山", CX, CANVAS_HEIGHT - 30);

		ctx.fillStyle = "rgba(111,103,93,0.55)";
		ctx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.fillText(
			"将刀拖入掌心虚线框中 — 刀背对准红色生命线",
			CX,
			CANVAS_HEIGHT - 8,
		);
	}

	/* ───────── Reflection appear frame ───────── */
	private renderReflectionAppear(ctx: CanvasRenderingContext2D): void {
		// Palm with knife aligned
		this.drawPalm(ctx);
		this.drawKnife(ctx, KNIFE_TARGET.x, KNIFE_TARGET.y, KNIFE_W, KNIFE_H, true);

		// Reflection glow emerging from contact point
		if (this.reflectionGlowAlpha > 0.01) {
			const contactX = KNIFE_TARGET.x + KNIFE_W;
			const contactY = KNIFE_TARGET.y + KNIFE_H / 2;
			const glow = ctx.createRadialGradient(
				contactX,
				contactY,
				0,
				contactX,
				contactY,
				120,
			);
			glow.addColorStop(
				0,
				`rgba(240,240,255,${this.reflectionGlowAlpha * 0.7})`,
			);
			glow.addColorStop(
				0.5,
				`rgba(200,220,255,${this.reflectionGlowAlpha * 0.3})`,
			);
			glow.addColorStop(1, "rgba(200,220,255,0)");
			ctx.fillStyle = glow;
			ctx.beginPath();
			ctx.arc(contactX, contactY, 120, 0, Math.PI * 2);
			ctx.fill();

			// Reflection rectangle appearing
			ctx.strokeStyle = `rgba(240,240,255,${this.reflectionGlowAlpha})`;
			ctx.lineWidth = 2;
			ctx.setLineDash([4, 3]);
			ctx.strokeRect(
				REFLECTION_START.x,
				REFLECTION_START.y,
				REFLECTION_W,
				REFLECTION_H,
			);
			ctx.setLineDash([]);
		}

		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("刀背敲击 · 反光生成", CX, CANVAS_HEIGHT - 30);
	}

	/* ───────── Stage 2: Reflection → Mangshan ───────── */
	private renderStage2(ctx: CanvasRenderingContext2D): void {
		// Mangshan mountain path (target, fixed)
		const mx = MANGSHAN_TARGET.x;
		const my = MANGSHAN_TARGET.y;

		// Mountain silhouette
		ctx.fillStyle = "#3a3530";
		ctx.beginPath();
		ctx.moveTo(mx - 60, my + 60);
		ctx.quadraticCurveTo(mx - 20, my - 40, mx, my - 10);
		ctx.quadraticCurveTo(mx + 20, my + 20, mx + 60, my + 60);
		ctx.closePath();
		ctx.fill();

		// Winding path on mountain
		ctx.strokeStyle = "rgba(240,240,220,0.4)";
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 8]);
		ctx.beginPath();
		ctx.moveTo(mx - 30, my + 30);
		ctx.quadraticCurveTo(mx - 10, my - 10, mx + 10, my + 10);
		ctx.quadraticCurveTo(mx + 25, my + 25, mx + 40, my + 40);
		ctx.stroke();
		ctx.setLineDash([]);

		// Target zone on mountain
		const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 600);
		ctx.strokeStyle = `rgba(240,240,255,${0.3 + pulse * 0.4})`;
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 8]);
		ctx.strokeRect(mx - 4, my - 4, PATH_W + 8, PATH_H + 8);
		ctx.setLineDash([]);

		// Draggable reflection on puzzle layer
		const pCtx = this.canvasManager.getContext("puzzle");
		if (pCtx) {
			const rx = this.reflPos.x;
			const ry = this.reflPos.y;

			const glow = pCtx.createRadialGradient(
				rx + REFLECTION_W / 2,
				ry + REFLECTION_H / 2,
				0,
				rx + REFLECTION_W / 2,
				ry + REFLECTION_H / 2,
				REFLECTION_W,
			);
			glow.addColorStop(0, "rgba(240,240,255,0.6)");
			glow.addColorStop(1, "rgba(200,220,255,0.1)");
			pCtx.fillStyle = glow;
			pCtx.fillRect(rx, ry, REFLECTION_W, REFLECTION_H);

			pCtx.strokeStyle = "rgba(240,240,255,0.7)";
			pCtx.lineWidth = 2;
			pCtx.strokeRect(rx, ry, REFLECTION_W, REFLECTION_H);

			// Label on reflection piece
			pCtx.fillStyle = "rgba(240,240,255,0.6)";
			pCtx.font = '10px "PingFang SC", sans-serif';
			pCtx.textAlign = "center";
			pCtx.fillText("反光", rx + REFLECTION_W / 2, ry - 5);
		}

		// Instruction
		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("拖拽反光到邙山山路", CX, CANVAS_HEIGHT - 30);
	}

	/* ───────── Stamp frame ───────── */
	private renderStampFrame(ctx: CanvasRenderingContext2D): void {
		this.drawColdPaperBg(ctx);

		// Mangshan with reflection embedded
		const mx = MANGSHAN_TARGET.x;
		const my = MANGSHAN_TARGET.y;

		// Mountain
		ctx.fillStyle = "#3a3530";
		ctx.beginPath();
		ctx.moveTo(mx - 60, my + 60);
		ctx.quadraticCurveTo(mx - 20, my - 40, mx, my - 10);
		ctx.quadraticCurveTo(mx + 20, my + 20, mx + 60, my + 60);
		ctx.closePath();
		ctx.fill();

		// Path illuminated
		ctx.strokeStyle = `rgba(240,240,220,${0.4 + this.peonyAlpha * 0.3})`;
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 8]);
		ctx.beginPath();
		ctx.moveTo(mx - 30, my + 30);
		ctx.quadraticCurveTo(mx - 10, my - 10, mx + 10, my + 10);
		ctx.quadraticCurveTo(mx + 25, my + 25, mx + 40, my + 40);
		ctx.stroke();
		ctx.setLineDash([]);

		// Wild peony (牡丹第二环)
		if (this.peonyAlpha > 0.01) {
			ctx.save();
			ctx.globalAlpha = this.peonyAlpha;
			const peonyX = mx - 10;
			const peonyY = my - 20;
			for (let p = 0; p < 5; p++) {
				const pa = (p / 5) * Math.PI * 2;
				ctx.fillStyle = "rgba(200,80,60,0.5)";
				ctx.beginPath();
				ctx.arc(
					peonyX + Math.cos(pa) * 8,
					peonyY + Math.sin(pa) * 8,
					6,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}
			ctx.restore();
		}

		// Tear pool (北邙第一环 — 泪眼)
		if (this.tearAlpha > 0.01) {
			ctx.save();
			ctx.globalAlpha = this.tearAlpha * 0.4;
			const tearX = mx - 40;
			const tearY = my + 30;
			ctx.fillStyle = "rgba(180,200,220,0.5)";
			ctx.beginPath();
			ctx.ellipse(tearX, tearY, 15, 8, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,0.3)";
			ctx.beginPath();
			ctx.arc(tearX - 3, tearY - 2, 3, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		// Stamp title
		ctx.fillStyle = "#C23B22";
		ctx.font = '36px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("托", CX, CY - 80);

		ctx.fillStyle = "rgba(111,103,93,0.6)";
		ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
		ctx.fillText("—— 东汉 · 党锢·望门投止 ——", CX, CY - 30);
	}
}
