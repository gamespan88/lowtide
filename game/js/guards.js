// guards.js — the lantern wardens. Each runs the full state machine
// PATROL → SUSPICIOUS → INVESTIGATE → CHASE → SEARCH → RETURN, with a per-warden
// detection meter that fills by distance, light and stance and decays when the thief
// is unseen — so a near miss can still be recovered by breaking line of sight.

import { TILE, tileCenter, moveBody } from './levels.js';
import { lineOfSight, exposureAt } from './vision.js';

export const CONE_RANGE = TILE * 6.8;
export const CONE_HALF = 0.66; // radians, ~38 degrees
const SPEEDS = { patrol: 62, suspicious: 0, investigate: 98, chase: 216, search: 84, return: 124 };

function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

export class Warden {
  constructor(level, def, index) {
    const start = tileCenter(def.path[0][0], def.path[0][1]);
    this.x = start.x; this.y = start.y;
    this.r = 14;
    this.path = def.path;
    this.wp = 1 % def.path.length;
    this.index = index;
    this.state = 'patrol';
    this.detection = 0;
    this.facing = Math.PI / 2;
    this.pauseT = 0;
    this.stateT = 0;
    this.lastSeen = null;
    this.target = null;
    this.loseT = 0;
    this.stepT = 0;
    this.moving = false;
    this.callout = null;
    this.calloutT = 0;
    this.scanPhase = Math.random() * 6;
  }

  say(text, seconds = 2.2) {
    this.callout = text;
    this.calloutT = seconds;
  }

  hear(point, text) {
    if (this.state === 'chase') return;
    this.target = { x: point.x, y: point.y };
    this.lastSeen = { x: point.x, y: point.y };
    if (this.state !== 'investigate') {
      this.state = 'investigate';
      this.stateT = 0;
      if (text) this.say(text);
    }
  }

  moveToward(dt, level, tx, ty, speed) {
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) { this.moving = false; return true; }
    moveBody(level, this, (dx / dist) * speed, (dy / dist) * speed, dt, false);
    this.facing = angleLerp(this.facing, Math.atan2(dy, dx), dt * 6);
    this.moving = true;
    return false;
  }

  update(dt, world) {
    const { level, player, lamps } = world;
    this.stateT += dt;
    if (this.calloutT > 0) this.calloutT -= dt; else this.callout = null;

    // --- seeing ---
    const distP = Math.hypot(player.x - this.x, player.y - this.y);
    const angP = Math.atan2(player.y - this.y, player.x - this.x);
    let angDiff = Math.abs(((angP - this.facing) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    const exposure = exposureAt(level, lamps, player);
    const inCone = distP < CONE_RANGE && angDiff < CONE_HALF;
    const seen = inCone && exposure > 0 &&
      lineOfSight(level, this.x, this.y, player.x, player.y, player.stance === 'sneak');

    if (seen) {
      const fill = Math.max(0.12, 1.3 - distP / CONE_RANGE) * exposure;
      this.detection = Math.min(1, this.detection + fill * dt * 1.15);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseT = 0;
      if (this.detection >= 1 && this.state !== 'chase') {
        this.state = 'chase';
        this.stateT = 0;
        this.say('There! Stop!');
        world.onSpotted(this);
      }
    } else {
      this.detection = Math.max(0, this.detection - dt * 0.22);
      this.loseT += dt;
    }

    // --- state machine ---
    this.moving = false;
    if (this.state === 'patrol') {
      if (this.detection >= 0.35) { this.state = 'suspicious'; this.stateT = 0; this.say('Hm?'); }
      else if (this.pauseT > 0) {
        this.pauseT -= dt;
        this.facing += Math.sin(world.time * 1.4 + this.scanPhase) * dt * 0.7;
      } else {
        const wp = tileCenter(this.path[this.wp][0], this.path[this.wp][1]);
        if (this.moveToward(dt, level, wp.x, wp.y, SPEEDS.patrol)) {
          this.wp = (this.wp + 1) % this.path.length;
          this.pauseT = 1.1;
        }
      }
    } else if (this.state === 'suspicious') {
      if (this.lastSeen) this.facing = angleLerp(this.facing, Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x), dt * 5);
      if (this.detection >= 0.62) { this.state = 'investigate'; this.stateT = 0; this.target = this.lastSeen; }
      else if (this.stateT > 1.5) {
        if (this.detection > 0.2 && this.lastSeen) { this.state = 'investigate'; this.target = this.lastSeen; }
        else this.state = 'patrol';
        this.stateT = 0;
      }
    } else if (this.state === 'investigate') {
      const t = this.target || this.lastSeen;
      if (!t) { this.state = 'return'; this.stateT = 0; }
      else if (this.moveToward(dt, level, t.x, t.y, SPEEDS.investigate)) {
        if (this.stateT > 1.6) { this.state = 'return'; this.stateT = 0; }
        this.facing += Math.sin(world.time * 2.2 + this.scanPhase) * dt * 1.4;
      }
      if (this.stateT > 7) { this.state = 'return'; this.stateT = 0; }
    } else if (this.state === 'chase') {
      const t = this.lastSeen || player;
      this.moveToward(dt, level, t.x, t.y, SPEEDS.chase);
      if (distP < 27) world.onCaught(this);
      else if (!seen && this.loseT > 3.5) { this.state = 'search'; this.stateT = 0; this.say('Where did you go…'); }
    } else if (this.state === 'search') {
      const t = this.lastSeen;
      if (t && Math.hypot(t.x - this.x, t.y - this.y) > 30) this.moveToward(dt, level, t.x, t.y, SPEEDS.search);
      else this.facing += Math.sin(world.time * 1.8 + this.scanPhase) * dt * 1.6;
      if (this.stateT > 3.4) { this.state = 'return'; this.stateT = 0; }
    } else if (this.state === 'return') {
      let best = 0, bestD = Infinity;
      this.path.forEach((p, i) => {
        const c = tileCenter(p[0], p[1]);
        const d = Math.hypot(c.x - this.x, c.y - this.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      const wp = tileCenter(this.path[best][0], this.path[best][1]);
      if (this.moveToward(dt, level, wp.x, wp.y, SPEEDS.return)) {
        this.wp = best;
        this.state = 'patrol';
        this.stateT = 0;
      }
      if (this.stateT > 8) { this.state = 'patrol'; this.stateT = 0; }
    }

    // --- footsteps the player can hear ---
    if (this.moving) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.42;
        world.sound.guardStep(distP / TILE);
      }
    }
  }
}
