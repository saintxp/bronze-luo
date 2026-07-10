/**
 * 铜声·识洛 — NestPuzzle unit tests
 *
 * Covers alignment detection, layer progression,
 * progress feedback, and state transitions.
 */

import { describe, it, expect } from 'vitest';
import { NestPuzzle, type NestLayer } from '../puzzle/NestPuzzle';
import { PuzzleState, SNAP_THRESHOLD } from '../utils/constants';

function makeLayers(count: number): NestLayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `layer-${i}`,
    offset: { x: 0, y: 0 },
    targetOffset: { x: 100 * (i + 1), y: 0 },
    holeRadius: 40 + i * 5,
  }));
}

describe('NestPuzzle', () => {
  describe('checkAlignment — single layer', () => {
    it('returns SOLVED when offset matches target exactly (single layer)', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-1',
        chapterId: 'grey',
        layers: makeLayers(1),
      });
      const result = puzzle.checkAlignment({ offset: { x: 100, y: 0 } });
      // Single layer: lock → solvedCount >= layers.length → SOLVED immediately
      expect(result).toBe(PuzzleState.SOLVED);
      expect(puzzle.solvedLayerCount).toBe(1);
      expect(puzzle.state).toBe(PuzzleState.SOLVED);
    });

    it('returns SOLVED within SNAP_THRESHOLD (single layer)', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-2',
        chapterId: 'grey',
        layers: makeLayers(1),
      });
      const nearTarget = { x: 100 - SNAP_THRESHOLD + 1, y: 0 };
      const result = puzzle.checkAlignment({ offset: nearTarget });
      expect(result).toBe(PuzzleState.SOLVED);
    });

    it('returns NEAR when offset is within NEAR_THRESHOLD but outside SNAP_THRESHOLD', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-3',
        chapterId: 'grey',
        layers: makeLayers(1),
      });
      // Default SNAP=30, NEAR=80. At offset x=100-40=60: distance=40 → outside snap (30), inside near (80)
      const nearTarget = { x: 60, y: 0 };
      const result = puzzle.checkAlignment({ offset: nearTarget });
      expect(result).toBe(PuzzleState.NEAR);
    });

    it('returns IDLE when offset is outside NEAR_THRESHOLD', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-4',
        chapterId: 'grey',
        layers: makeLayers(1),
      });
      // Distance 100 > NEAR_THRESHOLD (80)
      const farOffset = { x: 0, y: 0 };
      const result = puzzle.checkAlignment({ offset: farOffset });
      expect(result).toBe(PuzzleState.IDLE);
    });
  });

  describe('multi-layer progression', () => {
    it('locks layers one by one and reaches SOLVED when all done', () => {
      const layers = makeLayers(3);
      const puzzle = new NestPuzzle({
        id: 'nest-multi',
        chapterId: 'grey',
        layers,
      });

      expect(puzzle.currentLayerIndex).toBe(0);
      expect(puzzle.solvedLayerCount).toBe(0);

      // Solve layer 0 → SNAPPED (still has layers left)
      let result = puzzle.checkAlignment({ offset: { x: 100, y: 0 } });
      expect(result).toBe(PuzzleState.SNAPPED);
      expect(puzzle.solvedLayerCount).toBe(1);
      expect(puzzle.currentLayerIndex).toBe(1);

      // Solve layer 1 → SNAPPED (still has layers left)
      result = puzzle.checkAlignment({ offset: { x: 200, y: 0 } });
      expect(result).toBe(PuzzleState.SNAPPED);
      expect(puzzle.solvedLayerCount).toBe(2);
      expect(puzzle.currentLayerIndex).toBe(2);

      // Solve layer 2 — last layer → SOLVED
      result = puzzle.checkAlignment({ offset: { x: 300, y: 0 } });
      expect(result).toBe(PuzzleState.SOLVED);
      expect(puzzle.solvedLayerCount).toBe(3);
      expect(puzzle.state).toBe(PuzzleState.SOLVED);
    });

    it('only the current (unlocked) layer responds to alignment checks', () => {
      const layers = makeLayers(2);
      const puzzle = new NestPuzzle({
        id: 'nest-lock',
        chapterId: 'grey',
        layers,
      });

      // Solve layer 0
      puzzle.checkAlignment({ offset: { x: 100, y: 0 } });
      expect(puzzle.solvedLayerCount).toBe(1);

      // Layer 0 is now locked — currentLayerIndex = 1, which is layer 1.
      // Moving to {0,0} checks layer 1's alignment. Layer 1 target is {200,0}.
      // Distance 200 >> NEAR_THRESHOLD, so it's IDLE. Solved count should not increase.
      puzzle.checkAlignment({ offset: { x: 0, y: 0 } });
      expect(puzzle.solvedLayerCount).toBe(1);
    });
  });

  describe('SOLVED is terminal', () => {
    it('returns SOLVED for any further checkAlignment calls', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-terminal',
        chapterId: 'grey',
        layers: makeLayers(1),
      });

      // Single layer → SOLVED immediately
      expect(puzzle.state).toBe(PuzzleState.IDLE);
      puzzle.checkAlignment({ offset: { x: 100, y: 0 } });
      expect(puzzle.state).toBe(PuzzleState.SOLVED);

      // Further calls should still return SOLVED
      const result = puzzle.checkAlignment({ offset: { x: 0, y: 0 } });
      expect(result).toBe(PuzzleState.SOLVED);
      expect(puzzle.state).toBe(PuzzleState.SOLVED);
    });
  });

  describe('progress feedback', () => {
    it('returns 0 when all layers are at initial offset', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-progress-0',
        chapterId: 'grey',
        layers: makeLayers(3),
      });
      expect(puzzle.getProgressFeedback()).toBe(0);
    });

    it('returns 1 when all layers are solved', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-progress-1',
        chapterId: 'grey',
        layers: makeLayers(2),
      });
      puzzle.checkAlignment({ offset: { x: 100, y: 0 } });
      puzzle.checkAlignment({ offset: { x: 200, y: 0 } });
      expect(puzzle.getProgressFeedback()).toBe(1);
    });

    it('returns intermediate values as layers progress', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-progress-mid',
        chapterId: 'grey',
        layers: makeLayers(2),
      });

      // After solving layer a: progress = 1/2 + 0 = 0.5
      puzzle.checkAlignment({ offset: { x: 100, y: 0 } });
      const progress = puzzle.getProgressFeedback();
      expect(progress).toBeGreaterThanOrEqual(0.5);
      expect(progress).toBeLessThan(1);
    });
  });

  describe('onSolve', () => {
    it('snaps all layer offsets to their exact target positions', () => {
      const layers = makeLayers(2);
      const puzzle = new NestPuzzle({
        id: 'nest-onSolve',
        chapterId: 'grey',
        layers,
      });

      puzzle.checkAlignment({ offset: { x: 100, y: 0 } });
      puzzle.checkAlignment({ offset: { x: 200, y: 0 } });
      expect(puzzle.state).toBe(PuzzleState.SOLVED);

      // Verify via internal snapshot (constructor shallow-copies layers)
      const snapped = puzzle.layersSnapshot;
      for (let i = 0; i < snapped.length; i++) {
        expect(snapped[i].offset.x).toBe(layers[i].targetOffset.x);
        expect(snapped[i].offset.y).toBe(layers[i].targetOffset.y);
      }
    });
  });

  describe('onReset', () => {
    it('resets all layers to zero offset and currentLayerIndex to 0', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-reset',
        chapterId: 'grey',
        layers: makeLayers(3),
      });

      puzzle.checkAlignment({ offset: { x: 100, y: 0 } });
      puzzle.checkAlignment({ offset: { x: 200, y: 0 } });
      expect(puzzle.solvedLayerCount).toBe(2);

      puzzle.reset();
      expect(puzzle.solvedLayerCount).toBe(0);
      expect(puzzle.currentLayerIndex).toBe(0);
      expect(puzzle.state).toBe(PuzzleState.IDLE);
    });
  });

  describe('edge cases', () => {
    it('handles empty layer array', () => {
      const puzzle = new NestPuzzle({
        id: 'nest-empty',
        chapterId: 'grey',
        layers: [],
      });
      expect(puzzle.state).toBe(PuzzleState.IDLE);
      expect(puzzle.totalLayers).toBe(0);
      expect(puzzle.currentLayer).toBeNull();
    });

    it('supports per-layer threshold overrides', () => {
      const layer: NestLayer = {
        id: 'tight',
        offset: { x: 0, y: 0 },
        targetOffset: { x: 100, y: 0 },
        holeRadius: 40,
        snapThreshold: 5,  // very tight snap
        nearThreshold: 15, // very tight near
      };
      const puzzle = new NestPuzzle({
        id: 'nest-tight',
        chapterId: 'grey',
        layers: [layer],
      });

      // At offset {92,0}: distance 8. snap=5, near=15. 5 < 8 < 15 → NEAR
      let result = puzzle.checkAlignment({ offset: { x: 92, y: 0 } });
      expect(result).toBe(PuzzleState.NEAR);

      // At offset {98,0}: distance 2. 2 < 5 → SOLVED (single layer)
      result = puzzle.checkAlignment({ offset: { x: 98, y: 0 } });
      expect(result).toBe(PuzzleState.SOLVED);
    });
  });
});
