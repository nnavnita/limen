// In-world text: hanging signs, desk placards, name plates, speech bubbles.
// All of it is drawn on the canvas in the bitmap font so nothing looks smooth.

import { COLORS } from './palette.js';
import { drawText, drawTextCentered, measure, GLYPH_H } from './font.js';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Sign hanging over a zone: name, plus a lamp and count when anyone is in. */
export function drawZoneSign(ctx, x, y, label, count) {
  const text = count ? `${label} \u00d7${count}` : label;
  const w = measure(text) + (count ? 16 : 10);
  const left = Math.round(x - w / 2);

  px(ctx, left + 4, y - 4, 2, 4, '#6a5a78');          // hangers
  px(ctx, left + w - 6, y - 4, 2, 4, '#6a5a78');
  px(ctx, left, y, w, GLYPH_H + 5, COLORS.woodDark);
  px(ctx, left + 1, y + 1, w - 2, GLYPH_H + 3, count ? '#3d2f4d' : '#2c2438');

  if (count) {
    px(ctx, left + 4, y + 5, 3, 3, '#ffd06a');
    drawText(ctx, text, left + 10, y + 3, '#ffe9a8');
  } else {
    drawTextCentered(ctx, text, left + w / 2, y + 3, '#7b6b8b');
  }
}

/** Small placard over a desk cluster, colour-coded per repo. */
export function drawClusterPlacard(ctx, centerX, y, repo, color, zoneW) {
  const w = measure(repo) + 10;
  const left = clampLeft(centerX, w, zoneW);
  px(ctx, left, y, w, GLYPH_H + 4, COLORS.woodDark);
  px(ctx, left + 1, y + 1, w - 2, GLYPH_H + 2, '#4a3a2c');
  px(ctx, left + 3, y + 3, 2, GLYPH_H - 2, color);
  drawText(ctx, repo, left + 7, y + 2, COLORS.paper);
}

function clampLeft(centerX, w, limit) {
  const left = Math.round(centerX - w / 2);
  if (!limit) return left;
  return Math.max(2, Math.min(left, limit - w - 2));
}

/** Name plate under a character, kept inside the zone it belongs to. */
export function drawNamePlate(ctx, centerX, y, name, title, zoneW) {
  const text = `${name} ${title}`;
  const w = measure(text) + 6;
  const left = clampLeft(centerX, w, zoneW);
  px(ctx, left, y, w, GLYPH_H + 3, 'rgba(18, 13, 32, 0.85)');
  const used = drawText(ctx, name + ' ', left + 3, y + 2, COLORS.paper);
  drawText(ctx, title, left + 3 + used + 1, y + 2, '#a294b8');
}

/** Speech bubble for water-cooler chat. */
export function drawSpeechBubble(ctx, centerX, bottomY, text, zoneW) {
  const w = measure(text) + 8;
  const h = GLYPH_H + 6;
  const left = clampLeft(centerX, w, zoneW);
  const top = Math.round(bottomY - h - 3);

  px(ctx, left + 1, top, w - 2, h, COLORS.paper);
  px(ctx, left, top + 1, w, h - 2, COLORS.paper);

  // The tail stays over the speaker even when the bubble has been nudged inward.
  const tail = Math.max(left + 2, Math.min(Math.round(centerX) - 1, left + w - 4));
  px(ctx, tail, top + h, 3, 2, COLORS.paper);
  px(ctx, tail + 1, top + h + 2, 1, 1, COLORS.paper);
  drawText(ctx, text, left + 4, top + 3, COLORS.ink);
}

/** The sign over the front door. */
export function drawBuildingSign(ctx, centerX, y) {
  drawTextCentered(ctx, 'LIMEN & CO.', centerX, y, '#f0e2c8');
}
