/**
 * 铜声·识洛 — ChapterErlitou 壹·二里头
 *
 * Puzzle: 陶范合拢 (AlignmentPuzzle, 7 frames)
 * Player drags the right mold half onto the left to complete
 * the dragon-body mold. Bronze sound 'guDu' on solve.
 *
 * Frame flow:
 *   INTRO (2s) → COPPER_FLASH (1s) → PUZZLE (interactive)
 *   → SOLVED_ANIM (1.5s) → DRAGON_TAIL (3s) → COMPLETE
 *
 * Palette: bronze gold #D4A843, turquoise #4A9B9B
 * Stamp: 「铸」
 */

import { ChapterBase } from './ChapterBase';
import { type CanvasManager } from '../engine/CanvasManager';
import { DragHandler } from '../engine/DragHandler';
import { StampEffect } from '../ui/StampEffect';
import { AlignmentPuzzle } from '../puzzle/AlignmentPuzzle';
import { eventBus } from '../utils/EventBus';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';
import { type Vec2 } from '../utils/math';
import { gameState } from '../state/GameState';
import { createLogger } from '../utils/logger';

const log = createLogger('ChapterErlitou');

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Layout ───────── */

const MOLD_W = 160;
const MOLD_H = 220;
const SEAM_X = CX - 10; // where the two halves meet

const LEFT_POS: Vec2 = { x: SEAM_X - MOLD_W, y: CY - MOLD_H / 2 };
const RIGHT_TARGET: Vec2 = { x: SEAM_X, y: CY - MOLD_H / 2 };
const RIGHT_START: Vec2 = { x: CX + 100, y: CY - MOLD_H / 2 };

/* ───────── Frame enum ───────── */

enum ErlitouFrame {
  INTRO,
  COPPER_FLASH,
  PUZZLE,
  SOLVED_ANIM,
  DRAGON_TAIL,
  COMPLETE,
}

export class ChapterErlitou extends ChapterBase {
  private canvasManager: CanvasManager;
  private dragHandler: DragHandler;
  private stampEffect: StampEffect;
  private frame: ErlitouFrame = ErlitouFrame.INTRO;
  private frameTimer = 0;
  private completed = false;
  private skipRender = false;

  // Puzzle state
  private rightPos: Vec2 = { ...RIGHT_START };
  private readonly rightSize = { w: MOLD_W, h: MOLD_H };

  // Solved animation
  private solvedProgress = 0;

  // Flash
  private flashAlpha = 0;

  // Dragon tail
  private tailProgress = 0;

  private readonly INTRO_DURATION = 2000;
  private readonly FLASH_DURATION = 1000;
  private readonly SOLVED_DURATION = 1500;
  private readonly TAIL_DURATION = 3000;
  private readonly TRANSITION_DURATION = 500;

  private onPuzzleSolved: ((payload: { chapterId: string; puzzleId: string }) => void) | null = null;

  constructor(
    canvasManager: CanvasManager,
    dragHandler: DragHandler,
    stampEffect: StampEffect,
  ) {
    super('erlitou');
    this.canvasManager = canvasManager;
    this.dragHandler = dragHandler;
    this.stampEffect = stampEffect;
  }

  init(): void {
    const puzzle = new AlignmentPuzzle({
      id: 'tao-fan',
      chapterId: 'erlitou',
      targetRect: {
        x: RIGHT_TARGET.x,
        y: RIGHT_TARGET.y,
        w: MOLD_W,
        h: MOLD_H,
      },
    });

    this.puzzles = [puzzle];
    this.puzzles.forEach((p) => gameState.registerPuzzle(p.id));

    log.info('Erlitou chapter initialized');
  }

  enter(): void {
    super.enter();
    this.resetState();
    this.frame = ErlitouFrame.INTRO;

    // Listen for puzzle solve
    this.onPuzzleSolved = (payload) => {
      if (payload.chapterId !== 'erlitou' || payload.puzzleId !== 'tao-fan') return;
      if (this.frame === ErlitouFrame.PUZZLE) {
        // Snap right half to exact target
        this.rightPos = { ...RIGHT_TARGET };
        this.advanceToSolved();
      }
    };
    eventBus.on('puzzle:solved', this.onPuzzleSolved);

    log.info('Erlitou entered');
  }

  exit(): void {
    super.exit();
    if (this.onPuzzleSolved) {
      eventBus.off('puzzle:solved', this.onPuzzleSolved);
      this.onPuzzleSolved = null;
    }
    this.dragHandler.detach();
    this.dragHandler.onDrag(() => {});
    this.dragHandler.onDragEnd(() => {});
  }

  private resetState(): void {
    this.frameTimer = 0;
    this.completed = false;
    this.skipRender = false;
    this.rightPos = { ...RIGHT_START };
    this.solvedProgress = 0;
    this.flashAlpha = 0;
    this.tailProgress = 0;
  }

  update(dt: number): void {
    if (this.skipRender) return;
    this.frameTimer += dt;

    switch (this.frame) {
      case ErlitouFrame.INTRO:
        if (this.frameTimer >= this.INTRO_DURATION) {
          this.advanceToFlash();
        }
        break;

      case ErlitouFrame.COPPER_FLASH:
        this.flashAlpha = this.frameTimer < 500
          ? this.frameTimer / 500
          : Math.max(0, 1 - (this.frameTimer - 500) / 500);
        if (this.frameTimer >= this.FLASH_DURATION) {
          this.advanceToPuzzle();
        }
        break;

      case ErlitouFrame.SOLVED_ANIM:
        this.solvedProgress = Math.min(1, this.frameTimer / this.SOLVED_DURATION);
        if (this.frameTimer >= this.SOLVED_DURATION) {
          this.advanceToTail();
        }
        break;

      case ErlitouFrame.DRAGON_TAIL:
        this.tailProgress = Math.min(1, this.frameTimer / this.TAIL_DURATION);
        if (this.frameTimer >= this.TAIL_DURATION) {
          this.advanceToComplete();
        }
        break;

      case ErlitouFrame.COMPLETE:
        if (this.completed) break;
        const fadeAlpha = Math.min(1, this.frameTimer / this.TRANSITION_DURATION);
        if (fadeAlpha >= 1) {
          this.completed = true;
          this.skipRender = true;
          eventBus.emit('chapter:complete', { chapterId: 'erlitou' });
        }
        break;
    }

    this.renderFrame();
  }

  /* ───────── Frame transitions ───────── */

  private advanceToFlash(): void {
    this.frame = ErlitouFrame.COPPER_FLASH;
    this.frameTimer = 0;
    log.info('Erlitou: INTRO → COPPER_FLASH');
  }

  private advanceToPuzzle(): void {
    this.frame = ErlitouFrame.PUZZLE;
    this.frameTimer = 0;
    this.setupPuzzleDrag();
    log.info('Erlitou: COPPER_FLASH → PUZZLE');
  }

  private advanceToSolved(): void {
    this.teardownPuzzleDrag();
    this.frame = ErlitouFrame.SOLVED_ANIM;
    this.frameTimer = 0;
    this.solvedProgress = 0;
    eventBus.emit('bronze:sound', { soundId: 'guDu' });
    this.stampEffect.showStamp({ text: '铸' });
    log.info('Erlitou: PUZZLE → SOLVED_ANIM');
  }

  private advanceToTail(): void {
    this.frame = ErlitouFrame.DRAGON_TAIL;
    this.frameTimer = 0;
    this.tailProgress = 0;
    log.info('Erlitou: SOLVED_ANIM → DRAGON_TAIL');
  }

  private advanceToComplete(): void {
    this.frame = ErlitouFrame.COMPLETE;
    this.frameTimer = 0;
    log.info('Erlitou: DRAGON_TAIL → COMPLETE (fade)');
  }

  /* ───────── Puzzle interaction ───────── */

  private setupPuzzleDrag(): void {
    const canvas = this.canvasManager.getLayer('puzzle')?.canvas;
    if (!canvas) return;

    this.dragHandler.attach(canvas);
    this.dragHandler.setMode('element');

    this.dragHandler.registerElement({
      id: 'mold-top',
      getPos: () => this.rightPos,
      setPos: (pos) => { this.rightPos = pos; },
      getSize: () => this.rightSize,
    });

    this.dragHandler.onDragEnd(() => {
      const puzzle = this.puzzles[0] as AlignmentPuzzle;
      const centerX = this.rightPos.x + MOLD_W / 2;
      const centerY = this.rightPos.y + MOLD_H / 2;
      puzzle.checkAlignment({ pos: { x: centerX, y: centerY } });
    });
  }

  private teardownPuzzleDrag(): void {
    this.dragHandler.detach();
    this.dragHandler.onDrag(() => {});
    this.dragHandler.onDragEnd(() => {});
  }

  /* ───────── Rendering ───────── */

  private renderFrame(): void {
    this.canvasManager.clearLayer('bg');
    this.canvasManager.clearLayer('puzzle');

    const ctx = this.canvasManager.getContext('bg');
    if (!ctx) return;

    switch (this.frame) {
      case ErlitouFrame.INTRO:
        this.renderIntro(ctx, false);
        break;
      case ErlitouFrame.COPPER_FLASH:
        this.renderIntro(ctx, true);
        break;
      case ErlitouFrame.PUZZLE:
        this.renderPuzzle(ctx);
        break;
      case ErlitouFrame.SOLVED_ANIM:
        this.renderSolved(ctx);
        break;
      case ErlitouFrame.DRAGON_TAIL:
      case ErlitouFrame.COMPLETE:
        this.renderTail(ctx);
        break;
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(CX, CY * 0.6, 0, CX, CY, CANVAS_WIDTH * 0.7);
    grad.addColorStop(0, '#f6f1e6');
    grad.addColorStop(1, '#e8dcc8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /* ───────── Helper: draw a mold half ───────── */

  private drawMoldHalf(
    ctx: CanvasRenderingContext2D,
    pos: Vec2,
    isLeft: boolean,
    alpha = 1,
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;

    const x = pos.x;
    const y = pos.y;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Bronze body
    this.roundRect(ctx, x, y, MOLD_W, MOLD_H, 8);
    ctx.fillStyle = '#B87333';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Gold inner border
    ctx.strokeStyle = '#D4A843';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x + 4, y + 4, MOLD_W - 8, MOLD_H - 8, 6);
    ctx.stroke();

    // Dragon pattern facing the seam
    ctx.strokeStyle = '#4A9B9B';
    ctx.lineWidth = 2;

    if (isLeft) {
      // Left half: dragon tail pattern on the right edge
      const seamX = x + MOLD_W - 10;
      ctx.beginPath();
      ctx.moveTo(seamX, y + 40);
      ctx.quadraticCurveTo(seamX - 20, y + 60, seamX, y + 80);
      ctx.quadraticCurveTo(seamX - 20, y + 100, seamX, y + 120);
      ctx.quadraticCurveTo(seamX - 20, y + 140, seamX, y + 160);
      ctx.stroke();

      // Turquoise inlay dots
      ctx.fillStyle = '#4A9B9B';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x + 30, y + 40 + i * 45, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Right half: dragon head pattern on the left edge
      const seamX = x + 10;
      ctx.beginPath();
      ctx.moveTo(seamX, y + 40);
      ctx.quadraticCurveTo(seamX + 20, y + 60, seamX, y + 80);
      ctx.quadraticCurveTo(seamX + 20, y + 100, seamX, y + 120);
      ctx.quadraticCurveTo(seamX + 20, y + 140, seamX, y + 160);
      ctx.stroke();

      // Turquoise inlay dots
      ctx.fillStyle = '#4A9B9B';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + MOLD_W - 30, y + 55 + i * 50, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
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

  /* ───────── Frame 0-1: Intro & Flash ───────── */

  private renderIntro(ctx: CanvasRenderingContext2D, showFlash: boolean): void {
    this.drawBackground(ctx);

    // Draw mold halves separated
    this.drawMoldHalf(ctx, LEFT_POS, true);

    // Right half positioned at start (further right)
    this.drawMoldHalf(ctx, RIGHT_START, false);

    // Label
    ctx.fillStyle = '#6f675d';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('陶范 · 二里头', CX, CANVAS_HEIGHT - 30);

    // Copper flash overlay
    if (showFlash && this.flashAlpha > 0) {
      // Copper burst
      const burst = ctx.createRadialGradient(CX, CY, 0, CX, CY, 300);
      burst.addColorStop(0, `rgba(184,115,51,${this.flashAlpha * 0.6})`);
      burst.addColorStop(0.5, `rgba(74,155,155,${this.flashAlpha * 0.4})`);
      burst.addColorStop(1, 'rgba(184,115,51,0)');
      ctx.fillStyle = burst;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Pure turquoise flash at peak
      if (this.flashAlpha > 0.8) {
        ctx.fillStyle = `rgba(74,155,155,${(this.flashAlpha - 0.8) * 2})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    }
  }

  /* ───────── Frame 3: Interactive Puzzle ───────── */

  private renderPuzzle(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);

    // Ripple effect on the mold (proximity feedback)
    const puzzle = this.puzzles[0] as AlignmentPuzzle;
    const progress = puzzle.getProgressFeedback();
    const rippleAlpha = Math.max(0, 0.15 * (1 - progress));

    if (rippleAlpha > 0.01) {
      const rippleCenter = {
        x: LEFT_POS.x + MOLD_W,  // center of the joined area
        y: CY,
      };
      const waveT = performance.now() / 600;
      for (let i = 0; i < 3; i++) {
        const r = 20 + ((waveT + i * 0.5) % 1) * 60;
        ctx.strokeStyle = `rgba(212,168,67,${rippleAlpha * (1 - i * 0.3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rippleCenter.x, rippleCenter.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw left half (fixed) on bg canvas
    this.drawMoldHalf(ctx, LEFT_POS, true);

    // Right half is drawn on puzzle canvas (draggable)
    const pCtx = this.canvasManager.getContext('puzzle');
    if (pCtx) {
      this.drawMoldHalf(pCtx, this.rightPos, false);
    }

    // Instruction text on bg
    ctx.fillStyle = '#6f675d';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('拖拽右半范合拢', CX, CANVAS_HEIGHT - 30);
  }

  /* ───────── Frame 4: Solved Animation ───────── */

  private renderSolved(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);

    const eased = this.solvedProgress;

    // Both halves now at correct positions (right half snapped to target)
    this.drawMoldHalf(ctx, LEFT_POS, true);
    this.drawMoldHalf(ctx, RIGHT_TARGET, false);

    // Golden glow between the halves — the dragon awakens
    if (eased > 0.3) {
      const glowAlpha = Math.min(1, (eased - 0.3) / 0.3);
      const glow = ctx.createRadialGradient(SEAM_X, CY, 0, SEAM_X, CY, 100);
      glow.addColorStop(0, `rgba(212,168,67,${glowAlpha * 0.5})`);
      glow.addColorStop(1, 'rgba(212,168,67,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(SEAM_X, CY, 100, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dragon body completes across the seam
    if (eased > 0.5) {
      const dragonAlpha = Math.min(1, (eased - 0.5) / 0.3);
      ctx.save();
      ctx.globalAlpha = dragonAlpha;
      ctx.strokeStyle = '#D4A843';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // A complete dragon spanning both halves
      ctx.moveTo(LEFT_POS.x + 20, CY - 30);
      ctx.quadraticCurveTo(LEFT_POS.x + MOLD_W - 10, CY - 60, SEAM_X, CY - 20);
      ctx.quadraticCurveTo(RIGHT_TARGET.x + 40, CY + 20, RIGHT_TARGET.x + MOLD_W - 20, CY + 10);
      ctx.stroke();
      ctx.restore();
    }

    // Stamp "铸" has been triggered via stampEffect in advanceToSolved

    ctx.fillStyle = '#6f675d';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('铸 · 龙身成', CX, CANVAS_HEIGHT - 30);
  }

  /* ───────── Frame 5-7: Dragon Tail ───────── */

  private renderTail(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);

    // Mold halves (assembled)
    this.drawMoldHalf(ctx, LEFT_POS, true);
    this.drawMoldHalf(ctx, RIGHT_TARGET, false);

    const t = this.tailProgress; // 0..1

    // 3 phases of tail extending:
    // Phase 1 (0-0.4): tail emerges from right of mold
    // Phase 2 (0.4-0.7): tail reaches halfway across remaining canvas
    // Phase 3 (0.7-1.0): tail thins to rope and extends to right edge

    // Tail start position (right side of assembled mold)
    const tailStartX = RIGHT_TARGET.x + MOLD_W;
    const tailStartY = CY;

    // Tail end position (extends to the right, toward Zhou)
    const tailEndX = tailStartX + t * (CANVAS_WIDTH - tailStartX - 50); // don't go off-screen
    const tailEndY = CY - 30 + t * 120; // arcs upward then curves

    // Tail width: starts thick (6), becomes rope-like (2)
    const tailWidth = 6 - t * 4;
    const tailAlpha = this.frame === ErlitouFrame.COMPLETE
      ? Math.max(0, 1 - this.frameTimer / this.TRANSITION_DURATION)
      : 1;

    ctx.save();
    ctx.globalAlpha = tailAlpha;
    ctx.strokeStyle = '#B87333';
    ctx.lineWidth = Math.max(2, tailWidth);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailStartX, tailStartY);
    // S-curve path for the dragon tail / rope
    const cp1x = tailStartX + (tailEndX - tailStartX) * 0.3;
    const cp1y = tailStartY - 80 * t;
    const cp2x = tailStartX + (tailEndX - tailStartX) * 0.7;
    const cp2y = tailEndY + 60 * t;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tailEndX, tailEndY);
    ctx.stroke();

    // When closer to rope (phase 2-3), add twisted-rope texture
    if (t > 0.4) {
      ctx.strokeStyle = 'rgba(212,168,67,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(tailStartX + 5, tailStartY - 5);
      ctx.bezierCurveTo(cp1x + 5, cp1y - 5, cp2x + 5, cp2y - 5, tailEndX + 5, tailEndY - 5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    if (this.frame === ErlitouFrame.COMPLETE) {
      const fadeAlpha = Math.min(1, this.frameTimer / this.TRANSITION_DURATION);
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }
}
