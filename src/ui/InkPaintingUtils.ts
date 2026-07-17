/**
 * 铜声·识洛 — InkPainting Utilities
 *
 * Ported from InkPainting (github.com/TanShilongMario/InkPainting, MIT)
 * Adapted for game use: seal stamps, paper textures, vertical text.
 *
 * Key differences from source:
 * - Coordinate system: 1920×1080 (game) vs 1000×1390 (painting app)
 * - Pre-rendered to offscreen canvases for performance
 * - No fluid simulation (too expensive for game loop)
 * - Deterministic seeded RNG for consistent textures
 */

import { INK } from "../utils/constants";

/* ───────── Utility Functions ───────── */

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => {
	if (v < a) return a;
	if (v > b) return b;
	return v;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Approximate gaussian, range -1..1, center-dense */
const gauss = () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
const rand = (a = 1, b?: number): number =>
	b === undefined ? Math.random() * a : a + Math.random() * (b - a);

/* ───────── Seeded RNG (FNV-1a + LCG) ───────── */

function hashSeed(id: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0 || 1;
}

export interface SeededRng {
	next: () => number;
	range: (a: number, b: number) => number;
	chance: (p: number) => boolean;
}

export function makeSeededRng(id: string, salt = 0): SeededRng {
	let s = (hashSeed(id) + salt) >>> 0;
	const next = () => {
		s = (Math.imul(1664525, s) + 1013904223) >>> 0;
		return s / 4294967296;
	};
	return {
		next,
		range: (a: number, b: number) => a + next() * (b - a),
		chance: (p: number) => next() < p,
	};
}

/* ───────── Color Helpers ───────── */

function parseHex(hex: string): { r: number; g: number; b: number } {
	const n = parseInt(hex.slice(1), 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function tintShade(
	tint: string,
	dr: number,
	dg: number,
	db: number,
	a: number,
): string {
	const t = parseHex(tint);
	return `rgba(${clamp(t.r + dr, 0, 255)},${clamp(t.g + dg, 0, 255)},${clamp(t.b + db, 0, 255)},${a})`;
}

/* ═══════════════════════════════════════════════
   §1  SEAL / STAMP RENDERING (朱砂印章)
   ═══════════════════════════════════════════════ */

export type SealCarve = "yin" | "yang"; // 阴刻 (white text) | 阳刻 (red text)

export interface SealConfig {
	/** 1–4 characters for the seal */
	text: string;
	/** Carving style: 'yin' (阴刻, white chars on red) or 'yang' (阳刻, red chars) */
	carve?: SealCarve;
	/** Pixel size of the seal canvas */
	size?: number;
	/** Cinnabar color — defaults to InkView cinnabar */
	color?: string;
	/** Font family — defaults to serif suitable for seal script */
	fontFamily?: string;
}

/**
 * Layout positions for 1–4 seal characters.
 * Traditional Chinese seal layout: right-to-left, top-to-bottom.
 */
function sealLayout(
	chars: string[],
	s: number,
	cx: number,
	cy: number,
): { fs: number; pos: [number, number][] } {
	let fs: number;
	let pos: [number, number][];

	if (chars.length === 1) {
		fs = s * 0.62;
		pos = [[cx, cy + 1]];
	} else if (chars.length === 2) {
		fs = s * 0.42;
		pos = [
			[cx, cy - s * 0.21],
			[cx, cy + s * 0.25],
		];
	} else if (chars.length === 3) {
		fs = s * 0.36;
		pos = [
			[cx + s * 0.22, cy - s * 0.21],
			[cx + s * 0.22, cy + s * 0.25],
			[cx - s * 0.22, cy],
		];
	} else {
		fs = s * 0.36;
		pos = [
			[cx + s * 0.22, cy - s * 0.21],
			[cx + s * 0.22, cy + s * 0.25],
			[cx - s * 0.22, cy - s * 0.21],
			[cx - s * 0.22, cy + s * 0.25],
		];
	}

	return { fs, pos };
}

// buildSealContour is inlined in renderSeal for clarity

/** Edge breaks and chips — subtle weathering */
function applySealEdgeBreaks(
	ctx: CanvasRenderingContext2D,
	pts: { x: number; y: number }[],
): void {
	const n = pts.length;
	ctx.save();
	ctx.globalCompositeOperation = "destination-out";
	ctx.fillStyle = "#000";
	ctx.lineCap = "butt";

	for (let i = 0; i < n; i++) {
		const p = pts[i];
		const q = pts[(i + 1) % n];
		const a = Math.atan2(q.y - p.y, q.x - p.x);

		if (Math.random() < 0.18) {
			ctx.globalAlpha = rand(0.5, 0.85);
			ctx.lineWidth = rand(0.7, 1.8);
			ctx.beginPath();
			ctx.moveTo(p.x + gauss() * 0.8, p.y + gauss() * 0.8);
			ctx.lineTo(
				p.x + Math.cos(a + gauss() * 0.3) * rand(1.5, 4),
				p.y + Math.sin(a + gauss() * 0.3) * rand(1.5, 4),
			);
			ctx.stroke();
		}

		if (Math.random() < 0.1) {
			ctx.globalAlpha = rand(0.45, 0.8);
			ctx.beginPath();
			ctx.arc(p.x + gauss() * 1.2, p.y + gauss() * 1.2, rand(0.5, 1.5), 0, TAU);
			ctx.fill();
		}
	}

	// A couple slightly larger chips
	for (let i = 0; i < 2; i++) {
		const p = pts[(Math.random() * n) | 0];
		ctx.globalAlpha = rand(0.5, 0.8);
		ctx.beginPath();
		ctx.arc(p.x, p.y, rand(1, 2.4), 0, TAU);
		ctx.fill();
	}

	ctx.globalAlpha = 1;
	ctx.restore();
}

/** Wear texture — tiny particles for aged look */
function applySealWear(
	ctx: CanvasRenderingContext2D,
	pts: { x: number; y: number }[],
	carve: SealCarve,
	color: string,
): void {
	const n = pts.length;
	ctx.fillStyle = color;
	const count = carve === "yin" ? 34 : 22;

	for (let i = 0; i < count; i++) {
		const p = pts[(Math.random() * n) | 0];
		const px = p.x + gauss() * 2;
		const py = p.y + gauss() * 2;
		ctx.globalAlpha = carve === "yin" ? rand(0.3, 0.65) : rand(0.1, 0.32);
		ctx.beginPath();
		ctx.arc(px, py, rand(0.3, 1.3), 0, TAU);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

/**
 * Render a seal stamp to an offscreen canvas.
 * Returns the canvas for later drawImage() composition.
 *
 * Usage:
 * ```ts
 * const sealCanvas = renderSeal({ text: '铸', carve: 'yin', size: 120 });
 * ctx.save();
 * ctx.globalCompositeOperation = 'multiply';
 * ctx.globalAlpha = 0.8;
 * ctx.drawImage(sealCanvas, x - 60, y - 60);
 * ctx.restore();
 * ```
 */
export function renderSeal(config: SealConfig): HTMLCanvasElement {
	const carve = config.carve ?? "yin";
	const px = config.size ?? 120;
	const color = config.color ?? INK.cinnabar;
	const fontFamily =
		config.fontFamily ??
		"'Ma Shan Zheng','Kaiti SC','STKaiti','KaiTi','Noto Serif TC',serif";

	const canvas = document.createElement("canvas");
	canvas.width = px;
	canvas.height = px;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get 2D context for seal canvas");

	const s = px * 0.383; // seal inner area
	const cx = px / 2;
	const cy = px / 2;

	const chars = config.text.slice(0, 4).split("");
	const { fs, pos } = sealLayout(chars, s, cx, cy);

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = `${fs}px ${fontFamily}`;

	const contour = (() => {
		const h = s / 2;
		const corners = [
			{ x: -h, y: -h },
			{ x: h, y: -h },
			{ x: h, y: h },
			{ x: -h, y: h },
		];
		const pts: { x: number; y: number }[] = [];
		for (let i = 0; i < 4; i++) {
			const c0 = corners[i];
			const c1 = corners[(i + 1) % 4];
			pts.push({ x: cx + c0.x + gauss() * 1.2, y: cy + c0.y + gauss() * 1.2 });
			for (let k = 1; k <= 2; k++) {
				const t = k / 3;
				pts.push({
					x: cx + lerp(c0.x, c1.x, t) + gauss() * 0.9,
					y: cy + lerp(c0.y, c1.y, t) + gauss() * 0.8,
				});
			}
		}
		return pts;
	})();

	const drawContourPath = () => {
		ctx.beginPath();
		ctx.moveTo(contour[0].x, contour[0].y);
		for (let i = 1; i < contour.length; i++) {
			ctx.lineTo(contour[i].x, contour[i].y);
		}
		ctx.closePath();
	};

	if (carve === "yin") {
		// 阴刻: red background, white (cut-out) text
		ctx.fillStyle = `${color}f0`; // slightly transparent
		drawContourPath();
		ctx.fill();

		// Cut out text
		ctx.globalCompositeOperation = "destination-out";
		for (let i = 0; i < chars.length; i++) {
			if (pos[i]) ctx.fillText(chars[i], pos[i][0], pos[i][1]);
		}

		applySealEdgeBreaks(ctx, contour);
		applySealWear(ctx, contour, "yin", color);
		ctx.globalCompositeOperation = "source-over";
	} else {
		// 阳刻: red text, thin red border
		ctx.fillStyle = `${color}e0`;
		for (let i = 0; i < chars.length; i++) {
			if (pos[i]) ctx.fillText(chars[i], pos[i][0], pos[i][1]);
		}

		ctx.strokeStyle = `${color}7a`;
		ctx.lineWidth = rand(1.3, 2.1);
		drawContourPath();
		ctx.stroke();

		ctx.globalCompositeOperation = "destination-out";
		applySealEdgeBreaks(ctx, contour);
		applySealWear(ctx, contour, "yang", color);
		ctx.globalCompositeOperation = "source-over";
	}

	return canvas;
}

/**
 * Draw a seal impression onto a target context.
 * Uses multiply blending for authentic cinnabar-on-paper look.
 *
 * @param targetCtx — destination canvas context
 * @param sealCanvas — pre-rendered seal from renderSeal()
 * @param x — center x position
 * @param y — center y position
 * @param alpha — impression opacity (0.72–0.86 for authentic look)
 * @param rotation — slight rotation in radians (±0.04 for natural feel)
 */
export function drawSealImpression(
	targetCtx: CanvasRenderingContext2D,
	sealCanvas: HTMLCanvasElement,
	x: number,
	y: number,
	alpha = 0.8,
	rotation = 0,
): void {
	const half = sealCanvas.width / 2;
	targetCtx.save();
	targetCtx.globalCompositeOperation = "multiply";
	targetCtx.globalAlpha = alpha;
	targetCtx.translate(x, y);
	targetCtx.rotate(rotation);
	targetCtx.drawImage(sealCanvas, -half, -half);
	targetCtx.restore();
}

/* ═══════════════════════════════════════════════
   §2  PAPER TEXTURE (宣纸纹理)
   ═══════════════════════════════════════════════ */

export interface PaperConfig {
	/** Paper tint color (hex) */
	tint?: string;
	/** Width in pixels */
	width?: number;
	/** Height in pixels */
	height?: number;
	/** Texture intensity preset: 'light' | 'medium' | 'heavy' */
	weight?: "light" | "medium" | "heavy";
	/** Seed for deterministic texture */
	seed?: string;
}

/**
 * Generate a rice paper texture on an offscreen canvas.
 * Ported from InkPainting's paintPaper() — simplified for game performance.
 *
 * Includes: base tint, wash variations, grain, fibers, vignette.
 * No fluid simulation (too expensive for game use).
 */
export function generatePaperTexture(
	config: PaperConfig = {},
): HTMLCanvasElement {
	const tint = config.tint ?? INK.paper;
	const w = config.width ?? 1920;
	const h = config.height ?? 1080;
	const weight = config.weight ?? "medium";
	const seed = config.seed ?? "default-paper";

	const rng = makeSeededRng(seed, 17);

	// Texture parameters by weight
	const texParams = {
		light: {
			wash: 0.07,
			grain: 1200,
			mottle: 100,
			fiber: 80,
			fiberLen: [6, 22] as [number, number],
			gain: 1.55,
			grainDark: 0.58,
			vignette: 0.048,
		},
		medium: {
			wash: 0.16,
			grain: 3000,
			mottle: 280,
			fiber: 200,
			fiberLen: [12, 42] as [number, number],
			gain: 1.5,
			grainDark: 0.74,
			vignette: 0.1,
		},
		heavy: {
			wash: 0.26,
			grain: 5000,
			mottle: 480,
			fiber: 300,
			fiberLen: [14, 48] as [number, number],
			gain: 1.55,
			grainDark: 0.8,
			vignette: 0.12,
		},
	}[weight];

	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get 2D context for paper canvas");

	// Base fill
	ctx.fillStyle = tint;
	ctx.fillRect(0, 0, w, h);

	const { wash, grain, mottle, fiber, fiberLen, gain, grainDark, vignette } =
		texParams;
	const [fMin, fMax] = fiberLen;

	// Wash variations — subtle color unevenness
	if (wash > 0) {
		for (let i = 0; i < 24; i++) {
			const x = rng.range(0, w);
			const y = rng.range(0, h);
			const rad = rng.range(90, 320) * (w / 1000);
			const warm = rng.chance(0.5);
			const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
			if (warm) {
				g.addColorStop(0, tintShade(tint, -22, -14, -32, wash * 0.72 * gain));
				g.addColorStop(1, tintShade(tint, 0, 0, 0, 0));
			} else {
				g.addColorStop(0, tintShade(tint, 10, 10, 14, wash * 0.58 * gain));
				g.addColorStop(1, tintShade(tint, 0, 0, 0, 0));
			}
			ctx.fillStyle = g;
			ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
		}
	}

	// Mottle — mid-scale speckles
	for (let i = 0; i < mottle; i++) {
		const x = rng.range(0, w);
		const y = rng.range(0, h);
		const s = rng.range(2, 5.5);
		const dark = rng.chance(grainDark);
		ctx.fillStyle = dark
			? tintShade(tint, -48, -40, -30, rng.range(0.035, 0.11) * gain)
			: tintShade(tint, 14, 12, 8, rng.range(0.04, 0.12) * gain);
		ctx.fillRect(x, y, s, s * rng.range(0.75, 1.15));
	}

	// Fine grain
	for (let i = 0; i < grain; i++) {
		const x = rng.range(0, w);
		const y = rng.range(0, h);
		const dark = rng.chance(grainDark);
		ctx.fillStyle = dark
			? tintShade(tint, -62, -52, -38, rng.range(0.022, 0.085) * gain)
			: tintShade(tint, 20, 18, 14, rng.range(0.03, 0.095) * gain);
		ctx.fillRect(x, y, rng.range(0.6, 2.8), rng.range(0.6, 2.8));
	}

	// Paper fibers
	ctx.lineCap = "round";
	for (let i = 0; i < fiber; i++) {
		const x = rng.range(0, w);
		const y = rng.range(0, h);
		const a = rng.range(0, TAU);
		const len = rng.range(fMin, fMax);
		const warm = rng.chance(0.5);
		ctx.strokeStyle = warm
			? tintShade(tint, -48, -38, -24, rng.range(0.024, 0.072) * gain)
			: tintShade(tint, -22, -18, -28, rng.range(0.018, 0.058) * gain);
		ctx.lineWidth = rng.range(0.45, 1.15);
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.quadraticCurveTo(
			x + Math.cos(a) * len * 0.5 + (rng.next() - 0.5) * 8,
			y + Math.sin(a) * len * 0.5 + (rng.next() - 0.5) * 8,
			x + Math.cos(a) * len,
			y + Math.sin(a) * len,
		);
		ctx.stroke();
	}

	// Vignette — edges slightly darker
	if (vignette > 0) {
		const g = ctx.createRadialGradient(
			w / 2,
			h / 2,
			Math.min(w, h) * 0.42,
			w / 2,
			h / 2,
			Math.max(w, h) * 0.75,
		);
		g.addColorStop(0, tintShade(tint, -40, -32, -24, 0));
		g.addColorStop(1, tintShade(tint, -40, -32, -24, vignette * gain));
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
	}

	return canvas;
}

/* ═══════════════════════════════════════════════
   §3  VERTICAL TEXT (竖排题词)
   ═══════════════════════════════════════════════ */

export interface VerticalTextConfig {
	/** Text content — columns separated by spaces, slashes, or newlines */
	text: string;
	/** Font size in px */
	fontSize?: number;
	/** Font family */
	fontFamily?: string;
	/** Font weight */
	fontWeight?: string;
	/** Text color */
	color?: string;
	/** Line height multiplier */
	lineHeight?: number;
	/** Column gap multiplier */
	columnGap?: number;
	/** Per-character jitter for hand-written feel */
	jitter?: number;
	/** Per-character alpha variation */
	alphaVariation?: number;
}

/**
 * Draw vertical text (right-to-left columns, top-to-bottom characters).
 * Traditional Chinese calligraphy layout.
 *
 * @param ctx — target canvas context
 * @param x — starting x (rightmost column position)
 * @param y — starting y (top of first character)
 * @param config — text configuration
 */
export function drawVerticalText(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	config: VerticalTextConfig,
): void {
	const fontSize = config.fontSize ?? 30;
	const fontFamily =
		config.fontFamily ??
		"'Ma Shan Zheng','Kaiti SC','STKaiti','KaiTi','Noto Serif TC',serif";
	const fontWeight = config.fontWeight ?? "normal";
	const color = config.color ?? INK.text;
	const lineH = fontSize * (config.lineHeight ?? 1.14);
	const colGap = fontSize * (config.columnGap ?? 1.35);
	const jitter = config.jitter ?? 0.9;
	const alphaVar = config.alphaVariation ?? 0.14;

	const cols = config.text.split(/[\s/]+/).filter(Boolean);

	ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = color;

	let cx = x;
	for (const col of cols) {
		let cy = y + fontSize / 2;
		for (const ch of col) {
			ctx.globalAlpha = 1 - Math.random() * alphaVar;
			ctx.fillText(ch, cx + gauss() * jitter, cy + gauss() * jitter);
			cy += lineH;
		}
		cx -= colGap; // next column to the left
	}
	ctx.globalAlpha = 1;
}
