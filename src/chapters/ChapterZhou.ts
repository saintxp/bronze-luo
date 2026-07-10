/**
 * 铜声·识洛 — ChapterZhou 贰·周王城
 *
 * Three-section chapter: 营洛 → 礼成 → 问道
 *
 * 营洛: Sundial → oracle bone → cauldron city → 孔老圆心 puzzle
 *       → stake press → stamp「宅兹」 (no bronze sound)
 * 礼成: Bell array → tune resonance → full resonance + 嗡——
 *       → peony bud → stamp「礼成」 + bronze 'weng'
 * 问道: Confucius entry + 叮——叮—— → ritual altar → green ox
 *       → white hair pulp seal → stamp「问道」 + bronze 'dingDing'
 *
 * Palette: bronze green #5D7A5E, ritual white #F5F0E8, gold #C8A65A, purple #7B5EA7
 * InkView: --ink-paper #fffaf0, --ink-cinnabar #b64232, --ink-gold #c8a65a
 */

import { ChapterBase } from './ChapterBase';
import { type CanvasManager } from '../engine/CanvasManager';
import { DragHandler, type DragState } from '../engine/DragHandler';
import { StampEffect } from '../ui/StampEffect';
import { eventBus } from '../utils/EventBus';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SNAP_THRESHOLD, NEAR_THRESHOLD } from '../utils/constants';
import { type Vec2, vec2Distance } from '../utils/math';
import { createLogger } from '../utils/logger';

const log = createLogger('ChapterZhou');

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

/* ───────── Layout constants ───────── */

// 孔老圆心
const KONGZI_CENTER: Vec2 = { x: CX - 120, y: CY };
const LAOZI_INITIAL: Vec2 = { x: CX + 100, y: CY - 40 };
const LAOZI_SIZE = { w: 60, h: 60 };

// Stakes (拽绳打桩)
const STAKE_POSITIONS: Vec2[] = [
  { x: CX - 150, y: CY + 100 },
  { x: CX, y: CY + 120 },
  { x: CX + 150, y: CY + 80 },
];
const STAKE_RADIUS = 18;

// Bell array (礼成)
const BELL_COUNT = 7;
const BELL_SPACING = 65;
const BELLS_Y = CY - 70;
const BELLS_START_X = CX - ((BELL_COUNT - 1) * BELL_SPACING) / 2;
const RESONANCE_INDEX = 4; // 5th bell (0-indexed)
const RESONANCE_TOLERANCE = 28;

/* ───────── Frame enum ───────── */

enum ZhouFrame {
  // 营洛 (yingluo)
  SAL_SUN_DIAL,
  SAL_ORACLE_BONE,
  SAL_TRIPOD,
  SAL_KONG_LAO,
  SAL_STAKES,
  SAL_STAMP_ZHAIZI,

  // 礼成 (licheng)
  LI_BELLS_APPEAR,
  LI_TUNE_BELLS,
  LI_RESONANCE,
  LI_PEONY,
  LI_STAMP,

  // 问道 (wendao)
  WD_CONFUCIUS,
  WD_ALTAR,
  WD_GREEN_OX,
  WD_PULP,
  WD_STAMP,
  WD_COMPLETE,
}

/* ───────── Chapter class ───────── */

export class ChapterZhou extends ChapterBase {
  private canvasManager: CanvasManager;
  private dragHandler: DragHandler;
  private stampEffect: StampEffect;

  private frame: ZhouFrame = ZhouFrame.SAL_SUN_DIAL;
  private frameTimer = 0;
  private completed = false;
  private skipRender = false;

  // 营洛 state
  private sandialPhase = 0;          // 0-4
  private sundialDragAccum = 0;      // accumulated horizontal drag px
  private sundialHasDragged = false; // true after first real drag
  private tripodProgress = 0;        // 0-1
  private laoziPos: Vec2 = { ...LAOZI_INITIAL };
  private stakesPressed: boolean[] = [false, false, false];
  private laoziSolved = false;
  private laoziDist = Infinity;      // current distance to center

  // 礼成 state
  private strikerX = BELLS_START_X + RESONANCE_INDEX * BELL_SPACING;
  private bellsAlpha = 0;
  private resonanceAlpha = 0;
  private peonyProgress = 0;

  // 问道 state
  private confuciusProgress = 0;
  private altarAlpha = 0;
  private oxProgress = 0;
  private pulpProgress = 0;

  // Interactive frame callback refs
  private boundStakeHandler: ((e: MouseEvent) => void) | null = null;
  private boundTouchStakeHandler: ((e: TouchEvent) => void) | null = null;

  private readonly AUTO_ORACLE = 2000;
  private readonly AUTO_STAMP_ZHAIZI = 2500;
  private readonly AUTO_BELLS_APPEAR = 2000;
  private readonly AUTO_RESONANCE = 3000;
  private readonly AUTO_PEONY = 2000;
  private readonly AUTO_STAMP_LI = 2500;
  private readonly AUTO_CONFUCIUS = 3000;
  private readonly AUTO_ALTAR = 2500;
  private readonly AUTO_GREEN_OX = 3000;
  private readonly AUTO_PULP = 2000;
  private readonly AUTO_STAMP_WD = 3000;
  private readonly TRANSITION_DURATION = 500;

  constructor(
    canvasManager: CanvasManager,
    dragHandler: DragHandler,
    stampEffect: StampEffect,
  ) {
    super('zhou');
    this.canvasManager = canvasManager;
    this.dragHandler = dragHandler;
    this.stampEffect = stampEffect;
  }

  init(): void {
    this.puzzles = [];
    log.info('Zhou chapter initialized');
  }

  enter(): void {
    super.enter();
    this.resetState();
    this.setupSundialDrag();
    log.info('Zhou entered — 营洛');
  }

  exit(): void {
    super.exit();
    this.teardownInteraction();
  }

  private resetState(): void {
    this.frameTimer = 0;
    this.completed = false;
    this.skipRender = false;
    this.sandialPhase = 0;
    this.sundialDragAccum = 0;
    this.sundialHasDragged = false;
    this.tripodProgress = 0;
    this.laoziPos = { ...LAOZI_INITIAL };
    this.stakesPressed = [false, false, false];
    this.laoziSolved = false;
    this.laoziDist = Infinity;
    this.strikerX = BELLS_START_X + RESONANCE_INDEX * BELL_SPACING;
    this.bellsAlpha = 0;
    this.resonanceAlpha = 0;
    this.peonyProgress = 0;
    this.confuciusProgress = 0;
    this.altarAlpha = 0;
    this.oxProgress = 0;
    this.pulpProgress = 0;
  }

  /* ───────── Update loop ───────── */

  update(dt: number): void {
    if (this.skipRender) return;
    this.frameTimer += dt;

    switch (this.frame) {
      case ZhouFrame.SAL_ORACLE_BONE:
        if (this.frameTimer >= this.AUTO_ORACLE) this.advanceToTripod();
        break;
      case ZhouFrame.SAL_STAMP_ZHAIZI:
        if (this.frameTimer >= this.AUTO_STAMP_ZHAIZI) this.advanceToBellsAppear();
        break;
      case ZhouFrame.LI_BELLS_APPEAR:
        this.bellsAlpha = Math.min(1, this.frameTimer / 1000);
        if (this.frameTimer >= this.AUTO_BELLS_APPEAR) this.advanceToTuneBells();
        break;
      case ZhouFrame.LI_RESONANCE:
        this.resonanceAlpha = Math.min(1, this.frameTimer / 800);
        if (this.frameTimer >= this.AUTO_RESONANCE) this.advanceToPeony();
        break;
      case ZhouFrame.LI_PEONY:
        this.peonyProgress = Math.min(1, this.frameTimer / 1500);
        if (this.frameTimer >= this.AUTO_PEONY) this.advanceToLiStamp();
        break;
      case ZhouFrame.LI_STAMP:
        if (this.frameTimer >= this.AUTO_STAMP_LI) this.advanceToConfucius();
        break;
      case ZhouFrame.WD_CONFUCIUS:
        this.confuciusProgress = Math.min(1, this.frameTimer / 2000);
        if (this.frameTimer >= this.AUTO_CONFUCIUS) this.advanceToAltar();
        break;
      case ZhouFrame.WD_ALTAR:
        this.altarAlpha = Math.min(1, this.frameTimer / 1500);
        if (this.frameTimer >= this.AUTO_ALTAR) this.advanceToGreenOx();
        break;
      case ZhouFrame.WD_GREEN_OX:
        this.oxProgress = Math.min(1, this.frameTimer / 2000);
        if (this.frameTimer >= this.AUTO_GREEN_OX) this.advanceToPulp();
        break;
      case ZhouFrame.WD_PULP:
        this.pulpProgress = Math.min(1, this.frameTimer / 1500);
        if (this.frameTimer >= this.AUTO_PULP) this.advanceToWdStamp();
        break;
      case ZhouFrame.WD_STAMP:
        if (this.frameTimer >= this.AUTO_STAMP_WD) this.advanceToComplete();
        break;
      case ZhouFrame.WD_COMPLETE:
        if (this.completed) break;
        if (this.frameTimer >= this.TRANSITION_DURATION) {
          this.completed = true;
          this.skipRender = true;
          eventBus.emit('chapter:complete', { chapterId: 'zhou' });
        }
        break;
    }

    this.renderFrame();
  }

  /* ───────── Frame transitions ───────── */

  private advanceToOracle(): void {
    this.teardownInteraction();
    this.frame = ZhouFrame.SAL_ORACLE_BONE;
    this.frameTimer = 0;
    log.info('Zhou: 营洛 — sundial → oracle bone');
  }

  private advanceToTripod(): void {
    this.frame = ZhouFrame.SAL_TRIPOD;
    this.frameTimer = 0;
    this.setupTripodDrag();
    log.info('Zhou: 营洛 — oracle bone → tripod');
  }

  private advanceToKongLao(): void {
    this.teardownInteraction();
    this.laoziPos = { ...LAOZI_INITIAL };
    this.frame = ZhouFrame.SAL_KONG_LAO;
    this.frameTimer = 0;
    this.setupKongLaoDrag();
    log.info('Zhou: 营洛 — tripod → 孔老圆心 puzzle');
  }

  private advanceToStakes(): void {
    this.teardownInteraction();
    this.frame = ZhouFrame.SAL_STAKES;
    this.frameTimer = 0;
    this.setupStakesClick();
    log.info('Zhou: 营洛 — puzzle → stakes');
  }

  private advanceToZhaiziStamp(): void {
    this.teardownInteraction();
    this.frame = ZhouFrame.SAL_STAMP_ZHAIZI;
    this.frameTimer = 0;
    this.stampEffect.showStamp({ text: '宅兹' });
    log.info('Zhou: 营洛 — stakes → stamp「宅兹」');
  }

  private advanceToBellsAppear(): void {
    this.frame = ZhouFrame.LI_BELLS_APPEAR;
    this.frameTimer = 0;
    this.bellsAlpha = 0;
    log.info('Zhou: 营洛 → 礼成 — bells appear');
  }

  private advanceToTuneBells(): void {
    this.frame = ZhouFrame.LI_TUNE_BELLS;
    this.frameTimer = 0;
    this.strikerX = BELLS_START_X + RESONANCE_INDEX * BELL_SPACING;
    this.setupBellTuneDrag();
    log.info('Zhou: 礼成 — bells appear → tune');
  }

  private advanceToResonance(): void {
    this.teardownInteraction();
    this.frame = ZhouFrame.LI_RESONANCE;
    this.frameTimer = 0;
    this.resonanceAlpha = 0;
    eventBus.emit('bronze:sound', { soundId: 'weng' });
    log.info('Zhou: 礼成 — tune → resonance + 嗡——');
  }

  private advanceToPeony(): void {
    this.frame = ZhouFrame.LI_PEONY;
    this.frameTimer = 0;
    this.peonyProgress = 0;
    log.info('Zhou: 礼成 — resonance → peony');
  }

  private advanceToLiStamp(): void {
    this.frame = ZhouFrame.LI_STAMP;
    this.frameTimer = 0;
    this.stampEffect.showStamp({ text: '礼成' });
    log.info('Zhou: 礼成 — peony → stamp');
  }

  private advanceToConfucius(): void {
    this.frame = ZhouFrame.WD_CONFUCIUS;
    this.frameTimer = 0;
    this.confuciusProgress = 0;
    eventBus.emit('bronze:sound', { soundId: 'dingDing' });
    log.info('Zhou: 礼成 → 问道 — Confucius + 叮——叮——');
  }

  private advanceToAltar(): void {
    this.frame = ZhouFrame.WD_ALTAR;
    this.frameTimer = 0;
    this.altarAlpha = 0;
    log.info('Zhou: 问道 — Confucius → altar');
  }

  private advanceToGreenOx(): void {
    this.frame = ZhouFrame.WD_GREEN_OX;
    this.frameTimer = 0;
    this.oxProgress = 0;
    log.info('Zhou: 问道 — altar → green ox');
  }

  private advanceToPulp(): void {
    this.frame = ZhouFrame.WD_PULP;
    this.frameTimer = 0;
    this.pulpProgress = 0;
    log.info('Zhou: 问道 — green ox → pulp');
  }

  private advanceToWdStamp(): void {
    this.frame = ZhouFrame.WD_STAMP;
    this.frameTimer = 0;
    this.stampEffect.showStamp({ text: '问道' });
    log.info('Zhou: 问道 — pulp → stamp');
  }

  private advanceToComplete(): void {
    this.frame = ZhouFrame.WD_COMPLETE;
    this.frameTimer = 0;
    log.info('Zhou: 问道 → COMPLETE');
  }

  /* ───────── Interaction setup / teardown ───────── */

  private teardownInteraction(): void {
    this.dragHandler.detach();
    this.dragHandler.onDrag(() => {});
    this.dragHandler.onDragEnd(() => {});
    if (this.boundStakeHandler) {
      const canvas = this.canvasManager.getLayer('puzzle')?.canvas;
      if (canvas) {
        canvas.removeEventListener('mousedown', this.boundStakeHandler);
      }
      this.boundStakeHandler = null;
    }
    if (this.boundTouchStakeHandler) {
      const canvas = this.canvasManager.getLayer('puzzle')?.canvas;
      if (canvas) {
        canvas.removeEventListener('touchstart', this.boundTouchStakeHandler);
      }
      this.boundTouchStakeHandler = null;
    }
  }

  private setupSundialDrag(): void {
    const canvas = this.canvasManager.getLayer('puzzle')?.canvas;
    if (!canvas) return;
    this.dragHandler.attach(canvas);
    this.dragHandler.setMode('layer');
    this.dragHandler.onDrag((state: DragState) => {
      // Only respond to actual user drags, not stale events from chapter transitions
      if (Math.abs(state.delta.x) > 2) {
        this.sundialHasDragged = true;
      }
      if (!this.sundialHasDragged) return;

      // Accumulate horizontal drag distance, then derive phase
      this.sundialDragAccum += state.delta.x;
      const PHASE_PX = 50; // px per phase — lower = more sensitive
      const rawPhase = Math.round(this.sundialDragAccum / PHASE_PX);
      this.sandialPhase = Math.max(0, Math.min(4, rawPhase));
      if (this.sandialPhase >= 4) {
        this.advanceToOracle();
      }
    });
  }

  private setupTripodDrag(): void {
    const canvas = this.canvasManager.getLayer('puzzle')?.canvas;
    if (!canvas) return;
    this.dragHandler.attach(canvas);
    this.dragHandler.setMode('layer');
    this.dragHandler.onDrag((state: DragState) => {
      this.tripodProgress = Math.min(1, this.tripodProgress + Math.abs(state.delta.x) * 0.003);
      if (this.tripodProgress >= 1) {
        this.advanceToKongLao();
      }
    });
  }

  private setupKongLaoDrag(): void {
    const canvas = this.canvasManager.getLayer('puzzle')?.canvas;
    if (!canvas) return;
    this.dragHandler.attach(canvas);
    this.dragHandler.setMode('element');

    this.dragHandler.registerElement({
      id: 'laozi-pin',
      getPos: () => ({ x: this.laoziPos.x - LAOZI_SIZE.w / 2, y: this.laoziPos.y - LAOZI_SIZE.h / 2 }),
      setPos: (pos) => {
        this.laoziPos = { x: pos.x + LAOZI_SIZE.w / 2, y: pos.y + LAOZI_SIZE.h / 2 };
      },
      getSize: () => LAOZI_SIZE,
    });

    this.dragHandler.onDrag(() => {
      // Track distance continuously for gradient feedback
      this.laoziDist = vec2Distance(this.laoziPos, KONGZI_CENTER);
    });

    this.dragHandler.onDragEnd(() => {
      if (this.laoziSolved) return;
      const dist = vec2Distance(this.laoziPos, KONGZI_CENTER);
      if (dist < SNAP_THRESHOLD) {
        this.laoziSolved = true;
        this.laoziPos = { ...KONGZI_CENTER };
        log.info('Zhou: 孔老圆心 — SOLVED');
        this.advanceToStakes();
      }
    });
  }

  private setupStakesClick(): void {
    const canvas = this.canvasManager.getLayer('puzzle')?.canvas;
    if (!canvas) return;

    // CanvasManager sets all canvases to pointerEvents:none — enable for interaction
    canvas.style.pointerEvents = 'auto';

    this.boundStakeHandler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
      this.checkStakeHit({ x, y });
    };
    this.boundTouchStakeHandler = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
      const y = (touch.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
      this.checkStakeHit({ x, y });
    };

    canvas.addEventListener('mousedown', this.boundStakeHandler);
    canvas.addEventListener('touchstart', this.boundTouchStakeHandler, { passive: false });
  }

  private checkStakeHit(pos: Vec2): void {
    for (let i = 0; i < STAKE_POSITIONS.length; i++) {
      if (this.stakesPressed[i]) continue;
      const dist = vec2Distance(pos, STAKE_POSITIONS[i]);
      if (dist < STAKE_RADIUS + 10) {
        this.stakesPressed[i] = true;
        log.info(`Zhou: stake ${i + 1}/3 pressed`);
        if (this.stakesPressed.every(Boolean)) {
          this.advanceToZhaiziStamp();
        }
        return;
      }
    }
  }

  private setupBellTuneDrag(): void {
    const canvas = this.canvasManager.getLayer('puzzle')?.canvas;
    if (!canvas) return;
    this.dragHandler.attach(canvas);
    this.dragHandler.setMode('layer');
    this.dragHandler.onDrag((state: DragState) => {
      this.strikerX += state.delta.x;
      // Clamp to bell array range
      const minX = BELLS_START_X - 20;
      const maxX = BELLS_START_X + (BELL_COUNT - 1) * BELL_SPACING + 20;
      this.strikerX = Math.max(minX, Math.min(maxX, this.strikerX));

      // Check if near resonance bell
      const resonanceX = BELLS_START_X + RESONANCE_INDEX * BELL_SPACING;
      const dist = Math.abs(this.strikerX - resonanceX);
      if (dist < RESONANCE_TOLERANCE) {
        this.advanceToResonance();
      }
    });
  }

  /* ───────── Rendering dispatch ───────── */

  private renderFrame(): void {
    this.canvasManager.clearLayer('bg');
    this.canvasManager.clearLayer('puzzle');

    const ctx = this.canvasManager.getContext('bg');
    if (!ctx) return;

    switch (this.frame) {
      case ZhouFrame.SAL_SUN_DIAL: this.renderSundial(ctx); break;
      case ZhouFrame.SAL_ORACLE_BONE: this.renderOracle(ctx); break;
      case ZhouFrame.SAL_TRIPOD: this.renderTripod(ctx); break;
      case ZhouFrame.SAL_KONG_LAO: this.renderKongLao(ctx); break;
      case ZhouFrame.SAL_STAKES: this.renderStakes(ctx); break;
      case ZhouFrame.SAL_STAMP_ZHAIZI: this.renderZhaiziStamp(ctx); break;
      case ZhouFrame.LI_BELLS_APPEAR: this.renderBellsAppear(ctx); break;
      case ZhouFrame.LI_TUNE_BELLS: this.renderTuneBells(ctx); break;
      case ZhouFrame.LI_RESONANCE: this.renderResonance(ctx); break;
      case ZhouFrame.LI_PEONY: this.renderPeony(ctx); break;
      case ZhouFrame.LI_STAMP: this.renderLiStamp(ctx); break;
      case ZhouFrame.WD_CONFUCIUS: this.renderConfucius(ctx); break;
      case ZhouFrame.WD_ALTAR: this.renderAltar(ctx); break;
      case ZhouFrame.WD_GREEN_OX: this.renderGreenOx(ctx); break;
      case ZhouFrame.WD_PULP: this.renderPulp(ctx); break;
      case ZhouFrame.WD_STAMP: this.renderWdStamp(ctx); break;
      case ZhouFrame.WD_COMPLETE: this.renderComplete(ctx); break;
    }
  }

  /* ───────── Helpers ───────── */

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    topColor: string,
    bottomColor: string,
  ): void {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawBronzeEdge(ctx: CanvasRenderingContext2D, alpha = 1): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#5D7A5E';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, CANVAS_WIDTH - 30, CANVAS_HEIGHT - 30);
    ctx.strokeStyle = '#C8A65A';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40);
    ctx.restore();
  }

  private drawInstruction(ctx: CanvasRenderingContext2D, text: string): void {
    ctx.fillStyle = '#6f675d';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, CX, CANVAS_HEIGHT - 30);
  }

  private drawFadeOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.frame === ZhouFrame.WD_COMPLETE) {
      const fade = Math.min(1, this.frameTimer / this.TRANSITION_DURATION);
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  /* ═══════════════════════════════════════
     营洛 — Frame rendering
     ═══════════════════════════════════════ */

  private renderSundial(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#F5F0E8', '#e8dcc8');
    this.drawBronzeEdge(ctx);

    // Sundial at center
    const dialX = CX;
    const dialY = CY - 40;

    // Base plate
    ctx.fillStyle = '#8B8070';
    ctx.beginPath();
    ctx.ellipse(dialX, dialY, 120, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gnomon (vertical pin)
    ctx.fillStyle = '#2a2723';
    ctx.fillRect(dialX - 2, dialY - 50, 4, 60);

    // Shadow — rotates based on phase (0-4)
    const shadowAngle = (this.sandialPhase / 4) * Math.PI * 0.6 - Math.PI * 0.3;
    const shadowLen = 60 + this.sandialPhase * 10;
    ctx.save();
    ctx.translate(dialX, dialY);
    ctx.rotate(shadowAngle);
    ctx.fillStyle = 'rgba(42,39,35,0.35)';
    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.lineTo(shadowLen, -2);
    ctx.lineTo(shadowLen, 2);
    ctx.lineTo(-3, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5 position markers (for the 5-grid sundial)
    for (let i = 0; i < 5; i++) {
      const a = (i / 4) * Math.PI * 0.6 - Math.PI * 0.3;
      const mx = dialX + Math.cos(a) * 90;
      const my = dialY + Math.sin(a) * 50;
      ctx.fillStyle = i === this.sandialPhase ? '#C8A65A' : 'rgba(200,166,90,0.4)';
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = '#5D7A5E';
    ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('土圭测影', CX, CY + 80);

    // Progress hint — show how many phases are left
    const remaining = 4 - this.sandialPhase;
    if (this.sandialPhase > 0) {
      ctx.fillStyle = '#C8A65A';
      ctx.font = '13px "PingFang SC", "Noto Sans SC", sans-serif';
      ctx.fillText(`已完成 ${this.sandialPhase}/4 格`, CX, CY + 108);
    }

    // Direction arrow — animate to draw attention
    if (remaining > 0) {
      const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 500);
      ctx.fillStyle = `rgba(93,122,94,${pulse})`;
      ctx.font = '18px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(remaining > 2 ? '→ 向右拖动 ←' : '→ 继续拖动 →', CX, CANVAS_HEIGHT - 55);
    }

    this.drawInstruction(ctx, '拖动观察日影变化 · 到尽头翻页');
  }

  private renderOracle(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#1A1A18', '#2a2723');

    // Turtle shell outline
    ctx.strokeStyle = '#8B8070';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(CX, CY - 20, 160, 200, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Cracks forming
    const cracksAppear = Math.min(1, this.frameTimer / 1500);
    ctx.strokeStyle = 'rgba(200,166,90,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const startAngle = (i / 6) * Math.PI * 2;
      const len = 30 + Math.sin(i * 3.7) * 20;
      const endAngle = startAngle + 0.3 + Math.sin(i * 2.1) * 0.2;
      if (this.frameTimer > i * 200) {
        ctx.beginPath();
        const sx = CX + Math.cos(startAngle) * 40;
        const sy = CY - 20 + Math.sin(startAngle) * 40;
        ctx.moveTo(sx, sy);
        const ex = sx + Math.cos(endAngle) * len * cracksAppear;
        const ey = sy + Math.sin(endAngle + 0.1) * len * cracksAppear * 0.5;
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }

    // "宅兹中国" appearing
    if (this.frameTimer > 1200) {
      const textAlpha = Math.min(1, (this.frameTimer - 1200) / 500);
      ctx.fillStyle = `rgba(200,166,90,${textAlpha})`;
      ctx.font = '28px "PingFang SC", "Noto Sans SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('宅兹中国', CX, CY + 220);
    }
  }

  private renderTripod(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#5D7A5E', '#3a5a3e');
    this.drawBronzeEdge(ctx);

    // Cauldron (九鼎)
    const tripodX = CX;
    const tripodY = CY + 10;

    // Tripod body
    ctx.fillStyle = '#4a6a3e';
    ctx.strokeStyle = '#C8A65A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tripodX - 80, tripodY - 20);
    ctx.quadraticCurveTo(tripodX, tripodY - 80, tripodX + 80, tripodY - 20);
    ctx.quadraticCurveTo(tripodX + 90, tripodY + 20, tripodX + 70, tripodY + 60);
    ctx.quadraticCurveTo(tripodX, tripodY + 90, tripodX - 70, tripodY + 60);
    ctx.quadraticCurveTo(tripodX - 90, tripodY + 20, tripodX - 80, tripodY - 20);
    ctx.fill();
    ctx.stroke();

    // Reflection pool (cauldron belly reflection) — city grows
    ctx.save();
    const reflectH = 40 + this.tripodProgress * 120;
    ctx.beginPath();
    ctx.ellipse(tripodX, tripodY + 100, 120 * this.tripodProgress + 10, reflectH / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,166,90,0.15)';
    ctx.fill();

    // Buildings growing in reflection
    if (this.tripodProgress > 0.3) {
      const cityAlpha = Math.min(1, (this.tripodProgress - 0.3) / 0.4);
      ctx.fillStyle = `rgba(245,240,232,${cityAlpha * 0.4})`;
      const cx = tripodX;
      const cy = tripodY + 100;
      for (let i = 0; i < 5; i++) {
        const bw = 12 + i * 3;
        const bh = 10 + i * 8 * this.tripodProgress;
        ctx.fillRect(cx - 50 + i * 22, cy - bh / 2, bw, bh);
      }
    }
    ctx.restore();

    ctx.fillStyle = '#F5F0E8';
    ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('九鼎定都', CX, tripodY - 110);

    this.drawInstruction(ctx, '← 拖动 → 城市生长');
  }

  private renderKongLao(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#F5F0E8', '#e8dcc8');
    this.drawBronzeEdge(ctx);

    // Confucius' twig circle (fixed)
    ctx.strokeStyle = '#2a2723';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(KONGZI_CENTER.x, KONGZI_CENTER.y, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Twig texture — small bumps along the circle
    ctx.strokeStyle = '#5D7A5E';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const bx = KONGZI_CENTER.x + Math.cos(a) * 60;
      const by = KONGZI_CENTER.y + Math.sin(a) * 60;
      ctx.beginPath();
      ctx.moveTo(bx - 4, by - 2);
      ctx.lineTo(bx + 4, by + 2);
      ctx.stroke();
    }

    // ── Target center marker ──
    // A small crosshair + dot showing where the pin must land
    ctx.strokeStyle = 'rgba(123,94,167,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(KONGZI_CENTER.x, KONGZI_CENTER.y, 5, 0, Math.PI * 2);
    ctx.stroke();
    // Small cross inside
    ctx.beginPath();
    ctx.moveTo(KONGZI_CENTER.x - 8, KONGZI_CENTER.y);
    ctx.lineTo(KONGZI_CENTER.x + 8, KONGZI_CENTER.y);
    ctx.moveTo(KONGZI_CENTER.x, KONGZI_CENTER.y - 8);
    ctx.lineTo(KONGZI_CENTER.x, KONGZI_CENTER.y + 8);
    ctx.stroke();
    // Center dot
    ctx.fillStyle = 'rgba(123,94,167,0.4)';
    ctx.beginPath();
    ctx.arc(KONGZI_CENTER.x, KONGZI_CENTER.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Label: 孔子
    ctx.fillStyle = '#6f675d';
    ctx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('孔子 · 枯枝画圆', KONGZI_CENTER.x, KONGZI_CENTER.y + 90);

    // Laozi's pin (draggable) — drawn on puzzle layer
    const pCtx = this.canvasManager.getContext('puzzle');
    if (pCtx) {
      // ── Gradient purple glow proportional to distance ──
      const glowIntensity = Math.max(0, 1 - this.laoziDist / NEAR_THRESHOLD);
      if (glowIntensity > 0.01) {
        const glow = pCtx.createRadialGradient(
          this.laoziPos.x, this.laoziPos.y, 0,
          this.laoziPos.x, this.laoziPos.y, 30 + (1 - glowIntensity) * 30,
        );
        glow.addColorStop(0, `rgba(123,94,167,${glowIntensity * 0.5})`);
        glow.addColorStop(1, 'rgba(123,94,167,0)');
        pCtx.fillStyle = glow;
        pCtx.beginPath();
        pCtx.arc(this.laoziPos.x, this.laoziPos.y, 30 + (1 - glowIntensity) * 30, 0, Math.PI * 2);
        pCtx.fill();
      }

      // Pin / twig center
      pCtx.strokeStyle = '#2a2723';
      pCtx.lineWidth = 2;
      pCtx.beginPath();
      pCtx.arc(this.laoziPos.x, this.laoziPos.y, 8, 0, Math.PI * 2);
      pCtx.stroke();

      // Small cross at center (the pin point)
      pCtx.strokeStyle = glowIntensity > 0.3 ? '#7B5EA7' : '#5D7A5E';
      pCtx.lineWidth = 2;
      pCtx.beginPath();
      pCtx.moveTo(this.laoziPos.x - 4, this.laoziPos.y);
      pCtx.lineTo(this.laoziPos.x + 4, this.laoziPos.y);
      pCtx.moveTo(this.laoziPos.x, this.laoziPos.y - 4);
      pCtx.lineTo(this.laoziPos.x, this.laoziPos.y + 4);
      pCtx.stroke();

      // Label on puzzle layer
      pCtx.fillStyle = '#6f675d';
      pCtx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
      pCtx.textAlign = 'center';
      pCtx.fillText('老子 · 枯枝戳圆心', this.laoziPos.x, this.laoziPos.y + 40);
    }

    // ── Distance bar (on bg layer) ──
    if (!this.laoziSolved) {
      const maxDist = 400;
      const clamped = Math.min(maxDist, this.laoziDist);
      const barWidth = Math.max(0, (1 - clamped / maxDist)) * 120;
      const barX = CX - 60;
      const barY = CANVAS_HEIGHT - 52;
      const barH = 4;

      // Background track
      ctx.fillStyle = 'rgba(111,103,93,0.3)';
      ctx.fillRect(barX, barY, 120, barH);

      // Fill — purple when close, gray when far
      const isClose = this.laoziDist < SNAP_THRESHOLD * 2;
      ctx.fillStyle = isClose ? '#7B5EA7' : 'rgba(123,94,167,0.4)';
      ctx.fillRect(barX, barY, barWidth, barH);

      // Label
      ctx.fillStyle = isClose ? '#7B5EA7' : '#6f675d';
      ctx.font = '11px "PingFang SC", "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      if (this.laoziDist < SNAP_THRESHOLD) {
        ctx.fillText('对准了！松手', CX, barY - 4);
      } else if (this.laoziDist < NEAR_THRESHOLD) {
        ctx.fillText('接近圆心 · 继续', CX, barY - 4);
      } else if (this.laoziDist < 200) {
        ctx.fillText('拖向圆心', CX, barY - 4);
      } else {
        ctx.fillText('将老子点拖到孔子圆中', CX, barY - 4);
      }
    }

    this.drawInstruction(ctx, '拖拽老子圆点到孔子圆心');
  }

  private renderStakes(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#5D7A5E', '#3a5a3e');

    // Dragon tail rope from left
    ctx.strokeStyle = '#B87333';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(50, CY + 40);
    ctx.quadraticCurveTo(CX - 250, CY + 100, STAKE_POSITIONS[0].x, STAKE_POSITIONS[0].y);
    ctx.stroke();

    // Connection between pressed stakes
    ctx.strokeStyle = '#C8A65A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      if (this.stakesPressed[i]) {
        if (i === 0) ctx.moveTo(STAKE_POSITIONS[i].x, STAKE_POSITIONS[i].y);
        else ctx.lineTo(STAKE_POSITIONS[i].x, STAKE_POSITIONS[i].y);
      }
    }
    ctx.stroke();

    // Draw stakes
    for (let i = 0; i < 3; i++) {
      const s = STAKE_POSITIONS[i];
      const pressed = this.stakesPressed[i];

      // Stake top (circle)
      ctx.fillStyle = pressed ? '#C8A65A' : '#8B8070';
      ctx.strokeStyle = pressed ? '#D4A843' : '#5D7A5E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, STAKE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (pressed) {
        // Rope wrapped around
        ctx.strokeStyle = '#B87333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, STAKE_RADIUS + 3, 0, Math.PI * 1.5);
        ctx.stroke();
      }

      // Stake body (wooden post)
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(s.x - 3, s.y + STAKE_RADIUS, 6, 40);
    }

    ctx.fillStyle = '#F5F0E8';
    ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('拽绳打桩', CX, CY - 120);

    this.drawInstruction(ctx, '点击木桩 — 依次打三桩');
  }

  private renderZhaiziStamp(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#F5F0E8', '#e8dcc8');
    this.drawBronzeEdge(ctx);

    ctx.fillStyle = '#5D7A5E';
    ctx.font = '36px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('宅兹中国', CX, CY - 20);

    ctx.fillStyle = '#6f675d';
    ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
    ctx.fillText('—— 周王城 · 营洛 ——', CX, CY + 40);
  }

  /* ═══════════════════════════════════════
     礼成 — Frame rendering
     ═══════════════════════════════════════ */

  private renderBellsAppear(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#3a5a3e', '#2a4a2e');

    // Bell array fading in
    const alpha = this.bellsAlpha;
    for (let i = 0; i < BELL_COUNT; i++) {
      const bx = BELLS_START_X + i * BELL_SPACING;
      const fadeDelay = i * 0.15;
      const bellAlpha = Math.max(0, Math.min(1, (alpha - fadeDelay) / 0.4));
      if (bellAlpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = bellAlpha;

      // Bell body
      ctx.strokeStyle = '#C8A65A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, BELLS_Y - 30);
      ctx.quadraticCurveTo(bx - 20, BELLS_Y - 10, bx - 18, BELLS_Y + 10);
      ctx.quadraticCurveTo(bx, BELLS_Y + 25, bx + 18, BELLS_Y + 10);
      ctx.quadraticCurveTo(bx + 20, BELLS_Y - 10, bx, BELLS_Y - 30);
      ctx.stroke();

      // Bell mouth
      ctx.strokeStyle = '#5D7A5E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - 14, BELLS_Y + 10);
      ctx.quadraticCurveTo(bx, BELLS_Y + 20, bx + 14, BELLS_Y + 10);
      ctx.stroke();

      // Top knob
      ctx.fillStyle = '#C8A65A';
      ctx.beginPath();
      ctx.arc(bx, BELLS_Y - 32, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.fillStyle = '#F5F0E8';
    ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('编钟阵列', CX, CY + 100);
  }

  private renderTuneBells(ctx: CanvasRenderingContext2D): void {
    // Same background as bells appear
    this.drawBackground(ctx, '#3a5a3e', '#2a4a2e');

    // Bell array (fully visible)
    for (let i = 0; i < BELL_COUNT; i++) {
      const bx = BELLS_START_X + i * BELL_SPACING;

      ctx.strokeStyle = '#C8A65A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, BELLS_Y - 30);
      ctx.quadraticCurveTo(bx - 20, BELLS_Y - 10, bx - 18, BELLS_Y + 10);
      ctx.quadraticCurveTo(bx, BELLS_Y + 25, bx + 18, BELLS_Y + 10);
      ctx.quadraticCurveTo(bx + 20, BELLS_Y - 10, bx, BELLS_Y - 30);
      ctx.stroke();

      // Highlight resonance bell
      if (i === RESONANCE_INDEX) {
        ctx.fillStyle = 'rgba(200,166,90,0.1)';
        ctx.beginPath();
        ctx.arc(bx, BELLS_Y, 30, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Striker (hammer) position
    ctx.fillStyle = '#8B8070';
    ctx.beginPath();
    ctx.arc(this.strikerX, BELLS_Y + 50, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5D7A5E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.strikerX, BELLS_Y + 40);
    ctx.lineTo(this.strikerX, BELLS_Y - 40);
    ctx.stroke();

    // Glow near resonance position
    const resX = BELLS_START_X + RESONANCE_INDEX * BELL_SPACING;
    const distToRes = Math.abs(this.strikerX - resX);
    if (distToRes < 80) {
      const glowIntensity = Math.max(0, 1 - distToRes / 80);
      const glow = ctx.createRadialGradient(resX, BELLS_Y, 0, resX, BELLS_Y, 60);
      glow.addColorStop(0, `rgba(200,166,90,${glowIntensity * 0.3})`);
      glow.addColorStop(1, 'rgba(200,166,90,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(resX, BELLS_Y, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#F5F0E8';
    ctx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('移动撞锤找到共振音', CX, CANVAS_HEIGHT - 30);
  }

  private renderResonance(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#2a4a2e', '#1a3a1e');

    const resX = BELLS_START_X + RESONANCE_INDEX * BELL_SPACING;

    // Sound wave rings emanating
    for (let i = 0; i < 4; i++) {
      const waveRadius = 60 + (this.frameTimer / 600 + i * 0.3) % 1 * 200;
      const waveAlpha = Math.max(0, 0.4 * (1 - waveRadius / 260));
      ctx.strokeStyle = `rgba(200,166,90,${waveAlpha * this.resonanceAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(resX, BELLS_Y, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Bell string vibration
    ctx.strokeStyle = 'rgba(200,166,90,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < BELL_COUNT; i++) {
      const bx = BELLS_START_X + i * BELL_SPACING;
      const vibrate = Math.sin(this.frameTimer / 80 + i) * 2 * this.resonanceAlpha;
      ctx.beginPath();
      ctx.moveTo(bx, BELLS_Y - 30);
      ctx.lineTo(bx + vibrate, BELLS_Y + 20);
      ctx.stroke();
    }

    ctx.fillStyle = '#F5F0E8';
    ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('嗡——', CX, CY + 120);
  }

  private renderPeony(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#F5F0E8', '#e8dcc8');
    this.drawBronzeEdge(ctx);

    // Peony bud blooming
    const bloom = this.peonyProgress;
    ctx.save();
    ctx.translate(CX, CY - 10);

    // Stem
    ctx.strokeStyle = '#5D7A5E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.quadraticCurveTo(-10, 30, 0, 0);
    ctx.stroke();

    // Bud/Flower
    const petalCount = 6;
    const maxRadius = 20 + bloom * 30;
    for (let i = 0; i < petalCount; i++) {
      const a = (i / petalCount) * Math.PI * 2 + bloom * 0.3;
      const pr = maxRadius * (0.6 + 0.4 * Math.sin(i * 1.5 + bloom * 2));
      const px = Math.cos(a) * pr;
      const py = Math.sin(a) * pr;

      ctx.fillStyle = bloom > 0.5
        ? `rgba(200,80,60,${(bloom - 0.5) * 2})`       // red petals
        : `rgba(200,166,90,${bloom * 2})`;              // gold bud
      ctx.beginPath();
      ctx.arc(px, py, pr * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.fillStyle = '#6f675d';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('牡丹 · 第一环', CX, CY + 120);
  }

  private renderLiStamp(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#F5F0E8', '#e8dcc8');
    this.drawBronzeEdge(ctx);

    ctx.fillStyle = '#5D7A5E';
    ctx.font = '36px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('礼成', CX, CY - 20);

    ctx.fillStyle = '#6f675d';
    ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
    ctx.fillText('—— 周王城 · 礼成 ——', CX, CY + 40);
  }

  /* ═══════════════════════════════════════
     问道 — Frame rendering
     ═══════════════════════════════════════ */

  private renderConfucius(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#e8dcc8', '#d8c8b0');

    // Carriage approaching from left
    const carX = -200 + this.confuciusProgress * (CX + 200);

    ctx.save();
    ctx.translate(carX, CY - 30);

    // Carriage body
    ctx.fillStyle = '#8B8070';
    ctx.fillRect(-40, -30, 80, 60);
    ctx.strokeStyle = '#5D7A5E';
    ctx.lineWidth = 2;
    ctx.strokeRect(-40, -30, 80, 60);

    // Wheel
    ctx.strokeStyle = '#2a2723';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 35, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Spokes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 35);
      ctx.lineTo(Math.cos(a) * 20, 35 + Math.sin(a) * 20);
      ctx.stroke();
    }

    // Copper bell (銮铃) on top
    ctx.fillStyle = '#C8A65A';
    ctx.beginPath();
    ctx.arc(0, -38, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = '#5D7A5E';
    ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('孔子入洛', CX, CY + 120);
  }

  private renderAltar(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#F5F0E8', '#e8dcc8');
    this.drawBronzeEdge(ctx);

    // Ritual layout
    const altarY = CY - 30;

    // Altar table
    ctx.fillStyle = '#8B8070';
    ctx.fillRect(CX - 100, altarY - 10, 200, 40);

    // Offerings on altar
    for (let i = 0; i < 5; i++) {
      const ox = CX - 80 + i * 40;
      ctx.fillStyle = i % 2 === 0 ? '#C8A65A' : '#5D7A5E';
      ctx.beginPath();
      ctx.arc(ox, altarY + 5, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Empty main seat (position of honor)
    ctx.strokeStyle = '#7B5EA7';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.rect(CX - 30, altarY - 60, 60, 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Purple glow on empty seat
    if (this.altarAlpha > 0) {
      const glow = ctx.createRadialGradient(CX, altarY - 35, 0, CX, altarY - 35, 50);
      glow.addColorStop(0, `rgba(123,94,167,${this.altarAlpha * 0.3})`);
      glow.addColorStop(1, 'rgba(123,94,167,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(CX, altarY - 35, 50, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#6f675d';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('主祭位虚席以待', CX, CY + 120);
  }

  private renderGreenOx(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#5D7A5E', '#3a5a3e');

    // Green ox walking right (leaving through Hangu Pass)
    const oxX = CX - 200 + this.oxProgress * 400;

    ctx.save();
    ctx.translate(oxX, CY - 10);

    // Ox body
    ctx.fillStyle = '#4a6a4a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ox head
    ctx.fillStyle = '#3a5a3a';
    ctx.beginPath();
    ctx.arc(45, -5, 18, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.strokeStyle = '#2a4a2a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, -20);
    ctx.lineTo(58, -35);
    ctx.moveTo(55, -20);
    ctx.lineTo(63, -32);
    ctx.stroke();

    // Rider (Laozi silhouette, minimal)
    ctx.fillStyle = '#2a2723';
    ctx.beginPath();
    ctx.arc(-5, -28, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-8, -16, 16, 35);

    // Purple mist streaming behind
    if (this.oxProgress > 0.3) {
      const mistAlpha = Math.min(1, (this.oxProgress - 0.3) / 0.4);
      const mist = ctx.createRadialGradient(-50, -10, 0, -50, -10, 100);
      mist.addColorStop(0, `rgba(123,94,167,${mistAlpha * 0.3})`);
      mist.addColorStop(1, 'rgba(123,94,167,0)');
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.arc(-50, -10, 100, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.fillStyle = '#F5F0E8';
    ctx.font = '20px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('青牛出关 · 紫气东来', CX, CY + 120);
  }

  private renderPulp(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#e8dcc8', '#d8c8b0');

    // Paper pulp pool
    ctx.fillStyle = '#c8b8a0';
    ctx.beginPath();
    ctx.ellipse(CX, CY, 150, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // White hair dissolving into pulp
    const hairProgress = this.pulpProgress;
    const strands = 8;
    ctx.strokeStyle = 'rgba(240,235,220,0.7)';
    ctx.lineWidth = 1;
    for (let i = 0; i < strands; i++) {
      const a = (i / strands) * Math.PI * 2 + hairProgress * 0.5;
      const startR = 20 + i * 5;
      const endR = 80 * hairProgress;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * startR, CY + Math.sin(a) * startR * 0.5);
      ctx.quadraticCurveTo(
        CX + Math.cos(a + 0.3) * startR * (1 + hairProgress),
        CY + Math.sin(a + 0.3) * startR * 0.5 * (1 + hairProgress),
        CX + Math.cos(a + 0.6) * endR,
        CY + Math.sin(a + 0.6) * endR * 0.5,
      );
      ctx.stroke();
    }

    // Fibers forming seal
    if (hairProgress > 0.7) {
      const fiberAlpha = Math.min(1, (hairProgress - 0.7) / 0.3);
      ctx.fillStyle = `rgba(200,166,90,${fiberAlpha * 0.5})`;
      ctx.font = '28px "PingFang SC", "Noto Sans SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('封', CX, CY);
    }

    ctx.fillStyle = '#6f675d';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('白发入纸 · 纤维封印', CX, CY + 120);
  }

  private renderWdStamp(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, '#F5F0E8', '#e8dcc8');
    this.drawBronzeEdge(ctx);

    ctx.fillStyle = '#5D7A5E';
    ctx.font = '36px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('问道', CX, CY - 20);

    ctx.fillStyle = '#6f675d';
    ctx.font = '18px "PingFang SC", "Noto Sans SC", serif';
    ctx.fillText('—— 周王城 · 问道 ——', CX, CY + 40);
  }

  private renderComplete(ctx: CanvasRenderingContext2D): void {
    this.renderWdStamp(ctx);
    this.drawFadeOverlay(ctx);
  }
}
