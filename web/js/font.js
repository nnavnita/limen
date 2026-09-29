// A bitmap font, built at runtime by rendering the system monospace face at a
// tiny size and hard-thresholding it. No font files, no smooth edges — every
// glyph ends up as whole pixels, like the rest of the office.

const SIZE = 8;          // pixel height of the source render
export const GLYPH_H = 8;
const THRESHOLD = 110;   // alpha cutoff; anything softer is not a pixel

const masks = new Map();
const tinted = new Map();

let scratch = null;
function scratchCtx() {
  if (!scratch) {
    scratch = document.createElement('canvas');
    scratch.width = 16;
    scratch.height = 16;
  }
  const ctx = scratch.getContext('2d', { willReadFrequently: true });
  ctx.font = `${SIZE}px ui-monospace, Menlo, monospace`;
  ctx.textBaseline = 'top';
  return ctx;
}

function maskFor(ch) {
  if (masks.has(ch)) return masks.get(ch);

  const ctx = scratchCtx();
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = '#fff';
  ctx.fillText(ch, 1, 2);

  const { data } = ctx.getImageData(0, 0, 16, 16);
  const on = [];
  let minX = 16;
  let maxX = -1;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (data[(y * 16 + x) * 4 + 3] >= THRESHOLD) {
        on.push([x, y]);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  // Space (and anything that renders blank) still needs to advance the cursor.
  const width = maxX < minX ? 3 : maxX - minX + 1;
  const mask = { pixels: on.map(([x, y]) => [x - (maxX < minX ? 0 : minX), y]), width };
  masks.set(ch, mask);
  return mask;
}

function glyphFor(ch, color) {
  const key = ch + '|' + color;
  if (tinted.has(key)) return tinted.get(key);

  const mask = maskFor(ch);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, mask.width);
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  for (const [x, y] of mask.pixels) ctx.fillRect(x, y, 1, 1);

  const glyph = { canvas, width: mask.width };
  tinted.set(key, glyph);
  return glyph;
}

const TRACKING = 1;   // pixels between glyphs

export function measure(text) {
  let width = 0;
  for (const ch of String(text)) width += maskFor(ch).width + TRACKING;
  return Math.max(0, width - TRACKING);
}

/** Draw pixel text with its top-left at (x, y). Returns the width drawn. */
export function drawText(ctx, text, x, y, color) {
  let cursor = Math.round(x);
  const top = Math.round(y);
  for (const ch of String(text)) {
    const glyph = glyphFor(ch, color);
    if (glyph.width > 0) ctx.drawImage(glyph.canvas, cursor, top);
    cursor += glyph.width + TRACKING;
  }
  return cursor - TRACKING - Math.round(x);
}

export function drawTextCentered(ctx, text, centerX, y, color) {
  return drawText(ctx, text, Math.round(centerX - measure(text) / 2), y, color);
}
