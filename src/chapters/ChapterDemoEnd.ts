/**
 * 铜声·识洛 — ChapterDemoEnd Phase 2 试玩结束画面
 *
 * 3 帧自动播放：
 *   FADE_IN (800ms) → SHOW_TEXT (2s) → DONE (无限)
 *
 * 纯 Canvas 2D 绘制，InkView 色板，无外部资产。
 * DONE 帧不发射 chapter:complete —— 画面永久保留。
 */

import { ChapterBase } from './ChapterBase';
import { type CanvasManager } from '../engine/CanvasManager';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('ChapterDemoEnd');

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

enum DemoEndFrame {
  FADE_IN,
  SHOW_TEXT,
  DONE,
}

export class ChapterDemoEnd extends ChapterBase {
  private canvasManager: CanvasManager;
  private frame: DemoEndFrame = DemoEndFrame.FADE_IN;
  private frameTimer = 0;
  private fadeAlpha = 1;       // 1 → 0 during FADE_IN
  private textAlpha = 0;       // 0 → 1 during SHOW_TEXT
  private subtitleAlpha = 0;
  private lineAlpha = 0;
  private closingAlpha = 0;
  private sealAlpha = 0;
  // No completed flag — DONE frame stays forever without chapter:complete

  private readonly FADE_DURATION = 800;
  private readonly TEXT_DURATION = 2000;

  constructor(canvasManager: CanvasManager) {
    super('demo-end');
    this.canvasManager = canvasManager;
  }

  init(): void {
    this.puzzles = [];
    log.info('DemoEnd chapter initialized');
  }

  enter(): void {
    super.enter();
    this.resetState();
    this.frame = DemoEndFrame.FADE_IN;
    log.info('DemoEnd entered');
  }

  exit(): void {
    super.exit();
  }

  private resetState(): void {
    this.frameTimer = 0;
    this.fadeAlpha = 1;
    this.textAlpha = 0;
    this.subtitleAlpha = 0;
    this.lineAlpha = 0;
    this.closingAlpha = 0;
    this.sealAlpha = 0;
  }

  update(dt: number): void {
    this.frameTimer += dt;

    switch (this.frame) {
      case DemoEndFrame.FADE_IN: {
        // Fade from black to warm paper
        this.fadeAlpha = Math.max(0, 1 - this.frameTimer / this.FADE_DURATION);
        if (this.frameTimer >= this.FADE_DURATION) {
          this.advanceToShowText();
        }
        break;
      }

      case DemoEndFrame.SHOW_TEXT: {
        const t = this.frameTimer;
        this.textAlpha = Math.min(1, t / 400);
        this.subtitleAlpha = Math.min(1, Math.max(0, (t - 300) / 400));
        this.lineAlpha = Math.min(1, Math.max(0, (t - 600) / 300));
        this.closingAlpha = Math.min(1, Math.max(0, (t - 900) / 400));
        this.sealAlpha = Math.min(1, Math.max(0, (t - 1400) / 500));
        if (this.frameTimer >= this.TEXT_DURATION) {
          this.advanceToDone();
        }
        break;
      }

      case DemoEndFrame.DONE:
        // Stay forever — no chapter:complete
        break;
    }

    this.renderFrame();
  }

  /* ───────── Frame transitions ───────── */

  private advanceToShowText(): void {
    this.frame = DemoEndFrame.SHOW_TEXT;
    this.frameTimer = 0;
    log.info('DemoEnd: FADE_IN → SHOW_TEXT');
  }

  private advanceToDone(): void {
    this.frame = DemoEndFrame.DONE;
    this.frameTimer = 0;
    log.info('DemoEnd: SHOW_TEXT → DONE (permanent)');
  }

  /* ───────── Rendering ───────── */

  private renderFrame(): void {
    this.canvasManager.clearLayer('bg');
    this.canvasManager.clearLayer('puzzle');

    const ctx = this.canvasManager.getContext('bg');
    if (!ctx) return;

    // Always render the warm paper background first
    ctx.fillStyle = '#f6f1e6';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Book page border decoration
    ctx.strokeStyle = 'rgba(42,39,35,0.08)';
    ctx.lineWidth = 1;
    const margin = 60;
    ctx.strokeRect(margin, margin, CANVAS_WIDTH - margin * 2, CANVAS_HEIGHT - margin * 2);

    // Inner border (thinner, more subtle)
    ctx.strokeStyle = 'rgba(42,39,35,0.04)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin + 20, margin + 20, CANVAS_WIDTH - (margin + 20) * 2, CANVAS_HEIGHT - (margin + 20) * 2);

    // Draw decorative top-left corner motif (simple L-shape angles)
    const cornerSize = 40;
    const cm = 100;
    ctx.strokeStyle = 'rgba(42,39,35,0.12)';
    ctx.lineWidth = 1.5;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(cm, cm + cornerSize);
    ctx.lineTo(cm, cm);
    ctx.lineTo(cm + cornerSize, cm);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - cm - cornerSize, CANVAS_HEIGHT - cm);
    ctx.lineTo(CANVAS_WIDTH - cm, CANVAS_HEIGHT - cm);
    ctx.lineTo(CANVAS_WIDTH - cm, CANVAS_HEIGHT - cm - cornerSize);
    ctx.stroke();

    // Title: 铜声·识洛
    if (this.textAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.textAlpha;
      ctx.fillStyle = '#201c18';
      ctx.font = 'bold 48px "PingFang SC", "Noto Sans SC", "SimSun", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('铜声·识洛', CX, CY - 30);
      ctx.restore();
    }

    // Subtitle: 试玩结束
    if (this.subtitleAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.subtitleAlpha;
      ctx.fillStyle = '#2a2723';
      ctx.font = '28px "PingFang SC", "Noto Sans SC", "SimSun", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('试玩结束', CX, CY + 50);
      ctx.restore();
    }

    // Decorative gold line
    if (this.lineAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.lineAlpha * 0.6;
      ctx.strokeStyle = '#c8a65a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CX - 60, CY + 100);
      ctx.lineTo(CX + 60, CY + 100);
      ctx.stroke();
      ctx.restore();
    }

    // Closing text: 感谢体验 · 敬请期待
    if (this.closingAlpha > 0.01) {
      ctx.save();
      const pulse = this.frame === DemoEndFrame.DONE
        ? 0.7 + 0.3 * Math.sin(performance.now() / 600)
        : 1;
      ctx.globalAlpha = this.closingAlpha * pulse;
      ctx.fillStyle = '#6f675d';
      ctx.font = '18px "PingFang SC", "Noto Sans SC", "SimSun", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('感谢体验 · 敬请期待', CX, CY + 140);
      ctx.restore();
    }

    // Cinnabar seal in bottom-right corner
    if (this.sealAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.sealAlpha;
      const sealX = CANVAS_WIDTH - 140;
      const sealY = CANVAS_HEIGHT - 110;
      const sealSize = 56;

      // Seal outer border
      ctx.strokeStyle = '#b64232';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sealX, sealY, sealSize, sealSize);

      // Seal inner border
      ctx.strokeStyle = 'rgba(182,66,50,0.5)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sealX + 4, sealY + 4, sealSize - 8, sealSize - 8);

      // Seal text
      ctx.fillStyle = '#b64232';
      ctx.font = 'bold 22px "PingFang SC", "Noto Sans SC", "SimSun", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('合册', sealX + sealSize / 2, sealY + sealSize / 2);
      ctx.restore();
    }

    // Fade overlay for FADE_IN frame
    if (this.fadeAlpha > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }
}
