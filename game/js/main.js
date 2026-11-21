// main.js — LOWTIDE's boot and campaign: title, four levels, tallies, victory, pause,
// retry, mute — and the staged "shots" mode (?shot=1..4) that poses real mid-action
// scenes from the game's own state for its screenshots. Nothing here cheats the render:
// a shot is one ordinary frame of an ordinary World, arranged and frozen.

import { LEVELS, tileCenter } from './levels.js';
import { World } from './world.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Hud } from './hud.js';
import { drawWorld } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const input = new Input(canvas);
const sound = new Sound();
const hud = new Hud();

const campaign = {
  level: 0,
  screen: 'title', // title | play | pause | tally | fail | victory
  totals: { time: 0, loot: 0, lootTotal: 0, spotted: 0, ghostLevels: 0 },
  lastTally: null,
};
let world = null;

function showOverlay(html) {
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
}
function hideOverlay() {
  overlay.style.display = 'none';
}

function startLevel(i) {
  campaign.level = i;
  world = new World(i, sound);
  campaign.screen = 'play';
  hideOverlay();
  hud.update(world);
}

function tally() {
  const ghost = world.spotted === 0;
  campaign.lastTally = {
    name: world.def.name, time: world.time, loot: world.lootTaken(), lootTotal: world.loot.length,
    spotted: world.spotted, strikes: world.strikes, ghost,
  };
  campaign.totals.time += world.time;
  campaign.totals.loot += world.lootTaken();
  campaign.totals.lootTotal += world.loot.length;
  campaign.totals.spotted += world.spotted;
  if (ghost) campaign.totals.ghostLevels++;
  campaign.screen = 'tally';
  const t = campaign.lastTally;
  showOverlay(`
    <div class="card">
      <h2>${t.name} — cleared</h2>
      <p class="tally">Time <b>${hud.fmtTime(t.time)}</b> · Loot <b>${t.loot}/${t.lootTotal}</b> ·
      Spotted <b>${t.spotted}</b> · Strikes <b>${t.strikes}</b></p>
      ${t.ghost ? '<p class="ghost">GHOST — never fully spotted. The abbey never knew.</p>' : ''}
      <p class="prompt">${campaign.level + 1 < LEVELS.length ? 'Press Enter — the tide turns to the next ruin.' : 'Press Enter — the last ruin.'}</p>
    </div>`);
}

function victory() {
  campaign.screen = 'victory';
  const t = campaign.totals;
  showOverlay(`
    <div class="card">
      <h2>LOWTIDE — the abbey is emptied</h2>
      <p class="tally">Total time <b>${hud.fmtTime(t.time)}</b> · Loot <b>${t.loot}/${t.lootTotal}</b> ·
      Spotted <b>${t.spotted}</b> · Ghost levels <b>${t.ghostLevels}/4</b></p>
      <p>The Tide Pearl rides the ebb out of the drowned abbey, and no bell remembers you.</p>
      <p class="prompt">Press Enter to play again.</p>
    </div>`);
}

function fail() {
  campaign.screen = 'fail';
  showOverlay(`
    <div class="card">
      <h2>Caught for the third time</h2>
      <p>The wardens chain the ${world.def.prize} back to its plinth and drag the causeway gate shut.</p>
      <p class="prompt">Press R or Enter to try ${world.def.name} again.</p>
    </div>`);
}

function title() {
  campaign.screen = 'title';
  showOverlay(`
    <div class="card">
      <h2>LOWTIDE</h2>
      <p>A drowned abbey on a tidal flat, four flooded ruins, one thief. Steal each level's
      prize and reach the EXIT unseen — mind the lantern cones, the lamp light, your own
      noise, and the scent hounds that follow your trail across dry stone.</p>
      <p class="tally">WASD / arrows move · Shift sneak · Space sprint · E take ·
      Click throw a coin · Esc pause · R retry · M mute</p>
      <p class="prompt">Click or press Enter to slip in.</p>
    </div>`);
}

function advance() {
  sound.ensure();
  if (campaign.screen === 'title') startLevel(0);
  else if (campaign.screen === 'tally') {
    if (campaign.level + 1 < LEVELS.length) startLevel(campaign.level + 1);
    else victory();
  } else if (campaign.screen === 'victory') { campaign.totals = { time: 0, loot: 0, lootTotal: 0, spotted: 0, ghostLevels: 0 }; title(); }
  else if (campaign.screen === 'fail') startLevel(campaign.level);
}

overlay.addEventListener('mousedown', () => { if (campaign.screen !== 'play') advance(); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && campaign.screen !== 'play') advance();
});

// --- staged screenshots --------------------------------------------------------
function dropScentPath(w, points, spanSeconds) {
  const step = spanSeconds / Math.max(1, points.length - 1);
  points.forEach(([tx, ty], i) => {
    const c = tileCenter(Math.floor(tx), Math.floor(ty));
    w.scent.drop(c.x + (tx % 1) * 40, c.y + (ty % 1) * 40, w.time - spanSeconds + i * step);
  });
}

function stageShot(n) {
  const levelFor = { 1: 0, 2: 1, 3: 2, 4: 3 };
  world = new World(levelFor[n], sound);
  world.time = 42;
  const P = world.player;
  const G = world.guards;
  if (n === 1) {
    // L1: a thrown coin pulls a warden off his route; the thief hides at low cover.
    const coin = tileCenter(14, 3);
    world.coinRest = { x: coin.x, y: coin.y };
    world.effects.push({ x: coin.x, y: coin.y, t: 0.3, max: 0.9, kind: 'ping' });
    world.coins = 2;
    const g = G[1];
    Object.assign(g, tileCenter(15, 2));
    g.state = 'investigate'; g.target = { ...coin }; g.detection = 0.55;
    g.facing = Math.atan2(coin.y - g.y, coin.x - g.x);
    g.say('What was that—?', 99);
    Object.assign(G[0], tileCenter(6, 2)); G[0].facing = 0;
    Object.assign(G[2], tileCenter(12, 14)); G[2].facing = -Math.PI / 2;
    Object.assign(P, tileCenter(19, 3));
    P.stance = 'sneak'; P.facing = Math.PI;
    world.alarm = 1;
  } else if (n === 2) {
    // L2: a hound tracks the dashed scent trail up the dry west bank beside the water
    // channel; a warden searches the cloister's east side, last-seen marker out.
    dropScentPath(world, [[2.5, 15.5], [2.4, 14.3], [2.5, 13.2], [3.2, 12.5], [4.5, 12.4]], 6);
    const h = world.hounds[0];
    Object.assign(h, tileCenter(2, 15));
    h.state = 'tracking';
    h.chain = world.scent.chainFrom(world.scent.crumbs[0]);
    h.chainIdx = 0;
    h.facing = Math.atan2(h.chain[1].y - h.y, h.chain[1].x - h.x);
    world.alarm = 1;
    const g = G[0];
    Object.assign(g, tileCenter(15, 3));
    g.state = 'search'; g.stateT = 1; g.detection = 0.3;
    g.lastSeen = tileCenter(17, 3);
    g.facing = Math.PI * 0.4;
    Object.assign(G[1], tileCenter(17, 12)); G[1].facing = Math.PI;
    Object.assign(G[2], tileCenter(5, 7)); G[2].facing = 0;
    world.cameras[0].angle = Math.PI / 2;
    world.cameras[0].exposure = 0.25;
    Object.assign(P, tileCenter(4, 12));
    P.stance = 'sneak'; P.facing = Math.PI * 0.2;
  } else if (n === 3) {
    // L3: the alarm is up — a chase at full sprint, tripwire lit, camera watching.
    world.time = 10;
    Object.assign(P, tileCenter(11, 10));
    P.stance = 'sprint'; P.moving = true; P.facing = 0;
    const g = G[1];
    Object.assign(g, tileCenter(9, 10));
    g.state = 'chase'; g.detection = 1;
    g.lastSeen = { x: P.x, y: P.y };
    g.facing = 0;
    g.say('There! Stop!', 99);
    const g3 = G[3];
    Object.assign(g3, tileCenter(19, 12));
    g3.state = 'investigate'; g3.detection = 0.6;
    g3.target = { x: P.x, y: P.y };
    g3.facing = Math.PI;
    Object.assign(G[0], tileCenter(3, 5)); G[0].facing = Math.PI / 2;
    Object.assign(G[2], tileCenter(6, 14)); G[2].facing = 0;
    world.cameras[0].angle = -Math.PI / 2;
    world.cameras[0].exposure = 0.55;
    world.alarm = 2;
    world.spotted = 1;
  } else if (n === 4) {
    // L4: the Tide Pearl is taken, the exit stands open, the abbey is quiet again.
    world.time = 96;
    world.objectiveTaken = true;
    world.loot[0].taken = true; world.loot[1].taken = true; world.loot[3].taken = true;
    Object.assign(P, tileCenter(20, 15));
    P.stance = 'walk'; P.facing = Math.PI / 4;
    Object.assign(G[2], tileCenter(11, 13)); G[2].facing = Math.PI / 2;
    Object.assign(G[0], tileCenter(5, 7)); G[0].facing = 0;
    world.coins = 3;
  }
  drawWorld(ctx, world);
  hud.update(world);
  window.__lowtideShot = n;
}

// --- boot ----------------------------------------------------------------------
const params = new URLSearchParams(window.location.search);
if (params.has('shot')) {
  stageShot(Math.max(1, Math.min(4, parseInt(params.get('shot'), 10) || 1)));
} else {
  title();
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (input.takePress('m')) { sound.ensure(); sound.setMuted(!sound.muted); }
    if (campaign.screen === 'play') {
      if (input.takePress('escape')) {
        campaign.screen = 'pause';
        showOverlay('<div class="card"><h2>Paused</h2><p class="prompt">Esc to slip back in · R to restart the level.</p></div>');
      } else if (input.takePress('r')) {
        startLevel(campaign.level);
      } else {
        world.update(dt, input);
        if (world.complete) tally();
        else if (world.failed) fail();
      }
    } else if (campaign.screen === 'pause') {
      if (input.takePress('escape')) { campaign.screen = 'play'; hideOverlay(); }
      else if (input.takePress('r')) startLevel(campaign.level);
    }
    if (world) { drawWorld(ctx, world); hud.update(world); }
    input.endFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
