/**
 * 铜声·识洛 — Tutorial chapter (L1 · L2 · L3)
 *
 * Three sequential tutorial levels teaching the core interaction primitives:
 *   L1 — Drag-to-align (door panel → door frame)
 *   L2 — Layer-pan / nest (hole alignment via panning)
 *   L3 — Rotation match (gear teeth alignment)
 *
 * All graphics are Canvas 2D placeholders — no external assets required.
 */

import { ChapterBase } from './ChapterBase';
import { AlignmentPuzzle } from '../puzzle/AlignmentPuzzle';
import { RotationPuzzle } from '../puzzle/RotationPuzzle';
import { type CanvasManager } from '../engine/CanvasManager';
import { DragHandler } from '../engine/DragHandler';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { gameState } from '../state/GameState';
import { eventBus } from '../utils/EventBus';
import { PuzzleState, SNAP_THRESHOLD, CANVAS_WIDTH, CANVAS_HEIGHT, TUTORIAL_L3_SNAP_ANGLES } from '../utils/constants';
import { type Vec2 } from '../utils/math';
import { createLogger } from '../utils/logger';

const log = createLogger('ChapterTutorial');

/* ───────── Layout constants ───────── */
const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

export class ChapterTutorial extends ChapterBase {
  private canvasManager: CanvasManager;
  private dragHandler: DragHandler;
  private overlay: TutorialOverlay;
  private currentLevel = 0; // 0 = L1, 1 = L2, 2 = L3

  /* L1 state */
  private l1PanelPos: Vec2 = { x: 200, y: 340 };
  private l1PanelSize = { w: 180, h: 360 };
  private l1FramePos = { x: 860, y: 340 };
  private l1FrameSize = { w: 200, h: 400 };

  /* L2 state */
  private l2PanOffset: Vec2 = { x: 0, y: 0 };
  private l2TargetOffset: Vec2 = { x: -300, y: -200 }; // correct pan offset
  private l2HoleRadius = 60;
  private l2Solved = false; // guard against repeated puzzle:solved emission

  /* L3 state */
  private l3Angle = 0;
  private l3GearRadius = 100;
  private l3FixedCenter: Vec2 = { x: 700, y: 500 };
  private l3MovableCenter: Vec2 = { x: 920, y: 500 };

  constructor(
    canvasManager: CanvasManager,
    dragHandler: DragHandler,
  ) {
    super('tutorial');
    this.canvasManager = canvasManager;
    this.dragHandler = dragHandler;
    this.overlay = new TutorialOverlay(canvasManager);
  }

  init(): void {
    // L1: drag door panel into door frame
    const l1 = new AlignmentPuzzle({
      id: 'tut-l1',
      chapterId: 'tutorial',
      targetRect: { x: 860, y: 340, w: 200, h: 400 },
    });

    // L2: custom puzzle handled inline
    const l2 = new AlignmentPuzzle({
      id: 'tut-l2',
      chapterId: 'tutorial',
      targetRect: { x: 0, y: 0, w: 10, h: 10 }, // dummy — overridden
    });

    // L3: gear rotation — start at half-tooth offset so gears aren't pre-aligned
    const l3 = new RotationPuzzle({
      id: 'tut-l3',
      chapterId: 'tutorial',
      startAngle: Math.PI / 8,
    });

    this.puzzles = [l1, l2, l3];
    this.puzzles.forEach((p) => gameState.registerPuzzle(p.id));

    // Listen for puzzle solves
    eventBus.on('puzzle:solved', this.onPuzzleSolved.bind(this));

    log.info('Tutorial chapter initialized');
  }

  enter(): void {
    super.enter();
    this.setupLevel(0);
  }

  exit(): void {
    super.exit();
    this.dragHandler.detach();
    this.overlay.hide();
  }

  update(_dt: number): void {
    // Renders the current tutorial level each frame
    this.renderLevel();

    // Update overlay
    const now = performance.now();
    this.overlay.render(now);

    // Clear UI canvas when overlay is hidden (prevent ghost text)
    if (!this.overlay.visible) {
      this.canvasManager.clearLayer('ui');
    }
  }

  /* ───────── Level setup ───────── */

  private setupLevel(level: number): void {
    this.currentLevel = level;
    this.dragHandler.detach();

    const puzzleCanvas = this.canvasManager.getLayer('puzzle');
    if (!puzzleCanvas) return;
    this.dragHandler.attach(puzzleCanvas.canvas);

    switch (level) {
      case 0:
        this.setupL1();
        break;
      case 1:
        this.setupL2();
        break;
      case 2:
        this.setupL3();
        break;
    }

    this.overlay.show(level + 1);
    log.info(`Tutorial level ${level + 1} started`);
  }

  /* ───────── L1: Drag-to-align door ───────── */

  private setupL1(): void {
    this.l1PanelPos = { x: 200, y: 340 };
    this.currentPuzzleIndex = 0;

    // Clear existing elements and register the door panel
    this.dragHandler.setMode('element');
    this.dragHandler.registerElement({
      id: 'door-panel',
      getPos: () => this.l1PanelPos,
      setPos: (pos) => { this.l1PanelPos = pos; },
      getSize: () => this.l1PanelSize,
    });

    this.dragHandler.onDragEnd(() => {
      const puzzle = this.puzzles[0] as AlignmentPuzzle;
      puzzle.checkAlignment({ pos: {
        x: this.l1PanelPos.x + this.l1PanelSize.w / 2,
        y: this.l1PanelPos.y + this.l1PanelSize.h / 2,
      }});

      if (puzzle.state === PuzzleState.SOLVED) {
        this.overlay.hide();
      }
    });
  }

  /* ───────── L2: Pan-to-nest ───────── */

  private setupL2(): void {
    this.l2PanOffset = { x: 0, y: 0 };
    this.l2Solved = false;
    this.currentPuzzleIndex = 1;

    // Clear any leaked callback from L1
    this.dragHandler.onDragEnd(() => {});

    // L2 uses layer-pan mode — the entire foreground layer pans
    this.dragHandler.setMode('layer');
    this.dragHandler.onDrag((state) => {
      this.l2PanOffset.x += state.delta.x;
      this.l2PanOffset.y += state.delta.y;

      // Check alignment: is the hole center over the target?
      const holeScreenX = CX + this.l2PanOffset.x;
      const holeScreenY = CY + this.l2PanOffset.y;
      const targetX = CX + this.l2TargetOffset.x;
      const targetY = CY + this.l2TargetOffset.y;

      const dist = Math.hypot(holeScreenX - targetX, holeScreenY - targetY);
      if (dist < SNAP_THRESHOLD && !this.l2Solved) {
        this.l2Solved = true;
        this.overlay.hide();
        eventBus.emit('puzzle:solved', {
          chapterId: 'tutorial',
          puzzleId: 'tut-l2',
        });
      }
    });
  }

  /* ───────── L3: Gear rotation ───────── */

  private setupL3(): void {
    this.l3Angle = Math.PI / 8; // half-tooth offset — not at any snap angle
    this.currentPuzzleIndex = 2;

    // Clear any leaked callback from previous levels
    this.dragHandler.onDragEnd(() => {});

    this.dragHandler.setMode('layer');

    let dragFrame = 0; // skip first frame so it doesn't instantly solve

    this.dragHandler.onDrag((state) => {
      dragFrame++;

      // Arc-drag: compute angle from center of movable gear
      const dx = state.currentPos.x - this.l3MovableCenter.x;
      const dy = state.currentPos.y - this.l3MovableCenter.y;
      const rawAngle = Math.atan2(dy, dx);

      // Only update angle & check alignment after the first drag frame,
      // so the user actually rotates the gear before it can solve
      if (dragFrame > 1) {
        this.l3Angle = rawAngle;

        const puzzle = this.puzzles[2] as RotationPuzzle;
        puzzle.checkAlignment({ angle: rawAngle });

        if (puzzle.state === PuzzleState.SOLVED) {
          this.overlay.hide();
        }
      } else {
        // First frame: store the angle but don't check alignment yet,
        // to prevent "drag from the right = angle 0 = snap angle 0 = instant solve"
        this.l3Angle = rawAngle;
      }
    });
  }

  /* ───────── Puzzle solve handler ───────── */

  private onPuzzleSolved(payload: { chapterId: string; puzzleId: string }): void {
    if (payload.chapterId !== 'tutorial') return;

    this.overlay.nextStep();

    switch (payload.puzzleId) {
      case 'tut-l1':
        this.advanceToNextPuzzle();
        setTimeout(() => this.setupLevel(1), 500);
        break;
      case 'tut-l2':
        this.advanceToNextPuzzle();
        setTimeout(() => this.setupLevel(2), 500);
        break;
      case 'tut-l3':
        gameState.isTutorialComplete = true;
        log.info('Tutorial complete! All 3 levels solved.');
        break;
    }
  }

  /* ───────── Drawing helpers ───────── */

  /** Draw warm ink-paper background across the full canvas. */
  private drawBackground(ctx: CanvasRenderingContext2D): void {
    // Ink-wash gradient
    const grad = ctx.createRadialGradient(CX, CY * 0.6, 0, CX, CY, CANVAS_WIDTH * 0.7);
    grad.addColorStop(0, '#f6f1e6');
    grad.addColorStop(1, '#e8dcc8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /** Draw a rounded rect path (no fill/stroke). */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /* ───────── Rendering ───────── */

  private renderLevel(): void {
    switch (this.currentLevel) {
      case 0:
        this.renderL1();
        break;
      case 1:
        this.renderL2();
        break;
      case 2:
        this.renderL3();
        break;
    }
  }

  /**
   * L1: Draw door frame (BG) + door panel (Puzzle canvas).
   */
  private renderL1(): void {
    this.canvasManager.clearLayer('bg');
    this.canvasManager.clearLayer('puzzle');

    const bgCtx = this.canvasManager.getContext('bg');
    if (bgCtx) {
      this.drawBackground(bgCtx);

      // Door frame outer shadow
      bgCtx.shadowColor = 'rgba(0,0,0,0.15)';
      bgCtx.shadowBlur = 20;
      this.roundRect(bgCtx, this.l1FramePos.x, this.l1FramePos.y, this.l1FrameSize.w, this.l1FrameSize.h, 6);
      bgCtx.fillStyle = '#5D7A5E';
      bgCtx.fill();
      bgCtx.shadowBlur = 0;

      // Frame interior (dark, textured)
      bgCtx.fillStyle = '#2a2723';
      this.roundRect(bgCtx, this.l1FramePos.x + 6, this.l1FramePos.y + 6, this.l1FrameSize.w - 12, this.l1FrameSize.h - 12, 4);
      bgCtx.fill();

      // Inner highlight
      bgCtx.strokeStyle = 'rgba(255,255,255,0.08)';
      bgCtx.lineWidth = 1;
      this.roundRect(bgCtx, this.l1FramePos.x + 8, this.l1FramePos.y + 8, this.l1FrameSize.w - 16, this.l1FrameSize.h - 16, 3);
      bgCtx.stroke();

      // Label
      bgCtx.fillStyle = '#6f675d';
      bgCtx.font = '14px "PingFang SC", sans-serif';
      bgCtx.textAlign = 'center';
      bgCtx.fillText('← 将门板拖入此处', this.l1FramePos.x + this.l1FrameSize.w / 2, this.l1FramePos.y + this.l1FrameSize.h + 30);
    }

    // Puzzle layer — door panel (draggable)
    const pCtx = this.canvasManager.getContext('puzzle');
    if (pCtx && !this.puzzles[0].solved) {
      // Panel shadow
      pCtx.shadowColor = 'rgba(0,0,0,0.25)';
      pCtx.shadowBlur = 12;
      pCtx.shadowOffsetX = 4;
      pCtx.shadowOffsetY = 4;

      // Panel body
      pCtx.fillStyle = '#8B8070'; // bronze-ash
      this.roundRect(pCtx, this.l1PanelPos.x, this.l1PanelPos.y, this.l1PanelSize.w, this.l1PanelSize.h, 4);
      pCtx.fill();
      pCtx.shadowBlur = 0;
      pCtx.shadowOffsetX = 0;
      pCtx.shadowOffsetY = 0;

      // Panel inner border
      pCtx.strokeStyle = '#6f675d';
      pCtx.lineWidth = 1;
      this.roundRect(pCtx, this.l1PanelPos.x + 6, this.l1PanelPos.y + 6, this.l1PanelSize.w - 12, this.l1PanelSize.h - 12, 2);
      pCtx.stroke();

      // Panel vertical seam
      pCtx.strokeStyle = 'rgba(0,0,0,0.1)';
      pCtx.lineWidth = 1;
      pCtx.beginPath();
      pCtx.moveTo(this.l1PanelPos.x + this.l1PanelSize.w / 2, this.l1PanelPos.y + 12);
      pCtx.lineTo(this.l1PanelPos.x + this.l1PanelSize.w / 2, this.l1PanelPos.y + this.l1PanelSize.h - 12);
      pCtx.stroke();
    }
  }

  /**
   * L2: Draw foreground layer with a "hole" (revealing BG content).
   */
  private renderL2(): void {
    this.canvasManager.clearLayer('bg');
    this.canvasManager.clearLayer('puzzle');

    const bgCtx = this.canvasManager.getContext('bg');
    if (bgCtx) {
      this.drawBackground(bgCtx);

      // Target position
      const targetX = CX + this.l2TargetOffset.x;
      const targetY = CY + this.l2TargetOffset.y;

      // Outer glow ring
      const glow = bgCtx.createRadialGradient(targetX, targetY, 20, targetX, targetY, 80);
      glow.addColorStop(0, 'rgba(184,115,51,0.4)');
      glow.addColorStop(1, 'rgba(184,115,51,0)');
      bgCtx.fillStyle = glow;
      bgCtx.beginPath();
      bgCtx.arc(targetX, targetY, 80, 0, Math.PI * 2);
      bgCtx.fill();

      // Solid target circle
      bgCtx.fillStyle = '#B87333'; // bronze-copper
      bgCtx.beginPath();
      bgCtx.arc(targetX, targetY, 40, 0, Math.PI * 2);
      bgCtx.fill();

      // Center star
      bgCtx.fillStyle = '#f6f1e6';
      bgCtx.font = '28px sans-serif';
      bgCtx.textAlign = 'center';
      bgCtx.textBaseline = 'middle';
      bgCtx.fillText('✦', targetX, targetY);

      // Label
      bgCtx.fillStyle = '#6f675d';
      bgCtx.font = '14px "PingFang SC", sans-serif';
      bgCtx.textBaseline = 'alphabetic';
      bgCtx.fillText('对准此处', targetX, targetY + 70);
    }

    const pCtx = this.canvasManager.getContext('puzzle');
    if (pCtx && !this.puzzles[1].solved) {
      // Foreground layer — solid fill with a circular hole
      const holeX = CX + this.l2PanOffset.x;
      const holeY = CY + this.l2PanOffset.y;

      // Full-canvas mask (no translate — the mask always fills the screen)
      pCtx.fillStyle = 'rgba(42,39,35,0.85)';
      pCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Cut out the hole at the panned position
      pCtx.save();
      pCtx.globalCompositeOperation = 'destination-out';
      pCtx.beginPath();
      pCtx.arc(holeX, holeY, this.l2HoleRadius, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.restore();

      // Hole border ring
      pCtx.strokeStyle = '#b64232';
      pCtx.lineWidth = 2;
      pCtx.setLineDash([6, 4]);
      pCtx.beginPath();
      pCtx.arc(holeX, holeY, this.l2HoleRadius + 4, 0, Math.PI * 2);
      pCtx.stroke();
      pCtx.setLineDash([]);
    }
  }

  /**
   * L3: Draw two gears with rotation interaction.
   * All rendering on BG canvas to avoid multi-canvas compositing flicker.
   */
  private renderL3(): void {
    this.canvasManager.clearLayer('bg');
    this.canvasManager.clearLayer('puzzle');
    // UI canvas is managed by overlay.render() + update()

    const bgCtx = this.canvasManager.getContext('bg');
    if (!bgCtx) return;

    this.drawBackground(bgCtx);

    const l3Puzzle = this.puzzles[2] as RotationPuzzle;
    const isSolved = l3Puzzle.state === PuzzleState.SOLVED;

    // ── Snap position markers ──
    this.drawSnapMarkers(bgCtx, this.l3FixedCenter, this.l3GearRadius + 12);

    // ── Near glow on movable gear ──
    if (l3Puzzle.state === PuzzleState.NEAR && !isSolved) {
      const glow = bgCtx.createRadialGradient(
        this.l3MovableCenter.x, this.l3MovableCenter.y, this.l3GearRadius - 10,
        this.l3MovableCenter.x, this.l3MovableCenter.y, this.l3GearRadius + 20,
      );
      glow.addColorStop(0, 'rgba(184,115,51,0.3)');
      glow.addColorStop(1, 'rgba(184,115,51,0)');
      bgCtx.fillStyle = glow;
      bgCtx.beginPath();
      bgCtx.arc(this.l3MovableCenter.x, this.l3MovableCenter.y, this.l3GearRadius + 20, 0, Math.PI * 2);
      bgCtx.fill();
    }

    // ── Solved glow on both gears ──
    if (isSolved) {
      for (const center of [this.l3FixedCenter, this.l3MovableCenter]) {
        const glow = bgCtx.createRadialGradient(
          center.x, center.y, this.l3GearRadius - 15,
          center.x, center.y, this.l3GearRadius + 30,
        );
        glow.addColorStop(0, 'rgba(201,166,90,0.5)');
        glow.addColorStop(1, 'rgba(201,166,90,0)');
        bgCtx.fillStyle = glow;
        bgCtx.beginPath();
        bgCtx.arc(center.x, center.y, this.l3GearRadius + 30, 0, Math.PI * 2);
        bgCtx.fill();
      }
    }

    // ── Fixed gear ──
    this.drawGear(bgCtx, this.l3FixedCenter, this.l3GearRadius, 0, '#5D7A5E');

    // ── Movable gear (always drawn — never disappears) ──
    // Use snapped angle from puzzle when solved for exact alignment
    const movableAngle = isSolved ? l3Puzzle.currentAngle : this.l3Angle;
    const movableColor = isSolved ? '#C8A65A' : '#B87333'; // gold when solved
    this.drawGear(bgCtx, this.l3MovableCenter, this.l3GearRadius, movableAngle, movableColor);

    // ── Angle indicator line (shows current rotation) ──
    if (!isSolved) {
      const indicatorLen = this.l3GearRadius * 1.5;
      const indicatorEndX = this.l3MovableCenter.x + Math.cos(this.l3Angle) * indicatorLen;
      const indicatorEndY = this.l3MovableCenter.y + Math.sin(this.l3Angle) * indicatorLen;
      bgCtx.strokeStyle = 'rgba(201,166,90,0.4)';
      bgCtx.lineWidth = 2;
      bgCtx.setLineDash([4, 6]);
      bgCtx.beginPath();
      bgCtx.moveTo(this.l3MovableCenter.x, this.l3MovableCenter.y);
      bgCtx.lineTo(indicatorEndX, indicatorEndY);
      bgCtx.stroke();
      bgCtx.setLineDash([]);

      // Degree label
      const degrees = Math.round((this.l3Angle * 180) / Math.PI);
      bgCtx.fillStyle = '#6f675d';
      bgCtx.font = '12px sans-serif';
      bgCtx.textAlign = 'left';
      bgCtx.textBaseline = 'top';
      bgCtx.fillText(`${degrees}°`, this.l3MovableCenter.x + this.l3GearRadius + 10, this.l3MovableCenter.y - 20);
    }

    // ── Solved state text ──
    if (isSolved) {
      bgCtx.fillStyle = '#C8A65A';
      bgCtx.font = 'bold 28px "PingFang SC", "Noto Sans SC", sans-serif';
      bgCtx.textAlign = 'center';
      bgCtx.textBaseline = 'middle';
      bgCtx.fillText('✓ 齿纹对齐！通关！', CX, this.l3MovableCenter.y + this.l3GearRadius + 50);

      bgCtx.fillStyle = '#6f675d';
      bgCtx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
      bgCtx.fillText('教学关完成 — 即将进入正式篇章', CX, this.l3MovableCenter.y + this.l3GearRadius + 80);
    }

    // ── Labels ──
    bgCtx.fillStyle = '#6f675d';
    bgCtx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'alphabetic';
    bgCtx.fillText('固定齿轮', this.l3FixedCenter.x, this.l3FixedCenter.y + this.l3GearRadius + 30);
  }

  /**
   * Draw small tick marks at each snap position around a gear.
   */
  private drawSnapMarkers(ctx: CanvasRenderingContext2D, center: Vec2, radius: number): void {
    for (const angle of TUTORIAL_L3_SNAP_ANGLES) {
      const mx = center.x + Math.cos(angle) * radius;
      const my = center.y + Math.sin(angle) * radius;
      ctx.fillStyle = 'rgba(92,122,94,0.3)';
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draw a gear shape using Canvas 2D.
   */
  private drawGear(
    ctx: CanvasRenderingContext2D,
    center: Vec2,
    radius: number,
    rotation: number,
    color: string,
  ): void {
    const teeth = 8;
    const innerRadius = radius * 0.85;

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(rotation);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#2a2723';
    ctx.lineWidth = 2;

    // Gear path
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const angle = (i * Math.PI) / teeth - Math.PI / 2;
      const r = i % 2 === 0 ? radius : innerRadius;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#2a2723';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
