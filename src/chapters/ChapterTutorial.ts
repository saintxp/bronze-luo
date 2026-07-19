/**
 * 铜声·识洛 — Tutorial chapter (L1 · L2 · L3)
 *
 * Three sequential tutorial levels teaching the core interaction primitives:
 *   L1 — Drag-to-align (door panel → door frame)
 *   L2 — Layer-pan / nest (hole alignment via panning)
 *   L3 — Rotation match (gear teeth alignment)
 *
 * Uses real PNG assets from /assets/tutorial/ when available,
 * falls back to Canvas 2D placeholder drawing.
 */

import { ChapterBase } from "./ChapterBase";
import { AlignmentPuzzle } from "../puzzle/AlignmentPuzzle";
import { RotationPuzzle } from "../puzzle/RotationPuzzle";
import type { CanvasManager } from "../engine/CanvasManager";
import type { DragHandler } from "../engine/DragHandler";
import { TutorialOverlay } from "../ui/TutorialOverlay";
import { gameState } from "../state/GameState";
import { eventBus } from "../utils/EventBus";
import type { AssetLoader } from "../assets/AssetLoader";
import { ASSETS } from "../assets/AssetManifest";
import {
	PuzzleState,
	SNAP_THRESHOLD,
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
	TUTORIAL_L3_SNAP_ANGLES,
} from "../utils/constants";
import type { Vec2 } from "../utils/math";
import { drawPaperBackground } from "../ui/InkPaintingUtils";
import { createLogger } from "../utils/logger";

const log = createLogger("ChapterTutorial");

/* ───────── Layout constants ───────── */
const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

export class ChapterTutorial extends ChapterBase {
	private canvasManager: CanvasManager;
	private dragHandler: DragHandler;
	private assetLoader: AssetLoader;
	private overlay: TutorialOverlay;
	private currentLevel = 0; // 0 = L1, 1 = L2, 2 = L3

	/* L1 state */
	private l1PanelPos: Vec2 = { x: 200, y: 340 };
	private l1PanelSize = { w: 180, h: 360 };
	private l1FramePos = { x: 860, y: 340 };
	private l1FrameSize = { w: 200, h: 400 };

	/* L2 state */
	private l2PanOffset: Vec2 = { x: 0, y: 0 };
	private l2TargetOffset: Vec2 = { x: -300, y: -200 };
	private l2HoleRadius = 60;
	private l2Solved = false;

	/* L3 state */
	private l3Angle = 0;
	private l3GearRadius = 100;
	private l3FixedCenter: Vec2 = { x: 700, y: 500 };
	private l3MovableCenter: Vec2 = { x: 920, y: 500 };

	constructor(
		canvasManager: CanvasManager,
		dragHandler: DragHandler,
		assetLoader: AssetLoader,
	) {
		super("tutorial");
		this.canvasManager = canvasManager;
		this.dragHandler = dragHandler;
		this.assetLoader = assetLoader;
		this.overlay = new TutorialOverlay(canvasManager);
	}

	async init(): Promise<void> {
		// Preload tutorial images
		await this.assetLoader.preloadChapter("tutorial", {
			doorFrame: ASSETS.tutorial.doorFrame,
			doorPanel: ASSETS.tutorial.doorPanel,
			doorClosed: ASSETS.tutorial.doorClosed,
			fgHole: ASSETS.tutorial.fgHole,
			bgScene: ASSETS.tutorial.bgScene,
			gearFixed: ASSETS.tutorial.gearFixed,
			gearMovable: ASSETS.tutorial.gearMovable,
			gearMeshed: ASSETS.tutorial.gearMeshed,
		});

		// L1: drag door panel into door frame
		const l1 = new AlignmentPuzzle({
			id: "tut-l1",
			chapterId: "tutorial",
			targetRect: { x: 860, y: 340, w: 200, h: 400 },
		});

		// L2: custom puzzle handled inline
		const l2 = new AlignmentPuzzle({
			id: "tut-l2",
			chapterId: "tutorial",
			targetRect: { x: 0, y: 0, w: 10, h: 10 }, // dummy — overridden
		});

		// L3: gear rotation — start at half-tooth offset so gears aren't pre-aligned
		const l3 = new RotationPuzzle({
			id: "tut-l3",
			chapterId: "tutorial",
			startAngle: Math.PI / 8,
		});

		this.puzzles = [l1, l2, l3];
		this.puzzles.forEach((p) => gameState.registerPuzzle(p.id));

		// Listen for puzzle solves
		eventBus.on("puzzle:solved", this.onPuzzleSolved.bind(this));

		log.info("Tutorial chapter initialized");
	}

	enter(): void {
		super.enter();
		this.setupLevel(0);
	}

	exit(): void {
		super.exit();
		this.dragHandler.detach();
		this.overlay.hide();
	}

	update(_dt: number): void {
		this.renderLevel();

		const now = performance.now();
		this.overlay.render(now);

		if (!this.overlay.visible) {
			this.canvasManager.clearLayer("ui");
		}
	}

	/* ───────── Image helpers ───────── */

	private getImg(path: string): HTMLImageElement | undefined {
		return this.assetLoader.get(path);
	}

	/** Draw an image centered at (cx, cy). */
	private drawCentered(
		ctx: CanvasRenderingContext2D,
		img: HTMLImageElement,
		cx: number,
		cy: number,
	): void {
		ctx.drawImage(img, cx - img.width / 2, cy - img.height / 2);
	}

	/* ───────── Level setup ───────── */

	private setupLevel(level: number): void {
		this.currentLevel = level;
		this.dragHandler.detach();

		const puzzleCanvas = this.canvasManager.getLayer("puzzle");
		if (!puzzleCanvas) return;
		this.dragHandler.attach(puzzleCanvas.canvas);

		switch (level) {
			case 0:
				this.setupL1();
				break;
			case 1:
				this.setupL2();
				break;
			case 2:
				this.setupL3();
				break;
		}

		this.overlay.show(level + 1);
		log.info(`Tutorial level ${level + 1} started`);
	}

	/* ───────── L1: Drag-to-align door ───────── */

	private setupL1(): void {
		this.l1PanelPos = { x: 200, y: 340 };
		this.currentPuzzleIndex = 0;

		this.dragHandler.setMode("element");
		this.dragHandler.registerElement({
			id: "door-panel",
			getPos: () => this.l1PanelPos,
			setPos: (pos) => {
				this.l1PanelPos = pos;
			},
			getSize: () => this.l1PanelSize,
		});

		this.dragHandler.onDragEnd(() => {
			const puzzle = this.puzzles[0] as AlignmentPuzzle;
			puzzle.checkAlignment({
				pos: {
					x: this.l1PanelPos.x + this.l1PanelSize.w / 2,
					y: this.l1PanelPos.y + this.l1PanelSize.h / 2,
				},
			});

			if (puzzle.state === PuzzleState.SOLVED) {
				this.overlay.hide();
			}
		});
	}

	/* ───────── L2: Pan-to-nest ───────── */

	private setupL2(): void {
		this.l2PanOffset = { x: 0, y: 0 };
		this.l2Solved = false;
		this.currentPuzzleIndex = 1;

		this.dragHandler.onDragEnd(() => {});

		this.dragHandler.setMode("layer");
		this.dragHandler.onDrag((state) => {
			this.l2PanOffset.x += state.delta.x;
			this.l2PanOffset.y += state.delta.y;

			const holeScreenX = CX + this.l2PanOffset.x;
			const holeScreenY = CY + this.l2PanOffset.y;
			const targetX = CX + this.l2TargetOffset.x;
			const targetY = CY + this.l2TargetOffset.y;

			const dist = Math.hypot(holeScreenX - targetX, holeScreenY - targetY);
			if (dist < SNAP_THRESHOLD && !this.l2Solved) {
				this.l2Solved = true;
				this.overlay.hide();
				eventBus.emit("puzzle:solved", {
					chapterId: "tutorial",
					puzzleId: "tut-l2",
				});
			}
		});
	}

	/* ───────── L3: Gear rotation ───────── */

	private setupL3(): void {
		this.l3Angle = Math.PI / 8;
		this.currentPuzzleIndex = 2;

		this.dragHandler.onDragEnd(() => {});

		this.dragHandler.setMode("layer");

		let dragFrame = 0;

		this.dragHandler.onDrag((state) => {
			dragFrame++;

			const dx = state.currentPos.x - this.l3MovableCenter.x;
			const dy = state.currentPos.y - this.l3MovableCenter.y;
			const rawAngle = Math.atan2(dy, dx);

			if (dragFrame > 1) {
				this.l3Angle = rawAngle;

				const puzzle = this.puzzles[2] as RotationPuzzle;
				puzzle.checkAlignment({ angle: rawAngle });

				if (puzzle.state === PuzzleState.SOLVED) {
					this.overlay.hide();
				}
			} else {
				this.l3Angle = rawAngle;
			}
		});
	}

	/* ───────── Puzzle solve handler ───────── */

	private onPuzzleSolved(payload: {
		chapterId: string;
		puzzleId: string;
	}): void {
		if (payload.chapterId !== "tutorial") return;

		this.overlay.nextStep();

		switch (payload.puzzleId) {
			case "tut-l1":
				this.advanceToNextPuzzle();
				setTimeout(() => this.setupLevel(1), 500);
				break;
			case "tut-l2":
				this.advanceToNextPuzzle();
				setTimeout(() => this.setupLevel(2), 500);
				break;
			case "tut-l3":
				gameState.isTutorialComplete = true;
				log.info("Tutorial complete! All 3 levels solved.");
				setTimeout(() => {
					this.advanceToNextPuzzle();
				}, 1500);
				break;
		}
	}

	/* ───────── Drawing helpers ───────── */

	private drawBackground(ctx: CanvasRenderingContext2D): void {
		drawPaperBackground(ctx);
	}

	/* ───────── Rendering ───────── */

	private renderLevel(): void {
		switch (this.currentLevel) {
			case 0:
				this.renderL1();
				break;
			case 1:
				this.renderL2();
				break;
			case 2:
				this.renderL3();
				break;
		}
	}

	/**
	 * L1: Door frame (BG) + door panel (Puzzle canvas).
	 * Uses real PNGs when loaded, falls back to placeholder shapes.
	 */
	private renderL1(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const doorFrameImg = this.getImg(ASSETS.tutorial.doorFrame);
		const doorPanelImg = this.getImg(ASSETS.tutorial.doorPanel);
		const doorClosedImg = this.getImg(ASSETS.tutorial.doorClosed);
		const isSolved = this.puzzles[0]?.solved;

		// ── BG: door frame or completion fullscreen ──
		const bgCtx = this.canvasManager.getContext("bg");
		if (bgCtx) {
			this.drawBackground(bgCtx);

			if (isSolved && doorClosedImg) {
				// Solved: fullscreen completion image
				bgCtx.drawImage(doorClosedImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			} else if (doorFrameImg) {
				bgCtx.drawImage(doorFrameImg, this.l1FramePos.x, this.l1FramePos.y);
			} else {
				// Fallback: placeholder frame
				this.drawPlaceholderFrame(bgCtx);
			}
		}

		// ── Puzzle: door panel (draggable, hidden when solved) ──
		const pCtx = this.canvasManager.getContext("puzzle");
		if (pCtx && !isSolved) {
			if (doorPanelImg) {
				pCtx.drawImage(doorPanelImg, this.l1PanelPos.x, this.l1PanelPos.y);
			} else {
				this.drawPlaceholderPanel(pCtx);
			}
		}
	}

	/** Fallback: draw door frame placeholder (Canvas 2D). */
	private drawPlaceholderFrame(ctx: CanvasRenderingContext2D): void {
		ctx.shadowColor = "rgba(0,0,0,0.15)";
		ctx.shadowBlur = 20;
		this.roundRect(
			ctx,
			this.l1FramePos.x,
			this.l1FramePos.y,
			this.l1FrameSize.w,
			this.l1FrameSize.h,
			6,
		);
		ctx.fillStyle = "#5D7A5E";
		ctx.fill();
		ctx.shadowBlur = 0;

		ctx.fillStyle = "#2a2723";
		this.roundRect(
			ctx,
			this.l1FramePos.x + 6,
			this.l1FramePos.y + 6,
			this.l1FrameSize.w - 12,
			this.l1FrameSize.h - 12,
			4,
		);
		ctx.fill();

		ctx.strokeStyle = "rgba(255,255,255,0.08)";
		ctx.lineWidth = 1;
		this.roundRect(
			ctx,
			this.l1FramePos.x + 8,
			this.l1FramePos.y + 8,
			this.l1FrameSize.w - 16,
			this.l1FrameSize.h - 16,
			3,
		);
		ctx.stroke();

		ctx.fillStyle = "#6f675d";
		ctx.font = '14px "PingFang SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText(
			"← 将门板拖入此处",
			this.l1FramePos.x + this.l1FrameSize.w / 2,
			this.l1FramePos.y + this.l1FrameSize.h + 30,
		);
	}

	/** Fallback: draw door panel placeholder (Canvas 2D). */
	private drawPlaceholderPanel(ctx: CanvasRenderingContext2D): void {
		ctx.shadowColor = "rgba(0,0,0,0.25)";
		ctx.shadowBlur = 12;
		ctx.shadowOffsetX = 4;
		ctx.shadowOffsetY = 4;

		ctx.fillStyle = "#8B8070";
		this.roundRect(
			ctx,
			this.l1PanelPos.x,
			this.l1PanelPos.y,
			this.l1PanelSize.w,
			this.l1PanelSize.h,
			4,
		);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;

		ctx.strokeStyle = "#6f675d";
		ctx.lineWidth = 1;
		this.roundRect(
			ctx,
			this.l1PanelPos.x + 6,
			this.l1PanelPos.y + 6,
			this.l1PanelSize.w - 12,
			this.l1PanelSize.h - 12,
			2,
		);
		ctx.stroke();

		ctx.strokeStyle = "rgba(0,0,0,0.1)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(
			this.l1PanelPos.x + this.l1PanelSize.w / 2,
			this.l1PanelPos.y + 12,
		);
		ctx.lineTo(
			this.l1PanelPos.x + this.l1PanelSize.w / 2,
			this.l1PanelPos.y + this.l1PanelSize.h - 12,
		);
		ctx.stroke();
	}

	/**
	 * L2: Foreground layer with a hole, revealing background scenery.
	 */
	private renderL2(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const bgSceneImg = this.getImg(ASSETS.tutorial.bgScene);
		const isSolved = this.puzzles[1]?.solved;
		const targetX = CX + this.l2TargetOffset.x;
		const targetY = CY + this.l2TargetOffset.y;

		// ── BG: scenic image + crosshair target marker ──
		const bgCtx = this.canvasManager.getContext("bg");
		if (bgCtx) {
			this.drawBackground(bgCtx);

			if (bgSceneImg) {
				// bg-scene is 2400×1600 — center the overflow
				const bw = bgSceneImg.width;
				const bh = bgSceneImg.height;
				const bx = (CANVAS_WIDTH - bw) / 2;
				const by = (CANVAS_HEIGHT - bh) / 2;
				bgCtx.drawImage(bgSceneImg, bx, by);
			}

			// ── Crosshair target marker on BG (always visible through hole) ──
			if (!isSolved) {
				this.drawCrosshair(bgCtx, targetX, targetY);
			}
		}

		// ── Puzzle: Canvas-generated dark mask with hole (pannable) ──
		const pCtx = this.canvasManager.getContext("puzzle");
		if (pCtx && !isSolved) {
			const holeX = CX + this.l2PanOffset.x;
			const holeY = CY + this.l2PanOffset.y;

			// Dark translucent mask covering the whole canvas
			pCtx.fillStyle = "rgba(42,39,35,0.85)";
			pCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

			// Cut out the circular hole (shows bg through it)
			pCtx.save();
			pCtx.globalCompositeOperation = "destination-out";
			pCtx.beginPath();
			pCtx.arc(holeX, holeY, this.l2HoleRadius, 0, Math.PI * 2);
			pCtx.fill();
			pCtx.restore();

			// Hole border ring — cinnabar for interactivity hint
			pCtx.strokeStyle = "#b64232";
			pCtx.lineWidth = 2;
			pCtx.setLineDash([6, 4]);
			pCtx.beginPath();
			pCtx.arc(holeX, holeY, this.l2HoleRadius + 4, 0, Math.PI * 2);
			pCtx.stroke();
			pCtx.setLineDash([]);
		}
	}

	/**
	 * Draw a crosshair/准星 marker at the target position.
	 * Ink-line style — subtle but visible through the hole.
	 */
	private drawCrosshair(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
	): void {
		const radius = 50;

		// Outer faint ring
		ctx.strokeStyle = "rgba(182,66,50,0.35)";
		ctx.lineWidth = 2;
		ctx.setLineDash([8, 6]);
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.stroke();
		ctx.setLineDash([]);

		// Crosshair lines — ink-line style
		const gap = 16;
		const len = 28;
		ctx.strokeStyle = "#b64232";
		ctx.lineWidth = 2;
		ctx.beginPath();
		// Top
		ctx.moveTo(cx, cy - gap);
		ctx.lineTo(cx, cy - gap - len);
		// Bottom
		ctx.moveTo(cx, cy + gap);
		ctx.lineTo(cx, cy + gap + len);
		// Left
		ctx.moveTo(cx - gap, cy);
		ctx.lineTo(cx - gap - len, cy);
		// Right
		ctx.moveTo(cx + gap, cy);
		ctx.lineTo(cx + gap + len, cy);
		ctx.stroke();

		// Center dot
		ctx.fillStyle = "#b64232";
		ctx.beginPath();
		ctx.arc(cx, cy, 4, 0, Math.PI * 2);
		ctx.fill();
	}

	/**
	 * L3: Two gears with rotation interaction.
	 */
	private renderL3(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const gearFixedImg = this.getImg(ASSETS.tutorial.gearFixed);
		const gearMovableImg = this.getImg(ASSETS.tutorial.gearMovable);
		const gearMeshedImg = this.getImg(ASSETS.tutorial.gearMeshed);

		const l3Puzzle = this.puzzles[2] as RotationPuzzle;
		const isSolved = l3Puzzle.state === PuzzleState.SOLVED;

		const bgCtx = this.canvasManager.getContext("bg");
		if (!bgCtx) return;

		this.drawBackground(bgCtx);

		// ── Solved: fullscreen completion ──
		if (isSolved && gearMeshedImg) {
			bgCtx.drawImage(gearMeshedImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			// Solved text overlay
			bgCtx.fillStyle = "#C8A65A";
			bgCtx.font = 'bold 28px "PingFang SC", "Noto Sans SC", sans-serif';
			bgCtx.textAlign = "center";
			bgCtx.textBaseline = "middle";
			bgCtx.fillText(
				"✓ 齿纹对齐！通关！",
				CX,
				this.l3MovableCenter.y + this.l3GearRadius + 50,
			);
			bgCtx.fillStyle = "#6f675d";
			bgCtx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
			bgCtx.fillText(
				"教学关完成 — 即将进入正式篇章",
				CX,
				this.l3MovableCenter.y + this.l3GearRadius + 80,
			);
			return;
		}

		// ── Snap markers ──
		if (!gearFixedImg) {
			this.drawSnapMarkers(bgCtx, this.l3FixedCenter, this.l3GearRadius + 12);
		}

		// ── Near glow on movable gear ──
		if (l3Puzzle.state === PuzzleState.NEAR && !isSolved) {
			const glow = bgCtx.createRadialGradient(
				this.l3MovableCenter.x,
				this.l3MovableCenter.y,
				this.l3GearRadius - 10,
				this.l3MovableCenter.x,
				this.l3MovableCenter.y,
				this.l3GearRadius + 20,
			);
			glow.addColorStop(0, "rgba(184,115,51,0.3)");
			glow.addColorStop(1, "rgba(184,115,51,0)");
			bgCtx.fillStyle = glow;
			bgCtx.beginPath();
			bgCtx.arc(
				this.l3MovableCenter.x,
				this.l3MovableCenter.y,
				this.l3GearRadius + 20,
				0,
				Math.PI * 2,
			);
			bgCtx.fill();
		}

		// ── Solved glow ──
		if (isSolved && !gearMeshedImg) {
			for (const center of [this.l3FixedCenter, this.l3MovableCenter]) {
				const glow = bgCtx.createRadialGradient(
					center.x,
					center.y,
					this.l3GearRadius - 15,
					center.x,
					center.y,
					this.l3GearRadius + 30,
				);
				glow.addColorStop(0, "rgba(201,166,90,0.5)");
				glow.addColorStop(1, "rgba(201,166,90,0)");
				bgCtx.fillStyle = glow;
				bgCtx.beginPath();
				bgCtx.arc(center.x, center.y, this.l3GearRadius + 30, 0, Math.PI * 2);
				bgCtx.fill();
			}
		}

		// ── Fixed gear (BG) ──
		if (gearFixedImg) {
			this.drawCentered(
				bgCtx,
				gearFixedImg,
				this.l3FixedCenter.x,
				this.l3FixedCenter.y,
			);
		} else {
			this.drawGear(bgCtx, this.l3FixedCenter, this.l3GearRadius, 0, "#5D7A5E");
		}

		// ── Movable gear (Puzzle canvas — needs rotation transform) ──
		// Draw on BG canvas to avoid multi-canvas compositing flicker.
		const movableAngle = isSolved ? l3Puzzle.currentAngle : this.l3Angle;
		const movableColor = isSolved ? "#C8A65A" : "#B87333";

		if (gearMovableImg) {
			bgCtx.save();
			bgCtx.translate(this.l3MovableCenter.x, this.l3MovableCenter.y);
			bgCtx.rotate(movableAngle);
			bgCtx.drawImage(
				gearMovableImg,
				-gearMovableImg.width / 2,
				-gearMovableImg.height / 2,
			);
			bgCtx.restore();
		} else {
			this.drawGear(
				bgCtx,
				this.l3MovableCenter,
				this.l3GearRadius,
				movableAngle,
				movableColor,
			);
		}

		// ── Angle indicator (not shown with real images — they're self-explanatory) ──
		if (!gearMovableImg && !isSolved) {
			const indicatorLen = this.l3GearRadius * 1.5;
			const iEx =
				this.l3MovableCenter.x + Math.cos(this.l3Angle) * indicatorLen;
			const iEy =
				this.l3MovableCenter.y + Math.sin(this.l3Angle) * indicatorLen;
			bgCtx.strokeStyle = "rgba(201,166,90,0.4)";
			bgCtx.lineWidth = 2;
			bgCtx.setLineDash([4, 6]);
			bgCtx.beginPath();
			bgCtx.moveTo(this.l3MovableCenter.x, this.l3MovableCenter.y);
			bgCtx.lineTo(iEx, iEy);
			bgCtx.stroke();
			bgCtx.setLineDash([]);

			const degrees = Math.round((this.l3Angle * 180) / Math.PI);
			bgCtx.fillStyle = "#6f675d";
			bgCtx.font = "12px sans-serif";
			bgCtx.textAlign = "left";
			bgCtx.textBaseline = "top";
			bgCtx.fillText(
				`${degrees}°`,
				this.l3MovableCenter.x + this.l3GearRadius + 10,
				this.l3MovableCenter.y - 20,
			);
		}

		// ── Solved text (image fallback) ──
		if (isSolved && !gearMeshedImg) {
			bgCtx.fillStyle = "#C8A65A";
			bgCtx.font = 'bold 28px "PingFang SC", "Noto Sans SC", sans-serif';
			bgCtx.textAlign = "center";
			bgCtx.textBaseline = "middle";
			bgCtx.fillText(
				"✓ 齿纹对齐！通关！",
				CX,
				this.l3MovableCenter.y + this.l3GearRadius + 50,
			);
			bgCtx.fillStyle = "#6f675d";
			bgCtx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
			bgCtx.fillText(
				"教学关完成 — 即将进入正式篇章",
				CX,
				this.l3MovableCenter.y + this.l3GearRadius + 80,
			);
		}

		// ── Labels ──
		if (!gearFixedImg) {
			bgCtx.fillStyle = "#6f675d";
			bgCtx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
			bgCtx.textAlign = "center";
			bgCtx.textBaseline = "alphabetic";
			bgCtx.fillText(
				"固定齿轮",
				this.l3FixedCenter.x,
				this.l3FixedCenter.y + this.l3GearRadius + 30,
			);
		}
	}

	/* ───────── Fallback drawing helpers (Canvas 2D) ───────── */

	private roundRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number,
	): void {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.arcTo(x + w, y, x + w, y + r, r);
		ctx.lineTo(x + w, y + h - r);
		ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
		ctx.lineTo(x + r, y + h);
		ctx.arcTo(x, y + h, x, y + h - r, r);
		ctx.lineTo(x, y + r);
		ctx.arcTo(x, y, x + r, y, r);
		ctx.closePath();
	}

	private drawSnapMarkers(
		ctx: CanvasRenderingContext2D,
		center: Vec2,
		radius: number,
	): void {
		for (const angle of TUTORIAL_L3_SNAP_ANGLES) {
			const mx = center.x + Math.cos(angle) * radius;
			const my = center.y + Math.sin(angle) * radius;
			ctx.fillStyle = "rgba(92,122,94,0.3)";
			ctx.beginPath();
			ctx.arc(mx, my, 4, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawGear(
		ctx: CanvasRenderingContext2D,
		center: Vec2,
		radius: number,
		rotation: number,
		color: string,
	): void {
		const teeth = 8;
		const innerRadius = radius * 0.85;

		ctx.save();
		ctx.translate(center.x, center.y);
		ctx.rotate(rotation);

		ctx.fillStyle = color;
		ctx.strokeStyle = "#2a2723";
		ctx.lineWidth = 2;

		ctx.beginPath();
		for (let i = 0; i < teeth * 2; i++) {
			const angle = (i * Math.PI) / teeth - Math.PI / 2;
			const r = i % 2 === 0 ? radius : innerRadius;
			const px = Math.cos(angle) * r;
			const py = Math.sin(angle) * r;
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = "#2a2723";
		ctx.beginPath();
		ctx.arc(0, 0, 6, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}
}
