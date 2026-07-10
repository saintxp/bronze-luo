/**
 * 铜声·识洛 — Stamp effect
 *
 * Renders a cinnabar-red stamp animation on the UI canvas
 * when a puzzle is solved. Scales in and fades over ~600ms.
 *
 * Auto-triggers from 'puzzle:solved' events (non-tutorial chapters).
 * Chapters can also call showStamp() directly for custom stamp text.
 *
 * InkView Design System: cinnabar red for stamps, gold inner border.
 */

import { type CanvasManager } from '../engine/CanvasManager';
import { eventBus } from '../utils/EventBus';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('StampEffect');
const STAMP_ANIM_DURATION = 600; // ms — matches ANIM_SOLVE_DURATION
const STAMP_SIZE = 60; // px

export interface StampConfig {
  text?: string;
  x?: number;
  y?: number;
}

interface ActiveStamp {
  config: StampConfig;
  startTime: number;
}

export class StampEffect {
  private canvasManager: CanvasManager;
  private active: ActiveStamp[] = [];

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;

    // Auto-trigger on puzzle:solved (skip tutorial)
    eventBus.on('puzzle:solved', (payload: { chapterId: string; puzzleId: string }) => {
      if (payload.chapterId === 'tutorial') return;
      log.info(`Stamp triggered for: ${payload.puzzleId}`);
      this.showStamp({});
    });
  }

  /**
   * Show a stamp at the given position (defaults to center).
   * Stamp is cinnabar red with optional gold text (≤4 chars).
   */
  showStamp(config: StampConfig): void {
    this.active.push({
      config,
      startTime: performance.now(),
    });
  }

  /**
   * Render active stamps on the UI canvas.
   * Called each frame from the game loop.
   */
  render(now: number): void {
    const ctx = this.canvasManager.getContext('ui');
    if (!ctx || this.active.length === 0) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this.active.length; i++) {
      const stamp = this.active[i];
      const elapsed = now - stamp.startTime;
      const progress = Math.min(elapsed / STAMP_ANIM_DURATION, 1);

      if (progress >= 1) {
        // Keep visible for a moment, then mark for removal
        if (elapsed > STAMP_ANIM_DURATION + 200) {
          toRemove.push(i);
        }
        continue;
      }

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const x = stamp.config.x ?? CANVAS_WIDTH / 2;
      const y = stamp.config.y ?? CANVAS_HEIGHT / 2;

      ctx.save();

      // Scale in from center
      const scale = eased;
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      // Cinnabar red fill
      ctx.fillStyle = `rgba(182,66,50,${eased * 0.9})`;
      ctx.strokeStyle = `rgba(182,66,50,${eased})`;
      ctx.lineWidth = 3;

      // Stamp rectangle
      ctx.beginPath();
      ctx.rect(-STAMP_SIZE / 2, -STAMP_SIZE / 2, STAMP_SIZE, STAMP_SIZE);
      ctx.fill();
      ctx.stroke();

      // Gold inner border (InkView gold)
      ctx.strokeStyle = `rgba(200,166,90,${eased * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(-STAMP_SIZE / 2 + 4, -STAMP_SIZE / 2 + 4, STAMP_SIZE - 8, STAMP_SIZE - 8);
      ctx.stroke();

      // Text if provided (≤4 characters)
      if (stamp.config.text) {
        ctx.fillStyle = `rgba(200,166,90,${eased})`;
        ctx.font = 'bold 20px "PingFang SC", "Noto Sans SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stamp.config.text, 0, 0);
      }

      ctx.restore();
    }

    // Remove expired stamps (reverse order)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.active.splice(toRemove[i], 1);
    }
  }

  clear(): void {
    this.active = [];
  }
}
