/**
 * 铜声·识洛 — Hit detection & alignment math
 *
 * Core collision/snap/rotation detection used by all puzzle types.
 * All coordinates in logical canvas space (1920×1080).
 */

import { type Vec2, type Rect, vec2Distance, rectCenter, angleDiff } from '../utils/math';

export const enum AlignmentResult {
  MISALIGNED = 'MISALIGNED',
  NEAR = 'NEAR',
  SNAPPED = 'SNAPPED',
}

/**
 * Check alignment of a drag point against a target rectangle.
 *
 * @param dragPos  Current drag position (element center, typically)
 * @param target   Target rectangle
 * @param snapThreshold  Pixel distance to snap
 * @param nearThreshold  Pixel distance to show "near" feedback
 * @returns AlignmentResult
 */
export function checkAlignment(
  dragPos: Vec2,
  target: Rect,
  snapThreshold: number,
  nearThreshold: number,
): AlignmentResult {
  const dist = vec2Distance(dragPos, rectCenter(target));

  if (dist <= snapThreshold) return AlignmentResult.SNAPPED;
  if (dist <= nearThreshold) return AlignmentResult.NEAR;
  return AlignmentResult.MISALIGNED;
}

/**
 * Check rotation alignment against an array of snap angles.
 *
 * @param currentAngle  Current rotation angle in radians
 * @param snapAngles    Array of target angles to snap to
 * @param tolerance     Max angular distance to snap (radians)
 * @returns AlignmentResult
 */
export function checkRotation(
  currentAngle: number,
  snapAngles: number[],
  tolerance: number,
): AlignmentResult {
  let minDist = Infinity;

  for (const snap of snapAngles) {
    const dist = Math.abs(angleDiff(currentAngle, snap));
    if (dist < minDist) minDist = dist;
  }

  if (minDist <= tolerance) return AlignmentResult.SNAPPED;
  if (minDist <= tolerance * 2) return AlignmentResult.NEAR;
  return AlignmentResult.MISALIGNED;
}
