// hud.js — the right-hand panel: level, objective, clock, the DETECTION banner with its
// advice line, the three alarm segments, visibility, noise, loot, coins, spotted count,
// strikes and the current GOAL. The legend and controls are static HTML; this file keeps
// every changing field honest.

import { TILE, tileAt } from './levels.js';
import { lightAt } from './vision.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.level = $('hud-level');
    this.objective = $('hud-objective');
    this.time = $('hud-time');
    this.banner = $('banner');
    this.bannerWord = $('banner-word');
    this.bannerAdvice = $('banner-advice');
    this.alarmSegs = [...document.querySelectorAll('#alarm i')];
    this.vis = $('hud-vis');
    this.noise = $('hud-noise');
    this.loot = $('hud-loot');
    this.coins = $('hud-coins');
    this.spotted = $('hud-spotted');
    this.strikes = $('hud-strikes');
    this.goal = $('hud-goal');
  }

  fmtTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  bannerFor(world) {
    const states = world.guards.map((g) => g.state);
    const maxDet = Math.max(0, ...world.guards.map((g) => g.detection));
    const maxExp = Math.max(0, ...world.cameras.map((c) => c.exposure));
    if (states.includes('chase')) return ['SPOTTED', 'Break line of sight — duck behind cover or into shadow.', 'hot'];
    if (states.includes('search')) return ['SEARCHING', 'Stay hidden. They sweep the last place they saw you.', 'warn'];
    if (states.includes('investigate')) return ['SUSPICIOUS', 'Freeze in shadow. The meter falls when you are unseen.', 'warn'];
    if (maxDet > 0.12) return ['WATCHED', 'A warden is staring. Slip out of the cone, slowly.', 'warn'];
    if (maxExp > 0.4) return ['CAMERA', 'A camera is drinking you in — move out of its cone.', 'warn'];
    return ['UNSEEN', 'Move quiet. Watch the cones, mind the hounds.', 'calm'];
  }

  visibilityFor(world) {
    const p = world.player;
    const tile = tileAt(world.level, Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    if (tile === 'v') return 'IN THE VENTS';
    if (world.guards.some((g) => g.state === 'chase')) return 'GIVING CHASE';
    if (p.stance === 'sneak') {
      const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (tileAt(world.level, tx + dx, ty + dy) === '=') return 'HIDDEN';
      }
    }
    if (tile === 's') return 'IN SHADOW';
    if (lightAt(world.lamps, p.x, p.y) > 0.45) return 'IN LIGHT';
    return 'DIM FLOOR';
  }

  noiseFor(world) {
    const p = world.player;
    if (!p.moving) return 'STILL';
    if (p.wading) return 'LOUD — WADING';
    return { sneak: 'SILENT', walk: 'QUIET STEPS', sprint: 'LOUD' }[p.stance];
  }

  update(world) {
    const def = world.def;
    this.level.textContent = `LEVEL ${world.levelIndex + 1} — ${def.name.toUpperCase()}`;
    this.objective.textContent = world.objectiveTaken
      ? `Objective taken: ${def.prize}. Get out.`
      : `Steal ${def.prize} (stand close, press E).`;
    this.time.textContent = this.fmtTime(world.time);
    const [word, advice, cls] = this.bannerFor(world);
    this.bannerWord.textContent = word;
    this.bannerAdvice.textContent = advice;
    this.banner.className = `banner ${cls}`;
    const segCls = world.alarm === 2 ? 'on hot' : world.alarm === 1 ? 'on warn' : 'on calm';
    this.alarmSegs.forEach((seg, i) => { seg.className = i <= world.alarm ? segCls : ''; });
    this.vis.textContent = this.visibilityFor(world);
    this.noise.textContent = this.noiseFor(world);
    this.loot.textContent = `${world.lootTaken()} / ${world.loot.length}`;
    this.coins.textContent = `${world.coins}`;
    this.spotted.textContent = `${world.spotted}`;
    this.strikes.textContent = '●'.repeat(world.strikes) + '○'.repeat(3 - world.strikes);
    this.goal.textContent = world.objectiveTaken ? 'REACH THE EXIT →' : `STEAL: ${def.prize.replace(/^the /, '').toUpperCase()}`;
  }
}
