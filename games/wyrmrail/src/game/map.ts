// The valley the line is built in: a grid of terrain tiles, the Roost where the wyrm sleeps and
// the villages that join the line round by round. Screen positions are in src/scenes/layout.ts.

export const COLS = 12;
export const ROWS = 7;

export type Terrain = 'grass' | 'forest' | 'river' | 'mountain';

/** One character per tile: '.' grass, 'f' forest, '~' river, '^' mountain (no track). */
const TERRAIN_ROWS = [
  'ff...f~..^^.',
  'f.....~.....',
  '......~.f...',
  '.....f~.ff..',
  '..f...~..^..',
  '.ff...~..^..',
  '......~..^^.',
];

const TERRAIN_OF: Record<string, Terrain> = { '.': 'grass', f: 'forest', '~': 'river', '^': 'mountain' };

export function terrainAt(c: number, r: number): Terrain {
  return TERRAIN_OF[TERRAIN_ROWS[r][c]];
}

/** What a piece of track costs on each terrain; a river needs a bridge. Mountains can't be built on. */
export const TRACK_COST: Record<Exclude<Terrain, 'mountain'>, number> = { grass: 2, forest: 4, river: 6 };

export type Cargo = 'grain' | 'tools' | 'timber' | 'ore' | 'fish';

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

/** Where the wyrm sleeps, and starts from. */
export const ROOST: Tile = { c: 1, r: 3 };

export const VILLAGES: readonly Village[] = [
  { name: 'Millbrook', cargo: 'grain', c: 4, r: 1, round: 1 },
  { name: 'Ashford', cargo: 'tools', c: 4, r: 5, round: 1 },
  { name: 'Fernhollow', cargo: 'timber', c: 8, r: 1, round: 2 },
  { name: 'Stonereach', cargo: 'ore', c: 10, r: 5, round: 3 },
  { name: 'Saltmere', cargo: 'fish', c: 11, r: 2, round: 4 },
];

export const CARGO_NAMES: Record<Cargo, string> = { grain: 'Grain', tools: 'Tools', timber: 'Timber', ore: 'Ore', fish: 'Fish' };

export const key = (t: Tile) => `${t.c},${t.r}`;
export const sameTile = (a: Tile, b: Tile) => a.c === b.c && a.r === b.r;
export const manhattan = (a: Tile, b: Tile) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
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
