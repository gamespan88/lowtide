// hounds.js — the abbey's scent hounds, LOWTIDE's signature defence. The thief drops a
// scent crumb every third of a second while moving on dry ground; crumbs fade over ~18 s
// and none fall in water (wading washes the trail) or in vents. A hound that crosses a
// fresh crumb switches to TRACKING and follows the crumb chain toward the thief; if it
// reaches him, its bark spikes its handler-warden's detection.

import { TILE, tileCenter, moveBody } from './levels.js';

export const CRUMB_LIFE = 18;      // seconds before a crumb fades away
export const CRUMB_FRESH = 12;     // seconds a crumb stays worth following
export const NOSE_RADIUS = TILE * 2.3;

export class ScentField {
  constructor() {
    this.crumbs = []; // {x, y, t}
  }

  drop(x, y, t) {
    this.crumbs.push({ x, y, t });
  }

  update(now) {
    this.crumbs = this.crumbs.filter((c) => now - c.t < CRUMB_LIFE);
  }

  freshNear(x, y, r, now) {
    let best = null;
    for (const c of this.crumbs) {
      if (now - c.t > CRUMB_FRESH) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < r && (!best || c.t < best.t)) best = c;
    }
    return best;
  }

  // The chain from a found crumb forward to the freshest one: the trail to the thief.
  chainFrom(crumb) {
    return this.crumbs
      .filter((c) => c.t >= crumb.t)
      .sort((a, b) => a.t - b.t)
      .map((c) => ({ x: c.x, y: c.y, t: c.t }));
  }
}

export class Hound {
  constructor(level, def, handler) {
    const start = tileCenter(def.path[0][0], def.path[0][1]);
    this.x = start.x; this.y = start.y;
    this.r = 12;
    this.path = def.path;
    this.wp = 1 % def.path.length;
    this.handler = handler; // the Warden this hound works for
    this.state = 'patrol'; // patrol | tracking
    this.chain = [];
    this.chainIdx = 0;
    this.facing = Math.PI / 2;
    this.pauseT = 0;
    this.sniffT = 0;
    this.barkT = 0;
    this.staleT = 0;
    this.moving = false;
  }

  moveToward(dt, level, tx, ty, speed) {
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) { this.moving = false; return true; }
    moveBody(level, this, (dx / dist) * speed, (dy / dist) * speed, dt, false);
    this.facing = Math.atan2(dy, dx);
    this.moving = true;
    return false;
  }

  update(dt, world) {
    const { level, player, scent } = world;
    this.barkT = Math.max(0, this.barkT - dt);
    this.sniffT -= dt;
    this.moving = false;

    if (this.state === 'patrol') {
      const found = scent.freshNear(this.x, this.y, NOSE_RADIUS, world.time);
      if (found) {
        this.state = 'tracking';
        this.chain = scent.chainFrom(found);
        this.chainIdx = 0;
        this.staleT = 0;
        world.sound.sniff();
      } else if (this.pauseT > 0) {
        this.pauseT -= dt;
      } else {
        const wp = tileCenter(this.path[this.wp][0], this.path[this.wp][1]);
        if (this.moveToward(dt, level, wp.x, wp.y, 70)) {
          this.wp = (this.wp + 1) % this.path.length;
          this.pauseT = 0.7;
        }
      }
    }

    if (this.state === 'tracking') {
      // Refresh the chain from the crumb nearest the nose: the trail grows as he runs.
      if (this.sniffT <= 0) {
        this.sniffT = 0.55;
        world.sound.sniff();
        const near = scent.freshNear(this.x, this.y, NOSE_RADIUS, world.time);
        if (near) { this.chain = scent.chainFrom(near); this.chainIdx = 0; this.staleT = 0; }
      }
      while (this.chainIdx < this.chain.length &&
             Math.hypot(this.chain[this.chainIdx].x - this.x, this.chain[this.chainIdx].y - this.y) < 16) {
        this.chainIdx++;
      }
      const target = this.chain[this.chainIdx];
      if (target) {
        this.moveToward(dt, level, target.x, target.y, 148);
      } else {
        this.staleT += dt;
        if (this.staleT > 2.5) { this.state = 'patrol'; this.chain = []; }
      }
      const distP = Math.hypot(player.x - this.x, player.y - this.y);
      if (distP < TILE * 1.25 && this.barkT <= 0) {
        this.barkT = 4;
        world.onBark(this);
      }
      if (distP < 22) world.onCaught(this);
    }
  }
}
