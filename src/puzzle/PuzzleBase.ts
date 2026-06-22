/**
 * 铜声·识洛 — Puzzle base class
 *
 * All puzzle types inherit from this abstract class.
 * Each puzzle has its own FSM: IDLE → DRAGGING → NEAR → SNAPPED → SOLVED
 */

import { PuzzleState } from '../utils/constants';
import { eventBus } from '../utils/EventBus';
import { createLogger } from '../utils/logger';

const log = createLogger('PuzzleBase');

export interface PuzzleConfig {
  id: string;
  chapterId: string;
}

export abstract class PuzzleBase {
  readonly id: string;
  readonly chapterId: string;
  protected _state: PuzzleState = PuzzleState.IDLE;

  constructor(config: PuzzleConfig) {
    this.id = config.id;
    this.chapterId = config.chapterId;
  }

  get state(): PuzzleState {
    return this._state;
  }

  get solved(): boolean {
    return this._state === PuzzleState.SOLVED;
  }

  /**
   * Check if the puzzle is in a solved state.
   * Called by ChapterBase to determine chapter completion.
   */
  abstract checkAlignment(params: Record<string, unknown>): PuzzleState;

  /**
   * Get a progress indicator (0..1) for feedback rendering.
   */
  abstract getProgressFeedback(): number;

  /**
   * Called when the puzzle is solved.
   */
  abstract onSolve(): void | Promise<void>;

  /**
   * Reset puzzle to initial state.
   */
  abstract onReset(): void;

  /**
   * Update state with transition logging.
   */
  protected setState(newState: PuzzleState): void {
    if (this._state === newState) return;
    // SOLVED is a terminal state — only reset() can exit it
    if (this._state === PuzzleState.SOLVED) return;
    const prev = this._state;
    this._state = newState;
    log.debug(`[${this.id}] ${prev} → ${newState}`);

    if (newState === PuzzleState.SOLVED) {
      eventBus.emit('puzzle:solved', {
        chapterId: this.chapterId,
        puzzleId: this.id,
      });
    }
  }

  /**
   * Reset state to IDLE.
   */
  reset(): void {
    this._state = PuzzleState.IDLE;
    this.onReset();
  }
}
