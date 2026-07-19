/**
 * 铜声·识洛 — CurtainColophon (文字珠帘)
 *
 * Canvas-based physics bead-curtain effect for chapter colophon text.
 * Inspired by the "Temple of Heaven" curtain demo: Verlet-integrated chains
 * with Chinese vertical text, natural sway physics, and mouse collision.
 *
 * Lifecycle: IDLE → ASSEMBLING → HOLDING → DISPERSING → IDLE
 * - ASSEMBLING: characters animate from scattered positions to anchor points
 * - HOLDING:   physics simulation runs, player reads, mouse pushes chains
 * - DISPERSING: characters scatter away with wind
 *
 * InkView Design System: paper background, cinnabar/copper text tones.
 */

import type { CanvasManager } from "../engine/CanvasManager";
import { CANVAS_WIDTH, CANVAS_HEIGHT, INK } from "../utils/constants";
import { createLogger } from "../utils/logger";

const log = createLogger("CurtainColophon");

/* ───────── Constants ───────── */

const FONT_SIZE = 18; // px at 1920×1080 logical
const FONT_FAMILY = "'Songti SC', 'Noto Serif SC', SimSun, serif";
const ROW_GAP = 20; // row spacing
const MAX_COLUMNS = 28;
const MIN_COLUMNS = 4;
const TARGET_CHARS_PER_COL = 6;

const CURTAIN_WIDTH_RATIO = 0.88; // span 88% of canvas
const DENSITY_COL_SPACING = 38; // px between fabric columns (+20% from 32)

/** Punctuation marks that must not start a vertical column. */
const BAD_LINE_START_PUNCT = new Set([
	"\u3002", // 。
	"\uFF0C", // ，
	"\u3001", // 、
	"\uFF1B", // ；
	"\uFF1A", // ：
	"\uFF01", // ！
	"\uFF1F", // ？
	"\u2026", // …
	"\u2014", // —
	"\u2015", // ―
	"\u300B", // 》
	"\uFF09", // ）
	"\u3009", // 〉
	"\uFE3E", // ︾
	"\uFE36", // ︶
	"\uFE42", // ﹂
]);

const ASSEMBLE_DURATION = 1400; // ms
const DISPERSE_DURATION = 1000; // ms

/* ───────── Physics ───────── */

const FRICTION = 0.97; // per-frame velocity damping
const GRAVITY = 1.2; // per-frame gravity
const CONSTRAINT_PASSES = 5;
const WOBBLE_IMPULSE = 30; // initial offset px for visible chain wobble
const MOUSE_RADIUS = 80; // collision radius around pointer

/* ───────── Types ───────── */

enum Phase {
	IDLE = "idle",
	ASSEMBLING = "assembling",
	HOLDING = "holding",
	DISPERSING = "dispersing",
}

interface ChainPoint {
	x: number;
	y: number;
	oldX: number;
	oldY: number;
	anchorX: number;
	anchorY: number;
	pinned: boolean;
	restLength: number;
	char: string;
	/** Pre-computed scatter origin for assembly */
	scatterX: number;
	scatterY: number;
	/** Pre-computed wind target for dispersal */
	windX: number;
	windY: number;
}

export interface CurtainLayoutHint {
	/** Center the curtain both vertically and horizontally (blank/narrative pages). */
	blankPage?: boolean;
	/** Avoid the center of the screen; place curtain in the lower third. */
	avoidCenter?: boolean;
}

export interface CurtainOptions {
	onComplete?: () => void;
	hint?: CurtainLayoutHint;
}

/* ───────── Component ───────── */

export class CurtainColophon {
	private canvasManager: CanvasManager;
	private chains: ChainPoint[][] = [];
	private phase: Phase = Phase.IDLE;
	private phaseStart = 0;
	private onCompleteCb: (() => void) | null = null;
	private textColor: string = INK.text;
	private mouseX = -999;
	private mouseY = -999;
	private mouseOn = false;

	constructor(canvasManager: CanvasManager) {
		this.canvasManager = canvasManager;
	}

	/* ═══════════════════════════════════════════
	   Public API
	   ═══════════════════════════════════════════ */

	/**
	 * Show curtain colophon with the given text.
	 * Auto-plays: assemble → hold → disperse → callback.
	 */
	show(
		text: string,
		color: string,
		options?: CurtainOptions | (() => void),
	): void {
		const opts: CurtainOptions =
			typeof options === "function" ? { onComplete: options } : (options ?? {});

		this.textColor = color;
		this.onCompleteCb = opts.onComplete ?? null;

		this.build(text, opts.hint);
		this.startAssemble();
	}

	/**
	 * Per-frame render call (driven by game loop, not internal rAF).
	 * Handles phase advancement, physics, and drawing.
	 */
	render(now: number): void {
		if (this.phase === Phase.IDLE || this.chains.length === 0) return;
		this.loop(now);
	}

	/** Immediately hide and clean up. */
	dismiss(): void {
		this.chains = [];
		this.phase = Phase.IDLE;
	}

	destroy(): void {
		this.dismiss();
	}

	/* ═══════════════════════════════════════════
	   Build chains from text
	   ═══════════════════════════════════════════ */

	private build(source: string, hint?: CurtainLayoutHint): void {
		this.chains = [];

		if (!source || source.length === 0) return;

		// Normalize punctuation and layout-oriented line breaks.
		const text = verticalizePunctuation(normalizeColophonText(source));
		const totalChars = text.length;

		// ── Layout calculation ──
		// Divide text into vertical columns (right-to-left reading order).

		// Text columns: target 8 chars per column.
		const textColsNeeded = Math.ceil(totalChars / TARGET_CHARS_PER_COL);
		const preferredTextColumns = clamp(
			textColsNeeded,
			MIN_COLUMNS,
			MAX_COLUMNS,
		);

		let curtainWidth: number;
		let left: number;
		let densityCols: number;
		let textColumns: number;

		if (hint?.blankPage) {
			// Empty scene: tight, perfectly centered text block.
			textColumns = findColumnCountWithoutLeadingPunctuation(
				text,
				preferredTextColumns,
				MIN_COLUMNS,
				MAX_COLUMNS,
			);
			densityCols = textColumns;
			curtainWidth = Math.max(
				(densityCols - 1) * DENSITY_COL_SPACING,
				CANVAS_WIDTH * 0.35,
			);
			left = (CANVAS_WIDTH - curtainWidth) / 2;
		} else {
			// Normal scene: wide curtain fabric with text centered inside.
			curtainWidth = CANVAS_WIDTH * CURTAIN_WIDTH_RATIO;
			left = (CANVAS_WIDTH - curtainWidth) / 2;

			densityCols = Math.max(
				MIN_COLUMNS,
				Math.floor(curtainWidth / DENSITY_COL_SPACING),
			);

			// Keep text columns inside the fabric and avoid punctuation at
			// the start of any column.
			const maxTextCols = Math.min(densityCols, MAX_COLUMNS);
			const naturalTextColumns = clamp(
				preferredTextColumns,
				MIN_COLUMNS,
				maxTextCols,
			);
			textColumns = findColumnCountWithoutLeadingPunctuation(
				text,
				naturalTextColumns,
				MIN_COLUMNS,
				maxTextCols,
				densityCols,
			);
		}

		const startCol = (densityCols - textColumns) / 2;
		const textRows = Math.ceil(totalChars / textColumns);
		const curtainHeight = textRows * ROW_GAP;

		// Adaptive vertical placement.
		let topY: number;
		if (hint?.blankPage) {
			// Center the curtain block vertically.
			topY = Math.max(30, (CANVAS_HEIGHT - curtainHeight) / 2);
		} else {
			const avoidCenter = hint?.avoidCenter !== false; // default true
			const lowerAnchorY = avoidCenter
				? CANVAS_HEIGHT * 0.7
				: CANVAS_HEIGHT * 0.6;
			const fitTopY = CANVAS_HEIGHT - curtainHeight - 20;
			topY = Math.min(lowerAnchorY, fitTopY);
		}

		// Pre-compute scatter center (for assembly origin) and wind center.
		const scatterCX = CANVAS_WIDTH * 0.5;
		const scatterCY = CANVAS_HEIGHT * 0.55;
		const scatterR = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.45;

		// Wind direction: left-and-down (classic Chinese ink dispersal)
		const windBaseAngle = (Math.PI * 5) / 4; // 225° = bottom-left
		const windDist = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.55;

		for (let col = 0; col < densityCols; col++) {
			const chain: ChainPoint[] = [];

			const x =
				densityCols > 1
					? left + (col * curtainWidth) / (densityCols - 1)
					: CANVAS_WIDTH / 2;

			// This fabric column is a text column if it falls inside the
			// centered text block. Reading order is right-to-left.
			const isTextCol = col >= startCol && col < startCol + textColumns;
			const readingCol = isTextCol ? startCol + textColumns - 1 - col : -1;

			for (let row = 0; row <= textRows; row++) {
				const y = topY + row * ROW_GAP;
				const pinned = row === 0;

				// Determine character at this position
				let char = "";
				if (isTextCol && row > 0) {
					const textRowIdx = row - 1;
					const globalIdx = readingCol * textRows + textRowIdx;
					if (globalIdx < totalChars) {
						char = text[globalIdx];
					}
				}

				// Scatter origin: random position in a circular area
				const scatterAngle = Math.random() * Math.PI * 2;
				const scatterDist = scatterR * (0.5 + Math.random() * 0.5);
				const scatterX = scatterCX + Math.cos(scatterAngle) * scatterDist;
				const scatterY =
					scatterCY + Math.sin(scatterAngle) * scatterDist * 0.65;

				// Wind target for dispersal
				const windAngle = windBaseAngle + (Math.random() - 0.5) * 1.0;
				const windD = windDist * (0.6 + Math.random() * 0.7);
				const windX = x + Math.cos(windAngle) * windD;
				const windY = y + Math.sin(windAngle) * windD;

				const segLen = row === 0 ? 0 : ROW_GAP;

				chain.push({
					x: scatterX,
					y: scatterY,
					oldX: scatterX,
					oldY: scatterY,
					anchorX: x,
					anchorY: y,
					pinned,
					restLength: segLen,
					char,
					scatterX,
					scatterY,
					windX,
					windY,
				});
			}

			this.chains.push(chain);
		}

		log.info(
			`Built curtain: ${totalChars} chars → ${densityCols} fabric cols (${textColumns} text) × ${textRows} rows`,
		);
	}

	/* ═══════════════════════════════════════════
	   Phase transitions
	   ═══════════════════════════════════════════ */

	private startAssemble(): void {
		this.phase = Phase.ASSEMBLING;
		this.phaseStart = performance.now();
	}

	private advanceToHold(): void {
		this.phase = Phase.HOLDING;
		this.phaseStart = performance.now();

		// Initial random wobble so physics is visible immediately.
		for (const chain of this.chains) {
			for (const pt of chain) {
				if (pt.pinned) continue;
				pt.x += (Math.random() - 0.5) * WOBBLE_IMPULSE * 2;
				pt.y += (Math.random() - 0.5) * WOBBLE_IMPULSE;
				pt.oldX = pt.x - (pt.x - pt.oldX) * 0.5;
			}
		}
	}

	/** Check if the curtain is currently holding (waiting for player click). */
	isHolding(): boolean {
		return this.phase === Phase.HOLDING;
	}

	/** Player click — advance from HOLDING to DISPERSING. */
	advance(): void {
		if (this.phase === Phase.HOLDING) {
			this.startDisperse();
		}
	}

	/** Called from main.ts pointermove — updates cursor for chain collision. */
	setMouse(x: number, y: number, on: boolean): void {
		this.mouseX = x;
		this.mouseY = y;
		this.mouseOn = on;
	}

	private startDisperse(): void {
		this.phase = Phase.DISPERSING;
		this.phaseStart = performance.now();
	}

	private finish(): void {
		this.chains = [];
		this.phase = Phase.IDLE;
		const cb = this.onCompleteCb;
		this.onCompleteCb = null;
		cb?.();
	}

	/* ═══════════════════════════════════════════
	   Animation (driven by game loop render call)
	   ═══════════════════════════════════════════ */

	private loop(now: number): void {
		if (this.phase === Phase.IDLE || this.chains.length === 0) return;

		const elapsed = now - this.phaseStart;

		switch (this.phase) {
			case Phase.ASSEMBLING: {
				const t = Math.min(elapsed / ASSEMBLE_DURATION, 1);
				// Ease-out expo for snappy arrival
				const ease = t >= 1 ? 1 : 1 - 2 ** (-10 * t);

				// Interpolate each point from scatter to anchor
				for (const chain of this.chains) {
					for (const pt of chain) {
						pt.x = pt.scatterX + (pt.anchorX - pt.scatterX) * ease;
						pt.y = pt.scatterY + (pt.anchorY - pt.scatterY) * ease;
						pt.oldX = pt.x;
						pt.oldY = pt.y;
					}
				}

				this.draw();
				if (t >= 1) this.advanceToHold();
				return;
			}

			case Phase.HOLDING: {
				this.applyMouseForce();
				this.integrate();
				this.constrain();
				this.draw();
				return;
			}

			case Phase.DISPERSING: {
				const t = Math.min(elapsed / DISPERSE_DURATION, 1);
				// Ease-in quad for accelerating dispersal
				const ease = t * t;

				// Run physics while pulling toward wind targets
				for (const chain of this.chains) {
					for (const pt of chain) {
						if (pt.pinned) {
							// Pinned stays but with slight fade-drift
							pt.x = pt.anchorX + (pt.windX - pt.anchorX) * ease * 0.3;
							pt.y = pt.anchorY + (pt.windY - pt.anchorY) * ease * 0.3;
						} else {
							// Pull toward wind target with Verlet integration
							pt.oldX = pt.x;
							pt.oldY = pt.y;
							pt.x +=
								(pt.anchorX + (pt.windX - pt.anchorX) * ease - pt.x) * 0.12;
							pt.y +=
								(pt.anchorY + (pt.windY - pt.anchorY) * ease - pt.y) * 0.12 +
								GRAVITY * 1.5;
						}
					}
				}

				this.constrain();
				this.draw();

				if (t >= 1) {
					// Extra fade-out frames
					setTimeout(() => this.finish(), 400);
					this.phase = Phase.IDLE; // prevent re-trigger
				}
				return;
			}

			default:
				return;
		}
	}

	/* ═══════════════════════════════════════════
	   Verlet physics
	   ═══════════════════════════════════════════ */

	/** Verlet integration: velocity from position delta, add gravity. */
	private integrate(): void {
		for (const chain of this.chains) {
			for (const pt of chain) {
				if (pt.pinned) continue;
				const vx = (pt.x - pt.oldX) * FRICTION;
				const vy = (pt.y - pt.oldY) * FRICTION;
				pt.oldX = pt.x;
				pt.oldY = pt.y;
				pt.x += vx;
				pt.y += vy + GRAVITY;
			}
		}
	}

	/** Distance constraints: keep chain links at rest length. */
	private constrain(): void {
		for (let pass = 0; pass < CONSTRAINT_PASSES; pass++) {
			for (const chain of this.chains) {
				// Pin top anchor
				const anchor = chain[0];
				anchor.x = anchor.anchorX;
				anchor.y = anchor.anchorY;

				for (let i = 1; i < chain.length; i++) {
					const a = chain[i - 1];
					const b = chain[i];
					const dx = b.x - a.x;
					const dy = b.y - a.y;
					const dist = Math.max(0.0001, Math.hypot(dx, dy));
					const diff = (dist - b.restLength) / dist;

					if (a.pinned) {
						b.x -= dx * diff;
						b.y -= dy * diff;
					} else {
						const cx = dx * diff * 0.5;
						const cy = dy * diff * 0.5;
						a.x += cx;
						a.y += cy;
						b.x -= cx;
						b.y -= cy;
					}
				}
			}
		}
	}

	/** Push chain points near the pointer — simulates walking through the curtain. */
	private applyMouseForce(): void {
		if (!this.mouseOn) return;
		const mx = this.mouseX;
		const my = this.mouseY;
		if (mx < -99) return;
		for (const chain of this.chains) {
			for (let i = 1; i < chain.length; i++) {
				const pt = chain[i];
				const dx = pt.x - mx;
				const dy = pt.y - my;
				const dist = Math.hypot(dx, dy);
				if (dist < MOUSE_RADIUS && dist > 0.1) {
					const force = (1 - dist / MOUSE_RADIUS) * 12;
					pt.x += (dx / dist) * force;
					pt.y += (dy / dist) * force;
				}
			}
		}
	}

	/* ═══════════════════════════════════════════
	   Rendering
	   ═══════════════════════════════════════════ */

	private draw(): void {
		const ctx = this.canvasManager.getContext("ui");
		if (!ctx || this.chains.length === 0) return;

		const cols = this.chains.length;
		if (cols === 0) return;

		ctx.save();

		// ── Characters only (no beads, no threads, no backdrop) ──
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `500 ${FONT_SIZE}px ${FONT_FAMILY}`;
		ctx.fillStyle = this.textColor;

		// Soft contrasting glow so text never blends into the scene.
		ctx.shadowColor = chooseTextShadow(this.textColor);
		ctx.shadowBlur = 6;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;

		for (let c = 0; c < cols; c++) {
			const chain = this.chains[c];
			for (let i = 1; i < chain.length; i++) {
				const pt = chain[i];
				if (!pt.char) continue;
				ctx.fillText(pt.char, pt.x, pt.y + 0.5);
			}
		}

		ctx.restore();
	}
}

/* ───────── Utility ───────── */

function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
}

/**
 * Normalize chapter copy:
 * - Annotations start on a new line without a leading dash.
 * - Body em-dashes become a line break; the preceding sentence ends with a period.
 */
function normalizeColophonText(text: string): string {
	return text
		.replace(/\n——/g, "\n") // citation line: remove leading dash
		.replace(/([，。、；：！？])?——/g, "。\n"); // body dash → period + newline
}

/** Find a column count where no column begins with punctuation. */
function findColumnCountWithoutLeadingPunctuation(
	text: string,
	preferredColumns: number,
	minColumns: number,
	maxColumns: number,
	parityTarget?: number,
): number {
	const candidates: number[] = [];
	for (
		let delta = 0;
		delta <=
		Math.max(maxColumns - preferredColumns, preferredColumns - minColumns);
		delta++
	) {
		if (delta === 0) {
			candidates.push(preferredColumns);
		} else {
			if (preferredColumns + delta <= maxColumns)
				candidates.push(preferredColumns + delta);
			if (preferredColumns - delta >= minColumns)
				candidates.push(preferredColumns - delta);
		}
	}

	for (const cols of candidates) {
		if (parityTarget !== undefined && cols % 2 !== parityTarget % 2) continue;
		const rows = Math.ceil(text.length / cols);
		let ok = true;
		for (let c = 1; c < cols; c++) {
			const idx = c * rows;
			const char = firstVisibleChar(text, idx);
			if (char && BAD_LINE_START_PUNCT.has(char)) {
				ok = false;
				break;
			}
		}
		if (ok) return cols;
	}
	return preferredColumns;
}

/** Return the first non-newline character at or after idx, or null. */
function firstVisibleChar(text: string, idx: number): string | null {
	while (idx < text.length && text[idx] === "\n") idx++;
	return idx < text.length ? text[idx] : null;
}

/** Convert horizontal punctuation to vertical presentation forms. */
function verticalizePunctuation(text: string): string {
	return text
		.replace(/《/g, "\uFE3D") // vertical left double angle bracket
		.replace(/》/g, "\uFE3E") // vertical right double angle bracket
		.replace(/〈/g, "\uFE3F") // vertical left angle bracket
		.replace(/〉/g, "\uFE40") // vertical right angle bracket
		.replace(/（/g, "\uFE35") // vertical left parenthesis
		.replace(/）/g, "\uFE36") // vertical right parenthesis
		.replace(/……/g, "\uFE19"); // vertical ellipsis
}

/** Choose a shadow color that contrasts with the text color. */
function chooseTextShadow(color: string): string {
	try {
		const lum = luminance(color);
		return lum > 0.5
			? "rgba(32,28,24,0.35)" // dark text → dark shadow for depth
			: "rgba(246,241,230,0.7)"; // light text → light halo
	} catch {
		return "rgba(246,241,230,0.7)";
	}
}

function luminance(hex: string): number {
	const clean = hex.replace("#", "");
	if (clean.length !== 3 && clean.length !== 6) return 0;

	const expand =
		clean.length === 3
			? clean
					.split("")
					.map((c) => c + c)
					.join("")
			: clean;

	const r = Number.parseInt(expand.slice(0, 2), 16);
	const g = Number.parseInt(expand.slice(2, 4), 16);
	const b = Number.parseInt(expand.slice(4, 6), 16);

	return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
