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
export enum LayerZ {
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

/* ───────── UI ───────── */
export const POPUP_DISPLAY_DURATION = 2000; // ms — definition popup visible time
export const STAMP_SIZE = 60; // px — stamp square size

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
export enum PuzzleState {
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

/* ───────── Chapter Color Palettes ───────── */
// Source: 资产/Seedream_Seedance_提示词手册.md §色彩体系 + CLAUDE.md InkView tokens
// Each chapter has primary, secondary, accent, and background colors.

export interface ChapterPalette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  /** Atmospheric keyword for art direction */
  mood: string;
}

export const CHAPTER_PALETTE: Record<string, ChapterPalette> = {
  tutorial: {
    primary: '#2a2723',   // ink line
    secondary: '#f6f1e6', // paper
    accent: '#2a2723',
    bg: '#fffaf0',        // paper white
    mood: '极简线稿，古籍插图',
  },
  prologue: {
    primary: '#8B6F47',   // warm brown
    secondary: '#B87333', // copper gold
    accent: '#C8A65A',    // gold
    bg: '#f6f1e6',
    mood: '时间沉淀、古旧册子',
  },
  erlitou: {
    primary: '#D4A843',   // copper gold
    secondary: '#4A9B9B', // turquoise
    accent: '#B87333',    // ancient copper
    bg: '#f6f1e6',
    mood: '铸造、矿脉、液态金属',
  },
  grey: {
    primary: '#6B6B6B',   // smoke grey
    secondary: '#8B7355', // dark gold
    accent: '#8B7355',
    bg: '#2a2723',        // near-black
    mood: '悬置、沉睡、茧',
  },
  zhou: {
    primary: '#5D7A5E',   // bronze green
    secondary: '#F5F0E8', // ritual white
    accent: '#C8A65A',    // gold
    bg: '#f6f1e6',
    mood: '礼制秩序、编钟音色',
  },
  han: {
    primary: '#C23B22',   // vermillion
    secondary: '#1A1A18', // pitch black
    accent: '#D4A843',    // gold
    bg: '#1A1A18',
    mood: '火焰、夜空、星辰',
  },
  caowei: {
    primary: '#8B8070',   // ash
    secondary: '#B78642', // ochre
    accent: '#B78642',
    bg: '#f6f1e6',
    mood: '废墟、诗稿、墨迹',
  },
  wei: {
    primary: '#B64232',   // cinnabar / ink cinnabar
    secondary: '#F0EDE0', // lime white
    accent: '#E05A3A',    // silver vermillion
    bg: '#f6f1e6',
    mood: '石刻、铜镜光',
  },
  tang: {
    primary: '#D4A843',   // gold
    secondary: '#C8A65A', // warm gold
    accent: '#B64232',    // cinnabar
    bg: '#f6f1e6',
    mood: '盛世、牡丹、丝路',
  },
  epilogue: {
    primary: '#D4A843',   // gold
    secondary: '#5D7A5E', // bronze green
    accent: '#C23B22',    // vermillion
    bg: '#f6f1e6',
    mood: '全色谱汇聚、永恒',
  },
};

/* ───────── InkView Design Tokens ───────── */
// Source: InkView 水墨设计系统 (github.com/qybaihe/inkview)

export const INK = {
  bg: '#f6f1e6',
  paper: '#fffaf0',
  paperDeep: '#eee3d0',
  text: '#201c18',
  muted: '#6f675d',
  line: '#2a2723',
  wash: 'rgba(32,28,24,0.08)',
  cinnabar: '#b64232',
  indigo: '#2f536f',
  jade: '#5c7f67',
  ochre: '#b78642',
  gold: '#c8a65a',
} as const;

/* ───────── Bronze Palette Extension ───────── */

export const BRONZE = {
  copper: '#B87333',
  green: '#5D7A5E',
  rust: '#A65D2C',
  vermillion: '#C23B22',
  cinnabar: '#E05A3A',
  gold: '#D4A843',
  turquoise: '#4A9B9B',
  ash: '#8B8070',
  ink: '#1A1A18',
  ritualWhite: '#F5F0E8',
  limeWhite: '#F0EDE0',
} as const;

/* ───────── Storage ───────── */
export const SAVE_KEY = 'bronze-luo-save';
export const STAMP_KEY = 'bronze-luo-stamps';
