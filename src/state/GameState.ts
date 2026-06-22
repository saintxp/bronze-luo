/**
 * 铜声·识洛 — Game state manager
 *
 * Global singleton tracking current chapter, puzzle states, and tutorial progress.
 */

import { PuzzleState } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('GameState');

export interface PuzzleStatus {
  puzzleId: string;
  solved: boolean;
  state: PuzzleState;
}

export interface ChapterStatus {
  chapterId: string;
  completed: boolean;
  puzzles: Map<string, PuzzleStatus>;
}

class GameStateManager {
  private chapters = new Map<string, ChapterStatus>();
  private _currentChapterId: string | null = null;
  private _isTutorialComplete = false;

  get currentChapterId(): string | null {
    return this._currentChapterId;
  }

  get isTutorialComplete(): boolean {
    return this._isTutorialComplete;
  }

  set isTutorialComplete(v: boolean) {
    this._isTutorialComplete = v;
  }

  /**
   * Enter a chapter, setting it as the current active chapter.
   */
  enterChapter(chapterId: string): void {
    if (!this.chapters.has(chapterId)) {
      this.chapters.set(chapterId, {
        chapterId,
        completed: false,
        puzzles: new Map(),
      });
    }
    this._currentChapterId = chapterId;
    log.info(`Entered chapter: ${chapterId}`);
  }

  /**
   * Register a puzzle within the current chapter.
   */
  registerPuzzle(puzzleId: string): void {
    const chapter = this.chapters.get(this._currentChapterId ?? '');
    if (!chapter) return;

    chapter.puzzles.set(puzzleId, {
      puzzleId,
      solved: false,
      state: PuzzleState.IDLE,
    });
  }

  /**
   * Update puzzle status.
   */
  updatePuzzleState(puzzleId: string, state: PuzzleState): void {
    const chapter = this.chapters.get(this._currentChapterId ?? '');
    if (!chapter) return;

    const status = chapter.puzzles.get(puzzleId);
    if (!status) return;

    status.state = state;
    if (state === PuzzleState.SOLVED) {
      status.solved = true;
    }

    // Check if all puzzles in this chapter are solved
    const allSolved = Array.from(chapter.puzzles.values()).every(
      (p) => p.solved,
    );
    if (allSolved) {
      chapter.completed = true;
      log.info(`Chapter complete: ${this._currentChapterId}`);
    }
  }

  /**
   * Get the status for a specific puzzle.
   */
  getPuzzleStatus(puzzleId: string): PuzzleStatus | undefined {
    const chapter = this.chapters.get(this._currentChapterId ?? '');
    return chapter?.puzzles.get(puzzleId);
  }

  /**
   * Check if current chapter is complete.
   */
  isChapterComplete(): boolean {
    const chapter = this.chapters.get(this._currentChapterId ?? '');
    return chapter?.completed ?? false;
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.chapters.clear();
    this._currentChapterId = null;
    this._isTutorialComplete = false;
    log.info('GameState reset');
  }
}

export const gameState = new GameStateManager();
