// One open-plan office floor, divided into zones. Geometry and scenery.

import { COLORS, SPINES } from './palette.js';
import * as props from './props.js';
import { drawBuildingSign } from './signage.js';

export const WALL_H = 64;        // wall band; floor starts here
export const STAND_Y = 116;      // where feet rest
export const FLOOR_H = 132;
export const GAP = 10;           // partition thickness
export const SIGN_H = 26;

const SIGN_CLEARANCE = 22;   // headroom for the hanging zone signs
const LOWER_Y = FLOOR_H + GAP + SIGN_CLEARANCE;

export const ZONES = {
  desks:   { id: 'desks',   label: 'open plan',        x: 0,   y: 0,       w: 640, h: FLOOR_H },
  library: { id: 'library', label: 'research library', x: 0,   y: LOWER_Y, w: 240, h: FLOOR_H },
  meeting: { id: 'meeting', label: 'meeting room',     x: 250, y: LOWER_Y, w: 200, h: FLOOR_H },
  cooler:  { id: 'cooler',  label: 'water cooler',     x: 460, y: LOWER_Y, w: 180, h: FLOOR_H },
};

export const ZONE_LIST = [ZONES.desks, ZONES.library, ZONES.meeting, ZONES.cooler];

export const BOUNDS = {
  x: -GAP * 2,
  y: -GAP * 2 - SIGN_H,
  w: 640 + GAP * 4,
  h: LOWER_Y + FLOOR_H + GAP * 4 + SIGN_H,
};

// Where people stand in each zone. Desk positions are worked out per cluster.
const LIBRARY_SPOTS = [28, 74, 120, 166, 200];
const MEETING_SPOTS = [30, 58, 86, 114, 142, 168];
const COOLER_SPOTS = [34, 62, 92, 120, 148];

const DESK_PITCH = 46;
const CLUSTER_GAP = 26;
const DESK_MARGIN = 18;

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function repoColor(repoId) {
  return SPINES[hashString(repoId || '') % SPINES.length];
}

/**
 * Group the open-plan sessions into one desk cluster per repo, so people
 * working on the same thing sit together.
 */
export function deskClusters(sessions) {
  const byRepo = new Map();
  for (const session of sessions) {
    if (!byRepo.has(session.repo_id)) byRepo.set(session.repo_id, []);
    byRepo.get(session.repo_id).push(session);
  }
  if (!byRepo.size) return [];

  // Squeeze the desks together rather than letting a busy day overflow the wall.
  const available = ZONES.desks.w - DESK_MARGIN * 2;
  const natural = sessions.length * DESK_PITCH + (byRepo.size - 1) * CLUSTER_GAP;
  const squeeze = natural > available ? available / natural : 1;
  const pitch = Math.max(22, Math.floor(DESK_PITCH * squeeze));
  const gap = Math.max(8, Math.floor(CLUSTER_GAP * squeeze));

  const total = sessions.length * pitch + (byRepo.size - 1) * gap;
  let cursor = Math.max(DESK_MARGIN, Math.round((ZONES.desks.w - total) / 2));

  const clusters = [];
  for (const [repoId, members] of byRepo) {
    const width = members.length * pitch;
    clusters.push({
      repoId,
      repo: members[0].repo,
      color: repoColor(repoId),
      x: cursor,
      width,
      pitch,
      desks: members.map((session, i) => ({ session, x: cursor + i * pitch })),
    });
    cursor += width + gap;
  }
  return clusters;
}

/** Zone-local x for one session, given everyone else in that zone. */
export function spotFor(session, zoneId, peers, clusters) {
  if (zoneId === 'desks') {
    for (const cluster of clusters) {
      const desk = cluster.desks.find((d) => d.session.id === session.id);
      if (desk) return desk.x + 8;
    }
    return Math.round(ZONES.desks.w / 2);
  }
  const index = peers.findIndex((peer) => peer.id === session.id);
  const spots = zoneId === 'library' ? LIBRARY_SPOTS
    : zoneId === 'meeting' ? MEETING_SPOTS
    : COOLER_SPOTS;
  return spots[Math.max(0, index) % spots.length];
}

/** Everyone enters a zone from its doorway, so arrivals don't pop in mid-floor. */
export function entryFor(zoneId) {
  return zoneId === 'desks' ? 8 : ZONES[zoneId].w - 18;
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawShell(ctx, zone, lit) {
  px(ctx, 0, 0, zone.w, WALL_H, lit ? COLORS.wall : COLORS.wallShade);
  for (let x = 0; x < zone.w; x += 16) px(ctx, x, 0, 1, WALL_H, COLORS.wallShade);
  px(ctx, 0, WALL_H - 4, zone.w, 4, COLORS.wallTrim);

  for (let y = WALL_H; y < zone.h; y += 8) {
    const band = ((y - WALL_H) / 8) % 2 === 0;
    px(ctx, 0, y, zone.w, 8, band ? COLORS.floorA : COLORS.floorB);
    for (let x = band ? 0 : 20; x < zone.w; x += 40) px(ctx, x, y, 1, 8, COLORS.woodDark);
  }
}

function lightFrom(ctx, zone, cx) {
  // A shaft of light in stepped bands, so the glow is made of pixels too.
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const spread = 18 + i * 14;
    const top = 16 + i * 20;
    ctx.fillStyle = `rgba(255, 224, 160, ${0.05 - i * 0.007})`;
    ctx.fillRect(Math.round(cx - spread), top, spread * 2, 20);
  }
}

function drawDesksZone(ctx, zone, sessions, clusters) {
  drawShell(ctx, zone, sessions.length > 0);
  props.drawWindow(ctx, 250, 14);
  props.drawWindow(ctx, 330, 14);
  props.drawWallClock(ctx, 190, 20);
  props.drawCabinet(ctx, 26, WALL_H - 12);
  props.drawPrinter(ctx, 60, WALL_H + 2);
  props.drawPlant(ctx, zone.w - 26, WALL_H + 6);
  props.drawPlant(ctx, zone.w - 56, WALL_H + 8);
  props.drawRug(ctx, 150, zone.h - 9, zone.w - 300);

  if (!clusters.length) {
    const middle = Math.round(zone.w / 2 - DESK_PITCH);
    props.drawDesk(ctx, middle, 86, false, false);
    props.drawDesk(ctx, middle + DESK_PITCH, 86, false, false);
  }

  for (const cluster of clusters) {
    for (const desk of cluster.desks) {
      props.drawDesk(ctx, desk.x, 86, desk.session.status === 'busy',
                     desk.session.status !== 'busy');
    }
  }
  lightFrom(ctx, zone, 290);
}

function drawLibraryZone(ctx, zone, sessions, docs) {
  drawShell(ctx, zone, sessions.length > 0);
  props.drawWallShelves(ctx, 8, 10, zone.w - 60, WALL_H - 18, docs);
  props.drawBookshelf(ctx, zone.w - 40, WALL_H - 2, docs.slice(0, 12));
  props.drawReadingLamp(ctx, 150, WALL_H + 12);
  props.drawRug(ctx, 20, zone.h - 10, zone.w - 60);
  lightFrom(ctx, zone, 120);
}

function drawMeetingZone(ctx, zone, sessions, todos) {
  drawShell(ctx, zone, sessions.length > 0);
  props.drawBoard(ctx, 10, 12, todos);
  props.drawWhiteboard(ctx, 78, 12, 84, 34);
  props.drawTable(ctx, 24, zone.h - 34, zone.w - 60);
  props.drawPlant(ctx, zone.w - 24, WALL_H + 6);
  lightFrom(ctx, zone, 100);
}

function drawCoolerZone(ctx, zone, sessions) {
  drawShell(ctx, zone, sessions.length > 0);
  props.drawWindow(ctx, 96, 16);
  props.drawCooler(ctx, 14, WALL_H - 18);
  props.drawCupStack(ctx, 30, WALL_H + 4);
  props.drawStool(ctx, zone.w - 40, STAND_Y - 10);
  props.drawPlant(ctx, zone.w - 22, WALL_H + 6);
  props.drawRug(ctx, 24, zone.h - 10, zone.w - 60);
  lightFrom(ctx, zone, 100);
}

/** Static scenery for one zone. Characters are drawn on top by the caller. */
export function drawZone(ctx, zone, sessions, extras) {
  if (zone.id === 'desks') drawDesksZone(ctx, zone, sessions, extras.clusters || []);
  else if (zone.id === 'library') drawLibraryZone(ctx, zone, sessions, extras.docs || []);
  else if (zone.id === 'meeting') drawMeetingZone(ctx, zone, sessions, extras.todos || []);
  else drawCoolerZone(ctx, zone, sessions);

  if (!sessions.length) {
    px(ctx, 0, 0, zone.w, zone.h, COLORS.night);
  }
}

export function drawBuilding(ctx, showSign) {
  px(ctx, BOUNDS.x, BOUNDS.y, BOUNDS.w, BOUNDS.h, COLORS.buildingWall);
  px(ctx, BOUNDS.x, BOUNDS.y, BOUNDS.w, 6, COLORS.roof);
  px(ctx, BOUNDS.x, BOUNDS.y + 6, BOUNDS.w, SIGN_H - 6, COLORS.buildingTrim);

  if (showSign) drawBuildingSign(ctx, BOUNDS.x + BOUNDS.w / 2, BOUNDS.y + 9);
}

export function zoneAt(world) {
  return ZONE_LIST.find((zone) =>
    world.x >= zone.x && world.x < zone.x + zone.w &&
    world.y >= zone.y && world.y < zone.y + zone.h);
}
