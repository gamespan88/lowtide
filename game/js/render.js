// render.js — everything the canvas shows: the drowned abbey's tiles, lamp light, vision
// cones coloured by warden state, the scent trail, cameras, tripwires, callouts and the
// thief's own noise ring. Pure drawing: all decisions live in world.js and the actors.

import { TILE, COLS, ROWS, tileAt } from './levels.js';
import { conePolygon, lightAt } from './vision.js';
import { CONE_RANGE, CONE_HALF } from './guards.js';
import { NOSE_RADIUS, CRUMB_LIFE } from './hounds.js';

const CONE_FILL = {
  patrol: 'rgba(255,240,190,0.13)', suspicious: 'rgba(255,190,80,0.21)',
  investigate: 'rgba(255,170,60,0.23)', chase: 'rgba(255,70,50,0.30)',
  search: 'rgba(255,190,80,0.18)', return: 'rgba(255,240,190,0.11)',
};

export function drawWorld(ctx, world) {
  const { level } = world;
  ctx.fillStyle = '#10151f';
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  drawTiles(ctx, world);
  drawProps(ctx, world);
  drawLampGlow(ctx, world);
  drawItems(ctx, world);
  drawWires(ctx, world);
  drawCrumbs(ctx, world);
  drawCones(ctx, world);
  drawVignette(ctx);
  drawActors(ctx, world);
  drawMarkers(ctx, world);
}

// A small deterministic hash of a tile (and the level it sits in), so the dressing
// below — cracks, damp, worn stone — is identical on every frame and every run.
function tileHash(world, tx, ty) {
  let h = (tx * 73856093) ^ (ty * 19349663) ^ ((world.levelIndex + 1) * 83492791);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

// The wear of a drowned abbey, painted into plain floor: hairline cracks, scattered
// grit and rubble specks, damp patches that darken the stone, and — near the water's
// reach — a standing puddle's sheen. Purely cosmetic; seeded, so it never flickers.
function drawFloorWear(ctx, world, tx, ty) {
  const x = tx * TILE, y = ty * TILE;
  const h = tileHash(world, tx, ty);
  const h2 = tileHash(world, tx + 57, ty + 131);
  if (h < 0.16) {
    // a crack wandering across the flagstone
    ctx.strokeStyle = 'rgba(6,8,14,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4 + h2 * 10, y + 6 + h * 20);
    ctx.lineTo(x + 15 + h2 * 8, y + 16 + h * 10);
    ctx.lineTo(x + 26 + h2 * 9, y + 10 + h2 * 18);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,175,200,0.10)';
    ctx.beginPath();
    ctx.moveTo(x + 4 + h2 * 10, y + 7 + h * 20);
    ctx.lineTo(x + 15 + h2 * 8, y + 17 + h * 10);
    ctx.stroke();
  } else if (h < 0.34) {
    // grit and small fallen rubble
    ctx.fillStyle = 'rgba(120,134,160,0.35)';
    for (let i = 0; i < 3; i++) {
      const px = x + 6 + ((h * 91 + i * 37) % 28), py = y + 7 + ((h2 * 83 + i * 29) % 26);
      ctx.beginPath(); ctx.arc(px, py, 1.4 + ((h + i) % 1.3), 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(70,82,104,0.5)';
    ctx.beginPath(); ctx.arc(x + 8 + h2 * 22, y + 9 + h * 20, 2.6, 0, Math.PI * 2); ctx.fill();
  } else if (h < 0.48) {
    // a damp patch, darkening toward its heart
    const g = ctx.createRadialGradient(x + 12 + h2 * 16, y + 12 + h * 14, 2, x + 12 + h2 * 16, y + 12 + h * 14, 17);
    g.addColorStop(0, 'rgba(5,10,16,0.34)');
    g.addColorStop(1, 'rgba(5,10,16,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, TILE, TILE);
  } else if (h < 0.56) {
    // a shallow puddle: cool sheen with one bright skim of sky
    ctx.fillStyle = 'rgba(38,84,102,0.55)';
    ctx.beginPath(); ctx.ellipse(x + 11 + h2 * 17, y + 13 + h * 13, 11.5, 6.5, h * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(140,220,235,0.28)';
    ctx.beginPath(); ctx.ellipse(x + 11 + h2 * 17, y + 13 + h * 13, 11.5, 6.5, h * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(200,240,250,0.20)';
    ctx.beginPath(); ctx.ellipse(x + 8 + h2 * 15, y + 11 + h * 12, 5, 2, h * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  if (h2 > 0.86) {
    // a worn path: the centre of the flag polished pale by centuries of feet
    ctx.fillStyle = 'rgba(190,200,220,0.05)';
    ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE / 2, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTiles(ctx, world) {
  const { level, time } = world;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const t = tileAt(level, tx, ty);
    const x = tx * TILE, y = ty * TILE;
    const shade = ['#232c3d', '#212a3a', '#253041'][(tx * 7 + ty * 13) % 3];
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    if (t === '.') drawFloorWear(ctx, world, tx, ty);
    if (t === '~') {
      ctx.fillStyle = '#14424e';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(90,200,215,0.35)';
      ctx.beginPath();
      const off = Math.sin(time * 1.3 + tx * 1.7 + ty) * 3;
      ctx.moveTo(x + 5, y + 14 + off); ctx.lineTo(x + 19, y + 10 + off); ctx.lineTo(x + 33, y + 15 + off);
      ctx.moveTo(x + 7, y + 28 - off); ctx.lineTo(x + 20, y + 24 - off); ctx.lineTo(x + 34, y + 29 - off);
      ctx.stroke();
    } else if (t === 's') {
      ctx.fillStyle = 'rgba(3,5,10,0.55)';
      ctx.fillRect(x, y, TILE, TILE);
    } else if (t === 'v') {
      ctx.fillStyle = '#10141d';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#2c3648';
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(x + 4, y + i * 10); ctx.lineTo(x + TILE - 4, y + i * 10); ctx.stroke();
      }
    } else if (t === 'X') {
      const open = world.objectiveTaken;
      ctx.fillStyle = open ? '#0f3d38' : '#2c3038';
      ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = open ? '#57d7c5' : '#6a4a44';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.lineWidth = 1;
      ctx.fillStyle = open ? '#57d7c5' : '#8a5a52';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(open ? 'EXIT' : 'LOCKED', x + TILE / 2, y + TILE / 2 + 3);
    } else if (t === '#') {
      ctx.fillStyle = '#39435a';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#4d5a76';
      ctx.fillRect(x, y, TILE, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x, y + TILE - 5, TILE, 5);
      // a mason's trim line, and — where the wall meets open floor — tide-moss
      // creeping up its foot and buttress shading at the corners
      ctx.fillStyle = 'rgba(140,158,190,0.13)';
      ctx.fillRect(x, y + 19, TILE, 1.6);
      if (tileAt(level, tx, ty + 1) !== '#') {
        const mh = tileHash(world, tx + 311, ty + 97);
        ctx.fillStyle = `rgba(46,94,66,${0.25 + mh * 0.3})`;
        ctx.fillRect(x + 2 + mh * 8, y + TILE - 9, 9 + mh * 16, 4);
        ctx.fillRect(x + 6 + mh * 18, y + TILE - 6, 7 + mh * 10, 2.5);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
      }
      if (tileAt(level, tx - 1, ty) !== '#') { ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(x, y, 3, TILE); }
      if (tileAt(level, tx + 1, ty) !== '#') { ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(x + TILE - 3, y, 3, TILE); }
    } else if (t === 'C') {
      ctx.fillStyle = '#6d4c2f';
      ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = '#8a653d';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + TILE - 3, y + TILE - 3);
      ctx.moveTo(x + TILE - 3, y + 3); ctx.lineTo(x + 3, y + TILE - 3);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (t === '=') {
      ctx.fillStyle = '#4a5468';
      ctx.fillRect(x + 4, y + 9, TILE - 8, TILE - 13);
      ctx.fillStyle = '#5d6a84';
      ctx.fillRect(x + 4, y + 9, TILE - 8, 6);
    } else if (t === 'L') {
      ctx.fillStyle = '#20242c';
      ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffca7a';
      ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(x + TILE / 2, y + TILE / 2, 1, x + TILE / 2, y + TILE / 2, 17);
      halo.addColorStop(0, 'rgba(255,205,120,0.55)');
      halo.addColorStop(1, 'rgba(255,205,120,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x + TILE / 2 - 17, y + TILE / 2 - 17, 34, 34);
      ctx.restore();
    }
  }
}

// --- dressing ------------------------------------------------------------------
// A purely decorative layer (levels.js `props`): barrels and sacks stacked on crates,
// shelves and bookcases against walls, benches, tables, rugs, altar and treasure on the
// floor. Nothing here touches a tile, a route or a sightline — it only dresses rooms
// that were already there, so the abbey reads lived-in at contact-sheet size.
function drawProps(ctx, world) {
  for (const p of world.level.props || []) {
    const x = p.x * TILE, y = p.y * TILE;
    const w = (p.w || 1) * TILE, h = (p.h || 1) * TILE;
    PROP_PAINT[p.k]?.(ctx, x, y, w, h, world);
  }
}

function propBarrel(ctx, x, y) {
  const cx = x + TILE / 2, cy = y + TILE / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 9, 13, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a5230';
  ctx.beginPath(); ctx.arc(cx, cy, 12.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#54371d';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 12.5, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#96703f';
  ctx.beginPath(); ctx.arc(cx - 3, cy - 3, 4.5, 0, Math.PI * 2); ctx.fill();
}

function propSacks(ctx, x, y) {
  const cx = x + TILE / 2, cy = y + TILE / 2;
  ctx.fillStyle = '#8a7a52';
  ctx.beginPath(); ctx.ellipse(cx - 5, cy + 4, 10, 7.5, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 6, cy + 5, 9, 7, 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9c8a5e';
  ctx.beginPath(); ctx.ellipse(cx + 1, cy - 4, 8.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6d5f3c';
  ctx.beginPath(); ctx.arc(cx + 1, cy - 9, 2.2, 0, Math.PI * 2); ctx.fill();
}

function propStack(ctx, x, y) {
  // a second, smaller crate stacked on the one the tile already draws
  ctx.fillStyle = '#7d5a35';
  ctx.fillRect(x + 8, y + 2, TILE - 16, TILE - 16);
  ctx.strokeStyle = '#9a7445';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 8, y + 2, TILE - 16, TILE - 16);
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + TILE - 8, y + TILE - 14);
  ctx.moveTo(x + TILE - 8, y + 2); ctx.lineTo(x + 8, y + TILE - 14);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function propShelf(ctx, x, y) {
  // a wall shelf of jars and bundles, kept dull so it reads as stores, not signage
  ctx.fillStyle = '#3d2c1c';
  ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 8);
  ctx.fillStyle = '#54371d';
  ctx.fillRect(x + 2, y + 12, TILE - 4, 3);
  ctx.fillRect(x + 2, y + 25, TILE - 4, 3);
  const jars = ['#6d5f3c', '#4f6350', '#6e4a3a', '#5a6274', '#6d5f3c'];
  jars.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + 5 + i * 6.6, y + 6, 4.8, 6);
    ctx.fillRect(x + 5 + ((i + 2) % 5) * 6.6, y + 19, 4.8, 6);
  });
}

function propCart(ctx, x, y) {
  const cx = x + TILE / 2, cy = y + TILE / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 8, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6d4c2f';
  ctx.fillRect(cx - 15, cy - 10, 30, 20);
  ctx.strokeStyle = '#54371d';
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(cx - 15 + i * 7.5, cy - 10); ctx.lineTo(cx - 15 + i * 7.5, cy + 10); ctx.stroke();
  }
  ctx.fillStyle = '#3a2c1c';
  ctx.beginPath(); ctx.arc(cx - 15, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 15, cy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a653d';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(cx - 13, cy - 8); ctx.lineTo(cx - 21, cy - 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 13, cy + 8); ctx.lineTo(cx - 21, cy + 15); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8a7a52';
  ctx.beginPath(); ctx.ellipse(cx + 3, cy - 2, 8, 6, 0.3, 0, Math.PI * 2); ctx.fill();
}

function propBench(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x + 5, y + 24, TILE - 10, 5);
  ctx.fillStyle = '#5b6a84';
  ctx.beginPath(); ctx.roundRect(x + 4, y + 12, TILE - 8, 12, 3); ctx.fill();
  ctx.fillStyle = '#71809c';
  ctx.fillRect(x + 4, y + 12, TILE - 8, 4);
  ctx.fillStyle = '#46536e';
  ctx.fillRect(x + 7, y + 24, 5, 5); ctx.fillRect(x + TILE - 12, y + 24, 5, 5);
}

function propPlanter(ctx, x, y) {
  ctx.fillStyle = '#4a5d43';
  ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
  ctx.strokeStyle = '#5f7a56';
  ctx.strokeRect(x + 5.5, y + 5.5, TILE - 11, TILE - 11);
  ctx.fillStyle = '#3f7a4a';
  for (const [dx, dy, r] of [[13, 13, 6], [24, 11, 7], [18, 22, 8], [27, 25, 5.5], [11, 26, 5]]) {
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#57a05e';
  for (const [dx, dy] of [[16, 15], [24, 20], [19, 26]]) {
    ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2); ctx.fill();
  }
}

function propCarving(ctx, x, y) {
  ctx.strokeStyle = 'rgba(140,158,190,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 32); ctx.lineTo(x + 9, y + 16);
  ctx.arc(x + TILE / 2, y + 16, 11, Math.PI, 0);
  ctx.lineTo(x + 31, y + 32);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + TILE / 2, y + 12); ctx.lineTo(x + 26, y + 21);
  ctx.lineTo(x + TILE / 2, y + 30); ctx.lineTo(x + 14, y + 21);
  ctx.closePath(); ctx.stroke();
  ctx.lineWidth = 1;
}

function propRubble(ctx, x, y) {
  ctx.fillStyle = '#4d5a76';
  for (const [dx, dy, r] of [[12, 26, 6], [22, 29, 4.5], [29, 24, 5], [18, 20, 3.5]]) {
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#5f708f';
  ctx.beginPath(); ctx.arc(x + 14, y + 24, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 27, y + 22, 2, 0, Math.PI * 2); ctx.fill();
}

function propSparkle(ctx, x, y, w, h, world) {
  const tw = 0.55 + 0.45 * Math.sin(world.time * 2.2 + x * 1.3 + y * 0.7);
  ctx.fillStyle = `rgba(190,240,250,${0.75 * tw})`;
  for (const [dx, dy, s] of [[13, 13, 5], [27, 25, 4], [22, 9, 3]]) {
    const px = x + dx, py = y + dy;
    ctx.beginPath();
    ctx.moveTo(px, py - s); ctx.lineTo(px + s * 0.32, py - s * 0.32); ctx.lineTo(px + s, py);
    ctx.lineTo(px + s * 0.32, py + s * 0.32); ctx.lineTo(px, py + s);
    ctx.lineTo(px - s * 0.32, py + s * 0.32); ctx.lineTo(px - s, py);
    ctx.lineTo(px - s * 0.32, py - s * 0.32);
    ctx.closePath(); ctx.fill();
  }
}

function propBookcase(ctx, x, y) {
  ctx.fillStyle = '#4a3421';
  ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = '#5d422a';
  ctx.fillRect(x + 1, y + 13, TILE - 2, 2);
  ctx.fillRect(x + 1, y + 26, TILE - 2, 2);
  const spines = ['#8a4a3a', '#5d7a5a', '#a3803f', '#4a5a7a', '#7a3a4a', '#6d5f3c'];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = spines[(i + row * 2) % spines.length];
      ctx.fillRect(x + 4 + i * 5.6, y + 3 + row * 13, 4.2, 10);
    }
  }
}

function propTable(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x + 4, y + 7, w - 6, h - 6);
  ctx.fillStyle = '#6d4c2f';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#8a653d';
  ctx.fillRect(x + 2, y + 2, w - 4, 4);
  ctx.fillStyle = '#d9cfb0';
  ctx.fillRect(x + 12, y + 10, 13, 9);
  ctx.fillRect(x + w - 30, y + h - 17, 11, 8);
  ctx.fillStyle = '#ffca7a';
  ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 2.6, 0, Math.PI * 2); ctx.fill();
}

function propLectern(ctx, x, y) {
  const cx = x + TILE / 2, cy = y + TILE / 2;
  ctx.fillStyle = '#4a3421';
  ctx.beginPath(); ctx.roundRect(cx - 8, cy - 11, 16, 22, 2); ctx.fill();
  ctx.fillStyle = '#d9cfb0';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 7, cy - 5); ctx.lineTo(cx + 7, cy + 7); ctx.lineTo(cx, cy + 4);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8); ctx.lineTo(cx - 7, cy - 5); ctx.lineTo(cx - 7, cy + 7); ctx.lineTo(cx, cy + 4);
  ctx.closePath(); ctx.fill();
}

function propRug(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(110,47,53,0.92)';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.strokeStyle = '#a3803f';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 6.5, y + 6.5, w - 13, h - 13);
  ctx.lineWidth = 1;
  const cx = x + w / 2, cy = y + h / 2;
  const r = Math.min(w, h) * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
  ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = 'rgba(217,207,176,0.6)';
  for (let i = 0; i < w / 8; i++) {
    ctx.beginPath(); ctx.moveTo(x + 5 + i * 8, y + 1); ctx.lineTo(x + 5 + i * 8, y + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5 + i * 8, y + h - 4); ctx.lineTo(x + 5 + i * 8, y + h - 1); ctx.stroke();
  }
}

function propAltar(ctx, x, y, w, h) {
  ctx.fillStyle = '#6a7690';
  ctx.fillRect(x + 2, y + 4, w - 4, h - 8);
  ctx.fillStyle = '#7f8ba3';
  ctx.fillRect(x + 2, y + 4, w - 4, 5);
  ctx.fillStyle = '#7a2f3a';
  ctx.fillRect(x + 2, y + h / 2 - 4, w - 4, 8);
  for (const dx of [14, w - 14]) {
    ctx.fillStyle = '#ffca7a';
    ctx.beginPath(); ctx.arc(x + dx, y + 11, 2.6, 0, Math.PI * 2); ctx.fill();
  }
}

function propPew(ctx, x, y, w, h) {
  ctx.fillStyle = '#5d422a';
  ctx.fillRect(x + 2, y + 8, w - 4, h - 16);
  ctx.fillStyle = '#77572f';
  ctx.fillRect(x + 2, y + 8, w - 4, 5);
  ctx.fillStyle = '#4a3421';
  ctx.fillRect(x + 2, y + h - 13, w - 4, 3);
}

function propBowl(ctx, x, y) {
  const cx = x + TILE / 2, cy = y + TILE / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 6, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9a44e';
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6a1d';
  ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 2.2, 0, Math.PI * 2); ctx.fill();
}

function propTreasure(ctx, x, y) {
  const cx = x + TILE / 2, cy = y + TILE / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 8, 15, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9a44e';
  for (const [dx, dy, r] of [[-8, 5, 4.5], [0, 7, 5], [8, 5, 4.5], [-4, 0, 4], [5, -1, 4], [0, -5, 3.6]]) {
    ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(cx - 4, cy - 1, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#57d7c5';
  ctx.beginPath();
  ctx.moveTo(cx + 1, cy - 12); ctx.lineTo(cx + 6, cy - 5); ctx.lineTo(cx + 1, cy + 1); ctx.lineTo(cx - 4, cy - 5);
  ctx.closePath(); ctx.fill();
}

function propBanner(ctx, x, y) {
  // a hanging banner on a wall face: rod, abbey-red cloth, gold fringe, the pearl sigil
  ctx.fillStyle = '#2a2016';
  ctx.fillRect(x + 5, y + 3, TILE - 10, 3);
  ctx.fillStyle = '#6e2f35';
  ctx.fillRect(x + 9, y + 6, TILE - 18, 27);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x + 16, y + 6, 2.5, 27);
  ctx.fillRect(x + 24, y + 6, 2.5, 27);
  ctx.fillStyle = '#8a3d44';
  ctx.fillRect(x + 9, y + 6, TILE - 18, 4);
  ctx.strokeStyle = '#c9a44e';
  ctx.lineWidth = 1.4;
  const cx = x + TILE / 2, cy = y + 16;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 5, cy);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#57d7c5';
  ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a44e';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(x + 11 + i * 4.4, y + 33); ctx.lineTo(x + 11 + i * 4.4, y + 36.5); ctx.stroke();
  }
  ctx.lineWidth = 1;
}

function propSconce(ctx, x, y, w, h, world) {
  // a wall sconce: iron plate and arm, one flame with its own small halo
  const cx = x + TILE / 2, cy = y + TILE / 2;
  ctx.fillStyle = '#232830';
  ctx.fillRect(cx - 2.5, cy - 9, 5, 13);
  ctx.fillRect(cx - 6, cy + 2, 12, 3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const flick = 0.85 + 0.15 * Math.sin(world.time * 7 + x * 1.7 + y);
  const halo = ctx.createRadialGradient(cx, cy - 6, 1, cx, cy - 6, 15 * flick);
  halo.addColorStop(0, 'rgba(255,205,120,0.5)');
  halo.addColorStop(1, 'rgba(255,205,120,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 16, cy - 22, 32, 32);
  ctx.restore();
  ctx.fillStyle = '#ffca7a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.quadraticCurveTo(cx + 3.4, cy - 6, cx, cy - 3.4);
  ctx.quadraticCurveTo(cx - 3.4, cy - 6, cx, cy - 12);
  ctx.fill();
  ctx.fillStyle = '#fff3d0';
  ctx.beginPath(); ctx.arc(cx, cy - 6, 1.4, 0, Math.PI * 2); ctx.fill();
}

function propCandle(ctx, x, y, w, h, world) {
  // a votive cluster: wax stubs of uneven height, each with a lit wick
  const spots = [[12, 24, 9], [21, 27, 12], [29, 23, 7], [17, 18, 6], [26, 30, 8]];
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x + 20, y + 29, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(x + 20, y + 20, 2, x + 20, y + 20, 24);
  halo.addColorStop(0, 'rgba(255,190,100,0.30)');
  halo.addColorStop(1, 'rgba(255,190,100,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - 4, y - 4, TILE + 8, TILE + 8);
  ctx.restore();
  for (const [dx, dy, hh] of spots) {
    ctx.fillStyle = '#ddd3b8';
    ctx.fillRect(x + dx - 2.4, y + dy - hh, 4.8, hh);
    ctx.fillStyle = '#b8ab8c';
    ctx.fillRect(x + dx - 2.4, y + dy - hh, 4.8, 2);
    const fl = 0.8 + 0.2 * Math.sin(world.time * 9 + dx * 2.1 + dy);
    ctx.fillStyle = '#ffca7a';
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy - hh - 4.6 * fl);
    ctx.quadraticCurveTo(x + dx + 2, y + dy - hh - 1, x + dx, y + dy - hh + 0.6);
    ctx.quadraticCurveTo(x + dx - 2, y + dy - hh - 1, x + dx, y + dy - hh - 4.6 * fl);
    ctx.fill();
  }
}

function propStatue(ctx, x, y) {
  // a drowned saint on a plinth: stone robe, bowed head, teal patina in the folds
  const cx = x + TILE / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(cx, y + 35, 14, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#525f78';
  ctx.fillRect(cx - 11, y + 28, 22, 7);
  ctx.fillStyle = '#626f89';
  ctx.fillRect(cx - 11, y + 28, 22, 2.4);
  ctx.fillStyle = '#5d6a86';
  ctx.beginPath();
  ctx.moveTo(cx - 8, y + 28); ctx.lineTo(cx - 4.5, y + 10); ctx.lineTo(cx + 4.5, y + 10); ctx.lineTo(cx + 8, y + 28);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(87,180,160,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx - 6.5, y + 24); ctx.lineTo(cx - 5, y + 14); ctx.lineTo(cx - 2.5, y + 14); ctx.lineTo(cx - 3.8, y + 24);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6d7a96';
  ctx.beginPath(); ctx.arc(cx, y + 7.5, 4.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#525f78';
  ctx.beginPath(); ctx.arc(cx, y + 5.4, 5.4, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.strokeStyle = 'rgba(20,26,38,0.6)';
  ctx.beginPath(); ctx.moveTo(cx - 4, y + 17); ctx.lineTo(cx + 4, y + 17); ctx.stroke();
}

const PROP_PAINT = {
  barrel: propBarrel, sacks: propSacks, stack: propStack, shelf: propShelf, cart: propCart,
  bench: propBench, planter: propPlanter, carving: propCarving, rubble: propRubble,
  sparkle: propSparkle, bookcase: propBookcase, table: propTable, lectern: propLectern,
  rug: propRug, altar: propAltar, pew: propPew, bowl: propBowl, treasure: propTreasure,
  banner: propBanner, sconce: propSconce, candle: propCandle, statue: propStatue,
};

// A soft vignette: the room edges fall away into deeper shadow so lamp pools and lit
// floor read warm against cool dark. Drawn over the room, under the actors.
function drawVignette(ctx) {
  const g = ctx.createRadialGradient(480, 360, 340, 480, 360, 720);
  g.addColorStop(0, 'rgba(2,4,10,0)');
  g.addColorStop(1, 'rgba(2,4,10,0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
}

function drawLampGlow(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of world.lamps) {
    const l = lightAt(world.lamps, lamp.x, lamp.y);
    const R = TILE * 3.4;
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, R);
    g.addColorStop(0, 'rgba(255,205,120,0.38)');
    g.addColorStop(0.4, 'rgba(255,180,84,0.17)');
    g.addColorStop(1, 'rgba(255,180,84,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lamp.x - R, lamp.y - R, R * 2, R * 2);
    void l;
  }
  ctx.restore();
}

function drawItems(ctx, world) {
  for (const l of world.loot) {
    if (l.taken) continue;
    ctx.fillStyle = '#ffcf5e';
    ctx.beginPath(); ctx.arc(l.x, l.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a1d';
    ctx.stroke();
  }
  if (!world.objectiveTaken) {
    const p = world.objectivePos;
    const pulse = 13 + Math.sin(world.time * 2.4) * 3;
    ctx.strokeStyle = 'rgba(255,217,119,0.55)';
    ctx.beginPath(); ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd977';
    ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6dd';
    ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 3, 0, Math.PI * 2); ctx.fill();
  }
  if (world.coinRest) {
    ctx.fillStyle = '#e8d9a0';
    ctx.beginPath(); ctx.arc(world.coinRest.x, world.coinRest.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (world.coinFlight) {
    const f = world.coinFlight;
    const t = Math.min(1, f.t / f.dur);
    const x = f.x0 + (f.x1 - f.x0) * t;
    const y = f.y0 + (f.y1 - f.y0) * t - Math.sin(t * Math.PI) * 26;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const e of world.effects) {
    const t = e.t / e.max;
    ctx.strokeStyle = e.kind === 'ping' ? `rgba(255,220,150,${0.75 * (1 - t)})` : `rgba(87,215,197,${0.8 * (1 - t)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, 8 + t * 130, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawWires(ctx, world) {
  for (const w of world.wires) {
    ctx.fillStyle = '#1c212c';
    ctx.fillRect(w.x1 - 4, w.y1 - 4, 8, 8);
    ctx.fillRect(w.x2 - 4, w.y2 - 4, 8, 8);
    ctx.strokeStyle = w.lit ? '#ff4b3e' : 'rgba(255,75,62,0.35)';
    ctx.lineWidth = w.lit ? 2 : 1;
    ctx.setLineDash(w.lit ? [] : [5, 5]);
    ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  }
}

function drawCrumbs(ctx, world) {
  for (const c of world.scent.crumbs) {
    const age = world.time - c.t;
    ctx.fillStyle = `rgba(150,230,210,${0.5 * (1 - age / CRUMB_LIFE)})`;
    ctx.beginPath(); ctx.arc(c.x, c.y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  for (const h of world.hounds) {
    if (h.state !== 'tracking' || h.chain.length < 2) continue;
    ctx.strokeStyle = 'rgba(150,230,210,0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    for (let i = h.chainIdx; i < h.chain.length; i++) ctx.lineTo(h.chain[i].x, h.chain[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  }
}

function drawCones(ctx, world) {
  for (const cam of world.cameras) {
    const poly = conePolygon(world.level, cam.x, cam.y, cam.angle, 0.5, TILE * 5, 14);
    ctx.fillStyle = cam.exposure > 0.55 ? 'rgba(255,80,60,0.20)' : 'rgba(90,200,255,0.13)';
    pathOf(ctx, poly);
    ctx.fill();
  }
  for (const g of world.guards) {
    const poly = conePolygon(world.level, g.x, g.y, g.facing, CONE_HALF, CONE_RANGE);
    ctx.fillStyle = CONE_FILL[g.state];
    pathOf(ctx, poly);
    ctx.fill();
  }
}

function pathOf(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function drawActors(ctx, world) {
  // cameras: a wall mount and a lens that follows the sweep
  for (const cam of world.cameras) {
    ctx.fillStyle = '#2c3648';
    ctx.fillRect(cam.x - 7, cam.y - 7, 14, 14);
    ctx.fillStyle = cam.exposure > 0.55 ? '#ff5040' : '#9adcff';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 5, cam.y + Math.sin(cam.angle) * 5, 3.4, 0, Math.PI * 2);
    ctx.fill();
    if (cam.exposure > 0.03) {
      ctx.fillStyle = 'rgba(255,90,70,0.9)';
      ctx.fillRect(cam.x - 10, cam.y - 16, 20 * cam.exposure, 3);
    }
  }
  // hounds: an elongated body with a snout, ears and a tail, turned to its facing
  for (const h of world.hounds) {
    if (h.state === 'tracking') {
      ctx.strokeStyle = 'rgba(150,230,210,0.22)';
      ctx.beginPath(); ctx.arc(h.x, h.y, NOSE_RADIUS, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(h.x, h.y + 12, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.facing);
    ctx.scale(1.18, 1.18);
    // tail, wagging a little as it works the trail
    const wag = Math.sin(world.time * 6 + h.x * 0.1) * 2.5;
    ctx.strokeStyle = '#39415a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(-21, wag, -25, -3 + wag);
    ctx.stroke();
    ctx.lineWidth = 1;
    // body
    ctx.fillStyle = '#4c5872';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 9.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a6884';
    ctx.beginPath(); ctx.ellipse(-2, -2, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    // paws
    ctx.fillStyle = '#39415a';
    ctx.beginPath(); ctx.ellipse(9, -9, 4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, 9, 4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-10, -9, 4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-10, 9, 4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    // collar
    ctx.fillStyle = '#a34a3a';
    ctx.fillRect(7, -9, 3.6, 18);
    // ears
    ctx.fillStyle = '#39415a';
    ctx.beginPath(); ctx.ellipse(11, -7.5, 5.5, 3.2, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, 7.5, 5.5, 3.2, 0.5, 0, Math.PI * 2); ctx.fill();
    // head and snout
    ctx.fillStyle = '#66748f';
    ctx.beginPath(); ctx.ellipse(14, 0, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#76839e';
    ctx.beginPath(); ctx.ellipse(21.5, 0, 6, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath(); ctx.arc(26.5, 0, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // wardens: a coated figure with a head, a watch cap and the lantern it carries
  for (const g of world.guards) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(g.x, g.y, 2, g.x, g.y, 44);
    glow.addColorStop(0, 'rgba(255,190,100,0.34)');
    glow.addColorStop(1, 'rgba(255,190,100,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(g.x - 44, g.y - 44, 88, 88);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 13, 17, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.facing);
    // coat: a broad bell of a body, lighter panel toward the front
    ctx.fillStyle = '#7c4a20';
    ctx.beginPath(); ctx.ellipse(0, 0, 15.5, 16.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#96622c';
    ctx.beginPath(); ctx.ellipse(4, 0, 10, 12.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#54371d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.lineWidth = 1;
    // head with a watch cap, face turned to the facing
    ctx.fillStyle = '#46536e';
    ctx.beginPath(); ctx.arc(1, 0, 9.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dbb287';
    ctx.beginPath(); ctx.arc(3.4, 0, 7.2, 0, Math.PI * 2); ctx.fill();
    // the lantern, carried ahead on the right hand: frame, warm core, its own halo
    const lx = 14, ly = 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, 20);
    halo.addColorStop(0, 'rgba(255,205,120,0.5)');
    halo.addColorStop(1, 'rgba(255,205,120,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(lx - 20, ly - 20, 40, 40);
    ctx.restore();
    ctx.strokeStyle = '#d9b48c';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(lx - 2, ly - 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#2a2016';
    ctx.fillRect(lx - 4, ly - 5, 8, 10);
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(lx - 2.2, ly - 3, 4.4, 6);
    ctx.restore();
    if (g.detection > 0.02) {
      const col = g.state === 'chase' ? '#ff5040' : '#ffb454';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(g.x, g.y - 30, 9, -Math.PI * 0.8, Math.PI * 0.8); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(g.x, g.y - 30, 9, -Math.PI * 0.8, -Math.PI * 0.8 + Math.PI * 1.6 * g.detection); ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (g.state === 'chase' || g.state === 'suspicious' || g.state === 'investigate') {
      ctx.fillStyle = g.state === 'chase' ? '#ff5040' : '#ffb454';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.state === 'chase' ? '!' : '?', g.x, g.y - 40);
    }
  }
  // the thief: a hooded figure in a teal cloak, its peak and tail turned to its facing
  const p = world.player;
  if (!(world.invulnT > 0 && Math.floor(world.time * 9) % 2 === 0)) {
    const r = p.noiseRadius(world.level);
    if (p.moving && r > 0) {
      ctx.strokeStyle = p.wading ? 'rgba(120,220,230,0.4)' : 'rgba(255,255,255,0.33)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.facing);
    const cloak = p.stance === 'sneak' ? '#14604f' : '#1d7a68';
    // cloak tail trailing behind
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(-8, -9); ctx.lineTo(-21, 0); ctx.lineTo(-8, 9);
    ctx.closePath(); ctx.fill();
    // cloak body
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(2, -3, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    // a small satchel at the back
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(-13, 5, 8, 7);
    // the hood, peaked toward the facing, face in shadow inside it
    ctx.fillStyle = '#2fa08d';
    ctx.beginPath(); ctx.arc(3, 0, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -5); ctx.lineTo(16, 0); ctx.lineTo(8, 5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d2b26';
    ctx.beginPath(); ctx.arc(5.5, 0, 5.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawMarkers(ctx, world) {
  for (const g of world.guards) {
    if (g.state === 'search' && g.lastSeen) {
      const s = g.lastSeen;
      ctx.strokeStyle = 'rgba(255,120,90,0.85)';
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(s.x, s.y, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(s.x - 6, s.y - 6); ctx.lineTo(s.x + 6, s.y + 6);
      ctx.moveTo(s.x + 6, s.y - 6); ctx.lineTo(s.x - 6, s.y + 6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,150,120,0.9)';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LAST SEEN', s.x, s.y - 18);
    }
    if (g.callout) sayPill(ctx, g.x, g.y - 58, g.callout);
  }
  for (const h of world.hounds) {
    if (h.state === 'tracking') sayPill(ctx, h.x, h.y - 36, 'sniff sniff…');
  }
}

function sayPill(ctx, x, y, text) {
  ctx.font = '11px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = 'rgba(10,12,18,0.85)';
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 10, w, 17, 5);
  ctx.fill();
  ctx.fillStyle = '#ffe9c4';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 3);
}
