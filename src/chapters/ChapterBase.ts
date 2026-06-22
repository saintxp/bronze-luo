/**
 * 铜声·识洛 — Chapter base class
 *
 * Lifecycle: init → enter → (update loop) → exit
 * Each chapter runs puzzles in sequence.
 */

import { type PuzzleBase } from '../puzzle/PuzzleBase';
import { gameState } from '../state/GameState';
import { eventBus } from '../utils/EventBus';
import { createLogger } from '../utils/logger';

const log = createLogger('ChapterBase');

export abstract class ChapterBase {
  readonly id: string;
  protected puzzles: PuzzleBase[] = [];
  protected currentPuzzleIndex = 0;
  protected _entered = false;

  constructor(id: string) {
    this.id = id;
  }

  get entered(): boolean {
    return this._entered;
  }

  get currentPuzzle(): PuzzleBase | null {
    return this.puzzles[this.currentPuzzleIndex] ?? null;
  }

  get isComplete(): boolean {
    return this.puzzles.every((p) => p.solved);
  }

  /**
   * Initialize chapter — create puzzles, register with GameState.
   */
  abstract init(): void;

  /**
   * Enter the chapter — start the first puzzle.
   */
  enter(): void {
    this._entered = true;
    gameState.enterChapter(this.id);
    this.currentPuzzleIndex = 0;
    log.info(`Chapter entered: ${this.id}`);
  }

  /**
   * Exit the chapter — clean up.
   */
  exit(): void {
    this._entered = false;
    log.info(`Chapter exited: ${this.id}`);
  }

  /**
   * Called every frame when this chapter is active.
   */
  update(_dt: number): void {
    // Subclasses can override for per-frame logic
  }

  /**
   * Advance to the next puzzle in sequence.
   */
  protected advanceToNextPuzzle(): void {
    if (this.currentPuzzleIndex < this.puzzles.length - 1) {
      this.currentPuzzleIndex++;
      log.info(
        `[${this.id}] Advance to puzzle ${this.currentPuzzleIndex}: ${this.currentPuzzle?.id}`,
      );
    } else {
      this.onChapterComplete();
    }
  }

  /**
   * Called when all puzzles in this chapter are solved.
   */
  protected onChapterComplete(): void {
    eventBus.emit('chapter:complete', { chapterId: this.id });
    log.info(`Chapter complete: ${this.id}`);
  }
}
