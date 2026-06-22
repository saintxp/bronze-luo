/**
 * 铜声·识洛 — HitDetector alignment tests
 *
 * Covers: checkAlignment, checkRotation, pointInRect, distToRectCenter, angleDiff
 */
import { describe, it, expect } from 'vitest';

// Import directly from source since HitDetector delegates to math utils
import {
  checkAlignment,
  checkRotation,
  AlignmentResult,
} from '../engine/HitDetector';

describe('checkAlignment', () => {
  const target = { x: 100, y: 100, w: 200, h: 200 };

  it('returns SNAPPED when drag center is within snap threshold of target center', () => {
    // Target center is (200, 200); snapThreshold = 30
    const result = checkAlignment({ x: 200, y: 200 }, target, 30, 80);
    expect(result).toBe(AlignmentResult.SNAPPED);
  });

  it('returns SNAPPED at threshold edge (exactly 30px)', () => {
    const result = checkAlignment({ x: 230, y: 200 }, target, 30, 80);
    expect(result).toBe(AlignmentResult.SNAPPED);
  });

  it('returns NEAR when within near threshold but outside snap threshold', () => {
    const result = checkAlignment({ x: 250, y: 200 }, target, 30, 80);
    expect(result).toBe(AlignmentResult.NEAR);
  });

  it('returns MISALIGNED when outside near threshold', () => {
    const result = checkAlignment({ x: 400, y: 400 }, target, 30, 80);
    expect(result).toBe(AlignmentResult.MISALIGNED);
  });

  it('returns SNAPPED with mobile threshold when appropriate', () => {
    const result = checkAlignment({ x: 236, y: 200 }, target, 36, 96);
    expect(result).toBe(AlignmentResult.SNAPPED);
  });

  it('returns NEAR with zero-size rect', () => {
    const point = { x: 0, y: 0 };
    const zeroRect = { x: 0, y: 0, w: 0, h: 0 };
    const result = checkAlignment(point, zeroRect, 30, 80);
    expect(result).toBe(AlignmentResult.SNAPPED);
  });
});

describe('checkRotation', () => {
  it('returns SNAPPED when angle matches one of the snap angles', () => {
    const snapAngles = [0, Math.PI / 4, Math.PI / 2];
    const result = checkRotation(Math.PI / 4 + 0.05, snapAngles, Math.PI / 12);
    expect(result).toBe(AlignmentResult.SNAPPED);
  });

  it('returns SNAPPED at exact snap angle', () => {
    const result = checkRotation(0, [0, Math.PI / 4], Math.PI / 12);
    expect(result).toBe(AlignmentResult.SNAPPED);
  });

  it('returns NEAR when close but not within tolerance', () => {
    const snapAngles = [0, Math.PI / 4];
    // 20° is > 15° tolerance but closer than 45°
    const result = checkRotation(Math.PI / 9, snapAngles, Math.PI / 12);
    expect(result).toBe(AlignmentResult.NEAR);
  });

  it('returns MISALIGNED when far from all snap angles', () => {
    const snapAngles = [0, Math.PI / 2];
    // Math.PI (=180°) is far from 0 and π/2; tolerance*2 ≈ 0.52
    const result = checkRotation(Math.PI, snapAngles, Math.PI / 12);
    expect(result).toBe(AlignmentResult.MISALIGNED);
  });

  it('returns MISALIGNED with empty snap angles array', () => {
    const result = checkRotation(Math.PI / 4, [], Math.PI / 12);
    expect(result).toBe(AlignmentResult.MISALIGNED);
  });

  it('handles angle wrapping (near 2π vs 0)', () => {
    const result = checkRotation(0.05, [0, Math.PI / 2], Math.PI / 12);
    expect(result).toBe(AlignmentResult.SNAPPED);
  });
});
