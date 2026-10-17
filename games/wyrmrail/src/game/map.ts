// The valley the line is built in: a grid of terrain tiles, the Roost where the wyrm sleeps and
// the villages that join the line round by round. Every game makes a new valley with
// `generateValley`. Screen positions are in src/scenes/layout.ts.

import type { TextKey } from '../i18n';

export const COLS = 12;
export const ROWS = 7;

export type Terrain = 'grass' | 'forest' | 'river' | 'mountain';

/** What a piece of track costs on each terrain; a river needs a bridge and a mountain a tunnel (WR12). */
export const TRACK_COST: Record<Terrain, number> = { grass: 2, forest: 4, river: 6, mountain: 20 };

/** Goods a village sends, and the better goods its workshops make from them. */
export type Cargo = 'grain' | 'tools' | 'timber' | 'ore' | 'fish' | 'flour' | 'planks' | 'iron' | 'passengers';

export interface Tile {
  c: number;
  r: number;
}

export interface Village extends Tile {
  name: string;
  /** What the village sends down the line. */
  cargo: Cargo;
  /** The round it joins the line in. */
  round: number;
}

/** A valley: its terrain, row by row, and where each village stands in it. */
export interface Valley {
  terrain: Terrain[][];
  villages: Village[];
}

/** Where the wyrm sleeps, and starts from. */
export const ROOST: Tile = { c: 1, r: 3 };

/**
 * The villages, in the order they join the line. The first two always stand where the first round
 * expects them; the others get a place in each new valley.
 */
const VILLAGE_LIST: (Omit<Village, 'c' | 'r'> & Partial<Tile>)[] = [
  { name: 'Millbrook', cargo: 'grain', c: 4, r: 1, round: 1 },
  { name: 'Ashford', cargo: 'tools', c: 4, r: 5, round: 1 },
  { name: 'Fernhollow', cargo: 'timber', round: 2 },
  { name: 'Stonereach', cargo: 'ore', round: 3 },
  { name: 'Saltmere', cargo: 'fish', round: 4 },
  { name: 'Brackenly', cargo: 'timber', round: 5 },
  { name: 'Dunmoor', cargo: 'grain', round: 6 },
  { name: 'Wyndle', cargo: 'fish', round: 7 },
  { name: 'Kettlecross', cargo: 'tools', round: 8 },
];
export const VILLAGE_NAMES = VILLAGE_LIST.map((v) => v.name);

/** Villages with a workshop: it turns one cargo brought to it into a better one, which it sends on. */
export const WORKSHOPS: Record<string, { kind: string; takes: Cargo; makes: Cargo }> = {
  Ashford: { kind: 'forge', takes: 'ore', makes: 'iron' },
  Fernhollow: { kind: 'mill', takes: 'grain', makes: 'flour' },
  Stonereach: { kind: 'sawmill', takes: 'timber', makes: 'planks' },
};

/** Each cargo's name (on an order card) and the same word inside a sentence, as keys of `i18n/en.ts`. */
export const CARGO_NAMES: Record<Cargo, { name: TextKey; lower: TextKey }> = {
  grain: { name: 'grain', lower: 'grainLower' },
  tools: { name: 'tools', lower: 'toolsLower' },
  timber: { name: 'timber', lower: 'timberLower' },
  ore: { name: 'ore', lower: 'oreLower' },
  fish: { name: 'fish', lower: 'fishLower' },
  flour: { name: 'flour', lower: 'flourLower' },
  planks: { name: 'planks', lower: 'planksLower' },
  iron: { name: 'iron', lower: 'ironLower' },
  passengers: { name: 'passengers', lower: 'passengersLower' },
};

export const key = (t: Tile) => `${t.c},${t.r}`;
export const sameTile = (a: Tile, b: Tile) => a.c === b.c && a.r === b.r;
export const manhattan = (a: Tile, b: Tile) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
/** The tile across `t` from `n`, the straight way on. */
export const opposite = (t: Tile, n: Tile): Tile => ({ c: 2 * t.c - n.c, r: 2 * t.r - n.r });
export const inGrid = (t: Tile) => t.c >= 0 && t.r >= 0 && t.c < COLS && t.r < ROWS;

/** The four tiles next to `t` that are on the grid. */
export function neighbours(t: Tile): Tile[] {
  return [
    { c: t.c + 1, r: t.r },
    { c: t.c - 1, r: t.r },
    { c: t.c, r: t.r + 1 },
    { c: t.c, r: t.r - 1 },
  ].filter(inGrid);
}

export const terrainAt = (valley: Valley, t: Tile) => valley.terrain[t.r][t.c];

/** The first round's ground, between the Roost and the first two villages: always open grass. */
const isHome = (t: Tile) => t.c >= 2 && t.c <= 4 && t.r >= 1 && t.r <= 5;

/**
 * A new valley, picked with `rand` (Math.random in the game): a river winding down the middle
 * that the line has to bridge, a few mountains in the east, scattered forest, and a place for each
 * village that joins after the first round, spread apart and all reachable from the Roost.
 */
export function generateValley(rand: () => number = Math.random): Valley {
  for (;;) {
    const valley = tryValley(rand);
    if (valley) return valley;
  }
}

function tryValley(rand: () => number): Valley | null {
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const terrain: Terrain[][] = Array.from({ length: ROWS }, () => Array<Terrain>(COLS).fill('grass'));
  // The river: one tile a row, stepping a column east or west now and then, between columns 6 and 8.
  let rc = 6 + Math.floor(rand() * 2);
  for (let r = 0; r < ROWS; r++) {
    terrain[r][rc] = 'river';
    const next = Math.min(8, Math.max(6, rc + pick([-1, 0, 0, 1])));
    if (r < ROWS - 1 && next !== rc) {
      // A bend: the river runs along the row before it turns down again.
      terrain[r][next] = 'river';
      rc = next;
    }
  }
  const all: Tile[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) all.push({ c, r });
  const free = (t: Tile) => terrain[t.r][t.c] === 'grass' && !isHome(t) && !sameTile(t, ROOST);
  // Mountains east of the river, and forest anywhere off the first round's ground.
  const mountains = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < mountains; i++) {
    const t = pick(all.filter((t) => t.c >= 8 && free(t)));
    terrain[t.r][t.c] = 'mountain';
  }
  const forests = 9 + Math.floor(rand() * 5);
  for (let i = 0; i < forests; i++) {
    const t = pick(all.filter(free));
    terrain[t.r][t.c] = 'forest';
  }
  // The villages that join later: on land, three or more tiles from the Roost and every other village.
  const villages: Village[] = [];
  for (const v of VILLAGE_LIST) {
    if (v.c !== undefined && v.r !== undefined) {
      villages.push({ ...v, c: v.c, r: v.r });
      continue;
    }
    const spots = all.filter(
      (t) =>
        !isHome(t) &&
        (terrain[t.r][t.c] === 'grass' || terrain[t.r][t.c] === 'forest') &&
        manhattan(t, ROOST) >= 3 &&
        villages.every((o) => manhattan(t, o) >= 3),
    );
    if (!spots.length) return null;
    const t = pick(spots);
    terrain[t.r][t.c] = 'grass';
    villages.push({ ...v, c: t.c, r: t.r });
  }
  // Every village must be reachable from the Roost around the mountains.
  const seen = new Set([key(ROOST)]);
  const queue = [ROOST];
  while (queue.length) {
    for (const n of neighbours(queue.shift()!)) {
      if (seen.has(key(n)) || terrain[n.r][n.c] === 'mountain') continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return villages.every((v) => seen.has(key(v))) ? { terrain, villages } : null;
}
