/**
 * 铜声·识洛 — Multi-layer Canvas manager
 *
 * Manages 5 stacked canvases: BG, Puzzle, VFX, UI, Map.
 * Handles creation, sizing, DPR scaling, and CSS stacking.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, LayerZ } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('CanvasManager');

export type CanvasLayer = 'bg' | 'puzzle' | 'vfx' | 'ui' | 'map';

const LAYER_NAMES: CanvasLayer[] = ['bg', 'puzzle', 'vfx', 'ui', 'map'];

const LAYER_Z: Record<CanvasLayer, LayerZ> = {
  bg: LayerZ.BG,
  puzzle: LayerZ.Puzzle,
  vfx: LayerZ.VFX,
  ui: LayerZ.UI,
  map: LayerZ.Map,
};

export interface ManagedCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  layer: CanvasLayer;
  z: number;
  dirty: boolean;
}

export class CanvasManager {
  private canvases = new Map<CanvasLayer, ManagedCanvas>();
  private container: HTMLElement | null = null;
  private _width = CANVAS_WIDTH;
  private _height = CANVAS_HEIGHT;

  get width(): number {
    return this._width;
  }
  get height(): number {
    return this._height;
  }

  /**
   * Initialize all canvas layers inside a container element.
   */
  init(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Canvas container #${containerId} not found`);
    }
    this.container = container;

    // Ensure container is positioned (for absolute stacking)
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    for (const name of LAYER_NAMES) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(`Failed to get 2d context for ${name} canvas`);

      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.zIndex = String(LAYER_Z[name]);
      // Puzzle layer captures pointer events; other layers pass through
      canvas.style.pointerEvents = 'none';

      container.appendChild(canvas);

      this.canvases.set(name, {
        canvas,
        ctx,
        layer: name,
        z: LAYER_Z[name],
        dirty: true,
      });
    }

    this.resize();
    log.info('CanvasManager initialized with 5 layers');
  }

  /**
   * Resize all canvases to fill container while maintaining aspect ratio.
   * Internal resolution is fixed at CANVAS_WIDTH × CANVAS_HEIGHT (1920×1080);
   * CSS scales and centers the display.
   */
  resize(): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Fixed logical resolution — all game rendering uses these coordinates
    this._width = CANVAS_WIDTH;
    this._height = CANVAS_HEIGHT;

    // Scale to fit container while preserving 16:9 aspect ratio
    const scaleX = rect.width / CANVAS_WIDTH;
    const scaleY = rect.height / CANVAS_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const displayW = Math.round(CANVAS_WIDTH * scale);
    const displayH = Math.round(CANVAS_HEIGHT * scale);

    for (const [, mc] of this.canvases) {
      mc.canvas.width = Math.round(CANVAS_WIDTH * dpr);
      mc.canvas.height = Math.round(CANVAS_HEIGHT * dpr);
      mc.canvas.style.width = `${displayW}px`;
      mc.canvas.style.height = `${displayH}px`;
      // Reset and re-apply DPR scaling (clear any previous transform)
      mc.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mc.dirty = true;
    }

    // Center the canvas block in the container
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';

    log.info(`Resized: logical ${CANVAS_WIDTH}×${CANVAS_HEIGHT}, display ${displayW}×${displayH} @${dpr}x`);
  }

  /**
   * Get a managed canvas by layer name.
   */
  getLayer(layer: CanvasLayer): ManagedCanvas | undefined {
    return this.canvases.get(layer);
  }

  /**
   * Get the 2D context for a layer.
   */
  getContext(layer: CanvasLayer): CanvasRenderingContext2D | undefined {
    return this.canvases.get(layer)?.ctx;
  }

  /**
   * Clear a specific canvas layer.
   */
  clearLayer(layer: CanvasLayer): void {
    const mc = this.canvases.get(layer);
    if (!mc) return;
    mc.ctx.clearRect(0, 0, this._width, this._height);
    mc.dirty = true;
  }

  /**
   * Clear all canvas layers.
   */
  clearAll(): void {
    for (const name of LAYER_NAMES) {
      this.clearLayer(name);
    }
  }

  /**
   * Mark a layer as dirty (needs re-render).
   */
  markDirty(layer: CanvasLayer): void {
    this.canvases.get(layer)!.dirty = true;
  }

  /**
   * Destroy all canvases and clean up.
   */
  destroy(): void {
    for (const [, mc] of this.canvases) {
      mc.canvas.remove();
    }
    this.canvases.clear();
    this.container = null;
    log.info('CanvasManager destroyed');
  }
}
