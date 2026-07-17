/**
 * 铜声·识洛 — Game bootstrap
 *
 * Phase 2: ChapterManager drives the flow:
 *   tutorial → prologue → erlitou → grey → zhou
 * Chapters are added incrementally as they are implemented.
 *
 * Global singletons (CanvasManager, DragHandler, AudioManager,
 * StampEffect, DefinitionPopup, VideoTrigger) are created here
 * and shared across chapters.
 */

import { CanvasManager } from "./engine/CanvasManager";
import { DragHandler } from "./engine/DragHandler";
import { ChapterTutorial } from "./chapters/ChapterTutorial";
import { ChapterPrologue } from "./chapters/ChapterPrologue";
import { ChapterErlitou } from "./chapters/ChapterErlitou";
import { ChapterGrey } from "./chapters/ChapterGrey";
import { ChapterZhou } from "./chapters/ChapterZhou";
import { ChapterDemoEnd } from "./chapters/ChapterDemoEnd";
import type { ChapterBase } from "./chapters/ChapterBase";
import { initBronzeSounds } from "./audio/BronzeSound";
import { StampEffect } from "./ui/StampEffect";
import { DefinitionPopup } from "./ui/DefinitionPopup";
import { VideoTrigger } from "./assets/VideoTrigger";
import { gameState } from "./state/GameState";
import { eventBus } from "./utils/EventBus";
import { createLogger, setLogLevel } from "./utils/logger";

const log = createLogger("main");

/* ───────── ChapterManager ───────── */

/**
 * Manages an ordered list of chapters.
 * Listens for 'chapter:complete' events to auto-advance.
 * Each chapter goes through: init() → enter() → update() loop → exit()
 */
class ChapterManager {
	private chapters: ChapterBase[];
	private currentIndex = -1;
	private canvasManager: CanvasManager;

	constructor(chapters: ChapterBase[], canvasManager: CanvasManager) {
		this.chapters = chapters;
		this.canvasManager = canvasManager;

		eventBus.on("chapter:complete", () => {
			log.info("Chapter complete event — advancing to next");
			this.nextChapter();
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

	/** Return to the start page — exit current chapter and clear canvases. */
	goToStart(): void {
		if (this.currentIndex >= 0 && this.currentIndex < this.chapters.length) {
			this.chapters[this.currentIndex].exit();
		}
		this.currentIndex = -1;
		this.canvasManager.clearAll();
		log.info("Returned to start page");
	}

	nextChapter(): void {
		this.goToChapter(this.currentIndex + 1);
	}

	private goToChapter(index: number): void {
		// Exit current chapter
		if (this.currentIndex >= 0 && this.currentIndex < this.chapters.length) {
			this.chapters[this.currentIndex].exit();
		}

		if (index >= this.chapters.length) {
			log.info("All chapters complete — end of demo");
			this.currentIndex = -1;
			return;
		}

		this.currentIndex = index;
		this.canvasManager.clearAll();

		const chapter = this.chapters[index];
		// Set GameState chapter before init so registerPuzzle() works
		gameState.enterChapter(chapter.id);
		chapter.init();
		chapter.enter();

		log.info(
			`Switched to chapter: ${chapter.id} (${index + 1}/${this.chapters.length})`,
		);
	}

	update(dt: number): void {
		const ch = this.currentChapter;
		if (ch) {
			ch.update(dt);
		}
	}
}

/* ───────── Initialization ───────── */

function init(): void {
	log.info("铜声·识洛 — Phase 2 starting...");
	setLogLevel("debug");

	// 1. Canvas manager (5 layers)
	const canvasManager = new CanvasManager();
	canvasManager.init("app");

	// 2. Drag handler
	const dragHandler = new DragHandler();

	// 3. Audio
	initBronzeSounds();

	// 4. UI overlays
	const stampEffect = new StampEffect(canvasManager);
	const definitionPopup = new DefinitionPopup(canvasManager);
	const videoTrigger = new VideoTrigger(canvasManager);

	// 5. Chapters (expand incrementally as Steps 3-6 add each chapter)
	const chapters: ChapterBase[] = [
		new ChapterTutorial(canvasManager, dragHandler),
		new ChapterPrologue(canvasManager, dragHandler),
		new ChapterErlitou(canvasManager, dragHandler, stampEffect),
		new ChapterGrey(canvasManager, dragHandler),
		new ChapterZhou(canvasManager, dragHandler, stampEffect),
		new ChapterDemoEnd(canvasManager),
	];

	// 6. Chapter manager
	const chapterManager = new ChapterManager(chapters, canvasManager);

	// 7. Start page — wait for user click
	const startPage = document.getElementById("start-page")!;
	const btnStart = document.getElementById("btn-start")!;

	btnStart.addEventListener("click", () => {
		startPage.classList.add("hidden");
		chapterManager.start();
	});

	// Navigate back to start page (e.g. from DemoEnd)
	eventBus.on("navigate:start", () => {
		chapterManager.goToStart();
		startPage.classList.remove("hidden");
	});

	// 8. Game loop
	let lastTime = performance.now();

	function gameLoop(now: number): void {
		const dt = now - lastTime;
		lastTime = now;

		// Update current chapter (renders BG, Puzzle, VFX layers)
		chapterManager.update(dt);

		// Render UI layer overlays
		stampEffect.render(now);
		definitionPopup.render(now);
		videoTrigger.render(now);

		requestAnimationFrame(gameLoop);
	}

	requestAnimationFrame(gameLoop);

	// 9. Handle resize
	window.addEventListener("resize", () => {
		canvasManager.resize();
	});

	log.info("Phase 2 ready — waiting for chapters");
}

// Boot when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
