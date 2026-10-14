// The buildings and the land they go on. How each building scores is in state.ts.

/** Every building, in the order of the panel's tile buttons. The windmill is a gift: its button shows once it is won. */
export const BUILDINGS = ['farm', 'house', 'tower', 'windmill'] as const;
export type Building = (typeof BUILDINGS)[number];
export type Terrain = 'grass' | 'lake' | 'forest';
export type Cell = Terrain | Building;

export interface BuildingInfo {
  name: string;
  /** The rule in a sentence, shown on the tile's button. */
  rule: string;
}

export const INFO: Record<Building, BuildingInfo> = {
  farm: { name: 'Farm', rule: '1 point, +1 per lake beside it' },
  house: { name: 'House', rule: '+2 per farm, +1 per house or forest beside it' },
  tower: { name: 'Tower', rule: '+2 per house around it, 0 next to a tower' },
  windmill: { name: 'Windmill', rule: '+1 per farm around it, and +1 to each farm beside it' },
};

export const isBuilding = (cell: Cell): cell is Building => (BUILDINGS as readonly string[]).includes(cell);

/** The island's size in cells; GRID in src/scenes/layout.ts must match. */
export const MAP_SIZE = { cols: 10, rows: 7 };
/** The highest island number; each kingdom draws one from 1 to this. */
export const ISLANDS = 9999;

/** The four cells sharing an edge, as [dcol, drow]. */
export const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
/** The eight cells around a cell. */
export const AROUND = [...SIDES, [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

/**
 * Lays out island number `island`, one string per row and one character per cell: '.' grass,
 * '~' lake, 'T' forest. The same number always gives the same island. Buildings only go on grass.
 */
export function islandMap(island: number): string[] {
  const rand = seeded(island);
  const int = (n: number) => Math.floor(rand() * n);
  const { cols, rows } = MAP_SIZE;
  const map = Array.from({ length: rows }, () => Array<string>(cols).fill('.'));
  /** Grows a patch of `size` cells of `char` from a random grass cell, one random side at a time. */
  const patch = (char: string, size: number) => {
    let col = int(cols);
    let row = int(rows);
    while (map[row][col] !== '.') [col, row] = [int(cols), int(rows)];
    const cells = [[col, row]];
    map[row][col] = char;
    for (let tries = 0; cells.length < size && tries < 50; tries++) {
      const [c, r] = cells[int(cells.length)];
      const [dc, dr] = SIDES[int(4)];
      if (map[r + dr]?.[c + dc] !== '.') continue;
      map[r + dr][c + dc] = char;
      cells.push([c + dc, r + dr]);
    }
  };
  // Two or three lakes of 2 to 4 cells, then two or three woods of 1 to 3, like the first island.
  for (let i = 2 + int(2); i > 0; i--) patch('~', 2 + int(3));
  for (let i = 2 + int(2); i > 0; i--) patch('T', 1 + int(3));
  return map.map((cells) => cells.join(''));
}

/** A small seeded random generator (mulberry32), so an island number always lays out the same. */
export function seeded(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks a random island number, from Math.random so the playthrough's seeded runs repeat. */
export const randomIsland = () => 1 + Math.floor(Math.random() * ISLANDS);

const TERRAIN: Record<string, Terrain> = { '.': 'grass', '~': 'lake', T: 'forest' };

export function startingGrid(island: number): Cell[][] {
  return islandMap(island).map((row) => [...row].map((c) => TERRAIN[c]));
}
