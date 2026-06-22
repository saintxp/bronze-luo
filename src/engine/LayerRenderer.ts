/**
 * 铜声·识洛 — Layer renderer
 *
 * Thin rendering API over CanvasManager.
 * Provides renderLayer, renderLayerWithTransform, and clearLayer helpers.
 */

import { type CanvasManager, type CanvasLayer } from './CanvasManager';

export class LayerRenderer {
  private canvasManager: CanvasManager;

  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager;
  }

  /**
   * Clear a specific layer.
   */
  clear(layer: CanvasLayer): void {
    this.canvasManager.clearLayer(layer);
  }

  /**
   * Render a callback onto a layer.
   * The callback receives the 2D context.
   */
  render(layer: CanvasLayer, drawFn: (ctx: CanvasRenderingContext2D) => void): void {
    const ctx = this.canvasManager.getContext(layer);
    if (!ctx) return;

    ctx.save();
    drawFn(ctx);
    ctx.restore();

    this.canvasManager.markDirty(layer);
  }

  /**
   * Render with a transform applied.
   */
  renderTransformed(
    layer: CanvasLayer,
    transform: { dx?: number; dy?: number; scale?: number; rotation?: number },
    drawFn: (ctx: CanvasRenderingContext2D) => void,
  ): void {
    const ctx = this.canvasManager.getContext(layer);
    if (!ctx) return;

    ctx.save();
    ctx.translate(transform.dx ?? 0, transform.dy ?? 0);
    if (transform.scale && transform.scale !== 1) {
      ctx.scale(transform.scale, transform.scale);
    }
    if (transform.rotation) {
      ctx.rotate(transform.rotation);
    }
    drawFn(ctx);
    ctx.restore();

    this.canvasManager.markDirty(layer);
  }
}
