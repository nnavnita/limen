// Characters: one per live session, moving between zones as their work changes.

import { drawCharacter, drawHelper, drawThoughtBubble, drawSleep, FRAMES, CHAR_H } from './sprites.js';
import { STAND_Y, ZONES, entryFor } from './zones.js';

const WALK_SPEED = 0.6;    // world pixels per frame at 60fps
const FADE_SPEED = 0.09;
const ARRIVED = 1.2;

export class Actor {
  constructor(session, spot) {
    this.id = session.id;
    this.session = session;
    this.zoneId = session.zone;
    this.x = spot;
    this.target = spot;
    this.facingLeft = false;
    this.alpha = 1;
    this.fading = null;      // 'out' while leaving a zone, 'in' while arriving
    this.pending = null;
  }

  sync(session, spot) {
    this.session = session;

    if (session.zone !== this.zoneId && (!this.pending || this.pending.zoneId !== session.zone)) {
      // Changing zone means walking out of one room and into another, so the
      // sprite fades rather than sliding through the partition wall.
      this.pending = { zoneId: session.zone, spot };
      this.fading = 'out';
    } else if (session.zone === this.zoneId) {
      this.target = spot;
    } else if (this.pending) {
      this.pending.spot = spot;
    }
  }

  get moving() {
    return Math.abs(this.target - this.x) > ARRIVED;
  }

  update(step) {
    if (this.fading === 'out') {
      this.alpha -= FADE_SPEED * step;
      if (this.alpha <= 0) {
        this.alpha = 0;
        this.zoneId = this.pending.zoneId;
        this.x = entryFor(this.zoneId);
        this.target = this.pending.spot;
        this.pending = null;
        this.fading = 'in';
      }
    } else if (this.fading === 'in') {
      this.alpha = Math.min(1, this.alpha + FADE_SPEED * step);
      if (this.alpha >= 1) this.fading = null;
    }

    const delta = this.target - this.x;
    if (Math.abs(delta) <= ARRIVED) {
      this.x = this.target;
      return;
    }
    const direction = Math.sign(delta);
    this.facingLeft = direction < 0;
    this.x += direction * WALK_SPEED * step;
  }

  frame(tick) {
    if (this.moving) return FRAMES.WALK + Math.floor(tick / 8) % 4;
    const busy = this.session.status === 'busy';
    if (busy && this.zoneId === 'desks') {
      return Math.floor(tick / 9) % 2 ? FRAMES.TYPE2 : FRAMES.TYPE;
    }
    if (busy) return Math.floor(tick / 16) % 2 ? FRAMES.IDLE2 : FRAMES.IDLE;
    return Math.floor(tick / 34) % 2 ? FRAMES.IDLE2 : FRAMES.IDLE;
  }

  /** Called with the canvas already translated to this actor's zone. */
  draw(ctx, tick) {
    const y = STAND_Y - CHAR_H;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    drawCharacter(ctx, this.session.seed, this.x, y, this.frame(tick), this.facingLeft);

    // At the cooler they are on a break, so no tool bubble — they get chat instead.
    if (this.zoneId !== 'cooler' && this.session.status === 'busy' && this.session.last_tool) {
      drawThoughtBubble(ctx, this.x + 12, y - 18, this.session.last_tool);
    } else if (this.zoneId !== 'cooler' && this.session.status !== 'busy') {
      drawSleep(ctx, this.x + 13, y - 2, tick);
    }

    this.session.helpers.slice(0, 3).forEach((helper, i) => {
      drawHelper(ctx, this.x - 13 - i * 12, y + 12, tick + i * 17);
    });
    ctx.restore();
  }
}

/** Keep the actor list in step with the server's session list. */
export function reconcile(actors, sessions, spotOf) {
  const seen = new Set();

  for (const session of sessions) {
    seen.add(session.id);
    const spot = spotOf(session);
    const existing = actors.get(session.id);
    if (existing) existing.sync(session, spot);
    else actors.set(session.id, new Actor(session, spot));
  }

  for (const id of [...actors.keys()]) {
    if (!seen.has(id)) actors.delete(id);   // session ended, character goes home
  }
  return actors;
}
