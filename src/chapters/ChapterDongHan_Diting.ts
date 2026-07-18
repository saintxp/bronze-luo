/**
 * 铜声·识洛 — Chapter DongHan Diting 叁·东汉·地听
 *
 * Puzzle: 八龙首方向判定 🏆 (P0, 5 frames)
 * Player observes environmental clues to determine which of 8 dragon heads
 * faces the earthquake epicenter, then clicks the correct one.
 * Bronze sounds: 'da' (铜丸坠落) + 'dang' (入蟾蜍口)
 *
 * Frame flow:
 *   STAR_CHART (auto) → DRAGON_HEADS (interactive observe+select)
 *   → BALL_DROP (auto, 铜丸坠落+蟾蜍口) → SUPERNOVA (auto, SN185)
 *   → STAMP「地听」
 *
 * Palette: vermillion #C23B22, pitch black #1A1A18
 * Bronze sound: 'da' (嗒), 'dang' (当——)
 * Stamp: 「地听」
 */

import { ChapterBase } from "./ChapterBase";
import type { CanvasManager } from "../engine/CanvasManager";
import type { StampEffect } from "../ui/StampEffect";
import { DirectionPuzzle } from "../puzzle/DirectionPuzzle";
import { eventBus } from "../utils/EventBus";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../utils/constants";
import { type Vec2, vec2Distance } from "../utils/math";
import { gameState } from "../state/GameState";
import { createLogger } from "../utils/logger";

const log = createLogger("ChapterDiting");

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Layout ───────── */
const DRAGON_RING_RADIUS = 200;
const DRAGON_HEAD_RADIUS = 32;
const DRAGON_COUNT = 8;
const CORRECT_INDEX = 3; // SE direction

// Precomputed dragon head positions (constant, never change)
const DRAGON_ANGLES: number[] = Array.from(
	{ length: DRAGON_COUNT },
	(_, i) => (i / DRAGON_COUNT) * Math.PI * 2 - Math.PI / 2,
);
const DRAGON_POSITIONS: Vec2[] = DRAGON_ANGLES.map((a) => ({
	x: CX + Math.cos(a) * DRAGON_RING_RADIUS,
	y: CY + Math.sin(a) * DRAGON_RING_RADIUS,
}));
const DIR_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/* ───────── Frame enum ───────── */
enum DitingFrame {
	STAR_CHART,
	DRAGON_HEADS,
	BALL_DROP,
	SUPERNOVA,
	STAMP,
}

export class ChapterDongHanDiting extends ChapterBase {
	private canvasManager: CanvasManager;
	private stampEffect: StampEffect;
	private frame: DitingFrame = DitingFrame.STAR_CHART;
	private frameTimer = 0;
	private skipRender = false;

	// Direction puzzle
	private dirPuzzle!: DirectionPuzzle;

	// Star chart animation
	private starChartAlpha = 0;

	// Ball drop animation
	private ballDropY = 0; // 0..1
	private ballPauseTimer = 0;
	private ballPhase: "falling" | "paused" | "entering" = "falling";

	// Supernova animation
	private supernovaAlpha = 0;
	private supernovaRadius = 0;

	// Shake on wrong selection
	private shakeOffset = 0;
	private shakeTimer = 0;

	// Click handler
	private clickHandler: ((e: MouseEvent) => void) | null = null;
	private touchHandler: ((e: TouchEvent) => void) | null = null;

	private readonly AUTO_STAR_CHART = 2500;
	private readonly SUPERNOVA_DURATION = 2500;
	private readonly STAMP_DURATION = 2000;
	private readonly CLUE_INTERVAL = 5000; // reveal one clue level every 5s

	constructor(canvasManager: CanvasManager, stampEffect: StampEffect) {
		super("donghan-diting");
		this.canvasManager = canvasManager;
		this.stampEffect = stampEffect;
	}

	init(): void {
		this.dirPuzzle = new DirectionPuzzle({
			id: "diting-dragons",
			chapterId: "donghan-diting",
			optionCount: DRAGON_COUNT,
			correctIndex: CORRECT_INDEX,
			clueLevels: 3,
		});
		this.puzzles = [this.dirPuzzle];
		this.puzzles.forEach((p) => gameState.registerPuzzle(p.id));
		log.info("Diting chapter initialized");
	}

	enter(): void {
		super.enter();
		this.resetState();
		this.frame = DitingFrame.STAR_CHART;
		this.setupClickHandler();
		log.info("Diting entered — 地听");
	}

	exit(): void {
		super.exit();
		this.teardownClickHandler();
	}

	private resetState(): void {
		this.frameTimer = 0;
		this.skipRender = false;
		this.starChartAlpha = 0;
		this.ballDropY = 0;
		this.ballPauseTimer = 0;
		this.ballPhase = "falling";
		this.supernovaAlpha = 0;
		this.supernovaRadius = 0;
		this.shakeOffset = 0;
		this.shakeTimer = 0;
		this.dirPuzzle?.reset();
	}

	/* ───────── Update loop ───────── */
	update(dt: number): void {
		if (this.skipRender) return;
		this.frameTimer += dt;

		switch (this.frame) {
			case DitingFrame.STAR_CHART:
				this.starChartAlpha = Math.min(1, this.frameTimer / 1500);
				if (this.frameTimer >= this.AUTO_STAR_CHART) this.advanceToDragons();
				break;
			case DitingFrame.DRAGON_HEADS:
				// Auto-advance clues — one level every CLUE_INTERVAL ms
				if (
					!this.dirPuzzle.solved &&
					this.dirPuzzle.clueLevel < this.dirPuzzle.clueLevels &&
					this.frameTimer > this.CLUE_INTERVAL * (this.dirPuzzle.clueLevel + 1)
				) {
					this.dirPuzzle.advanceClue();
				}
				// Shake decay
				if (this.shakeTimer > 0) {
					this.shakeTimer -= dt;
					this.shakeOffset =
						Math.sin(this.shakeTimer * 0.05) * 4 * (this.shakeTimer / 600);
					if (this.shakeTimer <= 0) this.shakeOffset = 0;
				}
				break;
			case DitingFrame.BALL_DROP:
				this.updateBallDrop(dt);
				break;
			case DitingFrame.SUPERNOVA:
				this.supernovaAlpha = Math.min(1, this.frameTimer / 1000);
				this.supernovaRadius = Math.min(300, this.frameTimer * 0.15);
				if (this.frameTimer >= this.SUPERNOVA_DURATION) this.advanceToStamp();
				break;
			case DitingFrame.STAMP:
				if (this.frameTimer >= this.STAMP_DURATION) this.advanceToComplete();
				break;
		}

		this.renderFrame();
	}

	private updateBallDrop(dt: number): void {
		switch (this.ballPhase) {
			case "falling":
				this.ballDropY += dt / 600; // fall over 600ms
				if (this.ballDropY >= 1) {
					this.ballDropY = 1;
					this.ballPauseTimer = 0;
					this.ballPhase = "paused";
					eventBus.emit("bronze:sound", { soundId: "da" });
				}
				break;
			case "paused":
				this.ballPauseTimer += dt;
				if (this.ballPauseTimer >= 800) {
					this.ballPhase = "entering";
				}
				break;
			case "entering":
				// Ball enters toad mouth — fade out
				this.ballDropY += dt / 400;
				if (this.ballDropY >= 2) {
					eventBus.emit("bronze:sound", { soundId: "dang" });
					this.advanceToSupernova();
				}
				break;
		}
	}

	/* ───────── Transitions ───────── */
	private advanceToDragons(): void {
		this.frame = DitingFrame.DRAGON_HEADS;
		this.frameTimer = 0;
		log.info("Diting: STAR_CHART → DRAGON_HEADS");
	}

	private advanceToBallDrop(): void {
		this.frame = DitingFrame.BALL_DROP;
		this.frameTimer = 0;
		this.ballDropY = 0;
		this.ballPhase = "falling";
		log.info("Diting: DRAGON_HEADS → BALL_DROP + 嗒");
	}

	private advanceToSupernova(): void {
		this.frame = DitingFrame.SUPERNOVA;
		this.frameTimer = 0;
		this.supernovaAlpha = 0;
		this.supernovaRadius = 0;
		log.info("Diting: BALL_DROP → SUPERNOVA + 当——");
	}

	private advanceToStamp(): void {
		this.frame = DitingFrame.STAMP;
		this.frameTimer = 0;
		this.stampEffect.showStamp({ text: "地听" });
		log.info("Diting: SUPERNOVA → STAMP");
	}

	private advanceToComplete(): void {
		this.skipRender = true;
		eventBus.emit("chapter:complete", { chapterId: "donghan-diting" });
		log.info("Diting → COMPLETE");
	}

	/* ───────── Click handling ───────── */
	private setupClickHandler(): void {
		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;
		canvas.style.pointerEvents = "auto";

		this.clickHandler = (e: MouseEvent) => this.handleCanvasClick(e);
		this.touchHandler = (e: TouchEvent) => {
			e.preventDefault();
			const t = e.touches[0];
			if (t) this.handleCanvasClick(t as unknown as MouseEvent);
		};

		canvas.addEventListener("click", this.clickHandler);
		canvas.addEventListener("touchstart", this.touchHandler, {
			passive: false,
		});
	}

	private teardownClickHandler(): void {
		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;
		canvas.style.pointerEvents = "none";
		if (this.clickHandler)
			canvas.removeEventListener("click", this.clickHandler);
		if (this.touchHandler)
			canvas.removeEventListener("touchstart", this.touchHandler);
		this.clickHandler = null;
		this.touchHandler = null;
	}

	private handleCanvasClick(e: MouseEvent): void {
		if (this.frame !== DitingFrame.DRAGON_HEADS) return;
		if (this.dirPuzzle.solved) return;

		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const sx = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
		const sy = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
		const clickPos: Vec2 = { x: sx, y: sy };

		for (let i = 0; i < DRAGON_COUNT; i++) {
			const dp = DRAGON_POSITIONS[i];
			if (vec2Distance(clickPos, dp) < DRAGON_HEAD_RADIUS + 10) {
				const result = this.dirPuzzle.select(i);
				if (result === "SOLVED") {
					this.advanceToBallDrop();
				} else {
					// Wrong — shake feedback
					this.shakeTimer = 600;
				}
				return;
			}
		}
	}

	/* ───────── Rendering ───────── */
	private renderFrame(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const ctx = this.canvasManager.getContext("bg");
		if (!ctx) return;

		// Apply shake offset
		if (this.shakeOffset !== 0) {
			ctx.save();
			ctx.translate(this.shakeOffset * 2, this.shakeOffset);
		}

		switch (this.frame) {
			case DitingFrame.STAR_CHART:
				this.renderStarChart(ctx);
				break;
			case DitingFrame.DRAGON_HEADS:
				this.renderDragonHeads(ctx);
				break;
			case DitingFrame.BALL_DROP:
				this.renderBallDrop(ctx);
				break;
			case DitingFrame.SUPERNOVA:
				this.renderSupernova(ctx);
				break;
			case DitingFrame.STAMP:
				this.renderStampFrame(ctx);
				break;
		}

		if (this.shakeOffset !== 0) ctx.restore();
	}

	/* ───────── Background ───────── */
	private drawNightBg(ctx: CanvasRenderingContext2D, starAlpha = 0.15): void {
		const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
		grad.addColorStop(0, "#0a0a08");
		grad.addColorStop(0.5, "#1A1A18");
		grad.addColorStop(1, "#2a2018");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Stars
		ctx.fillStyle = `rgba(212,168,67,${starAlpha})`;
		for (let i = 0; i < 30; i++) {
			const sx = ((i * 191 + 37) * 7) % CANVAS_WIDTH;
			const sy = ((i * 137 + 53) * 3) % (CANVAS_HEIGHT * 0.7);
			const size = 1 + (i % 3);
			ctx.beginPath();
			ctx.arc(sx, sy, size, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	/* ───────── Star Chart frame ───────── */
	private renderStarChart(ctx: CanvasRenderingContext2D): void {
		this.drawNightBg(ctx);

		// Oil paper (星图)
		const paperAlpha = this.starChartAlpha;
		ctx.save();
		ctx.globalAlpha = paperAlpha;

		// Paper sheet
		ctx.fillStyle = "#f0e8d8";
		ctx.fillRect(CX - 160, CY - 100, 320, 200);
		ctx.strokeStyle = "#8B8070";
		ctx.lineWidth = 1;
		ctx.strokeRect(CX - 160, CY - 100, 320, 200);

		// Constellation dots (二十八宿 simplified)
		ctx.fillStyle = "#1A1A18";
		const constellations = [
			[CX - 80, CY - 40],
			[CX - 40, CY - 50],
			[CX, CY - 30],
			[CX + 40, CY - 55],
			[CX + 80, CY - 35],
			[CX - 60, CY],
			[CX, CY + 10],
			[CX + 60, CY - 5],
			[CX - 30, CY + 40],
			[CX + 30, CY + 30],
		];
		constellations.forEach(([cx, cy]) => {
			ctx.beginPath();
			ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
			ctx.fill();
		});

		// Connection lines (star chart lines)
		ctx.strokeStyle = "rgba(26,26,24,0.2)";
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		constellations.forEach(([cx, cy], i) => {
			if (i === 0) ctx.moveTo(cx, cy);
			else ctx.lineTo(cx, cy);
		});
		ctx.stroke();

		ctx.restore();

		// Light source (lantern behind the paper)
		if (paperAlpha > 0.5) {
			const glow = ctx.createRadialGradient(CX, CY, 0, CX, CY, 200);
			glow.addColorStop(0, `rgba(212,168,67,${(paperAlpha - 0.5) * 0.3})`);
			glow.addColorStop(1, "rgba(212,168,67,0)");
			ctx.fillStyle = glow;
			ctx.beginPath();
			ctx.arc(CX, CY, 200, 0, Math.PI * 2);
			ctx.fill();
		}

		// Label
		ctx.fillStyle = "rgba(255,240,220,0.5)";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("针孔星图 · 二十八宿", CX, CY + 150);
	}

	/* ───────── Dragon Heads frame ───────── */
	private renderDragonHeads(ctx: CanvasRenderingContext2D): void {
		this.drawNightBg(ctx, 0.2);

		// Central platform (Lingtai base)
		ctx.fillStyle = "#3a3028";
		ctx.beginPath();
		ctx.ellipse(CX, CY, 160, 50, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(200,166,90,0.3)";
		ctx.lineWidth = 2;
		ctx.stroke();

		// Instrument body (地动仪 central column)
		ctx.fillStyle = "#4a3a2a";
		ctx.beginPath();
		ctx.arc(CX, CY, 40, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "rgba(194,59,34,0.5)";
		ctx.lineWidth = 2;
		ctx.stroke();

		// Eight dragon heads around the ring
		const clueLevel = this.dirPuzzle.clueLevel;

		for (let i = 0; i < DRAGON_COUNT; i++) {
			const dp = DRAGON_POSITIONS[i];
			const isCorrect = i === CORRECT_INDEX;
			const isSelected = this.dirPuzzle.selectedIndex === i;
			const isWrong = isSelected && !isCorrect;
			const isHighlighted = clueLevel >= 3 && isCorrect;

			// Dragon head body (pointing outward from center)
			const toCenter = Math.atan2(CY - dp.y, CX - dp.x);

			ctx.save();
			ctx.translate(dp.x, dp.y);

			// Dragon head glow (correct, highlighted)
			if (isHighlighted) {
				const glow = ctx.createRadialGradient(
					0,
					0,
					0,
					0,
					0,
					DRAGON_HEAD_RADIUS + 15,
				);
				glow.addColorStop(0, "rgba(212,168,67,0.4)");
				glow.addColorStop(1, "rgba(212,168,67,0)");
				ctx.fillStyle = glow;
				ctx.beginPath();
				ctx.arc(0, 0, DRAGON_HEAD_RADIUS + 15, 0, Math.PI * 2);
				ctx.fill();
			}

			// Wrong selection shake glow
			if (isWrong && this.shakeTimer > 0) {
				ctx.fillStyle = "rgba(194,59,34,0.3)";
				ctx.beginPath();
				ctx.arc(0, 0, DRAGON_HEAD_RADIUS + 10, 0, Math.PI * 2);
				ctx.fill();
			}

			// Dragon head (bronze) — color based on state
			let headColor = "#6B5A3A"; // default bronze
			if (isHighlighted)
				headColor = "#D4A843"; // gold highlight
			else if (isWrong) headColor = "#C23B22"; // vermillion error
			ctx.fillStyle = headColor;
			ctx.beginPath();
			ctx.arc(0, 0, DRAGON_HEAD_RADIUS, 0, Math.PI * 2);
			ctx.fill();

			// Dragon mouth (open, facing outward)
			ctx.fillStyle = "#1A1A18";
			ctx.beginPath();
			ctx.arc(
				Math.cos(toCenter + Math.PI) * (DRAGON_HEAD_RADIUS - 8),
				Math.sin(toCenter + Math.PI) * (DRAGON_HEAD_RADIUS - 8),
				8,
				0,
				Math.PI * 2,
			);
			ctx.fill();

			// Copper ball in mouth (tiny)
			if (!isCorrect || clueLevel < 2) {
				ctx.fillStyle = "rgba(200,166,90,0.6)";
				ctx.beginPath();
				ctx.arc(
					Math.cos(toCenter + Math.PI) * (DRAGON_HEAD_RADIUS - 8),
					Math.sin(toCenter + Math.PI) * (DRAGON_HEAD_RADIUS - 8) + 1,
					3,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}

			ctx.restore();

			// Direction label (N/NE/E/SE/S/SW/W/NW)
			const LABEL_DIST = DRAGON_HEAD_RADIUS + 22;
			const labelX = dp.x + Math.cos(toCenter + Math.PI) * LABEL_DIST;
			const labelY = dp.y + Math.sin(toCenter + Math.PI) * LABEL_DIST;
			ctx.fillStyle = isHighlighted
				? "rgba(212,168,67,0.7)"
				: "rgba(255,240,220,0.25)";
			ctx.font = '10px "PingFang SC", sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(DIR_LABELS[i], labelX, labelY);
		}

		// Toad at the bottom (蟾蜍口 — target for the copper ball)
		const toadX = CX;
		const toadY = CY + 240;
		ctx.fillStyle = "#4a6a4a";
		ctx.beginPath();
		ctx.ellipse(toadX, toadY, 50, 25, 0, Math.PI, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#1A1A18";
		ctx.beginPath();
		ctx.arc(toadX, toadY - 8, 12, 0, Math.PI * 2);
		ctx.fill();

		// Environmental clues (layer 1: ground cracks)
		if (clueLevel >= 1) {
			ctx.strokeStyle = "rgba(194,59,34,0.2)";
			ctx.lineWidth = 1;
			// Cracks radiating from SE
			const seAngle = DRAGON_ANGLES[CORRECT_INDEX];
			for (let c = 0; c < 4; c++) {
				const crackAngle = seAngle + (c - 1.5) * 0.2;
				ctx.beginPath();
				const sx = CX + Math.cos(crackAngle) * 100;
				const sy = CY + Math.sin(crackAngle) * 100;
				ctx.moveTo(sx, sy);
				ctx.lineTo(
					sx + Math.cos(crackAngle) * 40,
					sy + Math.sin(crackAngle) * 40,
				);
				ctx.stroke();
			}
		}

		// Environmental clues (layer 2: building tilt)
		if (clueLevel >= 2) {
			ctx.strokeStyle = "rgba(194,59,34,0.3)";
			ctx.lineWidth = 1.5;
			const seAngle = DRAGON_ANGLES[CORRECT_INDEX];
			// Small tilted pillar near SE edge
			const pillarX = CX + Math.cos(seAngle) * 260;
			const pillarY = CY + Math.sin(seAngle) * 260;
			ctx.save();
			ctx.translate(pillarX, pillarY);
			ctx.rotate(seAngle - Math.PI / 6);
			ctx.fillStyle = "#3a3028";
			ctx.fillRect(-3, -20, 6, 40);
			ctx.restore();
		}

		// Label
		ctx.fillStyle = "rgba(255,240,220,0.7)";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		if (clueLevel >= 3) {
			ctx.fillText("龙首已现 · 点击正确方向", CX, CANVAS_HEIGHT - 30);
		} else if (clueLevel >= 1) {
			ctx.fillText("观察裂痕与倾斜 · 判断震源方向", CX, CANVAS_HEIGHT - 30);
		} else {
			ctx.fillText("八龙首各朝一方 · 找出震源方向", CX, CANVAS_HEIGHT - 30);
		}
	}

	/* ───────── Ball Drop frame ───────── */
	private renderBallDrop(ctx: CanvasRenderingContext2D): void {
		this.drawNightBg(ctx, 0.2);

		// Central platform
		ctx.fillStyle = "#3a3028";
		ctx.beginPath();
		ctx.ellipse(CX, CY, 160, 50, 0, 0, Math.PI * 2);
		ctx.fill();

		// Correct dragon head (highlighted, ball gone from mouth)
		const dp = DRAGON_POSITIONS[CORRECT_INDEX];
		ctx.fillStyle = "#D4A843";
		ctx.beginPath();
		ctx.arc(dp.x, dp.y, DRAGON_HEAD_RADIUS, 0, Math.PI * 2);
		ctx.fill();
		// Empty mouth
		const toCenter = Math.atan2(CY - dp.y, CX - dp.x);
		ctx.fillStyle = "#1A1A18";
		ctx.beginPath();
		ctx.arc(
			dp.x + Math.cos(toCenter + Math.PI) * (DRAGON_HEAD_RADIUS - 8),
			dp.y + Math.sin(toCenter + Math.PI) * (DRAGON_HEAD_RADIUS - 8),
			8,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		// Falling copper ball
		const ballStartY = dp.y + DRAGON_HEAD_RADIUS + 10;
		const toadY = CY + 240;
		const ballX = dp.x + (CX - dp.x) * 0.3;

		if (this.ballPhase === "falling" || this.ballPhase === "paused") {
			const by =
				ballStartY + (toadY - ballStartY) * Math.min(1, this.ballDropY);
			ctx.fillStyle = "#D4A843";
			ctx.beginPath();
			ctx.arc(ballX, by, 6, 0, Math.PI * 2);
			ctx.fill();

			// Motion trail
			if (this.ballPhase === "falling" && this.ballDropY > 0.3) {
				ctx.fillStyle = "rgba(212,168,67,0.2)";
				ctx.beginPath();
				ctx.arc(ballX, by - 8, 4, 0, Math.PI * 2);
				ctx.fill();
			}
		} else if (this.ballPhase === "entering") {
			// Ball entering toad mouth
			ctx.fillStyle = "rgba(212,168,67,0.5)";
			ctx.beginPath();
			ctx.arc(CX, toadY - 15, 5, 0, Math.PI * 2);
			ctx.fill();
		}

		// Toad
		const toadX = CX;
		ctx.fillStyle = "#4a6a4a";
		ctx.beginPath();
		ctx.ellipse(toadX, toadY, 50, 25, 0, Math.PI, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#1A1A18";
		ctx.beginPath();
		ctx.arc(toadX, toadY - 8, 14, 0, Math.PI * 2);
		ctx.fill();

		// Ripple rings at toad mouth when ball enters
		if (this.ballPhase === "entering") {
			const enterProgress = this.ballDropY - 1;
			for (let r = 0; r < 3; r++) {
				const rr = 15 + enterProgress * 40 + r * 12;
				const ra = Math.max(0, 0.3 - enterProgress * 0.2 - r * 0.08);
				ctx.strokeStyle = `rgba(212,168,67,${ra})`;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(toadX, toadY - 8, rr, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		// Sound label
		if (this.ballPhase === "falling") {
			ctx.fillStyle = "rgba(255,240,220,0.5)";
			ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
			ctx.textAlign = "center";
			ctx.fillText("嗒", CX, toadY + 60);
		} else if (this.ballPhase === "paused") {
			ctx.fillStyle = "rgba(255,240,220,0.7)";
			ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
			ctx.textAlign = "center";
			ctx.fillText("· · ·", CX, toadY + 60);
		}
	}

	/* ───────── Supernova frame ───────── */
	private renderSupernova(ctx: CanvasRenderingContext2D): void {
		this.drawNightBg(ctx, 0.1);

		// Lingtai observatory silhouette at bottom
		ctx.fillStyle = "#2a2018";
		ctx.fillRect(CX - 120, CY + 100, 240, 200);
		ctx.fillStyle = "#3a3028";
		ctx.fillRect(CX - 80, CY + 120, 160, 180);

		// Observatory dome
		ctx.fillStyle = "#2a2018";
		ctx.beginPath();
		ctx.arc(CX, CY + 100, 80, Math.PI, Math.PI * 2);
		ctx.fill();

		// SN185 supernova burst
		const snX = CX + 100;
		const snY = CY - 150;

		if (this.supernovaAlpha > 0.01) {
			// Outer halo
			const burst = ctx.createRadialGradient(
				snX,
				snY,
				0,
				snX,
				snY,
				this.supernovaRadius,
			);
			burst.addColorStop(0, `rgba(255,240,220,${this.supernovaAlpha * 0.8})`);
			burst.addColorStop(0.3, `rgba(212,168,67,${this.supernovaAlpha * 0.5})`);
			burst.addColorStop(0.6, `rgba(194,59,34,${this.supernovaAlpha * 0.3})`);
			burst.addColorStop(1, "rgba(26,26,24,0)");
			ctx.fillStyle = burst;
			ctx.beginPath();
			ctx.arc(snX, snY, this.supernovaRadius, 0, Math.PI * 2);
			ctx.fill();

			// Core
			ctx.fillStyle = `rgba(255,255,240,${this.supernovaAlpha})`;
			ctx.beginPath();
			ctx.arc(snX, snY, 8, 0, Math.PI * 2);
			ctx.fill();
		}

		// Label
		ctx.fillStyle = "rgba(255,240,220,0.5)";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("灵台 · SN185 超新星", CX, CANVAS_HEIGHT - 40);
	}

	/* ───────── Stamp frame ───────── */
	private renderStampFrame(ctx: CanvasRenderingContext2D): void {
		this.drawNightBg(ctx, 0.1);

		ctx.fillStyle = "#C23B22";
		ctx.font = '36px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("地听", CX, CY - 20);

		ctx.fillStyle = "rgba(255,240,220,0.5)";
		ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
		ctx.fillText("—— 东汉 · 张衡地动仪 ——", CX, CY + 40);
	}
}
