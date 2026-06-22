/**
 * 铜声·识洛 — Rotation match puzzle
 *
 * Player rotates an element via arc-drag to match a target angle.
 * Used in Tutorial L3 (gears) and 瘦骨 (dual-force resonance).
 * 3-position snap limits precision requirement.
 */

import { PuzzleState, TUTORIAL_L3_SNAP_ANGLES, TUTORIAL_L3_ANGLE_TOLERANCE } from '../utils/constants';
import { PuzzleBase, type PuzzleConfig } from './PuzzleBase';
import { checkRotation, AlignmentResult } from '../engine/HitDetector';
import { angleDiff } from '../utils/math';

export interface RotationPuzzleConfig extends PuzzleConfig {
  snapAngles?: number[];
  tolerance?: number;
  startAngle?: number;
}

export class RotationPuzzle extends PuzzleBase {
  private snapAngles: number[];
  private tolerance: number;
  private _currentAngle: number;
  private _progress = 0;
  private _closestSnapIndex = -1;

  constructor(config: RotationPuzzleConfig) {
    super(config);
    this.snapAngles = config.snapAngles ?? TUTORIAL_L3_SNAP_ANGLES;
    this.tolerance = config.tolerance ?? TUTORIAL_L3_ANGLE_TOLERANCE;
    this._currentAngle = config.startAngle ?? 0;
  }

  get currentAngle(): number {
    return this._currentAngle;
  }

  get closestSnapIndex(): number {
    return this._closestSnapIndex;
  }

  /**
   * Set the current rotation angle and check alignment.
   * Call this each frame during arc-drag.
   */
  checkAlignment(params: Record<string, unknown>): PuzzleState {
    // SOLVED is terminal — no further alignment checks needed
    if (this._state === PuzzleState.SOLVED) return PuzzleState.SOLVED;

    const angle = params.angle as number | undefined;
    if (angle !== undefined) {
      this._currentAngle = angle;
    }

    const result = checkRotation(this._currentAngle, this.snapAngles, this.tolerance);

    // Track which snap angle is closest (for visual feedback)
    let minDist = Infinity;
    this._closestSnapIndex = -1;
    this.snapAngles.forEach((snap, i) => {
      const d = Math.abs(angleDiff(this._currentAngle, snap));
      if (d < minDist) {
        minDist = d;
        this._closestSnapIndex = i;
      }
    });

    switch (result) {
      case AlignmentResult.SNAPPED:
        this._progress = 1;
        this.setState(PuzzleState.SOLVED);
        this.onSolve();
        break;
      case AlignmentResult.NEAR:
        this._progress = Math.max(0.7, 1 - minDist / (this.tolerance * 2));
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
    // Snap to exact angle on solve
    if (this._closestSnapIndex >= 0) {
      this._currentAngle = this.snapAngles[this._closestSnapIndex];
    }
  }

  onReset(): void {
    this._currentAngle = 0;
    this._progress = 0;
    this._closestSnapIndex = -1;
  }
}
