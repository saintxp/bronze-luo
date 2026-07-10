/**
 * 铜声·识洛 — ChapterPrologue 序章
 *
 * 4-frame pure cutscene (no puzzles):
 *   COVER → MAP → FINGERPRINT → COPPER_FLOOD → COMPLETE
 *
 * Canvas 2D placeholder rendering with InkView/bronze color palette.
 * All graphics are procedural — no external assets required.
 *
 * Frame state machine:
 *   COVER (hold 3s) → MAP (swipe Luo River) → FINGERPRINT (auto 1s)
 *   → COPPER_FLOOD (auto 2.5s + bronze sound 'guDu') → COMPLETE (fade to black → chapter:complete)
 */

import { ChapterBase } from './ChapterBase';
import { type CanvasManager } from '../engine/CanvasManager';
import { DragHandler } from '../engine/DragHandler';
import { eventBus } from '../utils/EventBus';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('ChapterPrologue');

const CX = CANVAS_WIDTH / 2;
const CY = CANVAS_HEIGHT / 2;

enum PrologueFrame {
  COVER,
  MAP,
  FINGERPRINT,
  COPPER_FLOOD,
  COMPLETE,
}

export class ChapterPrologue extends ChapterBase {
  private canvasManager: CanvasManager;
  private dragHandler: DragHandler;
  private frame: PrologueFrame = PrologueFrame.COVER;
  private frameTimer = 0;        // ms in current frame
  private holdDuration = 0;      // ms user has pressed on COVER
  private isPressing = false;    // user pressing on COVER
  private swipeProgress = 0;     // 0..1 Luo River swipe
  private transitionAlpha = 0;   // 0..1 fade-to-black
  private copperProgress = 0;    // 0..1 copper flood animation
  private fingerAlpha = 0;       // 0..1 fingerprint fade-in
  private completed = false;     // guard against double chapter:complete
  private skipRender = false;    // skip render after chapter transitioned

  private readonly HOLD_REQUIRED = 3000;
  private readonly FINGERPRINT_DURATION = 1000;
  private readonly FLOOD_DURATION = 2500;
  private readonly TRANSITION_DURATION = 500;

  // Direct event listeners for COVER frame
  private boundPointerDown: ((e: Event) => void) | null = null;
  private boundPointerUp: ((e: Event) => void) | null = null;

  constructor(canvasManager: CanvasManager, dragHandler: DragHandler) {
    super('prologue');
    this.canvasManager = canvasManager;
    this.dragHandler = dragHandler;
  }

  init(): void {
    this.puzzles = [];
    log.info('Prologue chapter initialized');
  }

  enter(): void {
    super.enter();
    this.resetState();
    this.frame = PrologueFrame.COVER;
    this.setupCoverListeners();
    log.info('Prologue entered');
  }

  exit(): void {
    super.exit();
    this.teardownCoverListeners();
    this.dragHandler.detach();
    this.dragHandler.onDrag(() => {});
    this.dragHandler.onDragEnd(() => {});
  }

  private resetState(): void {
    this.frameTimer = 0;
    this.holdDuration = 0;
    this.isPressing = false;
    this.swipeProgress = 0;
    this.transitionAlpha = 0;
    this.copperProgress = 0;
    this.fingerAlpha = 0;
    this.completed = false;
    this.skipRender = false;
  }

  private getCanvas(): HTMLCanvasElement | null {
    return this.canvasManager.getLayer('puzzle')?.canvas ?? null;
  }

  update(dt: number): void {
    // After chapter:complete has been emitted and ChapterManager transitioned,
    // skip further update processing to avoid racing the new chapter
    if (this.skipRender) return;

    this.frameTimer += dt;

    switch (this.frame) {
      case PrologueFrame.COVER:
        if (this.isPressing) {
          this.holdDuration += dt;
          if (this.holdDuration >= this.HOLD_REQUIRED) {
            this.advanceToMap();
          }
        }
        break;

      case PrologueFrame.MAP:
        // swipeProgress is driven by drag callbacks
        break;

      case PrologueFrame.FINGERPRINT:
        this.fingerAlpha = Math.min(1, this.frameTimer / 400);
        if (this.frameTimer >= this.FINGERPRINT_DURATION) {
          this.advanceToFlood();
        }
        break;

      case PrologueFrame.COPPER_FLOOD:
        this.copperProgress = Math.min(1, this.frameTimer / this.FLOOD_DURATION);
        if (this.frameTimer >= this.FLOOD_DURATION) {
          this.advanceToComplete();
        }
        break;

      case PrologueFrame.COMPLETE:
        if (this.completed) break;
        this.transitionAlpha = Math.min(1, this.transitionAlpha + dt / this.TRANSITION_DURATION);
        if (this.transitionAlpha >= 1) {
          this.completed = true;
          this.skipRender = true;
          eventBus.emit('chapter:complete', { chapterId: 'prologue' });
        }
        break;
    }

    this.renderFrame();
  }

  /* ───────── Frame transitions ───────── */

  private advanceToMap(): void {
    this.teardownCoverListeners();
    this.frame = PrologueFrame.MAP;
    this.frameTimer = 0;
    this.setupMapDrag();
    log.info('Prologue: COVER → MAP');
  }

  private advanceToFingerprint(): void {
    this.teardownMapDrag();
    this.frame = PrologueFrame.FINGERPRINT;
    this.frameTimer = 0;
    log.info('Prologue: MAP → FINGERPRINT');
  }

  private advanceToFlood(): void {
    this.frame = PrologueFrame.COPPER_FLOOD;
    this.frameTimer = 0;
    eventBus.emit('bronze:sound', { soundId: 'guDu' });
    log.info('Prologue: FINGERPRINT → COPPER_FLOOD');
  }

  private advanceToComplete(): void {
    this.frame = PrologueFrame.COMPLETE;
    this.transitionAlpha = 0;
    log.info('Prologue: COPPER_FLOOD → COMPLETE (fade out)');
  }

  /* ───────── Interaction setup / teardown ───────── */

  private setupCoverListeners(): void {
    const canvas = this.getCanvas();
    if (!canvas) return;

    // CanvasManager sets all canvases to pointerEvents:none — enable for interaction
    canvas.style.pointerEvents = 'auto';

    this.boundPointerDown = ((_e: Event) => {
      this.isPressing = true;
    }) as EventListener;

    this.boundPointerUp = ((_e: Event) => {
      this.isPressing = false;
    }) as EventListener;

    canvas.addEventListener('mousedown', this.boundPointerDown);
    canvas.addEventListener('mouseup', this.boundPointerUp);
    canvas.addEventListener('mouseleave', this.boundPointerUp);
    canvas.addEventListener('touchstart', this.boundPointerDown, { passive: true });
    canvas.addEventListener('touchend', this.boundPointerUp);
    canvas.addEventListener('touchcancel', this.boundPointerUp);
  }

  private teardownCoverListeners(): void {
    const canvas = this.getCanvas();
    if (!canvas || !this.boundPointerDown) return;
    canvas.removeEventListener('mousedown', this.boundPointerDown);
    canvas.removeEventListener('mouseup', this.boundPointerUp!);
    canvas.removeEventListener('mouseleave', this.boundPointerUp!);
    canvas.removeEventListener('touchstart', this.boundPointerDown);
    canvas.removeEventListener('touchend', this.boundPointerUp!);
    canvas.removeEventListener('touchcancel', this.boundPointerUp!);
    this.boundPointerDown = null;
    this.boundPointerUp = null;
  }

  private setupMapDrag(): void {
    const canvas = this.getCanvas();
    if (!canvas) return;
    this.dragHandler.attach(canvas);
    this.dragHandler.setMode('layer');
    this.dragHandler.onDrag((state) => {
      this.swipeProgress += Math.abs(state.delta.x) * 0.002;
      this.swipeProgress = Math.min(1, this.swipeProgress);
      if (this.swipeProgress >= 1) {
        this.advanceToFingerprint();
      }
    });
    this.dragHandler.onDragEnd(() => {});
  }

  private teardownMapDrag(): void {
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
      case PrologueFrame.COVER:
        this.renderCover(ctx);
        break;
      case PrologueFrame.MAP:
        this.renderMap(ctx);
        break;
      case PrologueFrame.FINGERPRINT:
        this.renderFingerprint(ctx);
        break;
      case PrologueFrame.COPPER_FLOOD:
      case PrologueFrame.COMPLETE:
        this.renderCopperFlood(ctx);
        break;
    }
  }

  /* ───────── Frame 0: Cover ───────── */

  private renderCover(ctx: CanvasRenderingContext2D): void {
    // Warm brown background
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dark edge vignette
    const vignette = ctx.createRadialGradient(CX, CY, CX * 0.3, CX, CY, CX * 1.2);
    vignette.addColorStop(0, 'rgba(139,105,20,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Luoyang basin silhouette — abstract oval with wall outline
    ctx.strokeStyle = 'rgba(200,166,90,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(CX, CY - 30, 200, 120, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(200,166,90,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(CX - 80, CY - 70, 160, 100);

    // Title
    ctx.fillStyle = '#C8A65A';
    ctx.font = 'bold 64px "PingFang SC", "Noto Sans SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('铜声·识洛', CX, CY - 40);

    // Subtitle
    ctx.fillStyle = '#f6f1e6';
    ctx.font = '24px "PingFang SC", "Noto Sans SC", serif';
    ctx.fillText('洛阳三千年', CX, CY + 40);

    // Hold instruction with pulsing opacity
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 500);
    ctx.fillStyle = `rgba(246,241,230,${0.4 + 0.3 * pulse})`;
    ctx.font = '18px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.fillText('按住以翻开', CX, CY + 140);

    // Hold progress ring
    if (this.isPressing || this.holdDuration > 0) {
      const progress = Math.min(1, this.holdDuration / this.HOLD_REQUIRED);
      const radius = 30;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + progress * Math.PI * 2;

      ctx.strokeStyle = '#C8A65A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CX, CY + 140, radius, startAngle, endAngle);
      ctx.stroke();

      ctx.fillStyle = '#C8A65A';
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(progress * 100)}%`, CX, CY + 140);
    }
  }

  /* ───────── Frame 1: Map ───────── */

  /** Build an S-curve path representing the Luo River. */
  private getRiverPath(): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = 100 + t * (CANVAS_WIDTH - 200);
      const y = CY - 60 + 80 * Math.sin(t * Math.PI * 2);
      pts.push({ x, y });
    }
    return pts;
  }

  private renderMap(ctx: CanvasRenderingContext2D): void {
    // Lighter warm background
    ctx.fillStyle = '#A0782C';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const river = this.getRiverPath();

    // Luo River S-curve
    ctx.beginPath();
    ctx.moveTo(river[0].x, river[0].y);
    for (let i = 1; i < river.length; i++) {
      ctx.lineTo(river[i].x, river[i].y);
    }
    ctx.strokeStyle = '#B87333';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Copper liquid droplet flowing along river (2s loop)
    const flowT = (performance.now() % 2000) / 2000;
    const flowIdx = Math.floor(flowT * river.length);
    const fp = river[flowIdx % river.length];
    ctx.fillStyle = 'rgba(184,115,51,0.6)';
    ctx.beginPath();
    ctx.arc(fp.x, fp.y, 8 + 4 * Math.sin(flowT * Math.PI * 4), 0, Math.PI * 2);
    ctx.fill();

    // 9 coordinate dots along the river
    const dotCount = 9;
    const litCount = Math.floor(this.swipeProgress * dotCount);
    for (let i = 0; i < dotCount; i++) {
      const idx = Math.floor((i / dotCount) * river.length);
      const dot = river[idx];
      const isLit = i < litCount;

      ctx.beginPath();
      ctx.arc(dot.x, dot.y, isLit ? 8 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isLit ? '#D4A843' : 'rgba(200,166,90,0.3)';
      ctx.fill();

      // Glow ring for lit dots
      if (isLit) {
        const glow = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, 20);
        glow.addColorStop(0, 'rgba(212,168,67,0.4)');
        glow.addColorStop(1, 'rgba(212,168,67,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Instructions
    ctx.fillStyle = '#f6f1e6';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('沿洛河滑动', CX, CANVAS_HEIGHT - 40);

    if (this.swipeProgress > 0 && this.swipeProgress < 1) {
      ctx.fillStyle = '#C8A65A';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${Math.round(this.swipeProgress * 100)}%`, CX, CANVAS_HEIGHT - 16);
    }
  }

  /* ───────── Frame 2: Fingerprint ───────── */

  private renderFingerprint(ctx: CanvasRenderingContext2D): void {
    // Same dimmed map background
    ctx.fillStyle = '#A0782C';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const river = this.getRiverPath();

    // Dim river
    ctx.beginPath();
    ctx.moveTo(river[0].x, river[0].y);
    for (let i = 1; i < river.length; i++) {
      ctx.lineTo(river[i].x, river[i].y);
    }
    ctx.strokeStyle = 'rgba(184,115,51,0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Dim coordinate dots
    for (let i = 0; i < 9; i++) {
      const idx = Math.floor((i / 9) * river.length);
      const dot = river[idx];
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,166,90,0.2)';
      ctx.fill();
    }

    // Fingerprint near Erlitou (2nd coordinate area)
    const fpIdx = Math.floor((1 / 9) * river.length);
    const fpc = river[fpIdx];
    const alpha = this.fingerAlpha;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Concentric fingerprint arcs
    const radii = [8, 16, 24, 32, 40];
    for (const r of radii) {
      ctx.strokeStyle = 'rgba(200,166,90,0.6)';
      ctx.lineWidth = 2;
      // Upper arc
      ctx.beginPath();
      ctx.arc(fpc.x, fpc.y - 3, r, 0.3, Math.PI - 0.3);
      ctx.stroke();
      // Lower arc (offset center for natural look)
      ctx.beginPath();
      ctx.arc(fpc.x + 4, fpc.y + 4, r, Math.PI + 0.3, -0.3);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#C8A65A';
    ctx.font = '16px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('二里头', fpc.x, fpc.y + 52);

    ctx.restore();

    // Footer
    ctx.fillStyle = 'rgba(246,241,230,0.7)';
    ctx.font = '14px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('认领者·印记', CX, CANVAS_HEIGHT - 40);
  }

  /* ───────── Frame 3: Copper Flood ───────── */

  private renderCopperFlood(ctx: CanvasRenderingContext2D): void {
    // Base map background
    ctx.fillStyle = '#A0782C';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Copper flood trapezoidal panels from all 4 sides
    const p = this.copperProgress; // 0..1
    const eased = p * p;           // ease-in
    const dist = eased * Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.8;

    ctx.fillStyle = '#B87333';

    // Top panel
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CANVAS_WIDTH, 0);
    ctx.lineTo(CANVAS_WIDTH - dist, dist);
    ctx.lineTo(dist, dist);
    ctx.closePath();
    ctx.fill();

    // Bottom panel
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH - dist, CANVAS_HEIGHT - dist);
    ctx.lineTo(dist, CANVAS_HEIGHT - dist);
    ctx.closePath();
    ctx.fill();

    // Left panel
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dist, dist);
    ctx.lineTo(dist, CANVAS_HEIGHT - dist);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Right panel
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH, 0);
    ctx.lineTo(CANVAS_WIDTH - dist, dist);
    ctx.lineTo(CANVAS_WIDTH - dist, CANVAS_HEIGHT - dist);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Copper shimmer highlights
    if (p > 0.2) {
      const shimmer = 0.08 * Math.sin(performance.now() / 300);
      ctx.fillStyle = `rgba(201,166,90,${shimmer})`;
      ctx.fillRect(0, dist * 0.4, CANVAS_WIDTH, 3);
    }

    // Center text when panels have closed significantly
    if (p > 0.4) {
      const textAlpha = Math.min(1, (p - 0.4) / 0.3);
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = '#C8A65A';
      ctx.font = 'bold 48px "PingFang SC", "Noto Sans SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('铜液吞没', CX, CY);
      ctx.restore();
    }

    // COMPLETE: fade to black transition
    if (this.frame === PrologueFrame.COMPLETE) {
      ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }
}
