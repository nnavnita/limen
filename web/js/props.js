// Furniture. Each prop draws at room-local coordinates.

import { COLORS, SPINES } from './palette.js';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const SHELF_W = 26;
export const SHELF_H = 36;

/** The bookshelf is the repo's markdown: one spine per doc. */
export function drawBookshelf(ctx, x, y, docs) {
  px(ctx, x, y, SHELF_W, SHELF_H, COLORS.woodDark);
  px(ctx, x + 1, y + 1, SHELF_W - 2, SHELF_H - 2, '#5b3a25');

  const shelves = 3;
  const shelfH = Math.floor((SHELF_H - 2) / shelves);
  for (let i = 0; i < shelves; i++) {
    const shelfY = y + 1 + i * shelfH;
    px(ctx, x + 1, shelfY + shelfH - 2, SHELF_W - 2, 2, COLORS.wood);

    let cursor = x + 3;
    const slice = docs.slice(i * 4, i * 4 + 4);
    for (const doc of slice) {
      const width = 2 + (hashString(doc.name) % 3);
      const height = shelfH - 4 - (hashString(doc.name) % 3);
      const color = SPINES[hashString(doc.name) % SPINES.length];
      px(ctx, cursor, shelfY + shelfH - 2 - height, width, height, color);
      cursor += width + 1;
      if (cursor > x + SHELF_W - 4) break;
    }
  }
}

export const BOARD_W = 38;
export const BOARD_H = 26;

const TODO_COLORS = {
  completed: '#7fc47f',
  in_progress: '#f0c34a',
  pending: '#e8e0cc',
};

/** The bulletin board is the session's todo list. */
export function drawBoard(ctx, x, y, todos) {
  px(ctx, x, y, BOARD_W, BOARD_H, COLORS.woodDark);
  px(ctx, x + 2, y + 2, BOARD_W - 4, BOARD_H - 4, COLORS.cork);

  if (!todos.length) {
    // An empty board still looks like a board, not a bug.
    px(ctx, x + 14, y + 9, 10, 8, COLORS.paper);
    px(ctx, x + 16, y + 12, 6, 1, COLORS.corkDark);
    px(ctx, x + 18, y + 8, 2, 2, '#c94f4f');
    return;
  }

  const cardW = 9;
  const cardH = 7;
  const perRow = Math.floor((BOARD_W - 6) / (cardW + 2));
  todos.slice(0, perRow * 2).forEach((todo, i) => {
    const cx = x + 4 + (i % perRow) * (cardW + 2);
    const cy = y + 4 + Math.floor(i / perRow) * (cardH + 3);
    px(ctx, cx, cy, cardW, cardH, TODO_COLORS[todo.status] || TODO_COLORS.pending);
    px(ctx, cx + 1, cy + 2, cardW - 3, 1, COLORS.corkDark);
    px(ctx, cx + 1, cy + 4, cardW - 4, 1, COLORS.corkDark);
    px(ctx, cx + Math.floor(cardW / 2) - 1, cy - 1, 2, 2, '#c94f4f'); // pin
  });
}

export const DESK_W = 30;
export const DESK_H = 20;

/** A desk with a monitor that only glows when someone is actually working. */
export function drawDesk(ctx, x, y, lit, mug) {
  px(ctx, x + 4, y + 2, 20, 12, '#2f3340');            // monitor shell
  px(ctx, x + 5, y + 3, 18, 10, lit ? COLORS.screen : COLORS.screenOff);
  if (lit) {
    px(ctx, x + 7, y + 5, 8, 1, '#2f6b60');
    px(ctx, x + 7, y + 7, 12, 1, '#2f6b60');
    px(ctx, x + 7, y + 9, 6, 1, '#2f6b60');
  }
  px(ctx, x + 12, y + 14, 4, 2, '#2f3340');            // stand
  px(ctx, x, y + 16, DESK_W, 3, COLORS.wood);          // desktop
  px(ctx, x, y + 19, DESK_W, 1, COLORS.woodDark);
  px(ctx, x + 2, y + 20, 2, 6, COLORS.woodDark);       // legs
  px(ctx, x + DESK_W - 4, y + 20, 2, 6, COLORS.woodDark);
  px(ctx, x + 9, y + 14, 12, 2, '#d9d3c4');            // keyboard

  if (mug) {
    px(ctx, x + 24, y + 12, 4, 4, '#e3e0d6');
    px(ctx, x + 28, y + 13, 1, 2, '#e3e0d6');
    px(ctx, x + 25, y + 12, 2, 1, '#6b4a2f');
  }
}

export function drawPlant(ctx, x, y) {
  px(ctx, x + 2, y + 8, 8, 7, COLORS.pot);
  px(ctx, x + 1, y + 7, 10, 2, '#c2705a');
  px(ctx, x + 5, y + 2, 2, 6, COLORS.leafDark);
  px(ctx, x, y + 2, 5, 3, COLORS.leaf);
  px(ctx, x + 7, y, 5, 4, COLORS.leaf);
  px(ctx, x + 2, y, 4, 3, COLORS.leafDark);
}

export function drawWindow(ctx, x, y) {
  px(ctx, x, y, 26, 18, COLORS.wallTrim);
  px(ctx, x + 2, y + 2, 22, 14, '#2b3b63');
  px(ctx, x + 4, y + 4, 6, 5, '#3c5488');
  px(ctx, x + 18, y + 5, 3, 3, '#ffe9a8');            // a little moon
  px(ctx, x + 12, y + 2, 2, 14, COLORS.wallTrim);
  px(ctx, x + 2, y + 8, 22, 2, COLORS.wallTrim);
}

export function drawRug(ctx, x, y, w) {
  px(ctx, x, y, w, 6, '#6e4352');
  px(ctx, x + 2, y + 1, w - 4, 4, '#875266');
  px(ctx, x + 8, y + 2, w - 16, 2, '#a0667c');
}

// --- Open plan ------------------------------------------------------------

// --- Library --------------------------------------------------------------

/** A wall of shelving. Each spine is one markdown file in a live repo. */
export function drawWallShelves(ctx, x, y, w, h, docs) {
  px(ctx, x, y, w, h, COLORS.woodDark);
  px(ctx, x + 1, y + 1, w - 2, h - 2, '#54331f');

  const rows = 4;
  const rowH = Math.floor((h - 2) / rows);
  let index = 0;
  for (let row = 0; row < rows; row++) {
    const rowY = y + 1 + row * rowH;
    px(ctx, x + 1, rowY + rowH - 2, w - 2, 2, COLORS.wood);

    let cursor = x + 3;
    while (cursor < x + w - 5) {
      const doc = docs[index % Math.max(1, docs.length)];
      // Rooms with no docs still get a furnished shelf, just a muted one.
      const key = doc ? hashString(doc.name + index) : hashString('empty' + index);
      const width = 2 + (key % 3);
      const height = rowH - 4 - (key % 4);
      px(ctx, cursor, rowY + rowH - 2 - height, width, height,
         doc ? SPINES[key % SPINES.length] : '#6b5a4a');
      cursor += width + 1;
      index++;
    }
  }
}

export function drawReadingLamp(ctx, x, y) {
  px(ctx, x + 3, y + 6, 2, 10, '#5c5470');
  px(ctx, x, y + 14, 8, 2, '#5c5470');
  px(ctx, x, y, 8, 6, '#d8b45a');
  px(ctx, x + 1, y + 6, 6, 2, 'rgba(255,226,150,0.55)');
}

// --- Meeting room ---------------------------------------------------------

export function drawTable(ctx, x, y, w) {
  px(ctx, x, y, w, 5, COLORS.wood);
  px(ctx, x, y + 5, w, 2, COLORS.woodDark);
  px(ctx, x + 3, y + 7, 3, 9, COLORS.woodDark);
  px(ctx, x + w - 6, y + 7, 3, 9, COLORS.woodDark);
  px(ctx, x + 8, y - 3, 5, 3, '#e3e0d6');     // a couple of mugs
  px(ctx, x + w - 14, y - 3, 5, 3, '#e3e0d6');
}

export function drawWhiteboard(ctx, x, y, w, h) {
  px(ctx, x, y, w, h, '#9aa3b5');
  px(ctx, x + 2, y + 2, w - 4, h - 4, '#f2f2ee');
  px(ctx, x + 6, y + 6, w - 20, 2, '#5a7fd4');
  px(ctx, x + 6, y + 12, w - 28, 2, '#d45a5a');
  px(ctx, x + 6, y + 18, w - 16, 2, '#5a7fd4');
}

// --- Water cooler ---------------------------------------------------------

export function drawCooler(ctx, x, y) {
  px(ctx, x + 1, y, 10, 13, '#9fd8e8');        // bottle
  px(ctx, x + 3, y + 2, 6, 9, '#6fc0d8');
  px(ctx, x + 4, y + 13, 4, 2, '#8d93a8');
  px(ctx, x, y + 15, 12, 18, '#d8dae4');       // body
  px(ctx, x + 2, y + 19, 8, 3, '#8d93a8');
  px(ctx, x + 1, y + 33, 10, 2, '#9aa0b4');
}

export function drawStool(ctx, x, y) {
  px(ctx, x, y, 10, 3, COLORS.wood);
  px(ctx, x + 1, y + 3, 2, 7, COLORS.woodDark);
  px(ctx, x + 7, y + 3, 2, 7, COLORS.woodDark);
}

export function drawCupStack(ctx, x, y) {
  px(ctx, x, y, 5, 4, '#efeae0');
  px(ctx, x, y - 3, 5, 4, '#efeae0');
  px(ctx, x, y - 6, 5, 4, '#efeae0');
}

// --- Odds and ends --------------------------------------------------------

export function drawWallClock(ctx, x, y) {
  px(ctx, x, y, 14, 14, COLORS.woodDark);
  px(ctx, x + 1, y + 1, 12, 12, COLORS.paper);
  px(ctx, x + 6, y + 3, 1, 4, COLORS.ink);
  px(ctx, x + 7, y + 7, 4, 1, COLORS.ink);
}

export function drawCabinet(ctx, x, y) {
  px(ctx, x, y, 20, 30, '#8d93a8');
  px(ctx, x + 1, y + 1, 18, 13, '#a0a6ba');
  px(ctx, x + 1, y + 16, 18, 13, '#a0a6ba');
  px(ctx, x + 7, y + 6, 6, 2, '#6d7288');
  px(ctx, x + 7, y + 21, 6, 2, '#6d7288');
  px(ctx, x + 4, y - 5, 12, 5, COLORS.leafDark);
  px(ctx, x + 2, y - 3, 16, 3, COLORS.leaf);
}

export function drawPrinter(ctx, x, y) {
  px(ctx, x, y + 4, 22, 12, '#9aa0b4');
  px(ctx, x + 2, y + 6, 18, 4, '#6d7288');
  px(ctx, x + 5, y, 12, 5, COLORS.paper);
  px(ctx, x, y + 16, 22, 2, '#7d8296');
}
