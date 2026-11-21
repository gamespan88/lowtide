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
  ctx.fillStyle = '#141a26';
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  drawTiles(ctx, world);
  drawLampGlow(ctx, world);
  drawItems(ctx, world);
  drawWires(ctx, world);
  drawCrumbs(ctx, world);
  drawCones(ctx, world);
  drawActors(ctx, world);
  drawMarkers(ctx, world);
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
    }
  }
}

function drawLampGlow(ctx, world) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lamp of world.lamps) {
    const l = lightAt(world.lamps, lamp.x, lamp.y);
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, TILE * 3.1);
    g.addColorStop(0, 'rgba(255,180,84,0.20)');
    g.addColorStop(1, 'rgba(255,180,84,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lamp.x - TILE * 3.1, lamp.y - TILE * 3.1, TILE * 6.2, TILE * 6.2);
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
  // hounds
  for (const h of world.hounds) {
    if (h.state === 'tracking') {
      ctx.strokeStyle = 'rgba(150,230,210,0.22)';
      ctx.beginPath(); ctx.arc(h.x, h.y, NOSE_RADIUS, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(h.x, h.y + 8, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d4454';
    ctx.beginPath(); ctx.arc(h.x, h.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#59637a';
    ctx.beginPath();
    ctx.arc(h.x + Math.cos(h.facing) * 8, h.y + Math.sin(h.facing) * 8, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // wardens
  for (const g of world.guards) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(g.x, g.y, 2, g.x, g.y, 30);
    glow.addColorStop(0, 'rgba(255,180,84,0.28)');
    glow.addColorStop(1, 'rgba(255,180,84,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(g.x - 30, g.y - 30, 60, 60);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 9, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4b21';
    ctx.beginPath(); ctx.arc(g.x, g.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d9b48c';
    ctx.beginPath(); ctx.arc(g.x, g.y - 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffca7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.facing) * 15, g.y + Math.sin(g.facing) * 15);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (g.detection > 0.02) {
      const col = g.state === 'chase' ? '#ff5040' : '#ffb454';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(g.x, g.y - 24, 8, -Math.PI * 0.8, Math.PI * 0.8); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(g.x, g.y - 24, 8, -Math.PI * 0.8, -Math.PI * 0.8 + Math.PI * 1.6 * g.detection); ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (g.state === 'chase' || g.state === 'suspicious' || g.state === 'investigate') {
      ctx.fillStyle = g.state === 'chase' ? '#ff5040' : '#ffb454';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.state === 'chase' ? '!' : '?', g.x, g.y - 32);
    }
  }
  // the thief
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
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.stance === 'sneak' ? '#155e52' : '#1f7a6d';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.stance === 'sneak' ? 11 : 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2fa08d';
    ctx.beginPath(); ctx.arc(p.x, p.y - 2, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#bff3e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.facing) * 13, p.y + Math.sin(p.facing) * 13);
    ctx.stroke();
    ctx.lineWidth = 1;
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
    if (g.callout) sayPill(ctx, g.x, g.y - 46, g.callout);
  }
  for (const h of world.hounds) {
    if (h.state === 'tracking') sayPill(ctx, h.x, h.y - 30, 'sniff sniff…');
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
