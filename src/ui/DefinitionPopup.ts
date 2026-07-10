/**
 * 铜声·识洛 — Definition popup
 *
 * Displays a ≤4-character definition popup on the UI canvas.
 * Styled with InkView Design System: warm paper background,
 * ink text, rounded pill shape. Auto-fades after 2 seconds.
 *
 * Triggered by chapters when a puzzle is solved.
 * The popup text is set per-puzzle (e.g. "铸", "宅兹", "礼成").
 */

import { type CanvasManager } from '../engine/CanvasManager';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('DefinitionPopup');
const POPUP_DISPLAY_DURATION = 2000; // ms — total visible time
const FADE_DURATION = 300; // ms — fade in/out

export interface PopupConfig {
  text: string;            // ≤4 characters (e.g. "铸", "宅兹", "礼成")
  subtitle?: string;       // optional subtitle / romanization
  x?: number;
  y?: number;
}

interface ActivePopup {
  config: PopupConfig;
  startTime: number;
}

export class DefinitionPopup {
  private canvasManager: CanvasManager;
  private active: ActivePopup[] = [];

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
  }

  /**
   * Show a definition popup.
   * @param config — text (≤4 chars), optional subtitle, position
   */
  show(config: PopupConfig): void {
    if (config.text.length > 4) {
      log.warn(`Definition text too long: "${config.text}" (max 4 chars)`);
    }
    this.active.push({
      config,
      startTime: performance.now(),
    });
  }

  /**
   * Render active popups on the UI canvas.
   * Called each frame from the game loop.
   */
  render(now: number): void {
    const ctx = this.canvasManager.getContext('ui');
    if (!ctx || this.active.length === 0) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this.active.length; i++) {
      const popup = this.active[i];
      const elapsed = now - popup.startTime;

      if (elapsed > POPUP_DISPLAY_DURATION) {
        toRemove.push(i);
        continue;
      }

      // Fade in → hold → fade out
      let alpha = 1;
      if (elapsed < FADE_DURATION) {
        alpha = elapsed / FADE_DURATION;
      } else if (elapsed > POPUP_DISPLAY_DURATION - FADE_DURATION) {
        alpha = (POPUP_DISPLAY_DURATION - elapsed) / FADE_DURATION;
      }

      const x = popup.config.x ?? CANVAS_WIDTH / 2;
      const y = popup.config.y ?? CANVAS_HEIGHT / 2 + 80;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Measure text width for pill size
      ctx.font = 'bold 24px "PingFang SC", "Noto Sans SC", serif';
      const textWidth = ctx.measureText(popup.config.text).width;
      const pillW = Math.max(textWidth + 48, 80);
      const pillH = 48;
      const pillR = 24; // corner radius

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 8;

      // Pill background — InkView paper
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.moveTo(x - pillW / 2 + pillR, y - pillH / 2);
      ctx.lineTo(x + pillW / 2 - pillR, y - pillH / 2);
      ctx.arcTo(x + pillW / 2, y - pillH / 2, x + pillW / 2, y - pillH / 2 + pillR, pillR);
      ctx.lineTo(x + pillW / 2, y + pillH / 2 - pillR);
      ctx.arcTo(x + pillW / 2, y + pillH / 2, x + pillW / 2 - pillR, y + pillH / 2, pillR);
      ctx.lineTo(x - pillW / 2 + pillR, y + pillH / 2);
      ctx.arcTo(x - pillW / 2, y + pillH / 2, x - pillW / 2, y + pillH / 2 - pillR, pillR);
      ctx.lineTo(x - pillW / 2, y - pillH / 2 + pillR);
      ctx.arcTo(x - pillW / 2, y - pillH / 2, x - pillW / 2 + pillR, y - pillH / 2, pillR);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ink border (subtle)
      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = '#2a2723';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Main text
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#201c18';
      ctx.font = 'bold 24px "PingFang SC", "Noto Sans SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(popup.config.text, x, y - (popup.config.subtitle ? 6 : 0));

      // Subtitle (smaller, below)
      if (popup.config.subtitle) {
        ctx.fillStyle = '#6f675d';
        ctx.font = '12px "PingFang SC", "Noto Sans SC", sans-serif';
        ctx.fillText(popup.config.subtitle, x, y + 22);
      }

      ctx.restore();
    }

    // Remove expired (reverse order)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.active.splice(toRemove[i], 1);
    }
  }

  clear(): void {
    this.active = [];
  }
}
