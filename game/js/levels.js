// levels.js — LOWTIDE's four handcrafted tile maps and everything placed on them.
// Terrain chars: # wall (tall, blocks sight) · C crate (tall cover) · = low cover (blocks
// movement, hides a sneaking thief from sight) · ~ water (loud to wade, washes scent away)
// · s deep shadow floor · v vent (only the thief may crawl in) · L lamp (solid, lights a pool)
// · . floor · X exit. Entities (player start, objective, loot, patrols) live in the defs.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 18;

export const TILE_NAMES = {
  '#': 'wall', C: 'crate', '=': 'low cover', '~': 'water', s: 'deep shadow',
  v: 'vent', L: 'lamp', '.': 'floor', X: 'exit',
};

export const LEVELS = [
  {
    name: 'The Causeway Stores',
    prize: 'the Drowned Ledger',
    coins: 3,
    start: [2, 16],
    objective: [21, 2],
    loot: [[12, 1], [5, 8], [20, 13]],
    guards: [
      { path: [[4, 1], [9, 1], [9, 4], [4, 4]] },
      { path: [[13, 2], [20, 2], [20, 6], [13, 6]] },
      { path: [[3, 15], [12, 15], [12, 12], [16, 12], [16, 15], [21, 15]] },
    ],
    hounds: [],
    cameras: [],
    wires: [],
    grid: [
      '########################',
      '#..........#...........#',
      '#..CC......#.....==....#',
      '#..CC......L.....==..L.#',
      '#..........#...........#',
      '#.....==...#.....CC....#',
      '#.....==...#.....CC....#',
      '#..L.......###.###.....#',
      '#......................#',
      '#....CC......==....L...#',
      '#....CC......==........#',
      '#..######..............#',
      '#.................CC...#',
      '#..L....==........CC...#',
      '#.......==.............#',
      '#......................#',
      '#.....................X#',
      '########################',
    ],
  },
  {
    name: 'The Flooded Cloister',
    prize: 'the Choir Ledger',
    coins: 3,
    start: [1, 8],
    objective: [21, 3],
    loot: [[5, 1], [21, 11], [12, 16]],
    guards: [
      { path: [[9, 2], [16, 2], [16, 4], [9, 4]] },
      { path: [[13, 10], [20, 10], [20, 14], [13, 14]] },
      { path: [[2, 6], [10, 6], [10, 8], [2, 8]] },
    ],
    hounds: [{ path: [[3, 10], [3, 15], [10, 15], [10, 10]] }],
    cameras: [{ x: 12, y: 1, a0: Math.PI * 0.25, a1: Math.PI * 0.75 }],
    wires: [],
    grid: [
      '########################',
      '#.....~~...............#',
      '#.CC..~~..L....ss......#',
      '#.CC..~~.......ss......#',
      '#.....~~...............#',
      '#..########.####....L..#',
      '#.....~~...............#',
      '#..L..~~....==....~~...#',
      '#.....~~....==....~~...#',
      '#####.~~.##########.####',
      '#.....~~...............#',
      '#..ss.~~..CC......L....#',
      '#..ss.~~..CC...........#',
      '#.....~~......==.......#',
      '#..####~~####..........#',
      '#......................#',
      '#.....L..........==...X#',
      '########################',
    ],
  },
  {
    name: 'The Chapter House',
    prize: 'the Chapter Seal',
    coins: 4,
    start: [2, 15],
    objective: [20, 3],
    loot: [[11, 1], [2, 8], [21, 15], [15, 8]],
    guards: [
      { path: [[2, 4], [5, 4], [5, 7], [2, 7]] },
      { path: [[14, 2], [20, 2], [20, 4], [14, 4]] },
      { path: [[5, 15], [8, 15], [8, 13], [5, 13]] },
      { path: [[18, 11], [21, 11], [21, 13], [18, 13]] },
    ],
    hounds: [{ path: [[13, 8], [20, 8], [20, 10], [13, 10]] }],
    cameras: [{ x: 11, y: 16, a0: -Math.PI * 0.75, a1: -Math.PI * 0.25 }],
    wires: [
      { x1: 7, y1: 9, x2: 15, y2: 9 },
      { x1: 17, y1: 3, x2: 17, y2: 7 },
    ],
    grid: [
      '########################',
      '#..vvvvvvvvvv..........#',
      '#..v........v....CC....#',
      '#..v..####..v..........#',
      '#.....#..#.............#',
      '#.L...#..#....==.......#',
      '#.....####....==.......#',
      '#..........####.####...#',
      '#..ss..................#',
      '#..ss....==......L.....#',
      '#........==............#',
      '#..####......####......#',
      '#......L.....#..#..C...#',
      '#..CC........#..#......#',
      '#..CC....####..####....#',
      '#......................#',
      '#.......vvvvvvvvvvvv..X#',
      '########################',
    ],
  },
  {
    name: 'The Sunken Vault',
    prize: 'the Tide Pearl',
    coins: 4,
    start: [12, 16],
    objective: [11, 2],
    loot: [[2, 1], [21, 2], [3, 15], [20, 15]],
    guards: [
      { path: [[3, 6], [8, 6], [8, 9], [3, 9]] },
      { path: [[15, 6], [20, 6], [20, 9], [15, 9]] },
      { path: [[9, 12], [14, 12], [14, 15], [9, 15]] },
      { path: [[2, 12], [5, 12], [5, 15], [2, 15]] },
      { path: [[18, 12], [21, 12], [21, 15], [18, 15]] },
    ],
    hounds: [
      { path: [[6, 10], [11, 10], [11, 12], [6, 12]] },
      { path: [[17, 10], [12, 10], [12, 12], [17, 12]] },
    ],
    cameras: [
      { x: 11, y: 5, a0: Math.PI * 0.2, a1: Math.PI * 0.8 },
      { x: 21, y: 10, a0: Math.PI * 0.6, a1: Math.PI * 1.05 },
    ],
    wires: [
      { x1: 10, y1: 10, x2: 13, y2: 10 },
      { x1: 4, y1: 11, x2: 19, y2: 11 },
    ],
    grid: [
      '########################',
      '#......#.......#.......#',
      '#.CC...#.......#...==..#',
      '#.CC...#.......#...==..#',
      '#......##.....##.......#',
      '#..L.....~~.......L....#',
      '#......~~~~~~..........#',
      '#..==..~~~~~~..==......#',
      '#..==..~~~~~~..==..L...#',
      '#......................#',
      '#....vvvv..~~..vvvv....#',
      '#......................#',
      '#..ss..........ss......#',
      '#..ss....L.....ss...L..#',
      '#......................#',
      '#.....==......==.......#',
      '#.....................X#',
      '########################',
    ],
  },
];

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.grid[ty][tx];
}

export function isSolidForBody(level, tx, ty, isPlayer) {
  const t = tileAt(level, tx, ty);
  if (t === '#' || t === 'C' || t === 'L' || t === '=') return true;
  if (t === 'v') return !isPlayer;
  return false;
}

export function blocksSight(level, tx, ty) {
  const t = tileAt(level, tx, ty);
  return t === '#' || t === 'C' || t === 'L';
}

export function lampPositions(level) {
  const lamps = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (level.grid[y][x] === 'L') lamps.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
  }
  return lamps;
}

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

// Circle-vs-tile collision, one axis at a time so bodies slide along walls and crates.
export function moveBody(level, body, vx, vy, dt, isPlayer) {
  const nx = body.x + vx * dt;
  if (!hitsSolid(level, nx, body.y, body.r, isPlayer)) body.x = nx;
  const ny = body.y + vy * dt;
  if (!hitsSolid(level, body.x, ny, body.r, isPlayer)) body.y = ny;
}

function hitsSolid(level, x, y, r, isPlayer) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!isSolidForBody(level, tx, ty, isPlayer)) continue;
    const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
    const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
    if (Math.hypot(x - cx, y - cy) < r) return true;
  }
  return false;
}
