/**
 * Phase 3 smoke test — verify all 6 new chapters instantiate and
 * complete their lifecycle without errors.
 *
 * Uses a minimal mock CanvasManager to run init/enter/update/exit.
 */

import { describe, it, expect } from "vitest";
import { ChapterDongHanZili } from "../chapters/ChapterDongHan_Zili";
import { ChapterDongHanDiting } from "../chapters/ChapterDongHan_Diting";
import { ChapterDongHanZhicheng } from "../chapters/ChapterDongHan_Zhicheng";
import { ChapterDongHanTuo } from "../chapters/ChapterDongHan_Tuo";
import { ChapterCaoWeiJincheng } from "../chapters/ChapterCaoWei_Jincheng";
import { ChapterCaoWeiShiqi } from "../chapters/ChapterCaoWei_Shiqi";
import { DirectionPuzzle } from "../puzzle/DirectionPuzzle";
import { PuzzleState } from "../utils/constants";

/* ───────── Minimal mock ───────── */
function mockCanvasManager(): any {
	const layers: Record<string, any> = {};
	return {
		layers,
		getLayer(name: string) {
			if (!layers[name]) {
				const canvas = {
					width: 1920,
					height: 1080,
					style: {},
					addEventListener: () => {},
					removeEventListener: () => {},
					getBoundingClientRect: () => ({
						left: 0,
						top: 0,
						width: 1920,
						height: 1080,
						right: 1920,
						bottom: 1080,
						x: 0,
						y: 0,
					}),
					setPointerCapture: () => {},
					releasePointerCapture: () => {},
				};
				const ctx = {
					clearRect: () => {},
					fillRect: () => {},
					strokeRect: () => {},
					fillText: () => {},
					strokeText: () => {},
					drawImage: () => {},
					fill: () => {},
					stroke: () => {},
					save: () => {},
					restore: () => {},
					translate: () => {},
					rotate: () => {},
					scale: () => {},
					beginPath: () => {},
					closePath: () => {},
					moveTo: () => {},
					lineTo: () => {},
					arc: () => {},
					ellipse: () => {},
					quadraticCurveTo: () => {},
					bezierCurveTo: () => {},
					createLinearGradient: () => ({ addColorStop: () => {} }),
					createRadialGradient: () => ({ addColorStop: () => {} }),
					setLineDash: () => {},
					clip: () => {},
					globalAlpha: 1,
					fillStyle: "",
					strokeStyle: "",
					lineWidth: 1,
					lineCap: "butt" as CanvasLineCap,
					textAlign: "start" as CanvasTextAlign,
					textBaseline: "alphabetic" as CanvasTextBaseline,
					font: "",
					shadowColor: "",
					shadowBlur: 0,
					shadowOffsetX: 0,
					shadowOffsetY: 0,
					canvas,
				} as any;
				layers[name] = { canvas, ctx };
			}
			return layers[name];
		},
		getContext(name: string) {
			return this.getLayer(name)?.ctx ?? null;
		},
		clearLayer(_name: string) {},
		clearAll() {},
	};
}

function mockDragHandler(): any {
	return {
		attach: () => {},
		detach: () => {},
		setMode: () => {},
		registerElement: () => {},
		onDrag: () => {},
		onDragEnd: () => {},
	};
}

function mockStampEffect(): any {
	return { showStamp: () => {} };
}

describe("Phase 3 — Chapter smoke tests", () => {
	/* ───────── DirectionPuzzle unit tests ───────── */
	describe("DirectionPuzzle", () => {
		it("starts IDLE with correct config", () => {
			const p = new DirectionPuzzle({
				id: "test",
				chapterId: "test",
				optionCount: 8,
				correctIndex: 3,
				clueLevels: 3,
			});
			expect(p.state).toBe(PuzzleState.IDLE);
			expect(p.optionCount).toBe(8);
			expect(p.correctIndex).toBe(3);
			expect(p.clueLevel).toBe(0);
			expect(p.wrongAttempts).toBe(0);
		});

		it("solves when correct index is selected", () => {
			const p = new DirectionPuzzle({
				id: "test",
				chapterId: "test",
				optionCount: 8,
				correctIndex: 3,
			});
			const result = p.select(3);
			expect(result).toBe(PuzzleState.SOLVED);
			expect(p.solved).toBe(true);
		});

		it("stays unsolved on wrong selection", () => {
			const p = new DirectionPuzzle({
				id: "test",
				chapterId: "test",
				optionCount: 8,
				correctIndex: 3,
			});
			const result = p.select(0);
			expect(result).toBe(PuzzleState.NEAR); // tremor feedback
			expect(p.solved).toBe(false);
			expect(p.wrongAttempts).toBe(1);
		});

		it("advances clue levels correctly", () => {
			const p = new DirectionPuzzle({
				id: "test",
				chapterId: "test",
				optionCount: 8,
				correctIndex: 3,
				clueLevels: 3,
			});
			expect(p.clueLevel).toBe(0);
			p.advanceClue();
			expect(p.clueLevel).toBe(1);
			p.advanceClue();
			expect(p.clueLevel).toBe(2);
			p.advanceClue();
			expect(p.clueLevel).toBe(3);
			expect(p.state).toBe(PuzzleState.NEAR);
		});

		it("reset clears all state", () => {
			const p = new DirectionPuzzle({
				id: "test",
				chapterId: "test",
				optionCount: 8,
				correctIndex: 3,
			});
			p.select(0);
			p.advanceClue();
			p.reset();
			expect(p.state).toBe(PuzzleState.IDLE);
			expect(p.clueLevel).toBe(0);
			expect(p.wrongAttempts).toBe(0);
			expect(p.solved).toBe(false);
		});

		it("ignores selection when already solved", () => {
			const p = new DirectionPuzzle({
				id: "test",
				chapterId: "test",
				optionCount: 8,
				correctIndex: 3,
			});
			p.select(3);
			expect(p.solved).toBe(true);
			const result = p.select(0);
			expect(result).toBe(PuzzleState.SOLVED);
		});
	});

	/* ───────── Chapter instantiation + lifecycle ───────── */
	const chaptersToTest = [
		{
			name: "DongHanZili",
			ctor: (cm: any, dh: any, se: any) => new ChapterDongHanZili(cm, dh, se),
			deps: ["cm", "dh", "se"],
		},
		{
			name: "DongHanDiting",
			ctor: (cm: any, _dh: any, se: any) => new ChapterDongHanDiting(cm, se),
			deps: ["cm", "se"],
		},
		{
			name: "DongHanZhicheng",
			ctor: (cm: any, dh: any, se: any) =>
				new ChapterDongHanZhicheng(cm, dh, se),
			deps: ["cm", "dh", "se"],
		},
		{
			name: "DongHanTuo",
			ctor: (cm: any, dh: any, se: any) => new ChapterDongHanTuo(cm, dh, se),
			deps: ["cm", "dh", "se"],
		},
		{
			name: "CaoWeiJincheng",
			ctor: (cm: any, _dh: any, se: any) => new ChapterCaoWeiJincheng(cm, se),
			deps: ["cm", "se"],
		},
		{
			name: "CaoWeiShiqi",
			ctor: (cm: any, _dh: any, se: any) => new ChapterCaoWeiShiqi(cm, se),
			deps: ["cm", "se"],
		},
	];

	for (const { name, ctor } of chaptersToTest) {
		describe(name, () => {
			it("constructs without error", () => {
				const cm = mockCanvasManager();
				const dh = mockDragHandler();
				const se = mockStampEffect();
				expect(() => ctor(cm, dh, se)).not.toThrow();
			});

			it("init runs without error", () => {
				const cm = mockCanvasManager();
				const dh = mockDragHandler();
				const se = mockStampEffect();
				const ch = ctor(cm, dh, se);
				expect(() => ch.init()).not.toThrow();
			});

			it("enter runs without error", () => {
				const cm = mockCanvasManager();
				const dh = mockDragHandler();
				const se = mockStampEffect();
				const ch = ctor(cm, dh, se);
				ch.init();
				expect(() => ch.enter()).not.toThrow();
				expect(ch.entered).toBe(true);
			});

			it("update runs without crash (100 frames)", () => {
				const cm = mockCanvasManager();
				const dh = mockDragHandler();
				const se = mockStampEffect();
				const ch = ctor(cm, dh, se);
				ch.init();
				ch.enter();
				for (let i = 0; i < 100; i++) {
					expect(() => ch.update(16.67)).not.toThrow();
				}
			});

			it("exit runs without error", () => {
				const cm = mockCanvasManager();
				const dh = mockDragHandler();
				const se = mockStampEffect();
				const ch = ctor(cm, dh, se);
				ch.init();
				ch.enter();
				expect(() => ch.exit()).not.toThrow();
				expect(ch.entered).toBe(false);
			});
		});
	}
});
