// vision.js — raycasts against the tile grid: line of sight, vision-cone polygons and
// lamp light. Everything the wardens (and the renderer) know about seeing comes from here.

import { TILE, tileAt, blocksSight } from './levels.js';

const STEP = 5; // px marched per ray step

export function castRay(level, x, y, angle, maxDist) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let d = 0;
  while (d < maxDist) {
    d += STEP;
    const px = x + dx * d, py = y + dy * d;
    if (blocksSight(level, Math.floor(px / TILE), Math.floor(py / TILE))) {
      return { x: px, y: py, dist: d };
    }
  }
  return { x: x + dx * maxDist, y: y + dy * maxDist, dist: maxDist };
}

// Can the eye at (x,y) see the point (px,py)? Low cover ('=') hides a sneaking thief:
// it counts as opaque only when the target is sneaking (hideIfSneaking).
export function lineOfSight(level, x, y, px, py, hideIfSneaking) {
  const dist = Math.hypot(px - x, py - y);
  const steps = Math.max(1, Math.ceil(dist / STEP));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x + (px - x) * t) / TILE);
    const ty = Math.floor((y + (py - y) * t) / TILE);
    const tile = tileAt(level, tx, ty);
    if (tile === '#' || tile === 'C' || tile === 'L') return false;
    if (hideIfSneaking && tile === '=') return false;
  }
  return true;
}

// The visible polygon of a vision cone: one ray per few degrees, marched to the first
// tall blocker. Used both to draw the cone and to test what the cone covers.
export function conePolygon(level, x, y, facing, halfAngle, range, rayCount = 26) {
  const pts = [{ x, y }];
  for (let i = 0; i <= rayCount; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rayCount;
    const hit = castRay(level, x, y, a, range);
    pts.push({ x: hit.x, y: hit.y });
  }
  return pts;
}

// 0 in darkness, up to 1 inside a lamp's pool. Lamps are precomputed per level.
export function lightAt(lamps, x, y) {
  let best = 0;
  const R = TILE * 3.1;
  for (const lamp of lamps) {
    const d = Math.hypot(lamp.x - x, lamp.y - y);
    if (d < R) best = Math.max(best, 1 - d / R);
  }
  return best;
}

// How visible is the player to an eye, as a fill-rate multiplier: lamp light exposes,
// deep shadow and vent mouths conceal.
export function exposureAt(level, lamps, player) {
  const tile = tileAt(level, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  if (tile === 'v') return 0;
  let m = 0.55 + lightAt(lamps, player.x, player.y) * 1.15;
  if (tile === 's') m *= 0.35;
  if (player.stance === 'sneak') m *= 0.7;
  if (player.stance === 'sprint') m *= 1.25;
  return m;
}
