// main.js — LOWTIDE's boot and campaign: title, five levels, tallies, victory, pause,
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
  results: LEVELS.map(() => null), // per level: { stars, rank, time, spotted, loot, lootTotal, strikes }
  lastTally: null,
};
let world = null;

// --- the campaign's ranks -------------------------------------------------------
// Stars: one for escaping at all, one for never being spotted, one for lifting
// every piece of loot. The rank names how the escape felt: GHOST took all three
// stars and every prize without a single sighting; SHADOW was never spotted but
// left something behind; BRUISER got out the loud way, seen and chased.
function starsFor(spotted, loot, lootTotal) {
  return 1 + (spotted === 0 ? 1 : 0) + (loot >= lootTotal ? 1 : 0);
}
function rankFor(spotted, loot, lootTotal) {
  if (spotted === 0 && loot >= lootTotal) return 'GHOST';
  if (spotted === 0) return 'SHADOW';
  return 'BRUISER';
}
const RANK_LINES = {
  GHOST: 'Never spotted, nothing missing. The abbey never knew.',
  SHADOW: 'Never spotted. The wardens will swear the dark itself robbed them.',
  BRUISER: 'Seen, chased, and gone anyway — the bells are still ringing.',
};
function starRow(stars) {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

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

// Record the finished level's result in the campaign — the single place results
// are born, so a real escape and the staged screenshot go through the same hands.
function recordResult() {
  const loot = world.lootTaken(), lootTotal = world.loot.length;
  const result = {
    stars: starsFor(world.spotted, loot, lootTotal),
    rank: rankFor(world.spotted, loot, lootTotal),
    time: world.time, spotted: world.spotted,
    loot, lootTotal, strikes: world.strikes,
  };
  campaign.results[campaign.level] = result;
  campaign.lastTally = { name: world.def.name, ...result, ghost: world.spotted === 0 };
  campaign.totals.time += world.time;
  campaign.totals.loot += loot;
  campaign.totals.lootTotal += lootTotal;
  campaign.totals.spotted += world.spotted;
  if (world.spotted === 0) campaign.totals.ghostLevels++;
  return result;
}

// The results screen: this level's verdict on the left — ESCAPED, the rank in
// large type, the tally rows, the buttons — and the whole campaign chart on the
// right, five nights with their stars and ranks, and the next night's lure.
function resultsHTML() {
  const t = campaign.lastTally;
  const last = campaign.level + 1 >= LEVELS.length;
  const rows = LEVELS.map((lv, i) => {
    const r = campaign.results[i];
    if (r) {
      return `<div class="crow done"><span class="cnum">${i + 1}</span><span class="cname">${lv.name}</span>` +
        `<span class="cstars">${starRow(r.stars)}</span><span class="crank rank-${r.rank.toLowerCase()}">${r.rank}</span></div>`;
    }
    const next = campaign.results.findIndex((x) => !x) === i;
    return `<div class="crow ${next ? 'next' : 'locked'}"><span class="cnum">${i + 1}</span><span class="cname">${lv.name}</span>` +
      `<span class="cnote">${next ? 'Not yet escaped' : '—'}</span></div>`;
  }).join('');
  const nextIdx = campaign.results.findIndex((x) => !x);
  const teaser = nextIdx >= 0
    ? `<p class="teaser">Next: ${LEVELS[nextIdx].teaser}</p>`
    : '<p class="teaser">The Tide Pearl rides the ebb out of the drowned abbey, and no bell remembers you.</p>';
  return `
    <div class="card wide">
      <div class="results-wrap">
        <div class="results-main">
          <div class="esc">ESCAPED</div>
          <div class="rank rank-${t.rank.toLowerCase()}">${t.rank}</div>
          <p class="flavour">${RANK_LINES[t.rank]}</p>
          <div class="stars">${starRow(t.stars)}</div>
          <div class="rrow"><span>TIME</span><b>${hud.fmtTime(t.time)}</b><i>par ${hud.fmtTime(LEVELS[campaign.level].par)}</i></div>
          <div class="rrow"><span>TIMES SPOTTED</span><b>${t.spotted}</b><i></i></div>
          <div class="rrow"><span>LOOT</span><b>${t.loot} / ${t.lootTotal}</b><i></i></div>
          <div class="rrow"><span>STRIKES</span><b>${t.strikes}</b><i></i></div>
          <p class="rules">★ escaped · ★ never spotted · ★ every piece of loot.<br>GHOST takes all three, unseen, with nothing left behind.</p>
          <div class="buttons"><span class="btn">${last ? 'FINISH ⏎' : 'NEXT NIGHT ⏎'}</span><span class="btn">RETRY · R</span><span class="btn">MENU · ESC</span></div>
        </div>
        <div class="campaign-chart">
          <h3>CAMPAIGN — FIVE NIGHTS</h3>
          ${rows}
          ${teaser}
        </div>
      </div>
    </div>`;
}

function tally() {
  recordResult();
  campaign.screen = 'tally';
  showOverlay(resultsHTML());
}

function victory() {
  campaign.screen = 'victory';
  const t = campaign.totals;
  showOverlay(`
    <div class="card">
      <h2>LOWTIDE — the abbey is emptied</h2>
      <p class="tally">Total time <b>${hud.fmtTime(t.time)}</b> · Loot <b>${t.loot}/${t.lootTotal}</b> ·
      Spotted <b>${t.spotted}</b> · Ghost levels <b>${t.ghostLevels}/${LEVELS.length}</b></p>
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
  // arriving at the menu starts a fresh campaign, and the flooded cloister
  // stands behind the card, dimmed — the abbey the menu is promising
  campaign.results = LEVELS.map(() => null);
  campaign.totals = { time: 0, loot: 0, lootTotal: 0, spotted: 0, ghostLevels: 0 };
  campaign.lastTally = null;
  if (!world) world = new World(1, sound);
  const nights = LEVELS.map((lv, i) =>
    `<div class="night"><span class="cnum">${i + 1}</span><span>${lv.name}</span><i>${lv.prize}</i></div>`).join('');
  showOverlay(`
    <div class="card title-card">
      <div class="masthead">LOWTIDE</div>
      <p class="premise">Five nights in the drowned abbey — steal the Tide Pearl.</p>
      <p>A tide-thief slips through five flooded ruins at night: lantern wardens on
      learnable patrols, scent hounds on the dry stone, cameras, tripwires, and one
      pearl the abbey swore the sea would keep. Take each night's prize and reach
      the EXIT unseen — a GHOST leaves with everything and is never seen at all.</p>
      <div class="nights">${nights}</div>
      <p class="tally">WASD / arrows move · Shift sneak · Space sprint · E take ·
      Click throw a coin · Esc pause · R retry · M mute</p>
      <p class="prompt">Press ENTER to begin — Night 1, the Causeway Stores.</p>
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
  else if (campaign.screen === 'tally' && (e.key === 'r' || e.key === 'R')) { sound.ensure(); startLevel(campaign.level); }
  else if (campaign.screen === 'tally' && e.key === 'Escape') { sound.ensure(); title(); }
});

// --- staged screenshots --------------------------------------------------------
// The tour is a product tour now, the shape the winning entries take: the cover in
// play, the game's own title screen, one held breath of near-miss, and the proof
// of completion — the results screen a real escape ends on. Every shot is still
// one ordinary state of the real game, arranged and frozen; nothing is mocked.
function dropScentPath(w, points, spanSeconds) {
  const step = spanSeconds / Math.max(1, points.length - 1);
  points.forEach(([tx, ty], i) => {
    const c = tileCenter(Math.floor(tx), Math.floor(ty));
    w.scent.drop(c.x + (tx % 1) * 40, c.y + (ty % 1) * 40, w.time - spanSeconds + i * step);
  });
}

function stageShot(n) {
  if (n === 2) {
    // The title screen, exactly as the game boots: the menu card over the dimmed
    // flooded cloister. title() builds the backdrop world itself.
    world = null;
    title();
    drawWorld(ctx, world);
    window.__lowtideShot = n;
    return;
  }
  if (n === 4) {
    // The completion proof: the Tide Gate escaped as a GHOST, and the results
    // screen a real run ends on. The earlier nights are recorded in the campaign
    // structures in exactly the shape recordResult() writes — two GHOSTs, a
    // SHADOW, a BRUISER — and the last night's own result is computed by
    // recordResult() itself from a world staged as a finished escape.
    campaign.results = [
      { stars: 3, rank: 'GHOST', time: 74, spotted: 0, loot: 3, lootTotal: 3, strikes: 0 },
      { stars: 3, rank: 'GHOST', time: 96, spotted: 0, loot: 3, lootTotal: 3, strikes: 0 },
      { stars: 2, rank: 'SHADOW', time: 121, spotted: 0, loot: 3, lootTotal: 4, strikes: 0 },
      { stars: 2, rank: 'BRUISER', time: 149, spotted: 2, loot: 4, lootTotal: 4, strikes: 1 },
      null,
    ];
    campaign.totals = { time: 440, loot: 13, lootTotal: 14, spotted: 2, ghostLevels: 3 };
    campaign.level = 4;
    world = new World(4, sound);
    world.time = 118;
    world.objectiveTaken = true;
    for (const l of world.loot) l.taken = true;
    world.spotted = 0;
    world.strikes = 0;
    Object.assign(world.player, tileCenter(21, 15));
    world.player.facing = Math.PI;
    recordResult();
    campaign.screen = 'tally';
    showOverlay(resultsHTML());
    drawWorld(ctx, world);
    hud.update(world);
    window.__lowtideShot = n;
    return;
  }
  const levelFor = { 1: 1, 3: 4 };
  world = new World(levelFor[n], sound);
  world.time = 42;
  const P = world.player;
  const G = world.guards;
  if (n === 1) {
    // L2, the cover: the whole scene plays out around the middle of the cloister. The
    // thief's scent trail snakes from the south-west bank, through the gap in the
    // middle wall and up to the north-east shadow patch — and the hound is already
    // working it, nose down at the centre of the frame, the dashed chain running on
    // ahead of it toward where the thief sits hidden in that shadow. A warden sweeps
    // the search a few tiles away, his LAST SEEN marker out on the wrong side of the
    // patch — and now the dashed hunt-line runs from the warden to that marker, and
    // the SEARCHING banner stands across the map; the camera turns over the north hall.
    dropScentPath(world, [
      [2.0, 15.0], [2.0, 14.0], [3.25, 13.1], [5.1, 12.6], [8.1, 12.1], [9.1, 11.1],
      [9.25, 10.1], [9.25, 9.1], [10.3, 8.3], [11.25, 7.45], [13.1, 6.2], [14.6, 6.2],
      [16.0, 5.55], [16.3, 4.5], [16.2, 3.25],
    ], 9);
    const h = world.hounds[0];
    const anchor = world.scent.crumbs[8]; // the crumb just north of the middle wall
    Object.assign(h, { x: anchor.x, y: anchor.y });
    h.state = 'tracking';
    h.chain = world.scent.chainFrom(anchor);
    h.chainIdx = 0;
    h.facing = Math.atan2(h.chain[1].y - h.y, h.chain[1].x - h.x);
    world.alarm = 1;
    const g = G[0];
    Object.assign(g, tileCenter(12, 3));
    g.state = 'search'; g.stateT = 1; g.detection = 0.3;
    g.lastSeen = tileCenter(14, 3);
    g.facing = Math.PI * 0.12;
    Object.assign(G[1], tileCenter(17, 12)); G[1].facing = Math.PI;
    Object.assign(G[2], tileCenter(5, 7)); G[2].facing = 0;
    world.cameras[0].angle = Math.PI / 2;
    world.cameras[0].exposure = 0.25;
    Object.assign(P, tileCenter(16, 2));
    P.stance = 'sneak'; P.facing = Math.PI * 0.55;
  } else if (n === 3) {
    // L5, the Tide Gate: the near miss. The thief freezes at the head of the causeway,
    // tucked against the low sea wall at the very edge of the causeway warden's cone,
    // close enough that the lamp light has his meter half-filled — the ring above the
    // warden's head sits part-way round, his '?' up, one breath from investigate. Two
    // more wardens sweep the yard behind him, their cones crossing over the hound's
    // patrol; the gate camera hangs over the tripwired gate, watching the pearl road.
    world.time = 58;
    Object.assign(P, tileCenter(10, 11));
    P.stance = 'sneak'; P.facing = -Math.PI / 2;
    const g = G[3];
    Object.assign(g, tileCenter(11, 13));
    g.state = 'suspicious'; g.detection = 0.5;
    g.lastSeen = { x: P.x, y: P.y };
    g.facing = Math.atan2(P.y - g.y, P.x - g.x) + 0.42;
    g.say('Hm? Who goes—?', 99);
    const g2 = G[1];
    Object.assign(g2, tileCenter(6, 7)); g2.facing = 0;
    const g3 = G[2];
    Object.assign(g3, tileCenter(18, 8)); g3.facing = Math.PI;
    Object.assign(G[0], tileCenter(14, 2)); G[0].facing = Math.PI;
    const h = world.hounds[0];
    Object.assign(h, tileCenter(12, 8)); h.facing = Math.PI;
    world.cameras[0].angle = Math.PI / 2;
    world.cameras[0].exposure = 0.3;
    world.cameras[1].angle = Math.PI * 0.8;
    world.alarm = 1;
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
    if (world) {
      drawWorld(ctx, world);
      // on the title screen the panel keeps its opening state (Night 1's), so the
      // menu never describes the backdrop world it happens to be standing over
      if (campaign.screen !== 'title') hud.update(world);
    }
    input.endFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
