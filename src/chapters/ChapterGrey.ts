/**
 * 铜声·识洛 — ChapterGrey 灰页·悬置商
 *
 * Puzzle: 裂缝嵌套 (6 keyframes, layer-pan alignment)
 * Player pans a gray overlay to align cracks with 5 sequential targets.
 * Each aligned crack opens a layer, revealing more of the star map behind.
 * Final layer: 「平子先生授」star map + 玄鸟浮现.
 *
 * No bronze sound — 灰页 is a suspended, silent chapter (商 suspended in time).
 *
 * Palette: ash gray #8B8070 → dark #1A1A18, dark gold edge glow #C8A65A
 *
 * Note: Uses direct layer-pan + custom multi-target tracking instead of
 * NestPuzzle, because NestPuzzle tracks per-layer offsets independently
 * while this puzzle uses a unified pan offset against sequential targets.
 */

import { ChapterBase } from "./ChapterBase";
import type { CanvasManager } from "../engine/CanvasManager";
import type { DragHandler, DragState } from "../engine/DragHandler";
import type { StampEffect } from "../ui/StampEffect";
import { eventBus } from "../utils/EventBus";
import {
	SNAP_THRESHOLD,
	NEAR_THRESHOLD,
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
} from "../utils/constants";
import { type Vec2, vec2Distance } from "../utils/math";
import { createLogger } from "../utils/logger";
import { drawPaperBackground } from "../ui/InkPaintingUtils";
import {
	createCanvasLiquidGlass,
	type LiquidGlassInstance,
} from "liquid-glass-canvas";

const log = createLogger("ChapterGrey");

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Crack targets (5 layers) ───────── */

interface CrackTarget {
	offset: Vec2; // pan offset to align this crack
	solved: boolean;
	grayValue: number; // 0-255 gray level for this layer
	holeRadius: number;
}

function makeTargets(): CrackTarget[] {
	return [
		{ offset: { x: 0, y: 0 }, solved: false, grayValue: 139, holeRadius: 45 },
		{
			offset: { x: -120, y: 70 },
			solved: false,
			grayValue: 120,
			holeRadius: 40,
		},
		{
			offset: { x: 100, y: -90 },
			solved: false,
			grayValue: 100,
			holeRadius: 35,
		},
		{
			offset: { x: -80, y: 120 },
			solved: false,
			grayValue: 75,
			holeRadius: 50,
		},
		{ offset: { x: 140, y: 50 }, solved: false, grayValue: 50, holeRadius: 42 },
	];
}

/* ───────── Frame enum ───────── */

enum GreyFrame {
	INTRO,
	PUZZLE,
	REVEAL,
	COMPLETE,
}

export class ChapterGrey extends ChapterBase {
	private canvasManager: CanvasManager;
	private dragHandler: DragHandler;
	private stampEffect: StampEffect;
	private frame: GreyFrame = GreyFrame.INTRO;
	private frameTimer = 0;

	// Pan state
	private panOffset: Vec2 = { x: 0, y: 0 };
	private savedPanOffset: Vec2 = { x: 0, y: 0 };
	private targets: CrackTarget[] = [];
	private solvedCount = 0;

	// Near glow for current crack
	private isNear = false;

	// Bird reveal
	private birdAlpha = 0;

	// Liquid glass glow (WebGL refraction following the current crack)
	private glass: LiquidGlassInstance | null = null;
	private glassWrap: HTMLDivElement | null = null;
	private glassAnchor: HTMLDivElement | null = null;

	private completed = false;
	private skipRender = false;

	private readonly INTRO_DURATION = 1500;
	private readonly REVEAL_DURATION = 2500;
	private readonly TRANSITION_DURATION = 500;

	constructor(
		canvasManager: CanvasManager,
		dragHandler: DragHandler,
		stampEffect: StampEffect,
	) {
		super("grey");
		this.canvasManager = canvasManager;
		this.dragHandler = dragHandler;
		this.stampEffect = stampEffect;
	}

	init(): void {
		this.puzzles = [];
		log.info("Grey chapter initialized");
	}

	enter(): void {
		super.enter();
		this.resetState();
		this.frame = GreyFrame.INTRO;
		this.setupGlass();
		log.info("Grey entered");
	}

	exit(): void {
		super.exit();
		this.teardownDrag();
		this.teardownGlass();
	}

	private resetState(): void {
		this.frameTimer = 0;
		this.panOffset = { x: 0, y: 0 };
		this.savedPanOffset = { x: 0, y: 0 };
		this.targets = makeTargets();
		this.solvedCount = 0;
		this.isNear = false;
		this.birdAlpha = 0;
		this.completed = false;
		this.skipRender = false;
	}

	update(dt: number): void {
		if (this.skipRender) return;
		this.frameTimer += dt;

		switch (this.frame) {
			case GreyFrame.INTRO:
				if (this.frameTimer >= this.INTRO_DURATION) {
					this.advanceToPuzzle();
				}
				break;

			case GreyFrame.PUZZLE:
				// alignment is checked in drag callbacks
				break;

			case GreyFrame.REVEAL:
				this.birdAlpha = Math.min(1, (this.frameTimer - 500) / 800);
				if (this.frameTimer >= this.REVEAL_DURATION) {
					this.advanceToComplete();
				}
				break;

			case GreyFrame.COMPLETE: {
				if (this.completed) break;
				const fade = Math.min(1, this.frameTimer / this.TRANSITION_DURATION);
				if (fade >= 1) {
					this.completed = true;
					this.skipRender = true;
					eventBus.emit("chapter:complete", { chapterId: "grey" });
				}
				break;
			}
		}

		this.updateGlassLens();
		this.renderFrame();
	}

	/* ───────── Frame transitions ───────── */

	private advanceToPuzzle(): void {
		this.frame = GreyFrame.PUZZLE;
		this.frameTimer = 0;
		this.setupPuzzleDrag();
		// Check alignment immediately — first crack starts at {0,0} which is target[0]
		this.checkCrackAlignment();
		log.info("Grey: INTRO → PUZZLE");
	}

	private advanceToReveal(): void {
		this.teardownDrag();
		this.frame = GreyFrame.REVEAL;
		this.frameTimer = 0;
		this.stampEffect.showStamp({ text: "悬置" });
		log.info("Grey: PUZZLE → REVEAL");
	}

	private advanceToComplete(): void {
		this.frame = GreyFrame.COMPLETE;
		this.frameTimer = 0;
		log.info("Grey: REVEAL → COMPLETE");
	}

	/* ───────── Puzzle interaction ───────── */

	private setupPuzzleDrag(): void {
		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;

		this.dragHandler.attach(canvas);
		this.dragHandler.setMode("layer");
		this.dragHandler.onDrag((state: DragState) => {
			// Map absolute drag position to pan offset
			this.panOffset.x = this.savedPanOffset.x + state.totalDelta.x;
			this.panOffset.y = this.savedPanOffset.y + state.totalDelta.y;

			// Check alignment against the next unsolved target
			this.checkCrackAlignment();
		});
		this.dragHandler.onDragEnd(() => {
			// Save current pan as base for next drag
			this.savedPanOffset = { ...this.panOffset };
			// Check one more time on release (snap if close enough)
			this.checkCrackAlignment();
		});
	}

	private checkCrackAlignment(): void {
		const nextIdx = this.solvedCount;
		if (nextIdx >= this.targets.length) return;

		const target = this.targets[nextIdx];
		const dist = vec2Distance(this.panOffset, target.offset);

		if (dist < SNAP_THRESHOLD) {
			// Crack aligns!
			target.solved = true;
			this.solvedCount++;
			this.isNear = false;
			log.info(`Grey: crack ${nextIdx + 1}/${this.targets.length} solved`);

			// Snap pan to target for smooth visual
			this.panOffset = { ...target.offset };

			if (this.solvedCount >= this.targets.length) {
				eventBus.emit("puzzle:solved", {
					chapterId: "grey",
					puzzleId: "crack-nest",
				});
				this.advanceToReveal();
			}
		} else if (dist < NEAR_THRESHOLD) {
			this.isNear = true;
		} else {
			this.isNear = false;
		}
	}

	private teardownDrag(): void {
		this.dragHandler.detach();
		this.dragHandler.onDrag(() => {});
		this.dragHandler.onDragEnd(() => {});
	}

	/* ───────── Liquid glass glow ───────── */

	/**
	 * WebGL glass-refraction lens that follows the current crack hole.
	 * A wrapper div is aligned 1:1 with the BG canvas so the source
	 * texture maps exactly onto the overlay; an invisible anchor div
	 * is repositioned each frame and the lens tracks its rect.
	 */
	private setupGlass(): void {
		const bgCanvas = this.canvasManager.getLayer("bg")?.canvas;
		const appEl = document.getElementById("app");
		if (!bgCanvas || !appEl) return;

		const rect = bgCanvas.getBoundingClientRect();
		const appRect = appEl.getBoundingClientRect();

		const wrap = document.createElement("div");
		wrap.style.position = "absolute";
		wrap.style.left = `${rect.left - appRect.left}px`;
		wrap.style.top = `${rect.top - appRect.top}px`;
		wrap.style.width = `${rect.width}px`;
		wrap.style.height = `${rect.height}px`;
		wrap.style.zIndex = "2"; // above puzzle gray overlay, below UI
		wrap.style.pointerEvents = "none";
		appEl.appendChild(wrap);
		this.glassWrap = wrap;

		this.glass = createCanvasLiquidGlass({
			source: bgCanvas,
			container: wrap,
			quality: "high",
		});

		const anchor = document.createElement("div");
		anchor.style.position = "absolute";
		anchor.style.pointerEvents = "none";
		anchor.style.visibility = "hidden";
		wrap.appendChild(anchor);
		this.glassAnchor = anchor;

		this.glass.registerLens(anchor, {
			radius: 90,
			depth: 42,
			feather: 38,
			curve: 2,
			chroma: 0.55,
			tint: "rgba(200,166,90,0.10)",
			glint: 0.35,
		});
		this.glass.start();
	}

	private updateGlassLens(): void {
		if (!this.glass || !this.glassAnchor || !this.glassWrap) return;
		const bgCanvas = this.canvasManager.getLayer("bg")?.canvas;
		if (!bgCanvas) return;

		const active =
			this.frame === GreyFrame.PUZZLE && this.solvedCount < this.targets.length;
		if (!active) {
			this.glassAnchor.style.width = "0px";
			this.glassAnchor.style.height = "0px";
			return;
		}

		const cur = this.targets[this.solvedCount];
		const holeGameX = CX + this.panOffset.x;
		const holeGameY = CY + this.panOffset.y;
		const sizeGame = (cur.holeRadius + 34) * 2;

		const rect = bgCanvas.getBoundingClientRect();
		const scale = rect.width / CANVAS_WIDTH;
		const sizeCss = sizeGame * scale;

		this.glassAnchor.style.width = `${sizeCss}px`;
		this.glassAnchor.style.height = `${sizeCss}px`;
		this.glassAnchor.style.left = `${holeGameX * scale - sizeCss / 2}px`;
		this.glassAnchor.style.top = `${holeGameY * scale - sizeCss / 2}px`;
	}

	private teardownGlass(): void {
		if (this.glass) {
			this.glass.destroy();
			this.glass = null;
		}
		if (this.glassWrap) {
			this.glassWrap.remove();
			this.glassWrap = null;
		}
		this.glassAnchor = null;
	}

	/* ───────── Rendering ───────── */

	private renderFrame(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const ctx = this.canvasManager.getContext("bg");
		if (!ctx) return;

		switch (this.frame) {
			case GreyFrame.INTRO:
				this.renderIntro(ctx);
				break;
			case GreyFrame.PUZZLE:
				this.renderPuzzle(ctx);
				break;
			case GreyFrame.REVEAL:
			case GreyFrame.COMPLETE:
				this.renderReveal(ctx);
				break;
		}
	}

	/* ───────── Helpers ───────── */

	/** Deterministic pseudo-random for star positions. */
	private static pRand(seed: number): number {
		return Math.abs(Math.sin(seed * 9973)) % 1;
	}

	/** Draw an irregular crack polygon. */
	private drawCrack(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		radius: number,
		seed: number,
	): void {
		const pts = 7 + (seed % 4);
		ctx.beginPath();
		for (let i = 0; i < pts; i++) {
			const angle = (i / pts) * Math.PI * 2 + seed * 0.3;
			const r = radius * (0.6 + 0.4 * Math.sin(seed + i * 3.7 + 1));
			const x = cx + Math.cos(angle) * r;
			const y = cy + Math.sin(angle) * r;
			ctx[i === 0 ? "moveTo" : "lineTo"](x, y);
		}
		ctx.closePath();
	}

	/** Draw a constellation star map. */
	private drawStarmap(ctx: CanvasRenderingContext2D, alpha: number): void {
		// Dark sky over heavy paper texture
		drawPaperBackground(ctx, "#0a0a18", 0.9);

		// Generate stars procedurally with fixed seeds
		const stars: { x: number; y: number; s: number; b: number }[] = [];
		for (let i = 0; i < 40; i++) {
			stars.push({
				x: 100 + ChapterGrey.pRand(i * 13) * (CANVAS_WIDTH - 200),
				y: 60 + ChapterGrey.pRand(i * 7 + 3) * (CANVAS_HEIGHT - 200),
				s: 1 + ChapterGrey.pRand(i * 5 + 11) * 2.5,
				b: 0.5 + ChapterGrey.pRand(i * 3 + 17) * 0.5,
			});
		}

		// Draw stars with twinkling
		const twinkle = Math.sin(performance.now() / 1000) * 0.15;
		for (const star of stars) {
			const brightness = Math.min(1, Math.max(0.3, star.b + twinkle));
			ctx.fillStyle = `rgba(220,220,235,${brightness * alpha})`;
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
			ctx.fill();
		}

		// Constellation lines (connecting a subset of stars)
		const lines = [
			[0, 3],
			[3, 7],
			[7, 12],
			[12, 0], // dipper-like
			[5, 9],
			[9, 14],
			[14, 18],
			[2, 6],
			[6, 11],
			[11, 15],
		];
		ctx.strokeStyle = `rgba(100,120,180,${0.2 * alpha})`;
		ctx.lineWidth = 1;
		for (const [a, b] of lines) {
			ctx.beginPath();
			ctx.moveTo(stars[a].x, stars[a].y);
			ctx.lineTo(stars[b].x, stars[b].y);
			ctx.stroke();
		}
	}

	/** Draw 玄鸟 (dark bird) silhouette. */
	private drawBird(ctx: CanvasRenderingContext2D, alpha: number): void {
		if (alpha <= 0) return;
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = "#1A1A18";

		// Bird silhouette made of two wing paths
		const bx = CX + 200;
		const by = CY - 60;

		ctx.beginPath();
		// Left wing
		ctx.moveTo(bx, by);
		ctx.quadraticCurveTo(bx - 80, by + 20, bx - 140, by - 20);
		ctx.quadraticCurveTo(bx - 100, by + 10, bx - 30, by + 40);
		// Body
		ctx.quadraticCurveTo(bx, by + 60, bx + 30, by + 40);
		// Right wing
		ctx.quadraticCurveTo(bx + 100, by + 10, bx + 140, by - 20);
		ctx.quadraticCurveTo(bx + 80, by + 20, bx, by);
		ctx.fill();

		// Label
		ctx.fillStyle = `rgba(200,166,90,${alpha * 0.8})`;
		ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("平子先生授", bx, by + 100);

		ctx.restore();
	}

	/* ───────── Frame rendering ───────── */

	/** Frame 0: Intro — dark gray page with first crack appearing. */
	private renderIntro(ctx: CanvasRenderingContext2D): void {
		// Dark background over heavy paper texture
		drawPaperBackground(ctx, "#1A1A18", 0.88);

		// Gray overlay with crack appearing
		const crackProgress = Math.min(1, this.frameTimer / this.INTRO_DURATION);
		const gray = 139 - crackProgress * 40;
		ctx.fillStyle = `rgba(${gray},${gray - 10},${gray - 20},0.95)`;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Crack forms at center
		if (crackProgress > 0.3) {
			const crackAlpha = Math.min(1, (crackProgress - 0.3) / 0.4);
			ctx.save();
			ctx.globalCompositeOperation = "destination-out";
			ctx.fillStyle = `rgba(0,0,0,${crackAlpha})`;
			this.drawCrack(ctx, CX, CY, 30 * crackAlpha, 0);
			ctx.fill();
			ctx.restore();

			// Crack edge glow
			if (crackAlpha > 0.5) {
				ctx.strokeStyle = `rgba(200,166,90,${crackAlpha * 0.3})`;
				ctx.lineWidth = 2;
				this.drawCrack(ctx, CX, CY, 30 * crackAlpha + 5, 0);
				ctx.stroke();
			}
		}

		// Label
		ctx.fillStyle = `rgba(111,103,93,${crackProgress})`;
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("触碰灰页 ……", CX, CANVAS_HEIGHT - 30);
	}

	/** Frame 1-5: Puzzle — pan to align cracks. */
	private renderPuzzle(ctx: CanvasRenderingContext2D): void {
		// Base: star map (revealed through cracks)
		this.drawStarmap(ctx, 1);

		// Calculate gray level: starts lighter, gets darker as more cracks open
		const baseGray = 139 - this.solvedCount * 18; // 139 → 49 after 5 solved
		const gray = Math.max(26, baseGray);

		// Gray overlay on puzzle canvas
		const pCtx = this.canvasManager.getContext("puzzle");
		if (!pCtx) return;

		// Fill puzzle canvas with gray overlay
		pCtx.fillStyle = `rgba(${gray},${gray - 8},${gray - 15},0.92)`;
		pCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		// Cut out solved cracks
		pCtx.save();
		pCtx.globalCompositeOperation = "destination-out";
		pCtx.fillStyle = "rgba(0,0,0,1)";

		for (let i = 0; i < this.solvedCount && i < this.targets.length; i++) {
			const t = this.targets[i];
			const cx = CX + t.offset.x;
			const cy = CY + t.offset.y;
			this.drawCrack(pCtx, cx, cy, t.holeRadius, i * 7);
			pCtx.fill();
		}

		// Current crack at pan offset
		if (this.solvedCount < this.targets.length) {
			const cur = this.targets[this.solvedCount];
			const curCX = CX + this.panOffset.x;
			const curCY = CY + this.panOffset.y;
			this.drawCrack(
				pCtx,
				curCX,
				curCY,
				cur.holeRadius,
				this.solvedCount * 7 + 3,
			);
			pCtx.fill();
		}

		pCtx.restore();

		// ── Ghost target indicators (visible above gray overlay) ──
		// Show faint dashed outlines at each unsolved target position so
		// the player knows where to drag.
		for (let i = this.solvedCount; i < this.targets.length; i++) {
			const t = this.targets[i];
			const tx = CX + t.offset.x;
			const ty = CY + t.offset.y;
			const isCurrent = i === this.solvedCount;

			// Pulse the current target ghost for attention
			const pulse = isCurrent
				? 0.7 + 0.3 * Math.sin(performance.now() / 600)
				: 1;
			const ghostAlpha = isCurrent ? 0.3 * pulse : 0.12;

			pCtx.save();
			pCtx.strokeStyle = `rgba(200,166,90,${ghostAlpha})`;
			pCtx.lineWidth = isCurrent ? 1.5 : 1;
			pCtx.setLineDash(isCurrent ? [] : [3, 5]);
			this.drawCrack(pCtx, tx, ty, t.holeRadius, i * 7);
			pCtx.stroke();
			pCtx.setLineDash([]);

			// Faint glow behind the current target
			if (isCurrent) {
				const glow = pCtx.createRadialGradient(
					tx,
					ty,
					0,
					tx,
					ty,
					t.holeRadius + 25,
				);
				glow.addColorStop(0, `rgba(200,166,90,0.08)`);
				glow.addColorStop(1, "rgba(200,166,90,0)");
				pCtx.fillStyle = glow;
				pCtx.beginPath();
				pCtx.arc(tx, ty, t.holeRadius + 25, 0, Math.PI * 2);
				pCtx.fill();
			}
			pCtx.restore();
		}

		// ── Distance indicator ──
		// Show a numeric hint so the player knows how close they are
		let dist = Infinity;
		if (this.solvedCount < this.targets.length) {
			const cur = this.targets[this.solvedCount];
			dist = vec2Distance(this.panOffset, cur.offset);
		}

		// Dark gold edge glow on nearest crack (when close)
		if (this.isNear && this.solvedCount < this.targets.length) {
			const cur = this.targets[this.solvedCount];
			const curCX = CX + this.panOffset.x;
			const curCY = CY + this.panOffset.y;
			const glow = pCtx.createRadialGradient(
				curCX,
				curCY,
				5,
				curCX,
				curCY,
				cur.holeRadius + 15,
			);
			glow.addColorStop(0, "rgba(200,166,90,0.25)");
			glow.addColorStop(1, "rgba(200,166,90,0)");
			pCtx.fillStyle = glow;
			this.drawCrack(
				pCtx,
				curCX,
				curCY,
				cur.holeRadius + 10,
				this.solvedCount * 7 + 5,
			);
			pCtx.fill();
		}

		// Solved count indicator on bg
		ctx.fillStyle = "#6f675d";
		ctx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(
			`裂缝 ${this.solvedCount}/${this.targets.length}`,
			CX,
			CANVAS_HEIGHT - 30,
		);

		// Distance bar — shows how close the current crack is to its target
		if (this.solvedCount < this.targets.length && dist < 300) {
			// Map 300px→0 to bar width 0→full (closer = fuller bar)
			const barWidth = Math.max(0, 1 - dist / 300) * 120;
			const barX = CX - 60;
			const barY = CANVAS_HEIGHT - 48;
			const barH = 4;

			// Background track
			ctx.fillStyle = "rgba(111,103,93,0.3)";
			ctx.fillRect(barX, barY, 120, barH);

			// Fill — gold when close, gray when far
			const isClose = dist < NEAR_THRESHOLD;
			ctx.fillStyle = isClose ? "#C8A65A" : "rgba(200,166,90,0.5)";
			ctx.fillRect(barX, barY, barWidth, barH);

			// Label
			ctx.fillStyle = isClose ? "#C8A65A" : "#6f675d";
			ctx.font = '11px "PingFang SC", "Noto Sans SC", sans-serif';
			ctx.fillText(isClose ? "接近目标" : "拖拽对齐", CX, barY - 4);
		} else if (this.solvedCount < this.targets.length) {
			// Far away — show a general hint pointing roughly toward target
			ctx.fillStyle = "#6f675d";
			ctx.font = '11px "PingFang SC", "Noto Sans SC", sans-serif';
			ctx.textAlign = "center";
			ctx.fillText("拖动画面 · 寻找裂缝", CX, CANVAS_HEIGHT - 48);
		}
	}

	/** After puzzle: Star map fully visible + 玄鸟. */
	private renderReveal(ctx: CanvasRenderingContext2D): void {
		// Full star map
		this.drawStarmap(ctx, 1);

		// 玄鸟 appears
		this.drawBird(ctx, this.birdAlpha);

		// Label
		ctx.fillStyle = `rgba(200,166,90,${Math.min(1, this.frameTimer / 1000)})`;
		ctx.font = '16px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("悬置之页 · 玄鸟启", CX, CANVAS_HEIGHT - 30);

		// Fade to black on complete
		if (this.frame === GreyFrame.COMPLETE) {
			ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.frameTimer / this.TRANSITION_DURATION)})`;
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		}
	}
}
