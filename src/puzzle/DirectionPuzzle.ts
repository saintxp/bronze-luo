/**
 * 铜声·识洛 — Direction judgment puzzle
 *
 * Player observes environmental clues (cracks, tilt, ripples) to determine
 * which direction among N options is the correct one, then selects it.
 * Used in 地听 (eight dragon heads direction judgment).
 *
 * Progressive feedback: wrong selection shows tremor but no solve;
 * clues become clearer over time.
 */

import { PuzzleState } from "../utils/constants";
import { PuzzleBase, type PuzzleConfig } from "./PuzzleBase";

export interface DirectionPuzzleConfig extends PuzzleConfig {
	/** Number of direction options (e.g. 8 for octagonal compass) */
	optionCount: number;
	/** Index of the correct option (0-based) */
	correctIndex: number;
	/** How many clue levels to reveal before auto-highlight */
	clueLevels?: number;
}

export class DirectionPuzzle extends PuzzleBase {
	readonly optionCount: number;
	readonly correctIndex: number;
	readonly clueLevels: number;
	private _selectedIndex = -1;
	private _clueLevel = 0;
	private _progress = 0;
	private _wrongAttempts = 0;

	constructor(config: DirectionPuzzleConfig) {
		super(config);
		this.optionCount = config.optionCount;
		this.correctIndex = config.correctIndex;
		this.clueLevels = config.clueLevels ?? 3;
	}

	get selectedIndex(): number {
		return this._selectedIndex;
	}

	get clueLevel(): number {
		return this._clueLevel;
	}

	get wrongAttempts(): number {
		return this._wrongAttempts;
	}

	/**
	 * Select an option (0-based index).
	 * Returns the new state.
	 */
	select(index: number): PuzzleState {
		if (this._state === PuzzleState.SOLVED) return PuzzleState.SOLVED;
		if (index < 0 || index >= this.optionCount) return this._state;

		this._selectedIndex = index;

		if (index === this.correctIndex) {
			this._progress = 1;
			this.setState(PuzzleState.SOLVED);
			this.onSolve();
		} else {
			this._wrongAttempts++;
			// Shake feedback — state transitions to NEAR (trembling) then back
			this.setState(PuzzleState.NEAR);
			// Schedule auto-reset back to IDLE after a brief tremor
			setTimeout(() => {
				if (this._state === PuzzleState.NEAR && !this.solved) {
					this._state = PuzzleState.IDLE;
				}
			}, 600);
		}

		return this._state;
	}

	/**
	 * Advance clue level — called as timer reveals more hints.
	 * At max clue level, the correct option glows.
	 */
	advanceClue(): void {
		if (this._state === PuzzleState.SOLVED) return;
		if (this._clueLevel < this.clueLevels) {
			this._clueLevel++;
			this._progress = this._clueLevel / this.clueLevels;
		}
		if (this._clueLevel >= this.clueLevels) {
			// Auto-highlight at max clues — still requires player to click
			this.setState(PuzzleState.NEAR);
		}
	}

	checkAlignment(_params: Record<string, unknown>): PuzzleState {
		return this._state;
	}

	getProgressFeedback(): number {
		return this._progress;
	}

	onSolve(): void {
		// Subclasses can override
	}

	onReset(): void {
		this._selectedIndex = -1;
		this._clueLevel = 0;
		this._wrongAttempts = 0;
		this._progress = 0;
	}
}
