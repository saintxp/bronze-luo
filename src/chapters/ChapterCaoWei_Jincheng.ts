/**
 * 铜声·识洛 — Chapter CaoWei Jincheng 肆·曹魏·烬城
 *
 * B-level progressive state machine (5 frames).
 * Three plaster applications — third auto-cracks and collapses into
 * a water puddle. Hand print shatters, concentric rings flatten.
 *
 * Frame flow:
 *   RUINS (auto) → BEIMANG (auto, 北邙第二环)
 *   → PLASTER (interactive, 3-stage progressive)
 *   → HAND_PRINT (auto, 碎裂) → STAMP「烬城」
 *
 * Palette: ash #8B8070, ochre #B78642
 * 暗线: 向下按姿势链④ (抹灰·主动失败) + 北邙第二环(灰中全景)
 * Stamp: 「烬城」
 */

import { ChapterBase } from "./ChapterBase";
import type { CanvasManager } from "../engine/CanvasManager";
import type { StampEffect } from "../ui/StampEffect";
import { eventBus } from "../utils/EventBus";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../utils/constants";
import type { Vec2 } from "../utils/math";
import { createLogger } from "../utils/logger";

const log = createLogger("ChapterJincheng");

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Layout ───────── */
//
// Three plaster rings — concentric, centered on a wall crack.
// Player must discover the correct application order (outer→middle→inner)
// by trial: wrong ring → tremor + no plaster. Correct ring → plaster sticks.
//
// Visual clue: faint concentric hairline cracks on the wall surface
// radiate outward, like growth rings. The outermost ring cracks first,
// then the middle, then the core — hinting at "从外向内抹".

const PLASTER_CENTER: Vec2 = { x: CX, y: CY - 10 };

// Three concentric rings, ordered outermost→innermost
interface PlasterZone {
	x: number;
	y: number;
	radius: number;
	label: string; // subtle symbol on the ring
}
const PLASTER_ZONES: PlasterZone[] = [
	{ x: PLASTER_CENTER.x, y: PLASTER_CENTER.y, radius: 75, label: "外" },
	{ x: PLASTER_CENTER.x, y: PLASTER_CENTER.y, radius: 48, label: "中" },
	{ x: PLASTER_CENTER.x, y: PLASTER_CENTER.y, radius: 22, label: "内" },
];

/* ───────── Frame enum ───────── */
enum JinchengFrame {
	RUINS,
	BEIMANG,
	PLASTER,
	HAND_PRINT,
	STAMP,
}

export class ChapterCaoWeiJincheng extends ChapterBase {
	private canvasManager: CanvasManager;
	private stampEffect: StampEffect;
	private frame: JinchengFrame = JinchengFrame.RUINS;
	private frameTimer = 0;
	private skipRender = false;

	// Plaster state
	private plasterStage = 0; // 0, 1, 2 (third = auto-crack)
	private plasterCracking = false;
	private crackProgress = 0;
	private puddleAlpha = 0;

	// Wrong click shake
	private wrongShakeTimer = 0;
	private wrongShakeOffset = 0;

	// Hand print
	private handShatterAlpha = 0;
	private rippleRadius = 0;

	// Click handler
	private clickHandler: ((e: MouseEvent) => void) | null = null;
	private touchHandler: ((e: TouchEvent) => void) | null = null;

	private readonly AUTO_RUINS = 2000;
	private readonly AUTO_BEIMANG = 2000;
	private readonly CRACK_DURATION = 2000;
	private readonly HAND_DURATION = 2000;
	private readonly STAMP_DURATION = 2000;

	constructor(canvasManager: CanvasManager, stampEffect: StampEffect) {
		super("caowei-jincheng");
		this.canvasManager = canvasManager;
		this.stampEffect = stampEffect;
	}

	init(): void {
		this.puzzles = [];
		log.info("Jincheng chapter initialized");
	}

	enter(): void {
		super.enter();
		this.resetState();
		this.frame = JinchengFrame.RUINS;
		this.setupClickHandler();
		log.info("Jincheng entered — 烬城");
	}

	exit(): void {
		super.exit();
		this.teardownClickHandler();
	}

	private resetState(): void {
		this.frameTimer = 0;
		this.skipRender = false;
		this.plasterStage = 0;
		this.plasterCracking = false;
		this.crackProgress = 0;
		this.puddleAlpha = 0;
		this.handShatterAlpha = 0;
		this.rippleRadius = 0;
		this.wrongShakeTimer = 0;
		this.wrongShakeOffset = 0;
		this.rippleRadius = 0;
	}

	/* ───────── Update loop ───────── */
	update(dt: number): void {
		if (this.skipRender) return;
		this.frameTimer += dt;

		switch (this.frame) {
			case JinchengFrame.RUINS:
				if (this.frameTimer >= this.AUTO_RUINS) this.advanceToBeimang();
				break;
			case JinchengFrame.BEIMANG:
				if (this.frameTimer >= this.AUTO_BEIMANG) this.advanceToPlaster();
				break;
			case JinchengFrame.PLASTER:
				// Wrong-click shake decay
				if (this.wrongShakeTimer > 0) {
					this.wrongShakeTimer -= dt;
					this.wrongShakeOffset =
						Math.sin(this.wrongShakeTimer * 0.08) *
						5 *
						(this.wrongShakeTimer / 500);
					if (this.wrongShakeTimer <= 0) this.wrongShakeOffset = 0;
				}
				if (this.plasterCracking) {
					this.crackProgress = Math.min(
						1,
						this.frameTimer / this.CRACK_DURATION,
					);
					if (this.crackProgress >= 1) {
						this.plasterCracking = false;
						this.plasterStage = 3;
						setTimeout(() => {
							if (this.frame === JinchengFrame.PLASTER)
								this.advanceToHandPrint();
						}, 1500);
					}
				}
				break;
			case JinchengFrame.HAND_PRINT:
				this.handShatterAlpha = Math.min(1, this.frameTimer / 800);
				this.rippleRadius = Math.min(120, this.frameTimer * 0.1);
				this.puddleAlpha = Math.max(
					0,
					Math.min(1, (this.frameTimer - 500) / 1000),
				);
				if (this.frameTimer >= this.HAND_DURATION) this.advanceToStamp();
				break;
			case JinchengFrame.STAMP:
				if (this.frameTimer >= this.STAMP_DURATION) this.advanceToComplete();
				break;
		}

		this.renderFrame();
	}

	/* ───────── Click handling ───────── */
	private setupClickHandler(): void {
		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;
		canvas.style.pointerEvents = "auto";

		this.clickHandler = (e: MouseEvent) => this.handleClick(e);
		this.touchHandler = (e: TouchEvent) => {
			e.preventDefault();
			const t = e.touches[0];
			if (t) this.handleClick(t as unknown as MouseEvent);
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

	private handleClick(e: MouseEvent): void {
		if (this.frame !== JinchengFrame.PLASTER) return;
		if (this.plasterCracking) return;

		const canvas = this.canvasManager.getLayer("puzzle")?.canvas;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const sx = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
		const sy = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

		// Check each zone — innermost first so inner rings aren't
		// swallowed by outer rings (they share the same center).
		for (let i = PLASTER_ZONES.length - 1; i >= 0; i--) {
			const z = PLASTER_ZONES[i];
			const dx = sx - z.x;
			const dy = sy - z.y;
			const hitR = z.radius + 12;
			if (dx * dx + dy * dy < hitR * hitR) {
				if (i === this.plasterStage) {
					// Correct ring at the correct stage → plaster sticks
					this.plasterStage++;
					if (this.plasterStage === 3) {
						this.plasterCracking = true;
						this.frameTimer = 0;
						this.crackProgress = 0;
					}
				} else if (i < this.plasterStage) {
					// Already plastered — gentle pulse (no penalty)
				} else {
					// Wrong order! shake feedback
					this.wrongShakeTimer = 500;
				}
				return;
			}
		}
	}

	/* ───────── Transitions ───────── */
	private advanceToBeimang(): void {
		this.frame = JinchengFrame.BEIMANG;
		this.frameTimer = 0;
		log.info("Jincheng: RUINS → BEIMANG");
	}

	private advanceToPlaster(): void {
		this.frame = JinchengFrame.PLASTER;
		this.frameTimer = 0;
		log.info("Jincheng: BEIMANG → PLASTER");
	}

	private advanceToHandPrint(): void {
		this.teardownClickHandler();
		this.frame = JinchengFrame.HAND_PRINT;
		this.frameTimer = 0;
		this.handShatterAlpha = 0;
		this.rippleRadius = 0;
		this.puddleAlpha = 0;
		log.info("Jincheng: PLASTER → HAND_PRINT");
	}

	private advanceToStamp(): void {
		this.frame = JinchengFrame.STAMP;
		this.frameTimer = 0;
		this.stampEffect.showStamp({ text: "烬城" });
		log.info("Jincheng: HAND_PRINT → STAMP");
	}

	private advanceToComplete(): void {
		this.skipRender = true;
		eventBus.emit("chapter:complete", { chapterId: "caowei-jincheng" });
		log.info("Jincheng → COMPLETE");
	}

	/* ───────── Rendering ───────── */
	private renderFrame(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const ctx = this.canvasManager.getContext("bg");
		if (!ctx) return;

		this.drawAshBg(ctx);

		switch (this.frame) {
			case JinchengFrame.RUINS:
				this.renderRuins(ctx);
				break;
			case JinchengFrame.BEIMANG:
				this.renderBeimang(ctx);
				break;
			case JinchengFrame.PLASTER:
				if (this.wrongShakeOffset !== 0) {
					ctx.save();
					ctx.translate(this.wrongShakeOffset, 0);
				}
				this.renderPlaster(ctx);
				if (this.wrongShakeOffset !== 0) ctx.restore();
				break;
			case JinchengFrame.HAND_PRINT:
				this.renderHandPrint(ctx);
				break;
			case JinchengFrame.STAMP:
				this.renderStampFrame(ctx);
				break;
		}
	}

	private drawAshBg(ctx: CanvasRenderingContext2D): void {
		const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
		grad.addColorStop(0, "#c8c0b8");
		grad.addColorStop(0.6, "#b8b0a8");
		grad.addColorStop(1, "#a89888");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}

	/* ───────── Ruins frame ───────── */
	private renderRuins(ctx: CanvasRenderingContext2D): void {
		// City ruins silhouette
		ctx.fillStyle = "#8a8078";
		// Broken walls
		ctx.fillRect(CX - 200, CY + 30, 80, 120);
		ctx.fillRect(CX - 100, CY + 60, 60, 90);
		ctx.fillRect(CX + 50, CY + 40, 100, 110);
		ctx.fillRect(CX + 180, CY + 70, 40, 80);

		// Ash particles drifting
		ctx.fillStyle = "rgba(180,170,160,0.3)";
		for (let i = 0; i < 15; i++) {
			const ax = ((i * 173 + 37) * 3) % CANVAS_WIDTH;
			const ay =
				((i * 97 + 53 + (performance.now() / 2000) * ((i % 3) + 1)) * 2) %
				CANVAS_HEIGHT;
			ctx.beginPath();
			ctx.arc(ax, ay, 2, 0, Math.PI * 2);
			ctx.fill();
		}

		// Label
		ctx.fillStyle = "rgba(111,103,93,0.5)";
		ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.fillText("洛阳废墟 · 灰已落定", CX, CY - 150);
	}

	/* ───────── Beimang frame ───────── */
	private renderBeimang(ctx: CanvasRenderingContext2D): void {
		// Beimang mountain panorama
		// Ash-grey and green dividing line
		const divideY = CY + 20;

		// Below: ash land
		ctx.fillStyle = "#a09890";
		ctx.fillRect(0, divideY, CANVAS_WIDTH, CANVAS_HEIGHT - divideY);

		// Ash texture
		ctx.fillStyle = "rgba(140,130,120,0.2)";
		for (let i = 0; i < 20; i++) {
			ctx.beginPath();
			ctx.arc(
				(i * 250 + 80) % CANVAS_WIDTH,
				divideY + i * 15,
				3 + (i % 5),
				0,
				Math.PI * 2,
			);
			ctx.fill();
		}

		// Above: green mountain silhouettes
		ctx.fillStyle = "#6a7a5a";
		ctx.beginPath();
		ctx.moveTo(0, divideY);
		ctx.quadraticCurveTo(200, divideY - 120, 400, divideY - 60);
		ctx.quadraticCurveTo(600, divideY - 40, 800, divideY - 100);
		ctx.quadraticCurveTo(1000, divideY - 20, 1200, divideY - 80);
		ctx.quadraticCurveTo(1500, divideY - 30, CANVAS_WIDTH, divideY - 50);
		ctx.lineTo(CANVAS_WIDTH, divideY);
		ctx.closePath();
		ctx.fill();

		// Dividing line highlight (ash-green boundary)
		ctx.strokeStyle = "rgba(120,130,110,0.5)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, divideY);
		ctx.lineTo(CANVAS_WIDTH, divideY);
		ctx.stroke();

		// 北邙第二环 label
		ctx.fillStyle = "rgba(111,103,93,0.5)";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("北邙 · 灰与青的分界线", CX, divideY + 60);
	}

	/* ───────── Plaster frame ───────── */
	private renderPlaster(ctx: CanvasRenderingContext2D): void {
		this.drawAshBg(ctx);

		const pc = PLASTER_CENTER;

		// ── Wall surface ──
		ctx.fillStyle = "#b0a090";
		ctx.fillRect(CX - 200, CY - 100, 400, 240);
		ctx.strokeStyle = "rgba(139,128,112,0.5)";
		ctx.lineWidth = 2;
		ctx.strokeRect(CX - 200, CY - 100, 400, 240);

		// ── Subtle concentric crack lines (clue: "从外向内") ──
		ctx.strokeStyle = "rgba(139,128,112,0.18)";
		ctx.lineWidth = 0.5;
		for (let r = 90; r >= 15; r -= 25) {
			ctx.beginPath();
			ctx.arc(pc.x, pc.y, r, 0, Math.PI * 2);
			ctx.stroke();
		}

		// ── Three concentric plaster rings ──
		for (let i = 0; i < PLASTER_ZONES.length; i++) {
			const z = PLASTER_ZONES[i];
			const isDone = i < this.plasterStage;
			const isActive = i === this.plasterStage;

			if (isDone) {
				// Plaster applied: grey-white filled disc
				ctx.fillStyle = "rgba(220,215,205,0.6)";
				ctx.beginPath();
				ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
				ctx.fill();

				// Ring edge after plastering
				ctx.strokeStyle = "rgba(180,175,165,0.3)";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
				ctx.stroke();

				if (i === 2 && this.plasterCracking) {
					// Innermost ring cracking
					ctx.strokeStyle = `rgba(26,26,24,${this.crackProgress * 0.6})`;
					ctx.lineWidth = 2;
					for (let c = 0; c < 6; c++) {
						const ca = (c / 6) * Math.PI * 2 + this.crackProgress * 0.7;
						const cl = 8 + this.crackProgress * 50;
						ctx.beginPath();
						ctx.moveTo(z.x, z.y);
						ctx.lineTo(z.x + Math.cos(ca) * cl, z.y + Math.sin(ca) * cl);
						ctx.stroke();
					}
				}
			}

			// Active / not-yet-reached ring — pulsing indicator
			if (isActive || (!isDone && i > this.plasterStage)) {
				const pulse = 0.35 + 0.25 * Math.sin(performance.now() / 700 + i * 1.2);
				const isNext = i === this.plasterStage;
				ctx.strokeStyle = `rgba(184,120,66,${pulse * (isNext ? 1 : 0.5)})`;
				ctx.lineWidth = isNext ? 2 : 1;
				ctx.setLineDash(isNext ? [6, 5] : [3, 8]);
				ctx.beginPath();
				ctx.arc(z.x, z.y, z.radius + 4, 0, Math.PI * 2);
				ctx.stroke();
				ctx.setLineDash([]);
			}

			// Label on each ring (subtle Chinese numbering)
			if (!isDone || i === 2) {
				const labelAlpha = isDone ? 0.3 : 0.5;
				ctx.fillStyle = `rgba(139,128,112,${labelAlpha})`;
				ctx.font = '11px "PingFang SC", "Noto Sans SC", serif';
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(z.label, z.x + z.radius + 14, z.y);
			}
		}

		// ── Puddle forming after crack (stage 3+) ──
		if (this.plasterStage >= 3 && !this.plasterCracking) {
			ctx.fillStyle = "rgba(180,200,210,0.3)";
			ctx.beginPath();
			ctx.ellipse(pc.x, pc.y + 30, 50, 20, 0, 0, Math.PI * 2);
			ctx.fill();
		}

		// ── Instruction ──
		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		const instrY = CY + 160;
		if (this.plasterCracking) {
			ctx.fillText("灰自动裂开 · 坍缩溶解", CX, instrY);
		} else if (this.wrongShakeTimer > 0) {
			ctx.fillStyle = "rgba(194,59,34,0.6)";
			ctx.fillText("顺序不对 — 从外向内试", CX, instrY);
		} else if (this.plasterStage === 0) {
			ctx.fillText("三层灰环 · 找出正确涂抹顺序", CX, instrY);
		} else if (this.plasterStage < 2) {
			ctx.fillText(`第${this.plasterStage}层已抹 · 继续`, CX, instrY);
		} else {
			ctx.fillText("最后一层 · 灰将自动裂开", CX, instrY);
		}
	}

	/* ───────── Hand Print frame ───────── */
	private renderHandPrint(ctx: CanvasRenderingContext2D): void {
		this.drawAshBg(ctx);

		// Puddle (from cracked plaster, centered at the ring core)
		const puddleX = PLASTER_CENTER.x;
		const puddleY = PLASTER_CENTER.y + 20;
		ctx.fillStyle = `rgba(180,200,210,${0.3 + this.puddleAlpha * 0.3})`;
		ctx.beginPath();
		ctx.ellipse(
			puddleX,
			puddleY,
			45 + this.puddleAlpha * 10,
			18 + this.puddleAlpha * 5,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		// Hand print reflection in water
		if (this.handShatterAlpha > 0.01) {
			ctx.save();
			ctx.globalAlpha = this.handShatterAlpha;

			// Hand silhouette
			ctx.strokeStyle = "rgba(194,59,34,0.3)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.ellipse(puddleX - 5, puddleY - 5, 20, 35, 0.1, 0, Math.PI * 2);
			ctx.stroke();
			// Finger traces
			for (let f = 0; f < 4; f++) {
				ctx.beginPath();
				ctx.moveTo(puddleX - 5, puddleY - 25);
				ctx.lineTo(puddleX - 5 + (f - 1.5) * 10, puddleY - 45);
				ctx.stroke();
			}

			// Concentric rings (同心圆压扁)
			for (let r = 0; r < 4; r++) {
				const rr = 15 + r * 15;
				ctx.strokeStyle = `rgba(194,59,34,${0.3 - r * 0.07})`;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.ellipse(puddleX, puddleY, rr, rr * 0.6, 0, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.restore();
		}

		// Ripple waves expanding from hand
		if (this.rippleRadius > 0) {
			ctx.strokeStyle = `rgba(180,200,210,${Math.max(0, 0.4 - (this.rippleRadius / 120) * 0.4)})`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(puddleX, puddleY, this.rippleRadius, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Label
		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("手印碎裂 · 反向涟漪", CX, puddleY + 60);
	}

	/* ───────── Stamp frame ───────── */
	private renderStampFrame(ctx: CanvasRenderingContext2D): void {
		this.drawAshBg(ctx);

		ctx.fillStyle = "#8B8070";
		ctx.font = '36px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("烬城", CX, CY - 20);

		ctx.fillStyle = "rgba(111,103,93,0.5)";
		ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
		ctx.fillText("—— 曹魏 · 废墟 ——", CX, CY + 40);
	}
}
