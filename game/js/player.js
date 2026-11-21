// player.js — the tide-thief: movement and stances. Sneak (Shift) is slow and silent,
// walk is quiet, sprint (Space) is fast and loud; wading is always loud. The current
// noise radius is exposed for the renderer, which draws it as a ring around the thief.

import { TILE, tileAt, moveBody } from './levels.js';

export const SPEEDS = { sneak: 86, walk: 152, sprint: 238 };
export const NOISE_TILES = { sneak: 0, walk: 2.2, sprint: 5.0 };

export class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.r = 13;
    this.stance = 'walk';
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.wading = false;
    this.stepT = 0;
    this.scentT = 0;
  }

  tile(level) {
    return tileAt(level, Math.floor(this.x / TILE), Math.floor(this.y / TILE));
  }

  noiseRadius(level) {
    let tiles = NOISE_TILES[this.stance];
    if (this.wading && this.moving) tiles += 2.4;
    return tiles * TILE;
  }

  update(dt, input, level, world) {
    let mx = 0, my = 0;
    if (input.down('w', 'arrowup')) my -= 1;
    if (input.down('s', 'arrowdown')) my += 1;
    if (input.down('a', 'arrowleft')) mx -= 1;
    if (input.down('d', 'arrowright')) mx += 1;
    this.moving = mx !== 0 || my !== 0;
    this.stance = input.down('shift') ? 'sneak' : input.down(' ') ? 'sprint' : 'walk';
    const tile = this.tile(level);
    this.wading = tile === '~';
    if (tile === 'v' && this.stance === 'sprint') this.stance = 'walk'; // vents force a crawl

    if (this.moving) {
      const len = Math.hypot(mx, my);
      const speed = SPEEDS[this.stance] * (tile === 'v' ? 0.62 : 1);
      const vx = (mx / len) * speed, vy = (my / len) * speed;
      moveBody(level, this, vx, vy, dt, true);
      this.facing = Math.atan2(vy, vx);
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = this.stance === 'sprint' ? 0.3 : this.stance === 'sneak' ? 0.52 : 0.4;
        world.sound.step(this.wading ? 'water' : tile === 'v' ? 'vent' : 'floor');
        world.onPlayerStep(this);
      }
      // Scent crumbs fall only on dry ground: water and vent grates hold no trail.
      this.scentT -= dt;
      if (this.scentT <= 0 && !this.wading && tile !== 'v') {
        this.scentT = 0.34;
        world.scent.drop(this.x, this.y, world.time);
      }
    }
    world.checkPlayerNoise(this);
  }
}
