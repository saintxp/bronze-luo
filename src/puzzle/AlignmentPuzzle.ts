/**
 * 铜声·识洛 — Drag-to-align puzzle
 *
 * The core puzzle type used in ~90% of all puzzles.
 * Player drags an element until it aligns with a target region.
 */

import { type Vec2, type Rect, vec2Distance, rectCenter } from '../utils/math';
import { PuzzleState, SNAP_THRESHOLD, NEAR_THRESHOLD } from '../utils/constants';
import { PuzzleBase, type PuzzleConfig } from './PuzzleBase';
import { checkAlignment, AlignmentResult } from '../engine/HitDetector';

export interface AlignmentPuzzleConfig extends PuzzleConfig {
  targetRect: Rect;
  snapThreshold?: number;
  nearThreshold?: number;
}

export class AlignmentPuzzle extends PuzzleBase {
  private targetRect: Rect;
  private snapThreshold: number;
  private nearThreshold: number;
  private _progress = 0;

  constructor(config: AlignmentPuzzleConfig) {
    super(config);
    this.targetRect = config.targetRect;
    this.snapThreshold = config.snapThreshold ?? SNAP_THRESHOLD;
    this.nearThreshold = config.nearThreshold ?? NEAR_THRESHOLD;
  }

  /**
   * Update drag position and check alignment.
   * Call this each frame during drag.
   */
  checkAlignment(params: Record<string, unknown>): PuzzleState {
    // SOLVED is terminal — no further alignment checks needed
    if (this._state === PuzzleState.SOLVED) return PuzzleState.SOLVED;

    const pos = params.pos as Vec2 | undefined;
    if (!pos) return this._state;

    const result = checkAlignment(pos, this.targetRect, this.snapThreshold, this.nearThreshold);

    switch (result) {
      case AlignmentResult.SNAPPED:
        this._progress = 1;
        this.setState(PuzzleState.SOLVED);
        this.onSolve();
        break;
      case AlignmentResult.NEAR:
        // Progress scales from near-threshold down to snap-threshold
        const dist = vec2Distance(pos, rectCenter(this.targetRect));
        this._progress = Math.max(
          0.8,
          1 - (dist - this.snapThreshold) / (this.nearThreshold - this.snapThreshold),
        );
        this.setState(PuzzleState.NEAR);
        break;
      case AlignmentResult.MISALIGNED:
        this._progress = 0;
        this.setState(PuzzleState.IDLE);
        break;
    }

    return this._state;
  }

  getProgressFeedback(): number {
    return this._progress;
  }

  onSolve(): void {
    // Subclasses can override for solve effects (snap anim, sound, etc.)
  }

  onReset(): void {
    this._progress = 0;
  }
}
