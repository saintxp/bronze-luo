/**
 * 铜声·识洛 — Video trigger manager
 *
 * Manages Seedance video triggers for cinematic moments.
 * Phase 2: Renders Canvas 2D placeholder animations.
 * Future: Will load and play actual .mp4 Seedance videos.
 *
 * 4 Seedance scenes (Tier1):
 *   copperFlood  — 铜液吞没 (Prologue)
 *   bellWave     — 编钟声波 (礼成)
 *   towerBurn    — 塔焚 (烬 · 全书唯一视觉高潮)
 *   mirrorShatter — 千秋镜碎裂 (唐)
 */

import { type CanvasManager } from '../engine/CanvasManager';
import { createLogger } from '../utils/logger';

const log = createLogger('VideoTrigger');

export type VideoId = 'copperFlood' | 'bellWave' | 'towerBurn' | 'mirrorShatter';

interface ActiveVideo {
  id: VideoId;
  startTime: number;
  duration: number;
}

export class VideoTrigger {
  private canvasManager: CanvasManager;
  private active: ActiveVideo[] = [];

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
  }

  /**
   * Trigger a video by ID.
   * @param id — Video identifier
   * @param duration — Duration in ms
   * @returns Promise that resolves when "playback" completes
   */
  trigger(id: VideoId, duration: number): Promise<void> {
    return new Promise((resolve) => {
      log.info(`Video triggered: ${id} (${duration}ms) — Canvas 2D placeholder`);

      this.active.push({
        id,
        startTime: performance.now(),
        duration,
      });

      setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  /**
   * Render active video placeholders on the VFX canvas.
   * Called each frame from the game loop.
   */
  render(now: number): void {
    const ctx = this.canvasManager.getContext('vfx');
    if (!ctx) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this.active.length; i++) {
      const v = this.active[i];
      const elapsed = now - v.startTime;
      const progress = Math.min(elapsed / v.duration, 1);

      switch (v.id) {
        case 'copperFlood':
          this.renderCopperFlood(ctx, progress);
          break;
        case 'bellWave':
          this.renderBellWave(ctx, progress);
          break;
        case 'towerBurn':
          this.renderTowerBurn(ctx, progress);
          break;
        case 'mirrorShatter':
          this.renderMirrorShatter(ctx, progress);
          break;
      }

      if (progress >= 1) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.active.splice(toRemove[i], 1);
    }
  }

  /**
   * Clear all active videos and the VFX canvas.
   */
  clear(): void {
    this.active = [];
    this.canvasManager.clearLayer('vfx');
  }

  /* ───────── Placeholder Canvas 2D renders ───────── */

  private renderCopperFlood(ctx: CanvasRenderingContext2D, progress: number): void {
    // Copper liquid rising from bottom
    ctx.fillStyle = '#B87333';
    const height = progress * ctx.canvas.height;
    ctx.fillRect(0, ctx.canvas.height - height, ctx.canvas.width, height);

    // Surface ripple
    const surfaceY = ctx.canvas.height - height;
    ctx.strokeStyle = 'rgba(184,115,51,0.6)';
    ctx.lineWidth = 2;
    for (let ri = 0; ri < 3; ri++) {
      ctx.beginPath();
      ctx.moveTo(0, surfaceY + Math.sin(progress * 30 + ri) * 10);
      for (let x = 0; x <= ctx.canvas.width; x += 5) {
        ctx.lineTo(x, surfaceY + Math.sin(progress * 30 + ri) * 10 + Math.sin(x * 0.02 + progress * 20 + ri) * 5);
      }
      ctx.stroke();
    }
  }

  private renderBellWave(ctx: CanvasRenderingContext2D, _progress: number): void {
    // Concentric sound wave rings
    for (let i = 0; i < 5; i++) {
      const phase = (_progress + i * 0.2) % 1;
      const r = 50 + phase * 300;
      ctx.strokeStyle = `rgba(93,122,94,${0.5 * (1 - phase)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private renderTowerBurn(ctx: CanvasRenderingContext2D, progress: number): void {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height * 0.4;

    // Flame particles
    for (let i = 0; i < 20; i++) {
      const px = cx + Math.sin(progress * 10 + i * 1.5) * (30 + i * 3);
      const py = cy - progress * 200 + Math.cos(progress * 5 + i * 0.7) * 20;
      ctx.fillStyle = `rgba(182,66,50,${0.5 + ((i % 5) / 5) * 0.3})`;
      ctx.beginPath();
      ctx.arc(px, py, 5 + ((i * 7) % 10) * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderMirrorShatter(ctx: CanvasRenderingContext2D, progress: number): void {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    // Radiating shatter lines
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + progress;
      const len = progress * 200;
      ctx.strokeStyle = `rgba(200,166,90,${0.7 * (1 - progress)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(
        cx + Math.cos(angle) * len * 0.2,
        cy + Math.sin(angle) * len * 0.2,
      );
      ctx.lineTo(
        cx + Math.cos(angle) * len,
        cy + Math.sin(angle) * len,
      );
      ctx.stroke();
    }
  }
}
