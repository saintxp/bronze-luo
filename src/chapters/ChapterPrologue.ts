/**
 * 铜声·识洛 — ChapterPrologue 序章
 *
 * 4-frame pure cutscene (no puzzles):
 *   COVER → MAP → FINGERPRINT → COPPER_FLOOD → COMPLETE
 *
 * Uses real PNG assets from /assets/prologue/, falls back to Canvas 2D.
 *
 * Frame state machine:
 *   COVER (hold 3s) → MAP (swipe Luo River) → FINGERPRINT (auto 1s)
 *   → COPPER_FLOOD (auto 2.5s + bronze sound 'guDu') → COMPLETE (fade to black → chapter:complete)
 */

import { ChapterBase } from "./ChapterBase";
import type { CanvasManager } from "../engine/CanvasManager";
import type { DragHandler } from "../engine/DragHandler";
import type { VFXParticleManager } from "../engine/VFXParticleManager";
import type { AssetLoader } from "../assets/AssetLoader";
import { ASSETS } from "../assets/AssetManifest";
import { eventBus } from "../utils/EventBus";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../utils/constants";
import { drawPaperBackground } from "../ui/InkPaintingUtils";
import { createLogger } from "../utils/logger";

const log = createLogger("ChapterPrologue");

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

// Image-space anchor points (tweak here if asset changes)
const MAP_IMG_SIZE = { w: 2400, h: 1600 };
// 二里头红点：「二里头夏都」标注处（luoyang-map.png 图像坐标）
const ERLITOU_MARKER_IMG = { x: 1390, y: 884 };
const COVER_IMG_SIZE = { w: 2189, h: 1232 };
const COVER_SEAL_IMG = { x: 1853, y: 872 }; // 朱砂指纹/印章 on cover.png

// 设为 true 可在地图上显示对齐辅助线（调试用）
const DEBUG_ALIGN = false;

// 洛河引导线：沿金色洛河从左下→右上（与河流流向相反）
const LUO_RIVER_GUIDE_IMG: { x: number; y: number }[] = [
	{ x: 243, y: 984 },
	{ x: 398, y: 887 },
	{ x: 525, y: 886 },
	{ x: 698, y: 820 },
	{ x: 871, y: 735 },
	{ x: 1002, y: 691 },
	{ x: 1175, y: 720 },
	{ x: 1354, y: 780 },
	{ x: 1566, y: 694 },
	{ x: 1707, y: 679 },
	{ x: 1875, y: 820 },
	{ x: 2125, y: 743 },
];

enum PrologueFrame {
	COVER,
	MAP,
	FINGERPRINT,
	COPPER_FLOOD,
	COMPLETE,
	COLOPHON,
}

export class ChapterPrologue extends ChapterBase {
	private canvasManager: CanvasManager;
	private dragHandler: DragHandler;
	private particles: VFXParticleManager;
	private assetLoader: AssetLoader;
	private frame: PrologueFrame = PrologueFrame.COVER;
	private frameTimer = 0;
	private holdDuration = 0;
	private isPressing = false;
	private swipeProgress = 0;
	private savedSwipeX = 0;
	private readonly SWIPE_DISTANCE = 400;
	private transitionAlpha = 0;
	private copperProgress = 0;
	private fingerAlpha = 0;
	private coverZoom = 1; // 1.0 → 1.10 slow zoom
	private coverTextAlpha = 0; // fade-in cover copy
	private colophonAlpha = 0;
	private colophonPhase: "in" | "hold" = "in";
	private colophonPhaseTimer = 0;
	private completed = false;
	private skipRender = false;

	private readonly HOLD_REQUIRED = 5000;
	private readonly FINGERPRINT_DURATION = 1000;
	private readonly FLOOD_DURATION = 2500;
	private readonly TRANSITION_DURATION = 500;

	private boundPointerDown: ((e: Event) => void) | null = null;
	private boundPointerUp: ((e: Event) => void) | null = null;
	private boundDebugClick: ((e: MouseEvent) => void) | null = null;
	private boundColophonClick: ((e: Event) => void) | null = null;
	private copperFloodVideo: HTMLVideoElement | null = null;
	private copperFloodVideoReady = false;

	constructor(
		canvasManager: CanvasManager,
		dragHandler: DragHandler,
		particles: VFXParticleManager,
		assetLoader: AssetLoader,
	) {
		super("prologue");
		this.canvasManager = canvasManager;
		this.dragHandler = dragHandler;
		this.particles = particles;
		this.assetLoader = assetLoader;
	}

	async init(): Promise<void> {
		this.puzzles = [];
		await this.assetLoader.preloadChapter("prologue", {
			cover: ASSETS.prologue.cover,
			map: ASSETS.prologue.map,
			fingerprint: ASSETS.prologue.fingerprint,
			copperFlood: ASSETS.prologue.copperFlood,
			copperFlood2: ASSETS.prologue.copperFlood2,
			copperFloodCorners: ASSETS.prologue.copperFloodCorners,
			colophonText: ASSETS.prologue.colophonText,
		});

		// Preload copper flood video
		const video = document.createElement("video");
		video.src = ASSETS.prologue.copperFloodVideo;
		video.loop = false;
		video.muted = false;
		video.playsInline = true;
		video.preload = "auto";
		video.style.display = "none";
		document.body.appendChild(video);

		video.onloadeddata = () => {
			this.copperFloodVideoReady = true;
			log.info("Copper flood video loaded");
		};
		video.onerror = () => {
			log.warn("Copper flood video failed — falling back to PNGs");
		};
		video.load();
		this.copperFloodVideo = video;

		log.info("Prologue chapter initialized");
	}

	enter(): void {
		super.enter();
		this.resetState();
		this.frame = PrologueFrame.COVER;
		this.setupCoverListeners();
		log.info("Prologue entered");
	}

	exit(): void {
		super.exit();
		this.teardownCoverListeners();
		this.teardownColophonClick();
		this.dragHandler.detach();
		this.dragHandler.onDrag(() => {});
		this.dragHandler.onDragEnd(() => {});

		if (this.copperFloodVideo) {
			this.copperFloodVideo.pause();
			this.copperFloodVideo.remove();
			this.copperFloodVideo = null;
			this.copperFloodVideoReady = false;
		}
	}

	/* ───────── Image helper ───────── */

	private getImg(path: string): HTMLImageElement | undefined {
		return this.assetLoader.get(path);
	}

	private mapImgToScreen(imgPos: { x: number; y: number }): {
		x: number;
		y: number;
	} {
		const bw = MAP_IMG_SIZE.w;
		const bh = MAP_IMG_SIZE.h;
		const bx = (CANVAS_WIDTH - bw) / 2;
		const by = (CANVAS_HEIGHT - bh) / 2;
		return { x: bx + imgPos.x, y: by + imgPos.y };
	}

	private coverImgToScreen(imgPos: { x: number; y: number }): {
		x: number;
		y: number;
	} {
		return {
			x: (imgPos.x * CANVAS_WIDTH) / COVER_IMG_SIZE.w,
			y: (imgPos.y * CANVAS_HEIGHT) / COVER_IMG_SIZE.h,
		};
	}

	/* ───────── State ───────── */

	private resetState(): void {
		this.frameTimer = 0;
		this.holdDuration = 0;
		this.isPressing = false;
		this.swipeProgress = 0;
		this.savedSwipeX = 0;
		this.transitionAlpha = 0;
		this.copperProgress = 0;
		this.fingerAlpha = 0;
		this.coverZoom = 1;
		this.colophonAlpha = 0;
		this.colophonPhase = "in";
		this.colophonPhaseTimer = 0;
		this.coverTextAlpha = 0;
		this.completed = false;
		this.skipRender = false;
	}

	private getCanvas(): HTMLCanvasElement | null {
		return this.canvasManager.getLayer("puzzle")?.canvas ?? null;
	}

	update(dt: number): void {
		if (this.skipRender) return;
		this.frameTimer += dt;

		switch (this.frame) {
			case PrologueFrame.COVER:
				if (this.isPressing) {
					this.holdDuration += dt;
					if (this.holdDuration >= this.HOLD_REQUIRED) {
						this.advanceToMap();
					}
				}
				break;
			case PrologueFrame.MAP:
				break;
			case PrologueFrame.FINGERPRINT:
				this.fingerAlpha = Math.min(1, this.frameTimer / 400);
				if (this.frameTimer >= this.FINGERPRINT_DURATION) {
					this.advanceToFlood();
				}
				break;
			case PrologueFrame.COPPER_FLOOD:
				this.copperProgress = Math.min(
					1,
					this.frameTimer / this.FLOOD_DURATION,
				);
				if (this.frameTimer >= this.FLOOD_DURATION) {
					this.advanceToComplete();
				}
				break;
			case PrologueFrame.COMPLETE:
				if (this.completed) break;
				this.transitionAlpha = Math.min(
					1,
					this.transitionAlpha + dt / this.TRANSITION_DURATION,
				);
				if (this.transitionAlpha >= 1) {
					this.advanceToColophon();
				}
				break;
			case PrologueFrame.COLOPHON:
				this.colophonPhaseTimer += dt;
				switch (this.colophonPhase) {
					case "in":
						this.colophonAlpha = Math.min(1, this.colophonPhaseTimer / 800);
						if (this.colophonPhaseTimer >= 800) {
							this.colophonPhase = "hold";
							this.colophonPhaseTimer = 0;
						}
						break;
					case "hold":
						this.colophonAlpha = 1;
						if (this.colophonPhaseTimer >= 3000) {
							this.finishColophon();
						}
						break;
				}
				break;
		}

		this.renderFrame();
	}

	/* ───────── Frame transitions ───────── */

	private advanceToMap(): void {
		this.teardownCoverListeners();
		this.frame = PrologueFrame.MAP;
		this.frameTimer = 0;
		this.setupMapDrag();
		log.info("Prologue: COVER → MAP");
	}

	private advanceToFingerprint(): void {
		this.teardownMapDrag();
		this.frame = PrologueFrame.FINGERPRINT;
		this.frameTimer = 0;
		log.info("Prologue: MAP → FINGERPRINT");
	}

	private advanceToFlood(): void {
		this.frame = PrologueFrame.COPPER_FLOOD;
		this.frameTimer = 0;
		this.particles.trigger("copperSplash", CX, CY);
		eventBus.emit("bronze:sound", { soundId: "guDu" });
		this.startCopperFloodVideo();
		log.info("Prologue: FINGERPRINT → COPPER_FLOOD");
	}

	private startCopperFloodVideo(): void {
		const v = this.copperFloodVideo;
		if (!v || !this.copperFloodVideoReady) return;
		v.currentTime = 0;
		v.play().catch(() => {});
	}

	private advanceToComplete(): void {
		this.frame = PrologueFrame.COMPLETE;
		this.transitionAlpha = 0;
		log.info("Prologue: COPPER_FLOOD → COMPLETE (fade out)");
	}

	private advanceToColophon(): void {
		this.completed = true;
		this.frame = PrologueFrame.COLOPHON;
		this.frameTimer = 0;
		this.colophonAlpha = 0;
		this.colophonPhase = "in";
		this.colophonPhaseTimer = 0;
		this.setupColophonClick();
		log.info("Prologue: COMPLETE → COLOPHON");
	}

	private setupColophonClick(): void {
		const canvas = this.getCanvas();
		if (!canvas) return;
		canvas.style.pointerEvents = "auto";

		this.boundColophonClick = (() => {
			if (this.colophonPhase === "hold") {
				this.finishColophon();
			}
		}) as EventListener;

		canvas.addEventListener("click", this.boundColophonClick);
	}

	private teardownColophonClick(): void {
		const canvas = this.getCanvas();
		if (!canvas || !this.boundColophonClick) return;
		canvas.removeEventListener("click", this.boundColophonClick);
		canvas.style.pointerEvents = "none";
		this.boundColophonClick = null;
	}

	private finishColophon(): void {
		this.teardownColophonClick();
		this.completed = true;
		this.skipRender = true;
		eventBus.emit("chapter:complete", { chapterId: "prologue" });
	}

	/* ───────── Interaction ───────── */

	private setupCoverListeners(): void {
		const canvas = this.getCanvas();
		if (!canvas) return;
		canvas.style.pointerEvents = "auto";

		this.boundPointerDown = (() => {
			this.isPressing = true;
		}) as EventListener;
		this.boundPointerUp = (() => {
			this.isPressing = false;
		}) as EventListener;

		canvas.addEventListener("mousedown", this.boundPointerDown);
		canvas.addEventListener("mouseup", this.boundPointerUp);
		canvas.addEventListener("mouseleave", this.boundPointerUp);
		canvas.addEventListener("touchstart", this.boundPointerDown, {
			passive: true,
		});
		canvas.addEventListener("touchend", this.boundPointerUp);
		canvas.addEventListener("touchcancel", this.boundPointerUp);
	}

	private teardownCoverListeners(): void {
		const canvas = this.getCanvas();
		if (!canvas || !this.boundPointerDown) return;
		canvas.removeEventListener("mousedown", this.boundPointerDown);
		canvas.removeEventListener("mouseup", this.boundPointerUp!);
		canvas.removeEventListener("mouseleave", this.boundPointerUp!);
		canvas.removeEventListener("touchstart", this.boundPointerDown);
		canvas.removeEventListener("touchend", this.boundPointerUp!);
		canvas.removeEventListener("touchcancel", this.boundPointerUp!);
		this.boundPointerDown = null;
		this.boundPointerUp = null;
	}

	private setupMapDrag(): void {
		const canvas = this.getCanvas();
		if (!canvas) return;
		this.dragHandler.attach(canvas);
		this.dragHandler.setMode("layer");
		this.dragHandler.onDrag((state) => {
			const totalX = this.savedSwipeX + Math.abs(state.totalDelta.x);
			this.swipeProgress = Math.min(1, totalX / this.SWIPE_DISTANCE);
			if (this.swipeProgress >= 1) {
				this.advanceToFingerprint();
			}
		});
		this.dragHandler.onDragEnd(() => {
			this.savedSwipeX = this.swipeProgress * this.SWIPE_DISTANCE;
		});

		if (DEBUG_ALIGN) {
			const bx = (CANVAS_WIDTH - MAP_IMG_SIZE.w) / 2;
			const by = (CANVAS_HEIGHT - MAP_IMG_SIZE.h) / 2;

			this.boundDebugClick = (e: MouseEvent) => {
				const rect = canvas.getBoundingClientRect();
				const gameX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
				const gameY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
				const imgX = Math.round(gameX - bx);
				const imgY = Math.round(gameY - by);
				log.info(
					`Map click: img=(${imgX}, ${imgY}), game=(${Math.round(gameX)}, ${Math.round(gameY)})`,
				);
			};
			canvas.addEventListener("click", this.boundDebugClick);
		}
	}

	private teardownMapDrag(): void {
		this.dragHandler.detach();
		this.dragHandler.onDrag(() => {});
		this.dragHandler.onDragEnd(() => {});

		if (this.boundDebugClick) {
			const canvas = this.getCanvas();
			canvas?.removeEventListener("click", this.boundDebugClick);
			this.boundDebugClick = null;
		}
	}

	/* ───────── Rendering dispatch ───────── */

	private renderFrame(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const ctx = this.canvasManager.getContext("bg");
		if (!ctx) return;

		switch (this.frame) {
			case PrologueFrame.COVER:
				this.renderCover(ctx);
				break;
			case PrologueFrame.MAP:
				this.renderMap(ctx);
				break;
			case PrologueFrame.FINGERPRINT:
				this.renderFingerprint(ctx);
				break;
			case PrologueFrame.COPPER_FLOOD:
			case PrologueFrame.COMPLETE:
				this.renderCopperFlood(ctx);
				break;
			case PrologueFrame.COLOPHON:
				this.renderColophon(ctx);
				break;
		}
	}

	/* ───────── Frame 0: Cover ───────── */

	private renderCover(ctx: CanvasRenderingContext2D): void {
		const coverImg = this.getImg(ASSETS.prologue.cover);

		// Slow zoom: 100% → 110% over time (even slower for longer feel)
		this.coverZoom = Math.min(1.1, 1 + this.frameTimer / 12000);

		ctx.save();
		ctx.translate(CX, CY);
		ctx.scale(this.coverZoom, this.coverZoom);
		ctx.translate(-CX, -CY);

		if (coverImg) {
			// Full-screen cover image
			ctx.drawImage(coverImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		} else {
			// ── Fallback: procedural cover ──
			drawPaperBackground(ctx, "#8B6914", 0.55);

			const vignette = ctx.createRadialGradient(
				CX,
				CY,
				CX * 0.3,
				CX,
				CY,
				CX * 1.2,
			);
			vignette.addColorStop(0, "rgba(139,105,20,0)");
			vignette.addColorStop(1, "rgba(0,0,0,0.3)");
			ctx.fillStyle = vignette;
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

			ctx.strokeStyle = "rgba(200,166,90,0.25)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(CX, CY - 30, 200, 120, 0, 0, Math.PI * 2);
			ctx.stroke();

			ctx.strokeStyle = "rgba(200,166,90,0.12)";
			ctx.lineWidth = 1;
			ctx.strokeRect(CX - 80, CY - 70, 160, 100);

			ctx.font = 'bold 64px "PingFang SC", "Noto Sans SC", serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = "rgba(32,28,24,0.55)";
			ctx.fillText("铜声·识洛", CX + 2, CY - 38);
			ctx.fillStyle = "#E8D068";
			ctx.fillText("铜声·识洛", CX, CY - 40);

			ctx.fillStyle = "#f6f1e6";
			ctx.font = '24px "PingFang SC", "Noto Sans SC", serif';
			ctx.fillText("洛阳三千年", CX, CY + 40);
		}

		ctx.restore();

		// ── Cover copy text: fade in over 1.5s, placed top-left to avoid seal ──
		this.coverTextAlpha = Math.min(1, this.frameTimer / 1500);
		if (this.coverTextAlpha > 0) {
			ctx.save();
			ctx.globalAlpha = this.coverTextAlpha * 0.9;
			ctx.fillStyle = "#f6f1e6";
			ctx.font = '22px "PingFang SC", "Noto Sans SC", serif';
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillText("集章册·认领者", 60, 60);
			ctx.restore();
		}

		// ── Press hint anchored on the cinnabar seal (bottom-right) ──
		const seal = this.coverImgToScreen(COVER_SEAL_IMG);
		const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 600);
		ctx.fillStyle = `rgba(246,241,230,${0.5 + 0.35 * pulse})`;
		ctx.font = '18px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("按住以翻开", seal.x, seal.y - 55);

		// Pulsing outer ring around the seal
		const outerR = 38 + 6 * pulse;
		ctx.strokeStyle = `rgba(198,166,90,${0.25 + 0.25 * pulse})`;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(seal.x, seal.y, outerR, 0, Math.PI * 2);
		ctx.stroke();

		if (this.isPressing || this.holdDuration > 0) {
			const progress = Math.min(1, this.holdDuration / this.HOLD_REQUIRED);
			const radius = 34;
			const startAngle = -Math.PI / 2;
			const endAngle = startAngle + progress * Math.PI * 2;

			ctx.strokeStyle = "#C8A65A";
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(seal.x, seal.y, radius, startAngle, endAngle);
			ctx.stroke();

			ctx.fillStyle = "#C8A65A";
			ctx.font = "14px sans-serif";
			ctx.fillText(`${Math.round(progress * 100)}%`, seal.x, seal.y);
		}
	}

	/* ───────── Frame 1: Map ───────── */

	private renderMap(ctx: CanvasRenderingContext2D): void {
		const mapImg = this.getImg(ASSETS.prologue.map);

		if (mapImg) {
			// luoyang-map is 2400×1600 — center and draw fullscreen
			const bw = mapImg.width;
			const bh = mapImg.height;
			const bx = (CANVAS_WIDTH - bw) / 2;
			const by = (CANVAS_HEIGHT - bh) / 2;
			ctx.drawImage(mapImg, bx, by);
		} else {
			// ── Fallback: procedural map ──
			drawPaperBackground(ctx, "#A0782C", 0.45);

			const river = this.getRiverPath();
			ctx.beginPath();
			ctx.moveTo(river[0].x, river[0].y);
			for (let i = 1; i < river.length; i++) {
				ctx.lineTo(river[i].x, river[i].y);
			}
			ctx.strokeStyle = "#B87333";
			ctx.lineWidth = 6;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.stroke();

			const flowT = (performance.now() % 2000) / 2000;
			const flowIdx = Math.floor(flowT * river.length);
			const fp = river[flowIdx % river.length];
			ctx.fillStyle = "rgba(184,115,51,0.6)";
			ctx.beginPath();
			ctx.arc(
				fp.x,
				fp.y,
				8 + 4 * Math.sin(flowT * Math.PI * 4),
				0,
				Math.PI * 2,
			);
			ctx.fill();

			const dotCount = 9;
			const litCount = Math.floor(this.swipeProgress * dotCount);
			for (let i = 0; i < dotCount; i++) {
				const idx = Math.floor((i / dotCount) * river.length);
				const dot = river[idx];
				const isLit = i < litCount;
				ctx.beginPath();
				ctx.arc(dot.x, dot.y, isLit ? 8 : 5, 0, Math.PI * 2);
				ctx.fillStyle = isLit ? "#D4A843" : "rgba(200,166,90,0.3)";
				ctx.fill();
				if (isLit) {
					const glow = ctx.createRadialGradient(
						dot.x,
						dot.y,
						0,
						dot.x,
						dot.y,
						20,
					);
					glow.addColorStop(0, "rgba(212,168,67,0.4)");
					glow.addColorStop(1, "rgba(212,168,67,0)");
					ctx.fillStyle = glow;
					ctx.beginPath();
					ctx.arc(dot.x, dot.y, 20, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}

		// Guide line: animate along Luo River in opposite direction (lower-left → upper-right)
		this.renderMapGuide(ctx);

		// Swipe instruction + progress (always drawn)
		ctx.fillStyle = "#f6f1e6";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("沿洛河逆溯而上", CX, CANVAS_HEIGHT - 40);

		if (this.swipeProgress > 0 && this.swipeProgress < 1) {
			ctx.fillStyle = "#C8A65A";
			ctx.font = "14px sans-serif";
			ctx.fillText(
				`${Math.round(this.swipeProgress * 100)}%`,
				CX,
				CANVAS_HEIGHT - 16,
			);
		}
	}

	private renderMapGuide(ctx: CanvasRenderingContext2D): void {
		const guide = LUO_RIVER_GUIDE_IMG.map((p) => this.mapImgToScreen(p));
		if (guide.length < 2) return;

		// Dashed track
		ctx.save();
		ctx.strokeStyle = DEBUG_ALIGN
			? "rgba(255,0,0,0.8)"
			: "rgba(200,166,90,0.55)";
		ctx.lineWidth = DEBUG_ALIGN ? 4 : 3;
		ctx.setLineDash([14, 10]);
		ctx.beginPath();
		ctx.moveTo(guide[0].x, guide[0].y);
		for (let i = 1; i < guide.length; i++) {
			ctx.lineTo(guide[i].x, guide[i].y);
		}
		ctx.stroke();
		ctx.setLineDash([]);

		// Moving head (opposite to river flow: index 0 → last)
		const duration = 2800;
		const t = (performance.now() % duration) / duration;
		const totalLen = guide.reduce((sum, p, i) => {
			if (i === 0) return 0;
			const dx = p.x - guide[i - 1].x;
			const dy = p.y - guide[i - 1].y;
			return sum + Math.hypot(dx, dy);
		}, 0);

		let traveled = t * totalLen;
		let seg = 0;
		for (let i = 1; i < guide.length; i++) {
			const dx = guide[i].x - guide[i - 1].x;
			const dy = guide[i].y - guide[i - 1].y;
			const len = Math.hypot(dx, dy);
			if (traveled <= len || i === guide.length - 1) {
				seg = i - 1;
				break;
			}
			traveled -= len;
		}

		const p0 = guide[seg];
		const p1 = guide[seg + 1];
		const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
		const ratio = segLen > 0 ? Math.min(1, traveled / segLen) : 0;
		const hx = p0.x + (p1.x - p0.x) * ratio;
		const hy = p0.y + (p1.y - p0.y) * ratio;
		const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

		// Glow around the head
		const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 28);
		glow.addColorStop(0, "rgba(212,168,67,0.7)");
		glow.addColorStop(1, "rgba(212,168,67,0)");
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(hx, hy, 28, 0, Math.PI * 2);
		ctx.fill();

		// Head dot
		ctx.fillStyle = "#D4A843";
		ctx.beginPath();
		ctx.arc(hx, hy, 7, 0, Math.PI * 2);
		ctx.fill();

		// Direction arrow
		ctx.save();
		ctx.translate(hx, hy);
		ctx.rotate(angle);
		ctx.fillStyle = "#f6f1e6";
		ctx.beginPath();
		ctx.moveTo(14, 0);
		ctx.lineTo(2, -5);
		ctx.lineTo(2, 5);
		ctx.closePath();
		ctx.fill();
		ctx.restore();

		// Target marker at Erlitou (end of guide)
		const target = this.mapImgToScreen(ERLITOU_MARKER_IMG);
		const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 400);

		// Crosshair + ring for visibility
		ctx.strokeStyle = `rgba(182,66,50,${0.6 + 0.3 * pulse})`;
		ctx.lineWidth = 3;
		const r = 18 + 6 * pulse;
		ctx.beginPath();
		ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
		ctx.stroke();

		ctx.strokeStyle = "rgba(182,66,50,0.85)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(target.x - r - 8, target.y);
		ctx.lineTo(target.x + r + 8, target.y);
		ctx.moveTo(target.x, target.y - r - 8);
		ctx.lineTo(target.x, target.y + r + 8);
		ctx.stroke();

		// Debug overlay: coordinates + waypoints
		if (DEBUG_ALIGN) {
			ctx.fillStyle = "#ff0000";
			ctx.font = "bold 14px monospace";
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillText(
				`Erlitou img=${ERLITOU_MARKER_IMG.x},${ERLITOU_MARKER_IMG.y} screen=${Math.round(target.x)},${Math.round(target.y)}`,
				target.x + 20,
				target.y - 20,
			);

			for (let i = 0; i < guide.length; i++) {
				const p = guide[i];
				ctx.fillStyle = i === 0 ? "#00ff00" : "#ff00ff";
				ctx.beginPath();
				ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#ff00ff";
				ctx.fillText(String(i), p.x + 8, p.y + 8);
			}
		}

		ctx.restore();
	}

	/** Build an S-curve path (fallback only). */
	private getRiverPath(): { x: number; y: number }[] {
		const pts: { x: number; y: number }[] = [];
		const segments = 40;
		for (let i = 0; i <= segments; i++) {
			const t = i / segments;
			const x = 100 + t * (CANVAS_WIDTH - 200);
			const y = CY - 60 + 80 * Math.sin(t * Math.PI * 2);
			pts.push({ x, y });
		}
		return pts;
	}

	/* ───────── Frame 2: Fingerprint ───────── */

	private renderFingerprint(ctx: CanvasRenderingContext2D): void {
		const mapImg = this.getImg(ASSETS.prologue.map);

		// Draw map background (image or fallback)
		if (mapImg) {
			const bw = mapImg.width;
			const bh = mapImg.height;
			const bx = (CANVAS_WIDTH - bw) / 2;
			const by = (CANVAS_HEIGHT - bh) / 2;
			ctx.drawImage(mapImg, bx, by);
		} else {
			drawPaperBackground(ctx, "#A0782C", 0.55);
			const river = this.getRiverPath();
			ctx.beginPath();
			ctx.moveTo(river[0].x, river[0].y);
			for (let i = 1; i < river.length; i++) ctx.lineTo(river[i].x, river[i].y);
			ctx.strokeStyle = "rgba(184,115,51,0.4)";
			ctx.lineWidth = 4;
			ctx.stroke();
			for (let i = 0; i < 9; i++) {
				const idx = Math.floor((i / 9) * river.length);
				const dot = river[idx];
				ctx.beginPath();
				ctx.arc(dot.x, dot.y, 5, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(200,166,90,0.2)";
				ctx.fill();
			}
		}

		// Canvas-generated fingerprint animation aligned to the Erlitou red dot
		const fpc = mapImg
			? this.mapImgToScreen(ERLITOU_MARKER_IMG)
			: this.getRiverPath()[Math.floor((1 / 9) * this.getRiverPath().length)];
		const alpha = this.fingerAlpha;

		ctx.save();
		ctx.globalAlpha = alpha;

		// Soft glow behind the fingerprint
		const glow = ctx.createRadialGradient(fpc.x, fpc.y, 8, fpc.x, fpc.y, 90);
		glow.addColorStop(0, "rgba(182,66,50,0.28)");
		glow.addColorStop(1, "rgba(182,66,50,0)");
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(fpc.x, fpc.y, 90, 0, Math.PI * 2);
		ctx.fill();

		// Pulsing scale for clarity
		const pulse = 1 + 0.08 * Math.sin(performance.now() / 250);
		ctx.translate(fpc.x, fpc.y);
		ctx.scale(pulse, pulse);
		ctx.translate(-fpc.x, -fpc.y);

		// Concentric fingerprint arcs — more rings, thicker, cinnabar + gold
		const radii = [10, 20, 30, 40, 50, 60, 70, 80];
		for (let i = 0; i < radii.length; i++) {
			const r = radii[i];
			const arcAlpha = 0.9 - i * 0.08;
			ctx.strokeStyle = `rgba(182,66,50,${Math.max(0.35, arcAlpha)})`;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(
				fpc.x - 2,
				fpc.y - 4,
				r,
				0.25 + i * 0.05,
				Math.PI - 0.25 + i * 0.05,
			);
			ctx.stroke();

			ctx.strokeStyle = `rgba(200,166,90,${Math.max(0.25, arcAlpha * 0.7)})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(
				fpc.x + 4,
				fpc.y + 4,
				r,
				Math.PI + 0.25 - i * 0.05,
				-0.25 - i * 0.05,
			);
			ctx.stroke();
		}

		// Center highlight dot
		ctx.fillStyle = "rgba(182,66,50,0.9)";
		ctx.beginPath();
		ctx.arc(fpc.x, fpc.y, 5, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();

		// Label with stronger visibility
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = "#f6f1e6";
		ctx.strokeStyle = "rgba(32,28,24,0.4)";
		ctx.lineWidth = 3;
		ctx.font = 'bold 18px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.strokeText("二里头", fpc.x, fpc.y + 92);
		ctx.fillText("二里头", fpc.x, fpc.y + 92);
		ctx.restore();

		// Footer
		ctx.fillStyle = "rgba(246,241,230,0.7)";
		ctx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("认领者·印记", CX, CANVAS_HEIGHT - 40);
	}

	/* ───────── Frame 3: Copper Flood ───────── */

	private renderCopperFlood(ctx: CanvasRenderingContext2D): void {
		const video = this.copperFloodVideo;
		const useVideo =
			video &&
			this.copperFloodVideoReady &&
			video.readyState >= 2 &&
			!video.paused;

		// ── Video path: draw full-screen seedance video ──
		if (useVideo) {
			ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		} else {
			// ── PNG fallback (original Canvas rendering) ──
			const mapImg = this.getImg(ASSETS.prologue.map);
			const floodImg =
				this.getImg(ASSETS.prologue.copperFlood2) ||
				this.getImg(ASSETS.prologue.copperFlood);
			const cornersImg = this.getImg(ASSETS.prologue.copperFloodCorners);

			if (mapImg) {
				const bw = mapImg.width;
				const bh = mapImg.height;
				const bx = (CANVAS_WIDTH - bw) / 2;
				const by = (CANVAS_HEIGHT - bh) / 2;
				ctx.drawImage(mapImg, bx, by);
			} else {
				drawPaperBackground(ctx, "#A0782C", 0.45);
			}

			if (cornersImg) {
				ctx.save();
				ctx.globalAlpha = Math.min(1, this.copperProgress * 1.5);
				ctx.drawImage(cornersImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
				ctx.restore();
			}

			if (floodImg) {
				ctx.save();
				ctx.globalAlpha = Math.min(1, this.copperProgress * 1.3);
				ctx.drawImage(floodImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
				ctx.restore();
			}

			if (!floodImg && !cornersImg) {
				const p = this.copperProgress;
				const eased = p * p;
				const dist = eased * Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.8;

				ctx.fillStyle = "#B87333";
				for (const [x1, y1, x2, y2, x3, y3, x4, y4] of [
					[0, 0, CANVAS_WIDTH, 0, CANVAS_WIDTH - dist, dist, dist, dist],
					[
						0,
						CANVAS_HEIGHT,
						CANVAS_WIDTH,
						CANVAS_HEIGHT,
						CANVAS_WIDTH - dist,
						CANVAS_HEIGHT - dist,
						dist,
						CANVAS_HEIGHT - dist,
					],
					[0, 0, dist, dist, dist, CANVAS_HEIGHT - dist, 0, CANVAS_HEIGHT],
					[
						CANVAS_WIDTH,
						0,
						CANVAS_WIDTH - dist,
						dist,
						CANVAS_WIDTH - dist,
						CANVAS_HEIGHT - dist,
						CANVAS_WIDTH,
						CANVAS_HEIGHT,
					],
				] as const) {
					ctx.beginPath();
					ctx.moveTo(x1, y1);
					ctx.lineTo(x2, y2);
					ctx.lineTo(x3, y3);
					ctx.lineTo(x4, y4);
					ctx.closePath();
					ctx.fill();
				}
			}

			if (this.copperProgress > 0.2) {
				const shimmer = 0.08 * Math.sin(performance.now() / 300);
				ctx.fillStyle = `rgba(201,166,90,${shimmer})`;
				ctx.fillRect(0, CANVAS_HEIGHT * 0.35, CANVAS_WIDTH, 3);
			}

			if (this.copperProgress > 0.4) {
				ctx.save();
				ctx.globalAlpha = Math.min(1, (this.copperProgress - 0.4) / 0.3);
				ctx.fillStyle = "#C8A65A";
				ctx.font = 'bold 48px "PingFang SC", "Noto Sans SC", serif';
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("铜液吞没", CX, CY);
				ctx.restore();
			}
		}

		// COMPLETE: fade to black (always applies)
		if (this.frame === PrologueFrame.COMPLETE) {
			ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
			ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		}
	}

	/* ───────── Frame 4: Colophon (static image) ───────── */

	private renderColophon(ctx: CanvasRenderingContext2D): void {
		// Black background
		ctx.fillStyle = "#1A1A18";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		const img = this.getImg(ASSETS.prologue.colophonText);

		// Draw image as background layer (if loaded)
		if (img) {
			ctx.save();
			ctx.globalAlpha = this.colophonAlpha;
			ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
			ctx.restore();
		}

		// Click hint at bottom (during hold phase)
		if (this.colophonPhase === "hold") {
			const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 600);
			ctx.fillStyle = `rgba(246,241,230,${0.3 + 0.25 * pulse})`;
			ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "alphabetic";
			ctx.fillText("点击继续", CX, CANVAS_HEIGHT - 60);
		}
	}
}
