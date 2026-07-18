/**
 * 铜声·识洛 — Chapter CaoWei Shiqi 肆·曹魏·诗起
 *
 * A-level existing puzzle (3 frames).
 * Water puddle → three poems emerge → wind passes between three poets.
 * Poets: 曹操 (sunken ink + wine stain + military seal),
 *        蔡文姬 (rouge stain + qin badge + burned paper edge),
 *        曹植 (horse on Luo River, "Third Year" water drops, hand hovering).
 *
 * Frame flow:
 *   PUDDLE_POEMS (auto, 水洼化纸→诗稿浮现)
 *   → POETS (auto, 三诗人风传递)
 *   → STAMP「诗起」
 *
 * Palette: ash #8B8070, ochre #B78642
 * VFX: 黄初三年水珠彩蛋
 * Stamp: 「诗起」
 */

import { ChapterBase } from "./ChapterBase";
import type { CanvasManager } from "../engine/CanvasManager";
import type { StampEffect } from "../ui/StampEffect";
import { eventBus } from "../utils/EventBus";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../utils/constants";
import { createLogger } from "../utils/logger";

const log = createLogger("ChapterShiqi");

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Frame enum ───────── */
enum ShiqiFrame {
	PUDDLE_POEMS,
	POETS,
	STAMP,
}

export class ChapterCaoWeiShiqi extends ChapterBase {
	private canvasManager: CanvasManager;
	private stampEffect: StampEffect;
	private frame: ShiqiFrame = ShiqiFrame.PUDDLE_POEMS;
	private frameTimer = 0;
	private skipRender = false;

	// Puddle → poems animation
	private puddleToPaper = 0;

	// Three poems appearance
	private poem1Alpha = 0; // 曹操
	private poem2Alpha = 0; // 蔡文姬
	private poem3Alpha = 0; // 曹植

	// Wind pass animation
	private windProgress = 0;

	// Cao Zhi's water drops
	private waterDrops: { x: number; y: number; alpha: number; vy: number }[] =
		[];

	// Paper scraps
	private scraps: {
		x: number;
		y: number;
		vx: number;
		vy: number;
		alpha: number;
	}[] = [];

	private readonly AUTO_PUDDLE = 3000;
	private readonly AUTO_POETS = 4000;
	private readonly STAMP_DURATION = 2500;

	constructor(canvasManager: CanvasManager, stampEffect: StampEffect) {
		super("caowei-shiqi");
		this.canvasManager = canvasManager;
		this.stampEffect = stampEffect;
	}

	init(): void {
		this.puzzles = [];
		// Initialize water drops
		for (let i = 0; i < 8; i++) {
			this.waterDrops.push({
				x: CX + 100 + (Math.random() - 0.5) * 80,
				y: CY + 30 + Math.random() * 60,
				alpha: 0,
				vy: 0,
			});
		}
		// Initialize paper scraps
		for (let i = 0; i < 12; i++) {
			this.scraps.push({
				x: CX + (Math.random() - 0.5) * 300,
				y: CY + Math.random() * 100,
				vx: (Math.random() - 0.5) * 0.8,
				vy: -0.5 - Math.random() * 1.5,
				alpha: 0,
			});
		}
		log.info("Shiqi chapter initialized");
	}

	enter(): void {
		super.enter();
		this.resetState();
		this.frame = ShiqiFrame.PUDDLE_POEMS;
		log.info("Shiqi entered — 诗起");
	}

	exit(): void {
		super.exit();
	}

	private resetState(): void {
		this.frameTimer = 0;
		this.skipRender = false;
		this.puddleToPaper = 0;
		this.poem1Alpha = 0;
		this.poem2Alpha = 0;
		this.poem3Alpha = 0;
		this.windProgress = 0;
	}

	/* ───────── Update loop ───────── */
	update(dt: number): void {
		if (this.skipRender) return;
		this.frameTimer += dt;

		switch (this.frame) {
			case ShiqiFrame.PUDDLE_POEMS:
				this.puddleToPaper = Math.min(1, this.frameTimer / 2000);
				this.poem1Alpha = Math.max(
					0,
					Math.min(1, (this.frameTimer - 800) / 600),
				);
				this.poem2Alpha = Math.max(
					0,
					Math.min(1, (this.frameTimer - 1400) / 600),
				);
				this.poem3Alpha = Math.max(
					0,
					Math.min(1, (this.frameTimer - 2000) / 600),
				);
				if (this.frameTimer >= this.AUTO_PUDDLE) this.advanceToPoets();
				break;
			case ShiqiFrame.POETS:
				this.windProgress = Math.min(1, this.frameTimer / 3000);
				// Animate water drops (曹植)
				this.waterDrops.forEach((d, i) => {
					if (this.windProgress > 0.5 + i * 0.05) {
						d.alpha = Math.max(0, d.alpha - dt / 1500);
						d.vy += dt * 0.0001;
						d.y += d.vy;
					} else if (this.windProgress > 0.3 + i * 0.04) {
						d.alpha = Math.min(1, d.alpha + dt / 500);
					}
				});
				// Animate paper scraps
				this.scraps.forEach((s) => {
					if (this.windProgress > 0.4) {
						s.alpha = Math.min(1, s.alpha + dt / 600);
						s.x += s.vx;
						s.y += s.vy;
					}
				});
				if (this.frameTimer >= this.AUTO_POETS) this.advanceToStamp();
				break;
			case ShiqiFrame.STAMP:
				if (this.frameTimer >= this.STAMP_DURATION) this.advanceToComplete();
				break;
		}

		this.renderFrame();
	}

	/* ───────── Transitions ───────── */
	private advanceToPoets(): void {
		this.frame = ShiqiFrame.POETS;
		this.frameTimer = 0;
		log.info("Shiqi: PUDDLE_POEMS → POETS");
	}

	private advanceToStamp(): void {
		this.frame = ShiqiFrame.STAMP;
		this.frameTimer = 0;
		this.stampEffect.showStamp({ text: "诗起" });
		log.info("Shiqi: POETS → STAMP");
	}

	private advanceToComplete(): void {
		this.skipRender = true;
		eventBus.emit("chapter:complete", { chapterId: "caowei-shiqi" });
		log.info("Shiqi → COMPLETE");
	}

	/* ───────── Rendering ───────── */
	private renderFrame(): void {
		this.canvasManager.clearLayer("bg");
		this.canvasManager.clearLayer("puzzle");

		const ctx = this.canvasManager.getContext("bg");
		if (!ctx) return;

		this.drawAshBg(ctx);

		switch (this.frame) {
			case ShiqiFrame.PUDDLE_POEMS:
				this.renderPuddlePoems(ctx);
				break;
			case ShiqiFrame.POETS:
				this.renderPoets(ctx);
				break;
			case ShiqiFrame.STAMP:
				this.renderStampFrame(ctx);
				break;
		}

		// Paper scraps overlay (all frames after puddle)
		if (this.frame === ShiqiFrame.POETS) {
			this.renderScraps(ctx);
		}

		// Water drops overlay
		if (this.frame === ShiqiFrame.POETS) {
			this.renderWaterDrops(ctx);
		}
	}

	private drawAshBg(ctx: CanvasRenderingContext2D): void {
		const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
		grad.addColorStop(0, "#d0c8c0");
		grad.addColorStop(1, "#b8b0a8");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}

	/* ───────── Puddle → Poems frame ───────── */
	private renderPuddlePoems(ctx: CanvasRenderingContext2D): void {
		const puddleX = CX;
		const puddleY = CY + 30;

		// Water puddle (transforming to paper)
		if (this.puddleToPaper < 0.7) {
			// Still looks like water
			const waterAlpha = 1 - this.puddleToPaper / 0.7;
			ctx.fillStyle = `rgba(180,200,210,${0.4 * waterAlpha})`;
			ctx.beginPath();
			ctx.ellipse(puddleX, puddleY, 120, 40, 0, 0, Math.PI * 2);
			ctx.fill();

			// Ripple rings
			for (let r = 0; r < 3; r++) {
				const rr = 40 + r * 30 + ((performance.now() / 800 + r * 0.5) % 1) * 40;
				ctx.strokeStyle = `rgba(200,210,220,${0.2 * waterAlpha})`;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(puddleX, puddleY, rr, 0, Math.PI * 2);
				ctx.stroke();
			}
		}

		// Paper emerging from water
		if (this.puddleToPaper > 0.3) {
			const paperAlpha = Math.min(1, (this.puddleToPaper - 0.3) / 0.3);
			ctx.fillStyle = `rgba(240,232,216,${paperAlpha * 0.8})`;
			ctx.fillRect(CX - 140, CY - 80, 280, 180);
			ctx.strokeStyle = `rgba(139,128,112,${paperAlpha * 0.6})`;
			ctx.lineWidth = 1;
			ctx.strokeRect(CX - 140, CY - 80, 280, 180);
		}

		// Three poem manuscripts appearing
		this.renderPoemSheet(
			ctx,
			CX - 200,
			CY - 60,
			100,
			140,
			this.poem1Alpha,
			"曹操",
			"#8a4030",
		);
		this.renderPoemSheet(
			ctx,
			CX - 50,
			CY - 50,
			100,
			140,
			this.poem2Alpha,
			"蔡文姬",
			"#a05040",
		);
		this.renderPoemSheet(
			ctx,
			CX + 100,
			CY - 70,
			100,
			140,
			this.poem3Alpha,
			"曹植",
			"#706050",
		);

		// Label
		ctx.fillStyle = "#6f675d";
		ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("水洼化纸 · 三稿浮出", CX, CY + 140);
	}

	private renderPoemSheet(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		alpha: number,
		_label: string,
		inkColor: string,
	): void {
		if (alpha < 0.01) return;
		ctx.save();
		ctx.globalAlpha = alpha;

		// Paper sheet
		ctx.fillStyle = "#f0e8d8";
		ctx.fillRect(x, y, w, h);
		ctx.strokeStyle = "rgba(139,128,112,0.5)";
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, w, h);

		// Ink lines (poem text simulation)
		ctx.strokeStyle = inkColor;
		ctx.lineWidth = 0.8;
		for (let l = 0; l < 5; l++) {
			const ly = y + 20 + l * 22;
			const lineLen = 60 + Math.sin(l * 1.7) * 15;
			ctx.beginPath();
			ctx.moveTo(x + 15, ly);
			ctx.lineTo(x + 15 + lineLen, ly);
			ctx.stroke();
		}

		ctx.restore();
	}

	/* ───────── Poets frame ───────── */
	private renderPoets(ctx: CanvasRenderingContext2D): void {
		// Three poems visible, wind passing between them

		// Cao Cao's poem (left) — ink sunken, wine stain, military seal
		const caoX = CX - 200;
		const caoY = CY - 30;
		this.renderPoemSheet(ctx, caoX, caoY, 110, 150, 1, "曹操", "#8a4030");

		// Wine stain on Cao Cao's poem
		ctx.fillStyle = "rgba(180,100,80,0.2)";
		ctx.beginPath();
		ctx.arc(caoX + 60, caoY + 60, 18, 0, Math.PI * 2);
		ctx.fill();

		// Military seal
		ctx.strokeStyle = "rgba(194,59,34,0.4)";
		ctx.lineWidth = 1;
		ctx.strokeRect(caoX + 70, caoY + 100, 20, 20);
		ctx.fillStyle = "rgba(194,59,34,0.3)";
		ctx.font = '10px "PingFang SC", serif';
		ctx.fillText("军", caoX + 72, caoY + 115);

		// Cai Wenji's poem (center) — rouge stain, qin badge, burned edge
		const caiX = CX - 55;
		const caiY = CY - 40;
		this.renderPoemSheet(ctx, caiX, caiY, 110, 150, 1, "蔡文姬", "#a05040");

		// Rouge stain
		ctx.fillStyle = "rgba(200,80,100,0.15)";
		ctx.beginPath();
		ctx.arc(caiX + 40, caiY + 80, 12, 0, Math.PI * 2);
		ctx.fill();

		// Burned paper edge
		ctx.strokeStyle = "rgba(26,26,24,0.5)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(caiX + 110, caiY + 10);
		ctx.lineTo(caiX + 108, caiY + 30);
		ctx.lineTo(caiX + 110, caiY + 50);
		ctx.lineTo(caiX + 106, caiY + 70);
		ctx.lineTo(caiX + 110, caiY + 90);
		ctx.lineTo(caiX + 108, caiY + 110);
		ctx.stroke();

		// Cao Zhi's poem (right) — horse on Luo River, hovering hand
		const zhiX = CX + 90;
		const zhiY = CY - 40;
		this.renderPoemSheet(ctx, zhiX, zhiY, 110, 150, 1, "曹植", "#706050");

		// Hand hovering an inch above
		ctx.strokeStyle = "rgba(139,128,112,0.3)";
		ctx.lineWidth = 1;
		ctx.setLineDash([2, 3]);
		ctx.beginPath();
		ctx.ellipse(zhiX + 50, zhiY + 100, 20, 12, 0, 0, Math.PI * 2);
		ctx.stroke();
		// Hand above
		ctx.fillStyle = "rgba(200,180,170,0.2)";
		ctx.beginPath();
		ctx.ellipse(zhiX + 45, zhiY + 85, 18, 10, 0.1, 0, Math.PI * 2);
		ctx.fill();
		ctx.setLineDash([]);

		// Wind lines connecting the three poems
		if (this.windProgress > 0.1) {
			const windAlpha = Math.min(1, this.windProgress) * 0.3;
			ctx.strokeStyle = `rgba(184,120,66,${windAlpha})`;
			ctx.lineWidth = 1;
			ctx.setLineDash([8, 12]);

			// Wind path: Cao Cao → Cai Wenji → Cao Zhi
			ctx.beginPath();
			const w1x = caoX + 110 + this.windProgress * 30;
			const w1y = caoY + 60 + Math.sin(this.windProgress * 2) * 10;
			ctx.moveTo(caoX + 110, caoY + 60);
			ctx.quadraticCurveTo(w1x, w1y, caiX, caiY + 60);
			ctx.stroke();

			if (this.windProgress > 0.3) {
				ctx.beginPath();
				ctx.moveTo(caiX + 110, caiY + 60);
				const w2x = caiX + 110 + (this.windProgress - 0.3) * 50;
				const w2y = caiY + 60 + Math.sin(this.windProgress * 2.5) * 8;
				ctx.quadraticCurveTo(w2x, w2y, zhiX, zhiY + 60);
				ctx.stroke();
			}

			ctx.setLineDash([]);
		}

		// Labels — raised contrast for readability on ash background
		ctx.fillStyle = "#6f675d";
		ctx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
		ctx.textAlign = "center";
		ctx.fillText("曹操", caoX + 55, caoY + 170);
		ctx.fillText("蔡文姬", caiX + 55, caiY + 170);
		ctx.fillText("曹植", zhiX + 55, zhiY + 170);
	}

	/* ───────── Water drops (曹植 · 黄初三年) ───────── */
	private renderWaterDrops(ctx: CanvasRenderingContext2D): void {
		this.waterDrops.forEach((d) => {
			if (d.alpha < 0.01) return;
			ctx.fillStyle = `rgba(180,200,220,${d.alpha * 0.6})`;
			ctx.beginPath();
			ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
			ctx.fill();

			// Highlight
			ctx.fillStyle = `rgba(255,255,255,${d.alpha * 0.3})`;
			ctx.beginPath();
			ctx.arc(d.x - 1, d.y - 1, 1, 0, Math.PI * 2);
			ctx.fill();
		});

		// "黄初三年" text
		if (this.windProgress > 0.6) {
			const fadeAlpha = Math.min(1, (this.windProgress - 0.6) / 0.2);
			ctx.fillStyle = `rgba(111,103,93,${fadeAlpha * 0.5})`;
			ctx.font = '14px "PingFang SC", "Noto Sans SC", serif';
			ctx.textAlign = "center";
			ctx.fillText("黄初三年", CX + 140, CY - 20);
		}
	}

	/* ───────── Paper scraps ───────── */
	private renderScraps(ctx: CanvasRenderingContext2D): void {
		this.scraps.forEach((s) => {
			if (s.alpha < 0.01) return;
			ctx.fillStyle = `rgba(240,232,216,${s.alpha * 0.6})`;
			ctx.fillRect(s.x, s.y, 6, 4);
		});
	}

	/* ───────── Stamp frame ───────── */
	private renderStampFrame(ctx: CanvasRenderingContext2D): void {
		this.drawAshBg(ctx);

		ctx.fillStyle = "#B78642";
		ctx.font = '36px "PingFang SC", "Noto Sans SC", serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("诗起", CX, CY - 20);

		ctx.fillStyle = "rgba(80,70,60,0.65)";
		ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
		ctx.fillText("—— 曹魏 · 三诗人 ——", CX, CY + 40);
	}
}
