// world.js — one level of LOWTIDE, live: the thief, wardens, hounds, cameras, tripwires,
// the thrown coin, the scent field and the three-segment alarm. main.js owns the campaign
// (screens, tallies); this file owns everything that moves inside a single level.

import { TILE, LEVELS, tileAt, tileCenter, lampPositions } from './levels.js';
import { Player } from './player.js';
import { Warden } from './guards.js';
import { Hound, ScentField } from './hounds.js';
import { lineOfSight } from './vision.js';

const CAM_RANGE = TILE * 5;
const CAM_HALF = 0.5;

export class World {
  constructor(levelIndex, sound) {
    this.def = LEVELS[levelIndex];
    this.level = this.def;
    this.levelIndex = levelIndex;
    this.sound = sound;
    this.lamps = lampPositions(this.def);
    this.time = 0;
    this.reset();
  }

  reset() {
    const s = tileCenter(this.def.start[0], this.def.start[1]);
    this.player = new Player(s.x, s.y);
    this.guards = this.def.guards.map((g, i) => new Warden(this.def, g, i));
    this.hounds = this.def.hounds.map((h) => {
      let handler = null, best = Infinity;
      for (const g of this.guards) {
        const d = Math.hypot(g.x - (h.path[0][0] + 0.5) * TILE, g.y - (h.path[0][1] + 0.5) * TILE);
        if (d < best) { best = d; handler = g; }
      }
      return new Hound(this.def, h, handler);
    });
    this.scent = new ScentField();
    this.cameras = this.def.cameras.map((c, i) => ({
      x: (c.x + 0.5) * TILE, y: (c.y + 0.5) * TILE, a0: c.a0, a1: c.a1,
      angle: (c.a0 + c.a1) / 2, phase: i * 1.7, exposure: 0,
    }));
    this.wires = this.def.wires.map((w, i) => ({
      x1: (w.x1 + 0.5) * TILE, y1: (w.y1 + 0.5) * TILE,
      x2: (w.x2 + 0.5) * TILE, y2: (w.y2 + 0.5) * TILE,
      off: i * 0.37, cooldown: 0, lit: false,
    }));
    const exit = this.findExit();
    this.exit = exit;
    this.objectivePos = tileCenter(this.def.objective[0], this.def.objective[1]);
    this.objectiveTaken = false;
    this.loot = this.def.loot.map(([x, y]) => ({ ...tileCenter(x, y), taken: false }));
    this.coins = this.def.coins;
    this.coinFlight = null;
    this.coinRest = null;
    this.effects = [];
    this.alarm = 0;
    this.calmT = 0;
    this.strikes = 0;
    this.spotted = 0;
    this.failed = false;
    this.complete = false;
    this.invulnT = 0;
    this.playerVisible = false;
    this.prevPlayer = { x: this.player.x, y: this.player.y };
    this.time = 0;
  }

  findExit() {
    for (let y = 0; y < this.def.grid.length; y++) {
      const x = this.def.grid[y].indexOf('X');
      if (x >= 0) return tileCenter(x, y);
    }
    return tileCenter(22, 16);
  }

  // --- events from the actors -------------------------------------------------
  onPlayerStep(player) {
    if (!player.moving) return;
    const r = player.noiseRadius(this.level);
    if (r <= 0) return;
    for (const g of this.guards) {
      if (Math.hypot(g.x - player.x, g.y - player.y) < r) g.hear({ x: player.x, y: player.y }, null);
    }
  }

  checkPlayerNoise() { /* step-driven: see onPlayerStep */ }

  onSpotted(warden) {
    this.spotted++;
    this.alarm = 2;
    this.calmT = 0;
    this.sound.sting();
    this.sound.bell();
  }

  onBark(hound) {
    this.sound.bark();
    this.alarm = Math.max(this.alarm, 1);
    const g = hound.handler;
    if (g) {
      g.detection = Math.max(g.detection, 0.78);
      g.lastSeen = { x: this.player.x, y: this.player.y };
      if (g.state !== 'chase') { g.state = 'investigate'; g.target = { x: this.player.x, y: this.player.y }; g.say('The hound has it!'); }
    }
  }

  onCaught(by) {
    if (this.invulnT > 0 || this.complete || this.failed) return;
    this.strikes++;
    this.sound.caught();
    if (this.strikes >= 3) { this.failed = true; return; }
    // A strike: back to the level entrance, wardens left wary, progress kept.
    const s = tileCenter(this.def.start[0], this.def.start[1]);
    this.player.x = s.x; this.player.y = s.y;
    this.guards.forEach((g, i) => {
      const c = tileCenter(this.def.guards[i].path[0][0], this.def.guards[i].path[0][1]);
      g.x = c.x; g.y = c.y; g.state = 'suspicious'; g.detection = 0.45; g.stateT = 0;
    });
    this.hounds.forEach((h, i) => {
      const c = tileCenter(this.def.hounds[i].path[0][0], this.def.hounds[i].path[0][1]);
      h.x = c.x; h.y = c.y; h.state = 'patrol'; h.chain = [];
    });
    this.scent = new ScentField();
    this.alarm = 1;
    this.invulnT = 2;
  }

  throwCoin(tx, ty) {
    if (this.coins <= 0 || this.coinFlight) return;
    const p = this.player;
    const d = Math.hypot(tx - p.x, ty - p.y);
    if (d > TILE * 7 || d < 12) return;
    const tile = tileAt(this.level, Math.floor(tx / TILE), Math.floor(ty / TILE));
    if (tile === '#' || tile === 'C' || tile === 'L') return;
    this.coins--;
    this.coinFlight = { x0: p.x, y0: p.y, x1: tx, y1: ty, t: 0, dur: 0.38 };
  }

  landCoin(x, y) {
    this.sound.coin();
    this.coinRest = { x, y };
    this.effects.push({ x, y, t: 0, max: 0.9, kind: 'ping' });
    for (const g of this.guards) {
      if (Math.hypot(g.x - x, g.y - y) < TILE * 4.2) g.hear({ x, y }, 'What was that—?');
    }
  }

  // --- per-frame ---------------------------------------------------------------
  update(dt, input) {
    if (this.complete || this.failed) return;
    this.time += dt;
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.prevPlayer = { x: this.player.x, y: this.player.y };
    this.playerVisible = false;

    this.player.update(dt, input, this.level, this);
    this.scent.update(this.time);

    // interactions
    if (input.takePress('e')) {
      if (!this.objectiveTaken && Math.hypot(this.player.x - this.objectivePos.x, this.player.y - this.objectivePos.y) < 36) {
        this.objectiveTaken = true;
        this.sound.pickup();
        this.effects.push({ x: this.objectivePos.x, y: this.objectivePos.y, t: 0, max: 0.8, kind: 'spark' });
      }
    }
    for (const l of this.loot) {
      if (!l.taken && Math.hypot(this.player.x - l.x, this.player.y - l.y) < 24) {
        l.taken = true;
        this.sound.pickup();
      }
    }
    if (this.objectiveTaken && Math.hypot(this.player.x - this.exit.x, this.player.y - this.exit.y) < 26) {
      this.complete = true;
      return;
    }

    const click = input.takeClick();
    if (click) this.throwCoin(click.x, click.y);
    if (this.coinFlight) {
      const f = this.coinFlight;
      f.t += dt;
      if (f.t >= f.dur) { this.landCoin(f.x1, f.y1); this.coinFlight = null; }
    }

    for (const g of this.guards) {
      g.update(dt, this);
      if (g.state === 'chase') this.playerVisible = true;
    }
    // playerVisible also when any warden's meter is climbing on a real sighting:
    // guards set lastSeen only when seen; hud reads detection for the softer states.
    for (const h of this.hounds) h.update(dt, this);
    this.updateCameras(dt);
    this.updateWires(dt);

    this.effects = this.effects.filter((e) => (e.t += dt) < e.max);

    // alarm: rises at once, falls only after a calm stretch
    let threat = 0;
    for (const g of this.guards) {
      if (g.state === 'chase') threat = 2;
      else if (g.state === 'investigate' || g.state === 'search' || g.detection > 0.3) threat = Math.max(threat, 1);
    }
    for (const c of this.cameras) if (c.exposure > 0.55) threat = Math.max(threat, 1);
    if (threat > this.alarm) { this.alarm = threat; this.calmT = 0; }
    else if (threat < this.alarm) {
      this.calmT += dt;
      if (this.calmT > 6) { this.alarm = threat; this.calmT = 0; }
    } else this.calmT = 0;
  }

  updateCameras(dt) {
    for (const cam of this.cameras) {
      const mid = (cam.a0 + cam.a1) / 2, half = (cam.a1 - cam.a0) / 2;
      cam.angle = mid + Math.sin(this.time * 0.45 + cam.phase) * half;
      const p = this.player;
      const d = Math.hypot(p.x - cam.x, p.y - cam.y);
      const ang = Math.atan2(p.y - cam.y, p.x - cam.x);
      let diff = Math.abs(((ang - cam.angle) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const inCone = d < CAM_RANGE && diff < CAM_HALF &&
        lineOfSight(this.level, cam.x, cam.y, p.x, p.y, p.stance === 'sneak');
      if (inCone && tileAt(this.level, Math.floor(p.x / TILE), Math.floor(p.y / TILE)) !== 'v') {
        cam.exposure = Math.min(1, cam.exposure + dt / 1.15);
        if (cam.exposure >= 1) {
          cam.exposure = 0.55;
          this.alarm = Math.max(this.alarm, 1);
          this.sound.bell();
          let best = null, bd = Infinity;
          for (const g of this.guards) {
            const gd = Math.hypot(g.x - p.x, g.y - p.y);
            if (gd < bd) { bd = gd; best = g; }
          }
          if (best) best.hear({ x: p.x, y: p.y }, 'The camera saw something!');
        }
      } else {
        cam.exposure = Math.max(0, cam.exposure - dt * 0.45);
      }
    }
  }

  updateWires(dt) {
    for (const w of this.wires) {
      w.cooldown = Math.max(0, w.cooldown - dt);
      const phase = (this.time * 0.5 + w.off) % 1;
      w.lit = phase < 0.62;
      if (!w.lit || w.cooldown > 0) continue;
      if (segmentsCross(this.prevPlayer, this.player, w)) {
        w.cooldown = 3;
        this.alarm = Math.max(this.alarm, 1);
        this.sound.bell();
        const mid = { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 };
        let best = null, bd = Infinity;
        for (const g of this.guards) {
          const gd = Math.hypot(g.x - mid.x, g.y - mid.y);
          if (gd < bd) { bd = gd; best = g; }
        }
        if (best) best.hear(mid, 'A wire sings — someone is here!');
        this.effects.push({ x: mid.x, y: mid.y, t: 0, max: 0.7, kind: 'ping' });
      }
    }
  }

  lootTaken() { return this.loot.filter((l) => l.taken).length; }
}

function segmentsCross(a, b, w) {
  const d = (b.x - a.x) * (w.y2 - w.y1) - (b.y - a.y) * (w.x2 - w.x1);
  if (d === 0) return false;
  const t = ((w.x1 - a.x) * (w.y2 - w.y1) - (w.y1 - a.y) * (w.x2 - w.x1)) / d;
  const u = ((w.x1 - a.x) * (b.y - a.y) - (w.y1 - a.y) * (b.x - a.x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
