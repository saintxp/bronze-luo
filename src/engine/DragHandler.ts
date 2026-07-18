/**
 * 铜声·识洛 — Drag interaction handler
 *
 * Mouse + touch dual-input handler. Screen coordinates → canvas coordinates.
 * Supports two modes:
 *   - element-drag: drag a specific element (arrow keys on canvas)
 *   - layer-pan:   pan an entire layer (used in L2 nest tutorial)
 *
 * State machine: IDLE → DRAGGING → ENDED
 */

import {
	SNAP_THRESHOLD,
	SNAP_THRESHOLD_MOBILE,
	CANVAS_WIDTH,
	CANVAS_HEIGHT,
} from "../utils/constants";
import { type Vec2, vec2Sub } from "../utils/math";
import { eventBus } from "../utils/EventBus";
import { createLogger } from "../utils/logger";

const log = createLogger("DragHandler");

export type DragMode = "element" | "layer";

export interface DragState {
	active: boolean;
	startPos: Vec2;
	currentPos: Vec2;
	delta: Vec2; // per-frame movement
	totalDelta: Vec2; // cumulative from drag start (currentPos - startPos)
	targetId: string | null;
	mode: DragMode;
}

export type DragCallback = (state: DragState) => void;

interface DragElement {
	id: string;
	getPos: () => Vec2;
	setPos: (pos: Vec2) => void;
	getSize: () => { w: number; h: number };
	onDragStart?: (pos: Vec2) => void;
	onDragMove?: (pos: Vec2, delta: Vec2) => void;
	onDragEnd?: (pos: Vec2) => void;
}

export class DragHandler {
	private canvas: HTMLCanvasElement | null = null;
	private state: DragState = {
		active: false,
		startPos: { x: 0, y: 0 },
		currentPos: { x: 0, y: 0 },
		delta: { x: 0, y: 0 },
		totalDelta: { x: 0, y: 0 },
		targetId: null,
		mode: "element",
	};

	private elements = new Map<string, DragElement>();
	private _mode: DragMode = "element";
	private _isMobile = false;
	private _onDrag: DragCallback | null = null;
	private _onDragEnd: DragCallback | null = null;

	private boundMouseDown: (e: MouseEvent) => void;
	private boundMouseMove: (e: MouseEvent) => void;
	private boundMouseUp: (e: MouseEvent) => void;
	private boundTouchStart: (e: TouchEvent) => void;
	private boundTouchMove: (e: TouchEvent) => void;
	private boundTouchEnd: (e: TouchEvent) => void;

	constructor() {
		// Bind handlers to keep references for removal
		this.boundMouseDown = this.onMouseDown.bind(this);
		this.boundMouseMove = this.onMouseMove.bind(this);
		this.boundMouseUp = this.onMouseUp.bind(this);
		this.boundTouchStart = this.onTouchStart.bind(this);
		this.boundTouchMove = this.onTouchMove.bind(this);
		this.boundTouchEnd = this.onTouchEnd.bind(this);
	}

	get mode(): DragMode {
		return this._mode;
	}

	get isMobile(): boolean {
		return this._isMobile;
	}

	get snapThreshold(): number {
		return this._isMobile ? SNAP_THRESHOLD_MOBILE : SNAP_THRESHOLD;
	}

	/**
	 * Attach drag handler to a canvas element.
	 */
	attach(canvas: HTMLCanvasElement): void {
		this.canvas = canvas;
		this._isMobile = "ontouchstart" in window;

		canvas.style.pointerEvents = "auto";
		canvas.addEventListener("mousedown", this.boundMouseDown);
		canvas.addEventListener("mousemove", this.boundMouseMove);
		canvas.addEventListener("mouseup", this.boundMouseUp);
		canvas.addEventListener("touchstart", this.boundTouchStart, {
			passive: false,
		});
		canvas.addEventListener("touchmove", this.boundTouchMove, {
			passive: false,
		});
		canvas.addEventListener("touchend", this.boundTouchEnd);

		log.info(`DragHandler attached (mobile: ${this._isMobile})`);
	}

	/**
	 * Detach from canvas.
	 */
	detach(): void {
		if (!this.canvas) return;
		this.canvas.style.pointerEvents = "none";
		this.canvas.removeEventListener("mousedown", this.boundMouseDown);
		this.canvas.removeEventListener("mousemove", this.boundMouseMove);
		this.canvas.removeEventListener("mouseup", this.boundMouseUp);
		this.canvas.removeEventListener("touchstart", this.boundTouchStart);
		this.canvas.removeEventListener("touchmove", this.boundTouchMove);
		this.canvas.removeEventListener("touchend", this.boundTouchEnd);
		this.canvas = null;
		// Elements and callbacks are chapter-scoped — clear them so they
		// never leak into the next chapter and shadow new registrations
		// (findElementAt iterates the Map in insertion order).
		this.elements.clear();
		this._onDrag = null;
		this._onDragEnd = null;
		this.state.active = false;
		this.state.targetId = null;
	}

	/**
	 * Register a draggable element.
	 */
	registerElement(el: DragElement): void {
		this.elements.set(el.id, el);
	}

	/**
	 * Unregister a draggable element.
	 */
	unregisterElement(id: string): void {
		this.elements.delete(id);
	}

	/**
	 * Set drag mode.
	 */
	setMode(mode: DragMode): void {
		this._mode = mode;
	}

	/**
	 * Set a global drag callback (called every frame during drag).
	 */
	onDrag(callback: DragCallback): void {
		this._onDrag = callback;
	}

	/**
	 * Set a global drag-end callback.
	 */
	onDragEnd(callback: DragCallback): void {
		this._onDragEnd = callback;
	}

	private screenToCanvas(clientX: number, clientY: number): Vec2 {
		if (!this.canvas) return { x: clientX, y: clientY };
		const rect = this.canvas.getBoundingClientRect();
		// Map CSS-pixel screen position → canvas logical 1920×1080 coordinates
		// The canvas's internal resolution is fixed, display size may be scaled
		return {
			x: (clientX - rect.left) * (CANVAS_WIDTH / rect.width),
			y: (clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
		};
	}

	private findElementAt(pos: Vec2): DragElement | null {
		for (const [, el] of this.elements) {
			const elPos = el.getPos();
			const size = el.getSize();
			if (
				pos.x >= elPos.x &&
				pos.x <= elPos.x + size.w &&
				pos.y >= elPos.y &&
				pos.y <= elPos.y + size.h
			) {
				return el;
			}
		}
		return null;
	}

	private startDrag(pos: Vec2, targetId: string | null): void {
		this.state = {
			active: true,
			startPos: { ...pos },
			currentPos: { ...pos },
			delta: { x: 0, y: 0 },
			totalDelta: { x: 0, y: 0 },
			targetId,
			mode: this._mode,
		};

		eventBus.emit("drag:start", {
			x: pos.x,
			y: pos.y,
			targetId: targetId ?? "",
		});

		const el = targetId ? this.elements.get(targetId) : null;
		el?.onDragStart?.(pos);
	}

	private moveDrag(pos: Vec2): void {
		if (!this.state.active) return;

		const delta = vec2Sub(pos, this.state.currentPos);
		this.state.currentPos = { ...pos };
		this.state.delta = delta;
		this.state.totalDelta = vec2Sub(pos, this.state.startPos);

		eventBus.emit("drag:move", {
			x: pos.x,
			y: pos.y,
			dx: delta.x,
			dy: delta.y,
		});

		// If in element mode, update the element position
		if (this._mode === "element" && this.state.targetId) {
			const el = this.elements.get(this.state.targetId);
			if (el) {
				const current = el.getPos();
				el.setPos({ x: current.x + delta.x, y: current.y + delta.y });
			}
		}

		this._onDrag?.(this.state);
	}

	private endDrag(pos: Vec2): void {
		if (!this.state.active) return;

		this.state.currentPos = { ...pos };
		this.state.active = false;

		eventBus.emit("drag:end", { x: pos.x, y: pos.y });
		this._onDragEnd?.(this.state);

		const el = this.state.targetId
			? this.elements.get(this.state.targetId)
			: null;
		el?.onDragEnd?.(pos);
	}

	/* ───────── Mouse handlers ───────── */

	private onMouseDown(e: MouseEvent): void {
		const pos = this.screenToCanvas(e.clientX, e.clientY);

		if (this._mode === "element") {
			const el = this.findElementAt(pos);
			if (el) {
				this.startDrag(pos, el.id);
				return;
			}
		}

		this.startDrag(pos, null);
	}

	private onMouseMove(e: MouseEvent): void {
		const pos = this.screenToCanvas(e.clientX, e.clientY);
		if (this.state.active) {
			this.moveDrag(pos);
		}
	}

	private onMouseUp(_e: MouseEvent): void {
		this.endDrag(this.state.currentPos);
	}

	/* ───────── Touch handlers ───────── */

	private onTouchStart(e: TouchEvent): void {
		e.preventDefault();
		const touch = e.touches[0];
		if (!touch) return;

		const pos = this.screenToCanvas(touch.clientX, touch.clientY);

		if (this._mode === "element") {
			const el = this.findElementAt(pos);
			if (el) {
				this.startDrag(pos, el.id);
				return;
			}
		}

		this.startDrag(pos, null);
	}

	private onTouchMove(e: TouchEvent): void {
		e.preventDefault();
		const touch = e.touches[0];
		if (!touch) return;

		const pos = this.screenToCanvas(touch.clientX, touch.clientY);
		if (this.state.active) {
			this.moveDrag(pos);
		}
	}

	private onTouchEnd(_e: TouchEvent): void {
		this.endDrag(this.state.currentPos);
	}
}
