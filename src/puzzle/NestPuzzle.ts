/**
 * 铜声·识洛 — Nested layer puzzle
 *
 * Player pans each layer to align its "hole" with the content behind it.
 * When a hole aligns (distance < SNAP_THRESHOLD), the layer locks and
 * the next layer becomes active. All layers locked → SOLVED.
 *
 * Used in: 灰页·悬置商 (Grey Page — crack nesting, 5 layers).
 * Derives from Tutorial L2's layer-pan mechanic.
 *
 * FSM per layer: IDLE → DRAGGING → NEAR → SNAPPED → (next layer)
 * Overall FSM:    IDLE → {per-layer states} → SOLVED
 */

import { type Vec2, vec2Distance } from '../utils/math';
import { PuzzleState, SNAP_THRESHOLD, NEAR_THRESHOLD } from '../utils/constants';
import { PuzzleBase, type PuzzleConfig } from './PuzzleBase';
import { createLogger } from '../utils/logger';

const log = createLogger('NestPuzzle');

export interface NestLayer {
  id: string;
  offset: Vec2;          // current pan offset (mutated during drag)
  targetOffset: Vec2;    // correct offset for alignment
  holeRadius: number;    // visual hole radius (px)
  snapThreshold?: number;  // per-layer override
  nearThreshold?: number;  // per-layer override
}

export interface NestPuzzleConfig extends PuzzleConfig {
  layers: NestLayer[];
  snapThreshold?: number;
  nearThreshold?: number;
}

export class NestPuzzle extends PuzzleBase {
  private layers: NestLayer[];
  private _currentLayerIndex: number;
  private _solvedLayerCount: number;
  private snapThreshold: number;
  private nearThreshold: number;

  constructor(config: NestPuzzleConfig) {
    super(config);
    this.layers = config.layers.map((l) => ({ ...l, offset: { ...l.offset } }));
    this.snapThreshold = config.snapThreshold ?? SNAP_THRESHOLD;
    this.nearThreshold = config.nearThreshold ?? NEAR_THRESHOLD;
    this._currentLayerIndex = 0;
    this._solvedLayerCount = 0;
  }

  get currentLayerIndex(): number {
    return this._currentLayerIndex;
  }

  get solvedLayerCount(): number {
    return this._solvedLayerCount;
  }

  get totalLayers(): number {
    return this.layers.length;
  }

  /**
   * Read-only snapshot of internal layers (testing/debugging).
   */
  get layersSnapshot(): ReadonlyArray<Readonly<NestLayer>> {
    return this.layers;
  }

  /**
   * Get the currently active (draggable) layer, or null if all done.
   */
  get currentLayer(): NestLayer | null {
    return this._currentLayerIndex < this.layers.length
      ? this.layers[this._currentLayerIndex]
      : null;
  }

  /**
   * Check alignment for the current layer.
   * Call each frame during layer-pan drag.
   *
   * @param params — expects { offset: Vec2 } (current pan offset)
   */
  checkAlignment(params: Record<string, unknown>): PuzzleState {
    if (this._state === PuzzleState.SOLVED) return PuzzleState.SOLVED;

    const offset = params.offset as Vec2 | undefined;
    if (!offset) return this._state;

    const layer = this.currentLayer;
    if (!layer) return this._state;

    // Update current layer's offset
    layer.offset = { ...offset };

    // Calculate distance from current offset to target
    const dist = vec2Distance(
      { x: layer.offset.x, y: layer.offset.y },
      { x: layer.targetOffset.x, y: layer.targetOffset.y },
    );

    const snapThresh = layer.snapThreshold ?? this.snapThreshold;
    const nearThresh = layer.nearThreshold ?? this.nearThreshold;

    if (dist < snapThresh) {
      return this.lockCurrentLayer();
    }

    if (dist < nearThresh) {
      this.setState(PuzzleState.NEAR);
      return this._state;
    }

    this.setState(PuzzleState.IDLE);
    return this._state;
  }

  /**
   * Lock the current layer and advance to the next.
   * If all layers are locked, the puzzle is SOLVED.
   */
  private lockCurrentLayer(): PuzzleState {
    this._solvedLayerCount++;
    this._currentLayerIndex++;

    if (this._solvedLayerCount >= this.layers.length) {
      log.info(`[${this.id}] All ${this.layers.length} layers nested — SOLVED`);
      this.setState(PuzzleState.SOLVED);
      this.onSolve();
      return PuzzleState.SOLVED;
    }

    log.info(`[${this.id}] Layer ${this._solvedLayerCount}/${this.layers.length} locked`);
    this.setState(PuzzleState.SNAPPED);
    return PuzzleState.SNAPPED;
  }

  getProgressFeedback(): number {
    if (this._state === PuzzleState.SOLVED) return 1;
    // Progress = (solved layers / total) + current layer progress
    const base = this._solvedLayerCount / this.layers.length;
    const layer = this.currentLayer;
    if (!layer) return base;

    const dist = vec2Distance(
      { x: layer.offset.x, y: layer.offset.y },
      { x: layer.targetOffset.x, y: layer.targetOffset.y },
    );

    const nearThresh = layer.nearThreshold ?? this.nearThreshold;

    if (dist < nearThresh) {
      // Count this layer's progress toward snap
      const snapThresh = layer.snapThreshold ?? this.snapThreshold;
      const layerProgress = Math.max(0, 1 - (dist - snapThresh) / (nearThresh - snapThresh));
      return base + layerProgress / this.layers.length;
    }

    return base;
  }

  onSolve(): void {
    // Snap all layers to their exact target positions
    for (const layer of this.layers) {
      layer.offset = { ...layer.targetOffset };
    }
  }

  onReset(): void {
    this._currentLayerIndex = 0;
    this._solvedLayerCount = 0;
    for (const layer of this.layers) {
      layer.offset = { x: 0, y: 0 };
    }
  }
}
