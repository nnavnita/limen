// Every sprite in this office is drawn here in code. No image files anywhere.

import { COLORS, appearance } from './palette.js';

export const CHAR_W = 16;
export const CHAR_H = 24;

// Frame order inside a generated sheet.
export const FRAMES = { IDLE: 0, IDLE2: 1, TYPE: 2, TYPE2: 3, WALK: 4 };
const FRAME_COUNT = 8;

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function drawHead(ctx, look, y) {
  if (look.longHair) px(ctx, 3, y + 3, 10, 11, shade(look.hair, -12));
  px(ctx, 4, y + 4, 8, 7, look.skin);            // face
  px(ctx, 4, y + 3, 8, 2, look.hair);            // hair top
  px(ctx, 3, y + 4, 1, 3, look.hair);            // sideburns
  px(ctx, 12, y + 4, 1, 3, look.hair);
  px(ctx, 4, y + 5, 3, 1, look.hair);            // fringe
  px(ctx, 9, y + 5, 3, 1, look.hair);
  px(ctx, 6, y + 7, 1, 2, COLORS.ink);           // eyes
  px(ctx, 9, y + 7, 1, 2, COLORS.ink);
  px(ctx, 5, y + 9, 1, 1, shade(look.skin, -40)); // cheeks
  px(ctx, 10, y + 9, 1, 1, shade(look.skin, -40));
  if (look.hat) {
    px(ctx, 3, y + 3, 10, 1, COLORS.wallTrim);
    px(ctx, 5, y + 1, 6, 2, COLORS.wallTrim);
  }
}

function drawLegs(ctx, look, y, stride) {
  // stride shifts one leg forward so walking reads without extra frames.
  px(ctx, 5, y + 18, 3, 4 + stride, look.pants);
  px(ctx, 8, y + 18, 3, 4 - stride, look.pants);
  px(ctx, 5, y + 22 + stride, 3, 2, COLORS.ink);
  px(ctx, 8, y + 22 - stride, 3, 2, COLORS.ink);
}

function drawBody(ctx, look, y) {
  px(ctx, 5, y + 11, 6, 7, look.shirt);
  px(ctx, 5, y + 11, 6, 1, shade(look.shirt, 25)); // collar highlight
}

function drawFrame(ctx, look, frame) {
  const bob = frame === FRAMES.IDLE2 || frame === FRAMES.TYPE2 ? 1 : 0;
  const walking = frame >= FRAMES.WALK;
  const stride = walking ? [0, 1, 0, -1][frame - FRAMES.WALK] : 0;
  const y = walking ? 0 : bob;

  drawLegs(ctx, look, y, stride);
  drawBody(ctx, look, y);

  if (frame === FRAMES.TYPE || frame === FRAMES.TYPE2) {
    // Arms reach forward to a desk, hands tapping out of phase.
    const tap = frame === FRAMES.TYPE ? 0 : 1;
    px(ctx, 3, y + 12, 2, 2, look.shirt);
    px(ctx, 11, y + 12, 2, 2, look.shirt);
    px(ctx, 2, y + 13 + tap, 2, 2, look.skin);
    px(ctx, 12, y + 14 - tap, 2, 2, look.skin);
  } else {
    const swing = walking ? stride : 0;
    px(ctx, 3, y + 11 - swing, 2, 5, look.shirt);
    px(ctx, 11, y + 11 + swing, 2, 5, look.shirt);
    px(ctx, 3, y + 16 - swing, 2, 2, look.skin);
    px(ctx, 11, y + 16 + swing, 2, 2, look.skin);
  }

  drawHead(ctx, look, y);
}

const sheetCache = new Map();

/** A horizontal strip of all 8 frames for one session's appearance. */
export function characterSheet(seed) {
  if (sheetCache.has(seed)) return sheetCache.get(seed);

  const look = appearance(seed);
  const canvas = document.createElement('canvas');
  canvas.width = CHAR_W * FRAME_COUNT;
  canvas.height = CHAR_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    ctx.save();
    ctx.translate(frame * CHAR_W, 0);
    drawFrame(ctx, look, frame);
    ctx.restore();
  }

  const sheet = { canvas, look };
  sheetCache.set(seed, sheet);
  return sheet;
}

export function drawCharacter(ctx, seed, x, y, frame, facingLeft) {
  const sheet = characterSheet(seed);
  ctx.save();
  if (facingLeft) {
    ctx.translate(Math.round(x) + CHAR_W, Math.round(y));
    ctx.scale(-1, 1);
  } else {
    ctx.translate(Math.round(x), Math.round(y));
  }
  ctx.drawImage(sheet.canvas, frame * CHAR_W, 0, CHAR_W, CHAR_H, 0, 0, CHAR_W, CHAR_H);
  ctx.restore();
}

/** Subagents: smaller, rounder, clearly not a full session. */
export function drawHelper(ctx, x, y, tick) {
  const bob = Math.floor(tick / 30) % 2;
  const ox = Math.round(x);
  const oy = Math.round(y) + bob;
  px(ctx, ox + 4, oy - 3, 1, 3, '#8d8fa8');       // antenna
  px(ctx, ox + 3, oy - 5, 3, 2, '#ffd98a');
  px(ctx, ox + 1, oy, 8, 7, '#b9bdd6');            // body
  px(ctx, ox, oy + 2, 1, 3, '#9aa0c0');
  px(ctx, ox + 9, oy + 2, 1, 3, '#9aa0c0');
  px(ctx, ox + 2, oy + 2, 2, 2, COLORS.ink);       // eyes
  px(ctx, ox + 6, oy + 2, 2, 2, COLORS.ink);
  px(ctx, ox + 2, oy + 7, 2, 2, '#7d82a0');
  px(ctx, ox + 6, oy + 7, 2, 2, '#7d82a0');
}

// --- Thought-bubble icons -------------------------------------------------

const ICON_BY_TOOL = {
  Read: 'search', Grep: 'search', Glob: 'search', LS: 'search', ToolSearch: 'search',
  Edit: 'wrench', Write: 'wrench', NotebookEdit: 'wrench', MultiEdit: 'wrench',
  Bash: 'terminal', BashOutput: 'terminal', KillShell: 'terminal',
  WebSearch: 'globe', WebFetch: 'globe',
  TodoWrite: 'clipboard', TaskCreate: 'clipboard', TaskUpdate: 'clipboard', ExitPlanMode: 'clipboard',
  Task: 'hardhat', Agent: 'hardhat', SendMessage: 'hardhat',
  Skill: 'spark',
};

export function iconForTool(tool) {
  return ICON_BY_TOOL[tool] || 'spark';
}

const ICONS = {
  search: (ctx, x, y) => {
    px(ctx, x + 1, y, 5, 1, COLORS.ink); px(ctx, x + 1, y + 5, 5, 1, COLORS.ink);
    px(ctx, x, y + 1, 1, 4, COLORS.ink); px(ctx, x + 6, y + 1, 1, 4, COLORS.ink);
    px(ctx, x + 1, y + 1, 5, 4, '#bfe6ff');
    px(ctx, x + 6, y + 6, 3, 3, COLORS.ink);
  },
  wrench: (ctx, x, y) => {
    px(ctx, x + 1, y, 3, 3, '#9aa3b5'); px(ctx, x + 2, y + 1, 1, 1, COLORS.ink);
    px(ctx, x + 3, y + 3, 3, 3, '#9aa3b5'); px(ctx, x + 5, y + 5, 4, 4, '#9aa3b5');
  },
  terminal: (ctx, x, y) => {
    px(ctx, x, y, 10, 8, COLORS.ink); px(ctx, x + 1, y + 1, 8, 6, '#1f2b2a');
    px(ctx, x + 2, y + 3, 3, 1, '#7ef2b0'); px(ctx, x + 2, y + 5, 2, 1, '#7ef2b0');
  },
  globe: (ctx, x, y) => {
    px(ctx, x + 1, y, 6, 8, '#4f9ed8'); px(ctx, x, y + 2, 8, 4, '#4f9ed8');
    px(ctx, x + 3, y, 1, 8, '#bfe6ff'); px(ctx, x, y + 3, 8, 1, '#bfe6ff');
  },
  clipboard: (ctx, x, y) => {
    px(ctx, x, y, 8, 9, COLORS.wood); px(ctx, x + 1, y + 1, 6, 7, COLORS.paper);
    px(ctx, x + 3, y - 1, 3, 2, '#9aa3b5');
    px(ctx, x + 2, y + 3, 4, 1, COLORS.ink); px(ctx, x + 2, y + 5, 4, 1, COLORS.ink);
  },
  hardhat: (ctx, x, y) => {
    px(ctx, x + 2, y + 1, 5, 4, '#f0a93a'); px(ctx, x, y + 5, 9, 2, '#f0a93a');
    px(ctx, x + 4, y, 1, 1, '#ffd98a');
  },
  spark: (ctx, x, y) => {
    px(ctx, x + 3, y, 2, 8, '#ffd98a'); px(ctx, x, y + 3, 8, 2, '#ffd98a');
    px(ctx, x + 2, y + 2, 4, 4, '#fff3cf');
  },
};

/** A little cloud with the current tool inside it. */
export function drawThoughtBubble(ctx, x, y, tool) {
  const w = 16;
  const h = 14;
  px(ctx, x + 2, y, w - 4, h, COLORS.paper);
  px(ctx, x, y + 2, w, h - 4, COLORS.paper);
  px(ctx, x + 3, y + h, 2, 2, COLORS.paper);
  px(ctx, x + 2, y + h + 2, 1, 1, COLORS.paper);
  ICONS[iconForTool(tool)](ctx, x + 3, y + 3);
}

/** Zzz for a session that is waiting on you. */
export function drawSleep(ctx, x, y, tick) {
  const phase = Math.floor(tick / 22) % 3;
  ctx.fillStyle = '#e9e2ff';
  for (let i = 0; i < 3; i++) {
    const size = 2 + i;
    const lift = ((phase + i) % 3) * 3;
    ctx.fillRect(x + i * 3, y - i * 4 - lift, size, size);
  }
}
