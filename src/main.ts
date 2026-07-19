/**
 * 铜声·识洛 — Game bootstrap
 *
 * Phase 3: ChapterManager drives the flow:
 *   tutorial → prologue → erlitou → grey → zhou
 *   → zili → diting → zhicheng → tuo → jincheng → shiqi
 * Chapters are added incrementally as they are implemented.
 *
 * Global singletons (CanvasManager, DragHandler, AudioManager,
 * StampEffect, DefinitionPopup, VideoTrigger) are created here
 * and shared across chapters.
 */

import { CanvasManager } from "./engine/CanvasManager";
import { DragHandler } from "./engine/DragHandler";
import { VFXParticleManager } from "./engine/VFXParticleManager";
import { AssetLoader } from "./assets/AssetLoader";
import { ChapterTutorial } from "./chapters/ChapterTutorial";
import { ChapterPrologue } from "./chapters/ChapterPrologue";
import { ChapterErlitou } from "./chapters/ChapterErlitou";
import { ChapterGrey } from "./chapters/ChapterGrey";
import { ChapterZhou } from "./chapters/ChapterZhou";
import { ChapterDongHanZili } from "./chapters/ChapterDongHan_Zili";
import { ChapterDongHanDiting } from "./chapters/ChapterDongHan_Diting";
import { ChapterDongHanZhicheng } from "./chapters/ChapterDongHan_Zhicheng";
import { ChapterDongHanTuo } from "./chapters/ChapterDongHan_Tuo";
import { ChapterCaoWeiJincheng } from "./chapters/ChapterCaoWei_Jincheng";
import { ChapterCaoWeiShiqi } from "./chapters/ChapterCaoWei_Shiqi";
import { ChapterDemoEnd } from "./chapters/ChapterDemoEnd";
import type { ChapterBase } from "./chapters/ChapterBase";
import { initBronzeSounds } from "./audio/BronzeSound";
import { StampEffect } from "./ui/StampEffect";
import { DefinitionPopup } from "./ui/DefinitionPopup";
import { VideoTrigger } from "./assets/VideoTrigger";
import { HudMenu } from "./ui/HudMenu";
import { gameState } from "./state/GameState";
import { eventBus } from "./utils/EventBus";
import { createLogger, setLogLevel } from "./utils/logger";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./utils/constants";
import { getCachedPaperTexture } from "./ui/InkPaintingUtils";
import { CurtainColophon } from "./ui/CurtainColophon";
import { getChapterCopy } from "./data/chapterCopy";

/* ───────── Chapter ID → Copy ID mapping ───────── */

/** Map a chapter instance id to the matching CHAPTER_COPY entry id. */
function resolveCopyId(chapterId: string): string {
	// Direct match (e.g. "erlitou", "prologue", "grey", "caowei-jincheng")
	if (getChapterCopy(chapterId)) return chapterId;

	// Tutorial → tutorial-l1
	if (chapterId === "tutorial") return "tutorial-l1";

	// Multi-puzzle chapters → first sub-puzzle text
	if (chapterId === "zhou") return "zhou-zhai";

	// "donghan-*" → "han-*"
	if (chapterId.startsWith("donghan-"))
		return chapterId.replace("donghan-", "han-");

	// Fallback
	return "erlitou";
}

const log = createLogger("main");

/* ───────── Transition Constants ───────── */
const FADE_DURATION = 350; // ms — chapter transition fade

/* ───────── ChapterManager ───────── */

/**
 * Manages an ordered list of chapters.
 * Listens for 'chapter:complete' events to auto-advance.
 * Chapters transition via fade-to-black → switch → fade-in.
 */
class ChapterManager {
	private chapters: ChapterBase[];
	private currentIndex = -1;
	private canvasManager: CanvasManager;
	private isTransitioning = false;
	private transitionAlpha = 0; // 0→1 during fade-out
	private transitionPhase: "idle" | "fadeOut" | "fadeIn" = "idle";
	private transitionTimer = 0;
	private paused = false;

	constructor(
		chapters: ChapterBase[],
		canvasManager: CanvasManager,
		private curtainColophon: CurtainColophon,
	) {
		this.chapters = chapters;
		this.canvasManager = canvasManager;

		eventBus.on("chapter:complete", ({ chapterId }: { chapterId: string }) => {
			if (this.isTransitioning) return;

			// Prologue has its own colophon BG image; CurtainColophon runs on top
			if (chapterId === "prologue") {
				log.info("Prologue colophon BG ready — showing curtain text");
			}

			log.info(`Chapter complete: ${chapterId} — showing colophon`);

			const copyId = resolveCopyId(chapterId);
			const copy = getChapterCopy(copyId);
			if (copy) {
				this.curtainColophon.show(copy.text, copy.color, () => {
					log.info("Colophon finished — advancing to next chapter");
					this.nextChapter();
				});
			} else {
				log.warn(`No colophon text for chapter: ${chapterId}`);
				this.nextChapter();
			}
		});
	}

	get currentChapter(): ChapterBase | null {
		if (this.currentIndex >= 0 && this.currentIndex < this.chapters.length) {
			return this.chapters[this.currentIndex];
		}
		return null;
	}

	start(): void {
		this.goToChapter(0);
	}

	/** Pause/resume chapter updates (HUD menu). */
	setPaused(paused: boolean): void {
		this.paused = paused;
	}

	/** Restart the current chapter in place (exit → init → enter). */
	restartChapter(): void {
		const idx = this.currentIndex;
		if (idx < 0 || idx >= this.chapters.length) return;
		this.chapters[idx].exit();
		this.canvasManager.clearAll();
		gameState.enterChapter(this.chapters[idx].id);
		this.chapters[idx].init();
		this.chapters[idx].enter();
		log.info(`Restarted chapter: ${this.chapters[idx].id}`);
	}

	/** Return to the start page — exit current chapter and clear canvases. */
	goToStart(): void {
		if (this.currentIndex >= 0 && this.currentIndex < this.chapters.length) {
			this.chapters[this.currentIndex].exit();
		}
		this.currentIndex = -1;
		this.isTransitioning = false;
		this.transitionPhase = "idle";
		this.canvasManager.clearAll();
		log.info("Returned to start page");
	}

	nextChapter(): void {
		this.goToChapter(this.currentIndex + 1);
	}

	/** Debug: jump directly to chapter by array index */
	skipTo(index: number): void {
		this.goToChapter(index);
	}

	private goToChapter(index: number): void {
		if (index >= this.chapters.length) {
			log.info("All chapters complete — end of demo");
			this.currentIndex = -1;
			this.isTransitioning = false;
			this.transitionPhase = "idle";
			return;
		}

		// Start fade-out transition
		this.isTransitioning = true;
		this.transitionPhase = "fadeOut";
		this.transitionAlpha = 0;
		this.transitionTimer = 0;
		// Defer chapter switch and fade-in until fade-out completes
		this._pendingIndex = index;
	}

	private _pendingIndex = -1;

	private finishSwitch(index: number): void {
		// Exit current chapter
		if (this.currentIndex >= 0 && this.currentIndex < this.chapters.length) {
			this.chapters[this.currentIndex].exit();
		}

		this.currentIndex = index;
		this.canvasManager.clearAll();

		const chapter = this.chapters[index];
		gameState.enterChapter(chapter.id);
		chapter.init();
		chapter.enter();

		log.info(
			`Switched to chapter: ${chapter.id} (${index + 1}/${this.chapters.length})`,
		);

		// Start fade-in
		this.transitionPhase = "fadeIn";
		this.transitionAlpha = 1;
		this.transitionTimer = 0;
	}

	update(dt: number): void {
		if (this.paused) return;
		// Handle transition animation
		if (this.isTransitioning) {
			this.transitionTimer += dt; // dt is in ms (rAF timestamp delta)
			const t = Math.min(this.transitionTimer / FADE_DURATION, 1);

			if (this.transitionPhase === "fadeOut") {
				this.transitionAlpha = t;

				// Render black overlay
				this.renderTransitionOverlay();

				if (t >= 1) {
					this.finishSwitch(this._pendingIndex);
				}
			} else if (this.transitionPhase === "fadeIn") {
				this.transitionAlpha = 1 - t;

				// Render black overlay
				this.renderTransitionOverlay();

				if (t >= 1) {
					this.isTransitioning = false;
					this.transitionPhase = "idle";
				}
			}

			// Still update current chapter during transition
			const ch = this.currentChapter;
			if (ch) {
				ch.update(dt);
			}
			return;
		}

		const ch = this.currentChapter;
		if (ch) {
			ch.update(dt);
		}
	}

	/** Render the page-turn transition overlay on the UI canvas.
	 *  Fades through warm rice paper (album metaphor) instead of black. */
	private renderTransitionOverlay(): void {
		const ctx = this.canvasManager.getContext("ui");
		if (!ctx) return;

		ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		const paper = getCachedPaperTexture();
		ctx.globalAlpha = this.transitionAlpha;
		ctx.drawImage(paper, 0, 0);
		ctx.globalAlpha = 1;
	}
}

/* ───────── Initialization ───────── */

function init(): void {
	log.info("铜声·识洛 — Phase 2 starting...");
	setLogLevel("debug");

	// 1. Canvas manager (5 layers)
	const canvasManager = new CanvasManager();
	canvasManager.init("app");

	// 2. Asset loader
	const assetLoader = new AssetLoader();

	// 3. Drag handler
	const dragHandler = new DragHandler();

	// 3. Audio
	initBronzeSounds();

	// 4. UI overlays
	const stampEffect = new StampEffect(canvasManager);
	const definitionPopup = new DefinitionPopup(canvasManager);
	const videoTrigger = new VideoTrigger(canvasManager);

	// 4.5 Particle effects — VFX layer
	const vfxCanvas = canvasManager.getLayer("vfx")?.canvas;
	if (!vfxCanvas) throw new Error("VFX canvas layer not found");
	const particleManager = new VFXParticleManager(vfxCanvas);

	// 4.6 Curtain colophon — chapter-completion text bead-curtain
	const curtainColophon = new CurtainColophon(canvasManager);

	// 5. Chapters (expand incrementally as Steps 3-6 add each chapter)
	const chapters: ChapterBase[] = [
		new ChapterTutorial(canvasManager, dragHandler, assetLoader),
		new ChapterPrologue(
			canvasManager,
			dragHandler,
			particleManager,
			assetLoader,
		),
		new ChapterErlitou(
			canvasManager,
			dragHandler,
			stampEffect,
			particleManager,
		),
		new ChapterGrey(canvasManager, dragHandler, stampEffect),
		new ChapterZhou(canvasManager, dragHandler, stampEffect, particleManager),
		// ── Phase 3: 东汉 (vermillion + pitch black) ──
		new ChapterDongHanZili(canvasManager, dragHandler, stampEffect),
		new ChapterDongHanDiting(canvasManager, stampEffect),
		new ChapterDongHanZhicheng(canvasManager, dragHandler, stampEffect),
		new ChapterDongHanTuo(canvasManager, dragHandler, stampEffect),
		// ── Phase 3: 曹魏 (ash + ochre) ──
		new ChapterCaoWeiJincheng(canvasManager, stampEffect),
		new ChapterCaoWeiShiqi(canvasManager, stampEffect),
		new ChapterDemoEnd(canvasManager),
	];

	// 6. Chapter manager (colophon drives transition timing)
	const chapterManager = new ChapterManager(
		chapters,
		canvasManager,
		curtainColophon,
	);

	// ── Debug: window.__jumpTo(chapterIndex) for screenshot capture ──
	(window as any).__jumpTo = (index: number) => {
		startPage.classList.add("hidden");
		hud.setInChapter(true);
		chapterManager.skipTo(index);
	};
	(window as any).__chapterList = () => {
		chapters.forEach((c, i) => console.log(`${i}: ${c.id}`));
	};

	// 6.5 HUD menu (stage-js) — pause menu / settings panel
	const appEl = document.getElementById("app");
	if (!appEl) throw new Error("App container #app not found");
	const hud = new HudMenu(appEl, {
		onPauseChange: (paused) => chapterManager.setPaused(paused),
		onRestartChapter: () => chapterManager.restartChapter(),
		onHome: () => {
			chapterManager.setPaused(false);
			eventBus.emit("navigate:start", null);
		},
	});
	window.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			e.preventDefault();
			hud.toggle();
		}
	});
	// Align stage canvas with the game canvas block
	hud.resize(canvasManager.getDisplayRect());

	// 7. Start page — wait for user click
	const startPage = document.getElementById("start-page")!;
	const btnStart = document.getElementById("btn-start")!;

	const btnSettings = document.getElementById("btn-settings")!;
	btnSettings.addEventListener("click", () => {
		hud.setInChapter(false);
		hud.open();
	});

	btnStart.addEventListener("click", () => {
		startPage.classList.add("hidden");
		hud.close();
		hud.setInChapter(true);
		chapterManager.start();
	});

	// Navigate back to start page (e.g. from DemoEnd)
	eventBus.on("navigate:start", () => {
		chapterManager.goToStart();
		startPage.classList.remove("hidden");
		hud.close();
		hud.setInChapter(false);
	});

	// 8. Game loop
	let lastTime = performance.now();

	function gameLoop(now: number): void {
		const dt = now - lastTime;
		lastTime = now;

		// Clear the UI layer once per frame — overlay renderers
		// (stamp / popup / video / tutorial / transition) draw fresh
		// each frame and must never accumulate into opaque blobs.
		canvasManager.clearLayer("ui");

		// Update current chapter (renders BG, Puzzle, VFX layers)
		chapterManager.update(dt);

		// Render UI layer overlays
		stampEffect.render(now);
		definitionPopup.render(now);
		videoTrigger.render(now);
		curtainColophon.render(now);

		requestAnimationFrame(gameLoop);
	}

	requestAnimationFrame(gameLoop);

	// 9. Handle resize
	window.addEventListener("resize", () => {
		canvasManager.resize();
		hud.resize(canvasManager.getDisplayRect());
	});

	// 10. Curtain interaction: mouse pushes chains + click advances
	// CanvasManager sets all canvases to pointer-events:none; only the puzzle
	// canvas is re-enabled by DragHandler. Listen on window so input always
	// reaches the curtain regardless of which layer is event-active.
	function updateCurtainPointer(e: PointerEvent): void {
		const r = canvasManager.getDisplayRect();
		const x = (e.clientX - r.left) * (CANVAS_WIDTH / r.width);
		const y = (e.clientY - r.top) * (CANVAS_HEIGHT / r.height);
		const inside = x >= 0 && x <= CANVAS_WIDTH && y >= 0 && y <= CANVAS_HEIGHT;
		curtainColophon.setMouse(x, y, inside);
	}
	window.addEventListener("pointermove", updateCurtainPointer);
	window.addEventListener("pointerleave", () => {
		curtainColophon.setMouse(-999, -999, false);
	});
	window.addEventListener("pointerup", (e: PointerEvent) => {
		if (curtainColophon.isHolding()) {
			e.preventDefault();
			curtainColophon.advance();
		}
	});
	window.addEventListener("keydown", (e: KeyboardEvent) => {
		if (curtainColophon.isHolding() && e.key !== "Escape") {
			e.preventDefault();
			curtainColophon.advance();
		}
	});

	log.info("Phase 2 ready — waiting for chapters");
}

// Boot when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
