/**
 * 铜声·识洛 — Image renderer utility
 *
 * Unified API for drawing images on Canvas layers.
 * When an image is missing (not yet loaded), falls back to
 * a procedural placeholder — so the game always renders something.
 *
 * Supports:
 *   - drawImage: basic draw with position + size
 *   - drawImageCover: fill target rect, crop overflow (like CSS object-fit: cover)
 *   - drawImageContain: fit within target rect, letterbox (like CSS object-fit: contain)
 *   - drawImageSliced: draw a source rect from the image into a dest rect (9-slice ready)
 *   - drawPlaceholder: procedural fallback (colored rect + label)
 */

export interface DrawRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Placeholder style when image is not yet loaded.
 */
export interface PlaceholderStyle {
  fill?: string;       // background color (default: #2a2723)
  stroke?: string;     // border color (default: #6f675d)
  label?: string;      // text label (default: asset path basename)
  textColor?: string;  // label color (default: #6f675d)
}

/**
 * Draw an image onto a canvas context.
 * If the image is not loaded, draws a placeholder.
 */
export function drawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  dest: DrawRect,
  placeholder?: PlaceholderStyle,
): void {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, dest.x, dest.y, dest.w, dest.h);
  } else {
    drawPlaceholder(ctx, dest, placeholder);
  }
}

/**
 * Draw an image with "cover" behavior — fill the target rect,
 * crop overflow. Like CSS object-fit: cover.
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  dest: DrawRect,
  placeholder?: PlaceholderStyle,
): void {
  if (!img || !img.complete || img.naturalWidth === 0) {
    drawPlaceholder(ctx, dest, placeholder);
    return;
  }

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const destRatio = dest.w / dest.h;

  let sx: number, sy: number, sw: number, sh: number;

  if (imgRatio > destRatio) {
    // Image is wider — crop sides
    sh = img.naturalHeight;
    sw = sh * destRatio;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    // Image is taller — crop top/bottom
    sw = img.naturalWidth;
    sh = sw / destRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dest.x, dest.y, dest.w, dest.h);
}

/**
 * Draw an image with "contain" behavior — fit within target rect,
 * letterbox with transparent or colored bars. Like CSS object-fit: contain.
 */
export function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  dest: DrawRect,
  placeholder?: PlaceholderStyle,
  letterboxColor?: string,
): void {
  if (!img || !img.complete || img.naturalWidth === 0) {
    drawPlaceholder(ctx, dest, placeholder);
    return;
  }

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const destRatio = dest.w / dest.h;

  let dw: number, dh: number, dx: number, dy: number;

  if (imgRatio > destRatio) {
    // Image is wider — fit width, letterbox top/bottom
    dw = dest.w;
    dh = dest.w / imgRatio;
    dx = dest.x;
    dy = dest.y + (dest.h - dh) / 2;
  } else {
    // Image is taller — fit height, letterbox sides
    dh = dest.h;
    dw = dest.h * imgRatio;
    dx = dest.x + (dest.w - dw) / 2;
    dy = dest.y;
  }

  if (letterboxColor) {
    ctx.fillStyle = letterboxColor;
    ctx.fillRect(dest.x, dest.y, dest.w, dest.h);
  }

  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Draw a slice of the source image into a destination rect.
 * Useful for sprite sheets or 9-slice rendering.
 */
export function drawImageSliced(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  src: DrawRect,
  dest: DrawRect,
  placeholder?: PlaceholderStyle,
): void {
  if (!img || !img.complete || img.naturalWidth === 0) {
    drawPlaceholder(ctx, dest, placeholder);
    return;
  }

  ctx.drawImage(
    img,
    src.x, src.y, src.w, src.h,
    dest.x, dest.y, dest.w, dest.h,
  );
}

/**
 * Draw a procedural placeholder when the image is not available.
 */
export function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  dest: DrawRect,
  style?: PlaceholderStyle,
): void {
  const fill = style?.fill ?? '#2a2723';
  const stroke = style?.stroke ?? '#6f675d';
  const textColor = style?.textColor ?? '#6f675d';
  const label = style?.label ?? '';

  // Background
  ctx.fillStyle = fill;
  ctx.fillRect(dest.x, dest.y, dest.w, dest.h);

  // Border
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(dest.x + 0.5, dest.y + 0.5, dest.w - 1, dest.h - 1);

  // Diagonal cross (indicates "missing asset")
  ctx.beginPath();
  ctx.moveTo(dest.x, dest.y);
  ctx.lineTo(dest.x + dest.w, dest.y + dest.h);
  ctx.moveTo(dest.x + dest.w, dest.y);
  ctx.lineTo(dest.x, dest.y + dest.h);
  ctx.strokeStyle = `${stroke}40`; // 25% opacity
  ctx.stroke();

  // Label
  if (label) {
    const fontSize = Math.min(14, dest.h / 4);
    ctx.fillStyle = textColor;
    ctx.font = `${fontSize}px "Noto Serif SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      label,
      dest.x + dest.w / 2,
      dest.y + dest.h / 2,
      dest.w - 10,
    );
  }
}

/**
 * Draw an image with alpha (transparency).
 */
export function drawImageAlpha(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  dest: DrawRect,
  alpha: number,
  placeholder?: PlaceholderStyle,
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  drawImage(ctx, img, dest, placeholder);
  ctx.restore();
}

/**
 * Draw an image with a clipping mask (rounded rect).
 */
export function drawImageClipped(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  dest: DrawRect,
  radius: number,
  placeholder?: PlaceholderStyle,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(dest.x, dest.y, dest.w, dest.h, radius);
  ctx.clip();
  drawImage(ctx, img, dest, placeholder);
  ctx.restore();
}
