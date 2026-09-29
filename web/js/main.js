// Wires the office together: poll, place people, camera, draw, hover.

import { COLORS } from './palette.js';
import {
  ZONES, ZONE_LIST, BOUNDS, STAND_Y, WALL_H,
  drawZone, drawBuilding, zoneAt, deskClusters, spotFor, repoColor,
} from './zones.js';
import { Actor, reconcile } from './characters.js';
import { chatter } from './chat.js';
import { CHAR_W, CHAR_H } from './sprites.js';
import { drawZoneSign, drawClusterPlacard, drawNamePlate, drawSpeechBubble } from './signage.js';

const POLL_MS = 1000;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const panel = document.getElementById('panel');
const status = document.getElementById('status');
const clock = document.getElementById('clock');

const actors = new Map();
let sessions = [];
let byZone = new Map();
let clusters = [];
let libraryDocs = [];
let meetingTodos = [];
let focusedZoneId = null;
let hover = null;
let tick = 0;
let lastFrame = performance.now();

const camera = { x: 0, y: 0, scale: 2, tx: 0, ty: 0, tscale: 2 };

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);

async function poll() {
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    apply(await response.json());
    status.classList.remove('offline');
  } catch (err) {
    status.classList.add('offline');
    status.textContent = 'office unreachable — is run.sh still going?';
  }
}

function apply(snapshot) {
  sessions = snapshot.sessions;

  byZone = new Map(ZONE_LIST.map((zone) => [zone.id, []]));
  for (const session of sessions) {
    (byZone.get(session.zone) || byZone.get('desks')).push(session);
  }

  clusters = deskClusters(byZone.get('desks'));

  // The library shelves show the docs of whichever repos are in the building.
  const seenDocs = new Set();
  libraryDocs = [];
  for (const session of sessions) {
    for (const doc of session.docs || []) {
      const key = session.repo_id + '/' + doc.path;
      if (seenDocs.has(key)) continue;
      seenDocs.add(key);
      libraryDocs.push({ ...doc, repo: session.repo });
    }
  }

  const withTodos = byZone.get('meeting').find((s) => s.todos.length)
    || sessions.find((s) => s.todos.length);
  meetingTodos = withTodos ? withTodos.todos : [];

  reconcile(actors, sessions, (session) =>
    spotFor(session, session.zone, byZone.get(session.zone) || [], clusters));

  const busy = sessions.filter((s) => s.status === 'busy').length;
  const onBreak = byZone.get('cooler').length;
  status.textContent = sessions.length
    ? `${sessions.length} in the office · ${busy} working · ${onBreak} on a break`
    : 'nobody in the office right now';

  renderPanel();
}

function sessionsIn(zoneId) {
  return byZone.get(zoneId) || [];
}

function fitScale(worldW, worldH) {
  // Whole-number zoom only: a fractional scale smears the pixel art.
  return Math.max(1, Math.floor(Math.min(canvas.width / worldW, canvas.height / worldH)));
}

function updateCamera(step) {
  const zone = focusedZoneId ? ZONES[focusedZoneId] : null;

  if (zone) {
    camera.tx = zone.x + zone.w / 2;
    camera.ty = zone.y + zone.h / 2;
    camera.tscale = fitScale(zone.w + 70, zone.h + 90);
  } else {
    camera.tx = BOUNDS.x + BOUNDS.w / 2;
    camera.ty = BOUNDS.y + BOUNDS.h / 2;
    camera.tscale = fitScale(BOUNDS.w + 40, BOUNDS.h + 60);
  }

  const ease = Math.min(1, 0.12 * step);
  camera.x += (camera.tx - camera.x) * ease;
  camera.y += (camera.ty - camera.y) * ease;
  camera.scale += (camera.tscale - camera.scale) * ease;
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (clientX - rect.left) * dpr;
  const y = (clientY - rect.top) * dpr;
  return {
    x: (x - canvas.width / 2) / camera.scale + camera.x,
    y: (y - canvas.height / 2) / camera.scale + camera.y,
  };
}

function project(worldX, worldY) {
  const dpr = window.devicePixelRatio || 1;
  return {
    x: ((worldX - camera.x) * camera.scale + canvas.width / 2) / dpr,
    y: ((worldY - camera.y) * camera.scale + canvas.height / 2) / dpr,
  };
}

/** What the cursor is over. Drives the tooltip. */
function probe(world) {
  const zone = zoneAt(world);
  if (!zone) return null;
  const local = { x: world.x - zone.x, y: world.y - zone.y };

  for (const session of sessionsIn(zone.id)) {
    const actor = actors.get(session.id);
    if (!actor || actor.zoneId !== zone.id) continue;
    if (local.x >= actor.x - 2 && local.x <= actor.x + CHAR_W + 2 &&
        local.y >= STAND_Y - CHAR_H - 18 && local.y <= STAND_Y + 2) {
      return { zone, kind: 'session', session };
    }
  }

  if (zone.id === 'library' && local.y < WALL_H) return { zone, kind: 'shelf' };
  if (zone.id === 'meeting' && local.x < 52 && local.y < WALL_H) return { zone, kind: 'board' };
  return { zone, kind: 'zone' };
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const ZONE_BLURB = {
  desks: 'heads down, editing and running things',
  library: 'reading the codebase and the web',
  meeting: 'planning, and running subagents',
  cooler: 'idle — these ones are waiting on you',
};

function tooltipHtml(found) {
  if (found.kind === 'session') {
    const s = found.session;
    const tools = Object.entries(s.tool_counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return `<b>${escapeHtml(s.name)} ${escapeHtml(s.title)}</b>
      <div style="color:${repoColor(s.repo_id)}">${escapeHtml(s.repo)}${s.git_branch ? ' · ⑂ ' + escapeHtml(s.git_branch) : ''}</div>
      <div class="dim">${s.status === 'busy' ? 'working' : 'waiting on you'} · ${escapeHtml(s.terminal_name || '')}</div>
      ${s.ai_title ? `<div>“${escapeHtml(s.ai_title)}”</div>` : ''}
      ${s.last_tool ? `<div class="dim">last tool: ${escapeHtml(s.last_tool)}</div>` : ''}
      ${tools.length ? `<div class="dim">${tools.map(([t, n]) => escapeHtml(t) + '×' + n).join(' · ')}</div>` : ''}`;
  }
  if (found.kind === 'shelf') {
    return '<b>the shelves</b>' + (libraryDocs.length
      ? `<div class="dim">${libraryDocs.slice(0, 16).map((d) => escapeHtml(d.repo + '/' + d.path)).join('<br>')}</div>`
      : '<div class="dim">no markdown in the active repos</div>');
  }
  if (found.kind === 'board') {
    return '<b>bulletin board</b>' + (meetingTodos.length
      ? `<div class="dim">${meetingTodos.map((t) => `[${escapeHtml(t.status[0])}] ${escapeHtml(t.content)}`).join('<br>')}</div>`
      : '<div class="dim">no tasks pinned up</div>');
  }
  const here = sessionsIn(found.zone.id);
  return `<b>${escapeHtml(found.zone.label)}</b>
    <div class="dim">${ZONE_BLURB[found.zone.id]}</div>
    <div class="dim">${here.length ? here.map((s) => escapeHtml(s.name)).join(', ') : 'empty'}</div>`;
}

function helperSummary(helpers) {
  const shown = helpers.slice(0, 3).map((h) => escapeHtml(h.description));
  const rest = helpers.length - shown.length;
  return shown.join(', ') + (rest > 0 ? ` +${rest} more` : '');
}

function renderPanel() {
  if (!focusedZoneId) {
    panel.classList.add('hidden');
    return;
  }
  const zone = ZONES[focusedZoneId];
  const here = sessionsIn(zone.id);
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <h2>${escapeHtml(zone.label)}</h2>
    <div class="dim path">${ZONE_BLURB[zone.id]}</div>
    ${here.length ? here.map((s) => `
      <div class="who">
        <b>${escapeHtml(s.name)}</b> <span class="dim">${escapeHtml(s.title)}</span>
        <div style="color:${repoColor(s.repo_id)}">${escapeHtml(s.repo)}${s.git_branch ? ' · ⑂ ' + escapeHtml(s.git_branch) : ''}</div>
        ${s.ai_title ? `<div class="quote">“${escapeHtml(s.ai_title)}”</div>` : ''}
        ${s.helpers.length ? `<div class="dim">${s.helpers.length} helper${s.helpers.length === 1 ? '' : 's'}: ${helperSummary(s.helpers)}</div>` : ''}
      </div>`).join('')
      : '<div class="dim">nobody in here</div>'}
    <div class="hint">esc to pull back</div>`;
}

function draw() {
  const now = performance.now();
  const step = Math.min(3, (now - lastFrame) / (1000 / 60));
  lastFrame = now;
  tick += step;

  updateCamera(step);
  for (const actor of actors.values()) actor.update(step);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const scale = Math.max(1, Math.round(camera.scale));
  ctx.setTransform(
    scale, 0, 0, scale,
    Math.round(canvas.width / 2 - camera.x * scale),
    Math.round(canvas.height / 2 - camera.y * scale),
  );

  const zoomed = Boolean(focusedZoneId);
  const talk = chatter(sessionsIn('cooler'), Date.now());
  drawBuilding(ctx, !zoomed);

  for (const zone of ZONE_LIST) {
    const here = sessionsIn(zone.id);
    ctx.save();
    ctx.translate(zone.x, zone.y);
    ctx.beginPath();
    ctx.rect(0, 0, zone.w, zone.h);
    ctx.clip();

    drawZone(ctx, zone, here, { clusters, docs: libraryDocs, todos: meetingTodos });

    if (zone.id === 'desks') {
      for (const cluster of clusters) {
        drawClusterPlacard(ctx, cluster.x + cluster.width / 2, 46, cluster.repo, cluster.color, zone.w);
      }
    }

    // An actor mid-move is drawn in the zone it is currently standing in.
    const standing = [...actors.values()].filter((actor) => actor.zoneId === zone.id);
    const inFocus = !zoomed || zone.id === focusedZoneId;

    standing.forEach((actor) => {
      actor.draw(ctx, tick);
      if (!inFocus) return;   // no speech or plates in a zone you're not looking at

      const said = talk.get(actor.id);
      if (said && zone.id === 'cooler' && !actor.moving && actor.alpha > 0.6) {
        drawSpeechBubble(ctx, actor.x + CHAR_W / 2,
                         STAND_Y - CHAR_H - 2 - said.lift, said.text, zone.w);
      }
      // Plates are wider than the gap between people, so only the one you are
      // pointing at gets a label. The panel lists everyone in the zone.
      if (hover && hover.kind === 'session' && hover.session.id === actor.id) {
        drawNamePlate(ctx, actor.x + CHAR_W / 2, STAND_Y + 3,
                      actor.session.name, actor.session.title, zone.w);
      }
    });

    if (zoomed && zone.id !== focusedZoneId) {
      ctx.fillStyle = 'rgba(14, 10, 28, 0.74)';
      ctx.fillRect(0, 0, zone.w, zone.h);
    }
    ctx.restore();

    if (hover && hover.zone.id === zone.id && !zoomed) {
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 1;
      ctx.strokeRect(zone.x + 0.5, zone.y + 0.5, zone.w - 1, zone.h - 1);
    }

    if (!zoomed || zone.id === focusedZoneId) {
      drawZoneSign(ctx, zone.x + zone.w / 2, zone.y - 17, zone.label, here.length);
    }
  }

  schedule(draw);
}

/** Chrome freezes requestAnimationFrame in occluded windows — which is exactly
 *  where a glanceable dashboard lives. Tick slowly rather than stopping dead. */
function schedule(fn) {
  if (document.hidden) setTimeout(fn, 100);
  else requestAnimationFrame(fn);
}

// --- Input ---------------------------------------------------------------

canvas.addEventListener('mousemove', (event) => {
  hover = probe(screenToWorld(event.clientX, event.clientY));
  if (hover) {
    tooltip.innerHTML = tooltipHtml(hover);
    tooltip.classList.remove('hidden');
    const pad = 16;
    tooltip.style.left = Math.min(event.clientX + pad, window.innerWidth - tooltip.offsetWidth - pad) + 'px';
    tooltip.style.top = Math.min(event.clientY + pad, window.innerHeight - tooltip.offsetHeight - pad) + 'px';
    canvas.style.cursor = 'pointer';
  } else {
    tooltip.classList.add('hidden');
    canvas.style.cursor = 'default';
  }
});

canvas.addEventListener('mouseleave', () => {
  hover = null;
  tooltip.classList.add('hidden');
});

canvas.addEventListener('click', (event) => {
  const found = probe(screenToWorld(event.clientX, event.clientY));
  focusedZoneId = found ? found.zone.id : null;
  hover = null;
  tooltip.classList.add('hidden');   // the view is about to move out from under it
  renderPanel();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    focusedZoneId = null;
    renderPanel();
  }
});

function updateClock() {
  clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

resize();
poll();
setInterval(poll, POLL_MS);
setInterval(updateClock, 1000);
updateClock();
schedule(draw);
