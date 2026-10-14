import { GRID, indexOf, neighbours, type Point, type Tile } from './state';
import type { Terrain } from './terrain';

/** Fewest land tiles an island may have; smaller ones are rolled again. */
const MIN_LAND = 45;
/** Height above which a tile is land. */
const SHORE = 0.18;
/** Relief above which inland tiles become hills and peaks. */
const HILLS_AT = 0.64;
const PEAK_AT = 0.74;

export interface Island {
  tiles: Tile[];
  port: Point;
}

/**
 * Rolls an island on the grid: one blob of land, ringed by beaches, with hills and peaks on its
 * high ground, forests and meadows elsewhere, then villages and ruins away from the port. Every
 * tile starts under fog except the port on the south coast. Later islands have more landmarks.
 */
export function makeIsland(number: number): Island {
  for (;;) {
    const island = tryIsland(number);
    if (island) return island;
  }
}

function tryIsland(number: number): Island | null {
  const { w, h } = GRID;
  const heightNoise = valueNoise(4);
  const woodNoise = valueNoise(3);
  const reliefNoise = valueNoise(3);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const height = (x: number, y: number) => {
    const dx = (x - cx) / (w / 2 - 0.5);
    const dy = (y - cy) / (h / 2 - 0.5);
    return 1 - Math.hypot(dx, dy) * 0.9 + (heightNoise[indexOf(x, y)] - 0.5) * 0.7;
  };

  const land = new Array<boolean>(w * h).fill(false);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) land[indexOf(x, y)] = height(x, y) > SHORE;

  // Keep only the biggest stretch of land, so every land tile can be walked to from the port.
  const biggest = largestPatch(land);
  if (biggest.length < MIN_LAND) return null;
  const keep = new Set(biggest.map((p) => indexOf(p.x, p.y)));

  const terrain = new Array<Terrain>(w * h).fill('sea');
  for (const p of biggest) {
    const i = indexOf(p.x, p.y);
    const coast = neighbours(p.x, p.y).some((n) => !keep.has(indexOf(n.x, n.y)));
    // High ground rises where the island is tall and the relief is rough.
    const z = 0.35 * height(p.x, p.y) + 0.75 * reliefNoise[i] - 0.1;
    terrain[i] = coast ? 'beach' : z > PEAK_AT ? 'mountain' : z > HILLS_AT ? 'hills' : woodNoise[i] > 0.5 ? 'forest' : 'grass';
  }

  // The port: the southernmost beach, nearest the middle.
  const beaches = biggest.filter((p) => terrain[indexOf(p.x, p.y)] === 'beach');
  beaches.sort((a, b) => b.y - a.y || Math.abs(a.x - cx) - Math.abs(b.x - cx));
  const port = beaches[0];
  terrain[indexOf(port.x, port.y)] = 'port';

  const far = (p: Point, d: number) => Math.abs(p.x - port.x) + Math.abs(p.y - port.y) >= d;
  const place = (kind: Terrain, count: number, on: Terrain[], distance: number) => {
    for (let n = 0; n < count; n++) {
      let spots = biggest.filter((p) => on.includes(terrain[indexOf(p.x, p.y)]) && far(p, distance));
      if (spots.length === 0) spots = biggest.filter((p) => ['grass', 'forest', 'beach'].includes(terrain[indexOf(p.x, p.y)]) && far(p, 2));
      if (spots.length === 0) return;
      const p = spots[Math.floor(Math.random() * spots.length)];
      terrain[indexOf(p.x, p.y)] = kind;
    }
  };
  place('village', Math.min(2 + Math.floor((number - 1) / 2), 4), ['grass'], 3);
  place('ruins', Math.min(1 + Math.floor((number - 1) / 2), 3), ['forest', 'hills'], 4);

  const tiles = terrain.map((t) => ({ terrain: t, revealed: t === 'port' }));
  return { tiles, port: { x: port.x, y: port.y } };
}

/** Smooth noise in [0, 1) over the grid: random values every `cell` tiles, blended between. */
function valueNoise(cell: number) {
  const { w, h } = GRID;
  const lw = Math.ceil(w / cell) + 2;
  const lh = Math.ceil(h / cell) + 2;
  const lattice = Array.from({ length: lw * lh }, () => Math.random());
  const at = (i: number, j: number) => lattice[j * lw + i];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const out: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const gy = y / cell;
      const i = Math.floor(gx);
      const j = Math.floor(gy);
      const tx = smooth(gx - i);
      const ty = smooth(gy - j);
      const top = at(i, j) + (at(i + 1, j) - at(i, j)) * tx;
      const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
      out.push(top + (bottom - top) * ty);
    }
  }
  return out;
}

/** The biggest group of `true` tiles joined side to side. */
function largestPatch(cells: boolean[]): Point[] {
  const seen = new Set<number>();
  let best: Point[] = [];
  for (let y = 0; y < GRID.h; y++) {
    for (let x = 0; x < GRID.w; x++) {
      if (!cells[indexOf(x, y)] || seen.has(indexOf(x, y))) continue;
      const patch: Point[] = [];
      const queue: Point[] = [{ x, y }];
      seen.add(indexOf(x, y));
      while (queue.length > 0) {
        const p = queue.pop()!;
        patch.push(p);
        for (const n of neighbours(p.x, p.y)) {
          const i = indexOf(n.x, n.y);
          if (cells[i] && !seen.has(i)) {
            seen.add(i);
            queue.push(n);
          }
        }
      }
      if (patch.length > best.length) best = patch;
    }
  }
  return best;
}
