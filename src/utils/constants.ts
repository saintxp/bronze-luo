/**
 * 铜声·识洛 — Game constants
 *
 * Centralized constants. No magic numbers anywhere in the codebase.
 * All canvas dimensions, thresholds, Z-indices, and timing values live here.
 */

/* ───────── Canvas ───────── */
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

/* ───────── Layer Z-order (CSS stacking for HTML canvases) ───────── */
export const enum LayerZ {
  BG = 0,
  Puzzle = 1,
  VFX = 2,
  UI = 3,
  Map = 4,
}

/* ───────── Drag & Snap ───────── */
export const SNAP_THRESHOLD = 30; // px — distance to snap
export const SNAP_THRESHOLD_MOBILE = 36; // px — 20% larger for touch
export const NEAR_THRESHOLD = 80; // px — distance to show "near" feedback

/* ───────── Animation ───────── */
export const ANIM_SNAP_DURATION = 200; // ms — snap animation
export const ANIM_SOLVE_DURATION = 600; // ms — puzzle solve animation
export const ANIM_TRANSITION_DURATION = 800; // ms — scene transition
export const ANIM_FADE_DURATION = 300; // ms — fade in/out
export const DEFAULT_FRAME_RATE = 60; // fps

/* ───────── Tutorial Constants ───────── */
export const TUTORIAL_L1_DOOR_W = 180;
export const TUTORIAL_L1_DOOR_H = 360;
export const TUTORIAL_L1_FRAME_W = 200;
export const TUTORIAL_L1_FRAME_H = 400;
export const TUTORIAL_L1_TARGET: [number, number] = [860, 340]; // door frame center

export const TUTORIAL_L2_HOLE_RADIUS = 60; // px — hole in foreground layer
export const TUTORIAL_L2_LAYER_PAN_SPEED = 1; // px per pixel of drag
export const TUTORIAL_L2_SCALE_TRIGGER = 0.85; // alignment ratio to trigger zoom

export const TUTORIAL_L3_GEAR_RADIUS = 100; // px
export const TUTORIAL_L3_SNAP_ANGLES = [
  0,
  Math.PI / 4,
  Math.PI / 2,
  (3 * Math.PI) / 4,
  Math.PI,
  (-3 * Math.PI) / 4,
  -Math.PI / 2,
  -Math.PI / 4,
]; // all 8 positions matching 8-tooth gear symmetry (45° period)
export const TUTORIAL_L3_ANGLE_TOLERANCE = Math.PI / 12; // 15° tolerance

/* ───────── Puzzle State ───────── */
export const enum PuzzleState {
  IDLE = 'IDLE',
  DRAGGING = 'DRAGGING',
  NEAR = 'NEAR',
  SNAPPED = 'SNAPPED',
  SOLVED = 'SOLVED',
}

/* ───────── Chapter IDs ───────── */
export const CHAPTER_TUTORIAL = 'tutorial';
export const CHAPTER_PROLOGUE = 'prologue';
export const CHAPTER_ERLITOU = 'erlitou';
export const CHAPTER_GREY = 'grey';
export const CHAPTER_ZHOU = 'zhou';
export const CHAPTER_HAN = 'han';
export const CHAPTER_CAOWEI = 'caowei';
export const CHAPTER_WEI = 'wei';
export const CHAPTER_TANG = 'tang';
export const CHAPTER_EPILOGUE = 'epilogue';

/* ───────── Storage ───────── */
export const SAVE_KEY = 'bronze-luo-save';
export const STAMP_KEY = 'bronze-luo-stamps';
