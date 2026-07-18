/**
 * 铜声·识洛 — Chapter DongHan Zili 叁·东汉·字立
 *
 * Puzzle: 字立·按哪里 (P1, 4 frames)
 * Player drags a paper grid onto one of three positions on the Xi Ping
 * Stone Classics (熹平石经) tablets. Floating ink characters must align
 * with the carved inscription — only one of three positions is correct.
 *
 * Frame flow:
 *   TABLETS (auto) → PRESS (auto) → PUZZLE (interactive drag)
 *   → SOLVED (Jiao Wei Qin + stamp「字立」)
 *
 * Palette: vermillion #C23B22, pitch black #1A1A18
 * Bronze sound: none (蔡邕焦尾琴 is visual only)
 * Stamp: 「字立」
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

const log = createLogger("ChapterZili");

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Layout ───────── */
const TABLET_W = 100;
const TABLET_H = 280;
const TABLET_COUNT = 5;
const TABLETS_START_X = CX - ((TABLET_COUNT - 1) * TABLET_W) / 2 - 60;

// Three optional snap positions on the center tablet
const SNAP_POSITIONS: Vec2[] = [
	{ x: CX + 10, y: CY - 30 }, // correct — matches inscription density
	{ x: CX + 10, y: CY - 80 }, // too high
	{ x: CX + 10, y: CY + 20 }, // too low
];
const CORRECT_INDEX = 0;

const PAPER_W = 90;
const PAPER_H = 130;
const PAPER_START: Vec2 = { x: CX + 160, y: CY - 140 };

/* ───────── Frame enum ───────── */
enum ZiliFrame {
	TABLETS,
	PRESS,
	PUZZLE,
	SOLVED,
}

export class ChapterDongHanZili extends ChapterBase {
	private canvasManager: CanvasManager;
	private dragHandler: DragHandler;
	private stampEffect: StampEffect;
	private frame: ZiliFrame = ZiliFrame.TABLETS;
	private frameTimer = 0;
	private skipRender = false;

	// Paper drag state
	private paperPos: Vec2 = { ...PAPER_START };
	private paperSnapped = -1; // -1 = none, 0/1/2 = snapped to position
	private puzzleSolved = false;

	// Ink float animation
	private inkFloatAlpha = 0;

	// Jiao Wei Qin
	private qinProgress = 0;

	private readonly AUTO_TABLETS = 2000;
	private readonly AUTO_PRESS = 1500;
	private readonly SOLVED_DURATION = 2500;

	constructor(
		canvasManager: CanvasManager,
		dragHandler: DragHandler,
		stampEffect: StampEffect,
	) {
		super("donghan-zili");
		this.canvasManager = canvasManager;
		this.dragHandler = dragHandler;
		this.stampEffect = stampEffect;
	}

	init(): void {
		this.puzzles = [];
		log.info("Zili chapter initialized");
	}

	enter(): void {
		super.enter();
		this.resetState();
		this.frame = ZiliFrame.TABLETS;
		log.info("Zili entered — 字立");
	}

	exit(): void {
		super.exit();
		this.teardownInteraction();
	}

	private resetState(): void {
		this.frameTimer = 0;
		this.skipRender = false;
		this.paperPos = { ...PAPER_START };
		this.paperSnapped = -1;
		this.puzzleSolved = false;
		this.inkFloatAlpha = 0;
		this.qinProgress = 0;
	}

	/* ───────── Update loop ───────── */
	update(dt: number): void {
		if (this.skipRender) return;
		this.frameTimer += dt;

		switch (this.frame) {
			case ZiliFrame.TABLETS:
				if (this.frameTimer >= this.AUTO_TABLETS) this.advanceToPress();
				break;
			case ZiliFrame.PRESS:
				this.inkFloatAlpha = Math.min(1, this.frameTimer / 800);
				if (this.frameTimer >= this.AUTO_PRESS) this.advanceToPuzzle();
				break;
			case ZiliFrame.SOLVED:
				this.qinProgress = Math.min(1, this.frameTimer / this.SOLVED_DURATION);
				if (this.frameTimer >= this.SOLVED_DURATION) this.advanceToComplete();
				break;
		}

		this.renderFrame();
	}

	/* ───────── Transitions ───────── */
	private advanceToPress(): void {
		this.frame = ZiliFrame.PRESS;
		this.frameTimer = 0;
		log.info("Zili: TABLETS → PRESS");
	}

	private advanceToPuzzle(): void {
		this.frame = ZiliFrame.PUZZLE;
		this.frameTimer = 0;
		this.setupPaperDrag();
		log.info("Zili: PRESS → PUZZLE");
	}

	private advanceToSolved(): void {
		this.teardownInteraction();
		this.frame = ZiliFrame.SOLVED;
		this.frameTimer = 0;
		this.qinProgress = 0;
		this.puzzleSolved = true;
		this.stampEffect.showStamp({ text: "字立" });
		log.info("Zili: PUZZLE → SOLVED");
	}

	private advanceToComplete(): void {
		this.skipRender = true;
		eventBus.emit("chapter:complete", { chapterId: "donghan-zili" });
		log.info("Zili → COMPLETE");
	}

	/* ───────── Interaction ───────── */
	private teardownInteraction(): void {
		this.dragHandler.detach();
		this.dragHandler.onDrag(() => {});
		this.dragHandler.onDragEnd(() => {});
	}

	private setupPaperDrag(): void {
		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;

		this.dragHandler.attach(canvas);
		this.dragHandler.setMode("element");

		this.dragHandler.registerElement({
			id: "paper-grid",
			getPos: () => this.paperPos,
			setPos: (pos) => {
				this.paperPos = pos;
			},
			getSize: () => ({ w: PAPER_W, h: PAPER_H }),
		});

		this.dragHandler.onDragEnd(() => {
			if (this.puzzleSolved) return;
			// Check snap to each position
			const paperCenter: Vec2 = {
				x: this.paperPos.x + PAPER_W / 2,
				y: this.paperPos.y + PAPER_H / 2,
			};
			for (let i = 0; i < SNAP_POSITIONS.length; i++) {
				const dist = vec2Distance(paperCenter, SNAP_POSITIONS[i]);
				if (dist < SNAP_THRESHOLD) {
					if (i === CORRECT_INDEX) {
						this.paperSnapped = i;
						this.paperPos = {
							x: SNAP_POSITIONS[i].x - PAPER_W / 2,
							y: SNAP_POSITIONS[i].y - PAPER_H / 2,
						};
						this.advanceToSolved();
					} else {
						// Wrong position — tremor feedback, snap then bounce
						this.paperSnapped = i;
						this.paperPos = {
							x: SNAP_POSITIONS[i].x - PAPER_W / 2,
							y: SNAP_POSITIONS[i].y - PAPER_H / 2,
						};
						setTimeout(() => {
							if (!this.puzzleSolved) {
								this.paperSnapped = -1;
								this.paperPos = { ...PAPER_START };
							}
						}, 500);
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

		// Dark background — night / stone chamber
		this.drawNightBg(ctx);

		switch (this.frame) {
			case ZiliFrame.TABLETS:
			case ZiliFrame.PRESS:
				this.renderTablets(ctx);
				if (this.frame === ZiliFrame.PRESS) this.renderInkFloat(ctx);
				break;
			case ZiliFrame.PUZZLE:
				this.renderTablets(ctx);
				this.renderDraggablePaper();
				this.renderSnapIndicators(ctx);
				break;
			case ZiliFrame.SOLVED:
				this.renderSolved(ctx);
				break;
		}
	}

	private drawNightBg(ctx: CanvasRenderingContext2D): void {
		// Deep night background
		const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
		grad.addColorStop(0, "#1A1A18");
		grad.addColorStop(0.6, "#2a2018");
		grad.addColorStop(1, "#3a2820");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Faint stars
		ctx.fillStyle = "rgba(212,168,67,0.15)";
		for (let i = 0; i < 20; i++) {
			const sx = (i * 173 + 71) % CANVAS_WIDTH;
			const sy = (i * 97 + 43) % (CANVAS_HEIGHT * 0.5);
			ctx.beginPath();
			ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private renderTablets(ctx: CanvasRenderingContext2D): void {
		// Stone tablets (熹平石经)
		for (let i = 0; i < TABLET_COUNT; i++) {
			const tx = TABLETS_START_X + i * (TABLET_W + 15);
			const ty = CY - TABLET_H / 2;

			// Stone body
			ctx.fillStyle = "#3a3530";
			ctx.fillRect(tx, ty, TABLET_W, TABLET_H);

			// Stone edge highlight
			ctx.strokeStyle = "rgba(200,166,90,0.3)";
			ctx.lineWidth = 1;
			ctx.strokeRect(tx, ty, TABLET_W, TABLET_H);

			// Inscription lines (carved text — subtle but readable)
			ctx.strokeStyle = "rgba(255,240,220,0.3)";
			ctx.lineWidth = 1;
			for (let j = 0; j < 8; j++) {
				const ly = ty + 20 + j * 32;
				const lineLen = 50 + Math.sin(i * 1.7 + j * 0.8) * 15;
				ctx.beginPath();
				ctx.moveTo(tx + 15, ly);
				ctx.lineTo(tx + 15 + lineLen, ly);
				ctx.stroke();
			}

			// Center tablet highlighting (the one the player will interact with)
			if (i === Math.floor(TABLET_COUNT / 2)) {
				ctx.strokeStyle = "rgba(194,59,34,0.4)";
				ctx.lineWidth = 2;
				ctx.strokeRect(tx - 2, ty - 2, TABLET_W + 4, TABLET_H + 4);
			}
		}

		// Title
		ctx.fillStyle = "#C23B22";
		ctx.font = '22px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.fillText("熹平石经", CX, CY - TABLET_H / 2 - 30);
	}

	private renderInkFloat(ctx: CanvasRenderingContext2D): void {
		// Floating ink characters rising from the center tablet
		const centerTx =
			TABLETS_START_X + Math.floor(TABLET_COUNT / 2) * (TABLET_W + 15);
		const ty = CY - TABLET_H / 2;

		ctx.save();
		ctx.globalAlpha = this.inkFloatAlpha;

		const characters = ["经", "典", "永", "传"];
		characters.forEach((ch, i) => {
			const chX = centerTx + TABLET_W / 2 + (i - 1.5) * 22;
			const chY = ty + 50 - i * 30 * this.inkFloatAlpha;
			ctx.fillStyle = `rgba(26,26,24,${0.7 + i * 0.1})`;
			ctx.font = '18px "PingFang SC", "Noto Sans SC", "SimSun", serif';
			ctx.textAlign = "center";
			ctx.fillText(ch, chX, chY);
		});

		ctx.restore();
	}

	private renderSnapIndicators(ctx: CanvasRenderingContext2D): void {
		// Show the three possible snap positions with subtle indicators
		SNAP_POSITIONS.forEach((pos, i) => {
			const pulse = 0.4 + 0.3 * Math.sin(performance.now() / 800 + i);
			ctx.strokeStyle = `rgba(194,59,34,${pulse})`;
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 6]);
			ctx.strokeRect(
				pos.x - PAPER_W / 2,
				pos.y - PAPER_H / 2,
				PAPER_W,
				PAPER_H,
			);
			ctx.setLineDash([]);
		});
	}

	private renderDraggablePaper(): void {
		const pCtx = this.canvasManager.getContext("puzzle");
		if (!pCtx) return;

		const px = this.paperPos.x;
		const py = this.paperPos.y;

		// Paper sheet
		pCtx.fillStyle = "#f0e8d8";
		pCtx.fillRect(px, py, PAPER_W, PAPER_H);

		// Paper border
		pCtx.strokeStyle = "#8B8070";
		pCtx.lineWidth = 1.5;
		pCtx.strokeRect(px, py, PAPER_W, PAPER_H);

		// Ink marks on paper
		pCtx.strokeStyle = "rgba(26,26,24,0.6)";
		pCtx.lineWidth = 1;
		for (let j = 0; j < 5; j++) {
			pCtx.beginPath();
			pCtx.moveTo(px + 10, py + 15 + j * 22);
			pCtx.lineTo(px + PAPER_W - 10, py + 15 + j * 22);
			pCtx.stroke();
		}

		// Snapped glow
		if (this.paperSnapped >= 0 && this.paperSnapped !== CORRECT_INDEX) {
			pCtx.strokeStyle = "rgba(194,59,34,0.6)";
			pCtx.lineWidth = 2;
			pCtx.strokeRect(px - 2, py - 2, PAPER_W + 4, PAPER_H + 4);
		}
	}

	/* ───────── Solved frame ───────── */
	private renderSolved(ctx: CanvasRenderingContext2D): void {
		this.drawNightBg(ctx);

		// Center tablet with paper aligned
		const centerTx =
			TABLETS_START_X + Math.floor(TABLET_COUNT / 2) * (TABLET_W + 15);
		const ty = CY - TABLET_H / 2;

		// Tablet
		ctx.fillStyle = "#3a3530";
		ctx.fillRect(centerTx, ty, TABLET_W, TABLET_H);
		ctx.strokeStyle = "rgba(200,166,90,0.5)";
		ctx.lineWidth = 2;
		ctx.strokeRect(centerTx, ty, TABLET_W, TABLET_H);

		// Aligned paper
		const px = SNAP_POSITIONS[CORRECT_INDEX].x - PAPER_W / 2;
		const py = SNAP_POSITIONS[CORRECT_INDEX].y - PAPER_H / 2;
		ctx.fillStyle = "rgba(240,232,216,0.9)";
		ctx.fillRect(px, py, PAPER_W, PAPER_H);
		ctx.strokeStyle = "#C23B22";
		ctx.lineWidth = 2;
		ctx.strokeRect(px, py, PAPER_W, PAPER_H);

		// Golden alignment glow
		const glow = ctx.createRadialGradient(CX, CY, 0, CX, CY, 120);
		glow.addColorStop(0, `rgba(194,59,34,${0.3 * this.qinProgress})`);
		glow.addColorStop(1, "rgba(194,59,34,0)");
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(CX, CY, 120, 0, Math.PI * 2);
		ctx.fill();

		// Jiao Wei Qin (焦尾琴) appearing
		if (this.qinProgress > 0.4) {
			const qinAlpha = Math.min(1, (this.qinProgress - 0.4) / 0.4);
			ctx.save();
			ctx.globalAlpha = qinAlpha;

			// Qin body (right side of screen)
			const qx = CX + 180;
			const qy = CY - 40;
			ctx.fillStyle = "#5a3020";
			ctx.fillRect(qx - 60, qy - 15, 120, 30);
			ctx.strokeStyle = "#C23B22";
			ctx.lineWidth = 1;
			ctx.strokeRect(qx - 60, qy - 15, 120, 30);

			// Strings
			ctx.strokeStyle = "rgba(200,166,90,0.5)";
			ctx.lineWidth = 0.5;
			for (let s = 0; s < 5; s++) {
				ctx.beginPath();
				ctx.moveTo(qx - 50, qy - 8 + s * 4);
				ctx.lineTo(qx + 50, qy - 8 + s * 4);
				ctx.stroke();
			}

			// Scorched tail
			ctx.fillStyle = "#1A1A18";
			ctx.fillRect(qx + 55, qy - 10, 8, 20);

			ctx.restore();
		}

		// Label
		ctx.fillStyle = "#C23B22";
		ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.fillText("焦尾琴 · 弦自震", CX, CY + TABLET_H / 2 + 60);
	}
}
