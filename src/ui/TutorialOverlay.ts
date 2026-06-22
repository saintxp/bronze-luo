/**
 * 铜声·识洛 — Tutorial overlay
 *
 * Canvas-rendered instructional UI (text + arrows) on the UI layer.
 * Uses InkView design system colors.
 * Auto-hides when the current puzzle is solved.
 */

import { type CanvasManager } from '../engine/CanvasManager';
import { CANVAS_WIDTH } from '../utils/constants';

const CX = CANVAS_WIDTH / 2;

/* InkView colors (from CLAUDE.md design system) */
const INK_CINNABAR = '#b64232';
const INK_PAPER = '#fffaf0';

/* Overlay layout */
const TEXT_Y = 920;          // vertical position of instruction text
const TEXT_FONT = '18px "PingFang SC", "Noto Sans SC", sans-serif';
const ARROW_LENGTH = 70;

export interface TutorialStep {
  text: string;
  arrow?: { x: number; y: number; angle: number }; // position + direction in radians
  highlight?: { x: number; y: number; w: number; h: number }; // region to highlight
}

const L1_STEPS: TutorialStep[] = [
  {
    text: '拖动门板，放入门框',
    arrow: { x: 300, y: 540, angle: 0 }, // arrow pointing right
    highlight: { x: 200, y: 340, w: 200, h: 400 },
  },
];

const L2_STEPS: TutorialStep[] = [
  {
    text: '滑动画面，让洞口对准星标',
    arrow: { x: 960, y: 540, angle: -2.5 }, // up-left toward target (660,340)
  },
];

const L3_STEPS: TutorialStep[] = [
  {
    text: '旋转齿轮，对齐齿纹',
    highlight: { x: 690, y: 390, w: 440, h: 220 }, // covers both gears
  },
];

export class TutorialOverlay {
  private canvasManager: CanvasManager;
  private steps: TutorialStep[] = [];
  private currentStep = 0;
  private _visible = false;
  private animPhase = 0; // for pulsing arrow animation

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
  }

  get visible(): boolean {
    return this._visible;
  }

  /**
   * Show tutorial for a specific level.
   */
  show(level: number): void {
    switch (level) {
      case 1:
        this.steps = L1_STEPS;
        break;
      case 2:
        this.steps = L2_STEPS;
        break;
      case 3:
        this.steps = L3_STEPS;
        break;
      default:
        this.steps = [];
    }
    this.currentStep = 0;
    this._visible = true;
  }

  /**
   * Hide the overlay.
   */
  hide(): void {
    this._visible = false;
  }

  /**
   * Advance to the next step (or hide if last).
   */
  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    } else {
      this.hide();
    }
  }

  /**
   * Render the tutorial overlay on the UI layer.
   * Call each frame from the game loop.
   */
  render(now: number): void {
    if (!this._visible || this.steps.length === 0) return;

    // Clear UI canvas before each frame to prevent accumulation
    this.canvasManager.clearLayer('ui');

    const ctx = this.canvasManager.getContext('ui');
    if (!ctx) return;

    // Pulsing animation for arrows
    this.animPhase = Math.sin(now / 300) * 0.3 + 0.7;

    const step = this.steps[this.currentStep];

    // Draw highlight region
    if (step.highlight) {
      this.drawHighlight(ctx, step.highlight);
    }

    // Draw arrow
    if (step.arrow) {
      this.drawArrow(ctx, step.arrow);
    }

    // Draw instruction text
    this.drawText(ctx, step.text);
  }

  private drawHighlight(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
  ): void {
    ctx.save();
    ctx.strokeStyle = INK_CINNABAR;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    arrow: { x: number; y: number; angle: number },
  ): void {
    const pulse = this.animPhase; // 0.4 → 1.0
    const len = ARROW_LENGTH * pulse;

    ctx.save();
    ctx.translate(arrow.x, arrow.y);
    ctx.rotate(arrow.angle);

    // Arrow line
    ctx.strokeStyle = INK_CINNABAR;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(len, 0);
    ctx.lineTo(len - 14, -8);
    ctx.moveTo(len, 0);
    ctx.lineTo(len - 14, 8);
    ctx.stroke();

    ctx.restore();
  }

  private drawText(ctx: CanvasRenderingContext2D, text: string): void {
    ctx.save();

    ctx.font = TEXT_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textW = ctx.measureText(text).width;
    const padH = 20;
    const bx = CX - textW / 2 - padH;
    const by = TEXT_Y - 16;
    const bw = textW + padH * 2;
    const bh = 36;

    // Semi-transparent dark background pill
    ctx.fillStyle = 'rgba(32,28,24,0.65)';
    this.roundRect(ctx, bx, by, bw, bh, 18);
    ctx.fill();

    // Text — white on the dark pill
    ctx.fillStyle = INK_PAPER;
    ctx.fillText(text, CX, by + bh / 2);

    ctx.restore();
  }

  /** Small rounded rect helper. */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
