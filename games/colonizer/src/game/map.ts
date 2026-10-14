import { MAP_SIZE, type Resource } from './data';

export const GRASS = 0;
export const WATER = 1;
export const ROCK = 2;
export const DIRT = 3;

export interface Node {
  id: number;
  kind: 'tree' | 'bush' | 'mine';
  res: Resource;
  tx: number;
  ty: number;
  w: number;
  h: number;
  amount: number;
}

export interface MapData {
  terrain: Uint8Array;
  nodes: Node[];
}

/** Top-left tile of each side's Town Center; the second side is the point mirror of the first. */
export const START_TILES = [
  { tx: 13, ty: 13 },
  { tx: MAP_SIZE - 17, ty: MAP_SIZE - 17 },
];

export const idx = (x: number, y: number) => y * MAP_SIZE + x;
export const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE;

const AMOUNT = { tree: 120, bush: 150, mine: 900 } as const;
const RESOURCE = { tree: 'wood', bush: 'food', mine: 'ore' } as const;

/**
 * Builds a fair random map: lakes, rock ridges, forests, berry bushes and gold mines are drawn in
 * the whole map and each one is copied to its point mirror, plus each side's starting trees, bushes
 * and mine. Uses Math.random, so a seeded run gives the same map.
 */
export function generateMap(): MapData {
  const terrain = new Uint8Array(MAP_SIZE * MAP_SIZE);
  const taken = new Uint8Array(MAP_SIZE * MAP_SIZE);
  const nodes: Node[] = [];
  const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const nearStart = (x: number, y: number) =>
    START_TILES.some((s) => Math.hypot(x - s.tx - 1.5, y - s.ty - 1.5) < 11);

  /** Whether every tile of a footprint and its mirror is free and clear of the starts. */
  const free = (tiles: { x: number; y: number }[]) =>
    tiles.every((t) => inMap(t.x, t.y) && !taken[idx(t.x, t.y)] && !nearStart(t.x, t.y));

  const mirrorTile = (t: { x: number; y: number }, size = 1) => ({ x: MAP_SIZE - t.x - size, y: MAP_SIZE - t.y - size });

  /** Terrain: every tile of a shape, and of its mirror. */
  function shape(tiles: { x: number; y: number }[], kind: typeof WATER | typeof ROCK) {
    const all = tiles.concat(tiles.map((t) => mirrorTile(t)));
    if (!free(all)) return;
    for (const t of all) {
      taken[idx(t.x, t.y)] = 1;
      terrain[idx(t.x, t.y)] = kind;
    }
  }

  /** A resource node of `size` x `size` tiles at `origin`, and the mirrored one. */
  function node(origin: { x: number; y: number }, kind: Node['kind'], size = 1) {
    const m = mirrorTile(origin, size);
    const tiles = [];
    for (const o of [origin, m]) for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) tiles.push({ x: o.x + i, y: o.y + j });
    if (!free(tiles)) return;
    for (const t of tiles) taken[idx(t.x, t.y)] = 1;
    for (const o of [origin, m]) {
      nodes.push({
        id: nodes.length + 1,
        kind,
        res: RESOURCE[kind],
        tx: o.x,
        ty: o.y,
        w: size,
        h: size,
        amount: AMOUNT[kind],
      });
    }
  }

  // Lakes: round blobs with ragged edges.
  for (let n = 0; n < 7; n++) {
    const cx = rand(8, 60);
    const cy = rand(8, 60);
    const r = rand(2, 4);
    const tiles: { x: number; y: number }[] = [];
    for (let y = cy - r - 1; y <= cy + r + 1; y++)
      for (let x = cx - r - 1; x <= cx + r + 1; x++)
        if (Math.hypot(x - cx, y - cy) <= r + (Math.random() < 0.3 ? 0.9 : 0)) tiles.push({ x, y });
    shape(tiles, WATER);
  }

  // Rock ridges: short two-tile-thick lines.
  for (let n = 0; n < 6; n++) {
    const x0 = rand(6, 56);
    const y0 = rand(6, 56);
    const horizontal = Math.random() < 0.5;
    const len = rand(5, 9);
    const tiles: { x: number; y: number }[] = [];
    for (let i = 0; i < len; i++) {
      tiles.push(horizontal ? { x: x0 + i, y: y0 } : { x: x0, y: y0 + i });
      tiles.push(horizontal ? { x: x0 + i, y: y0 + 1 } : { x: x0 + 1, y: y0 + i });
    }
    shape(tiles, ROCK);
  }

  // Forests: a cluster of single-tile trees.
  for (let n = 0; n < 26; n++) {
    const cx = rand(6, 58);
    const cy = rand(6, 58);
    for (let i = 0; i < 12; i++) node({ x: cx + rand(-3, 3), y: cy + rand(-3, 3) }, 'tree');
  }

  // Berry bushes, clumps of food for the early game.
  for (let n = 0; n < 10; n++) node({ x: rand(6, 58), y: rand(6, 58) }, 'bush');

  // Gold mines, two tiles square.
  for (let n = 0; n < 6; n++) node({ x: rand(6, 58), y: rand(6, 58) }, 'mine', 2);

  // Each side's start: trees and bushes beside the Town Center and a mine a few tiles away. The
  // second side is the mirror of the first, so both start the same.
  const s = START_TILES[0];
  for (const [dx, dy] of [[7, -2], [8, -2], [7, -3], [8, -3], [9, -3], [9, -2], [10, -3], [10, -2], [9, -4], [10, -4]])
    startNode({ x: s.tx + dx, y: s.ty + dy }, 'tree');
  for (const [dx, dy] of [[-3, 0], [-3, 1], [-4, 0], [-4, 1], [-3, -2]]) startNode({ x: s.tx + dx, y: s.ty + dy }, 'bush');
  startNode({ x: s.tx - 4, y: s.ty + 6 }, 'mine', 2);

  function startNode(origin: { x: number; y: number }, kind: Node['kind'], size = 1) {
    const m = mirrorTile(origin, size);
    for (const o of [origin, m]) {
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) taken[idx(o.x + i, o.y + j)] = 1;
      nodes.push({ id: nodes.length + 1, kind, res: RESOURCE[kind], tx: o.x, ty: o.y, w: size, h: size, amount: AMOUNT[kind] });
    }
  }

  // Dirt patches are decoration only.
  for (let n = 0; n < 60; n++) {
    const x = rand(0, MAP_SIZE - 1);
    const y = rand(0, MAP_SIZE - 1);
    if (terrain[idx(x, y)] === GRASS && !taken[idx(x, y)]) terrain[idx(x, y)] = DIRT;
  }

  return { terrain, nodes };
}
