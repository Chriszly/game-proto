// The three buildings and the land they go on. How each building scores is in state.ts.

export const BUILDINGS = ['farm', 'house', 'tower'] as const;
export type Building = (typeof BUILDINGS)[number];
export type Terrain = 'grass' | 'lake' | 'forest';
export type Cell = Terrain | Building;

export interface BuildingInfo {
  name: string;
  /** The rule in a sentence, shown on the tile's button. */
  rule: string;
}

export const INFO: Record<Building, BuildingInfo> = {
  farm: { name: 'Farm', rule: '1, +1 per lake beside it' },
  house: { name: 'House', rule: '+2 per farm, +1 per house or forest beside it' },
  tower: { name: 'Tower', rule: '+2 per house around it, 0 beside another tower' },
};

export const isBuilding = (cell: Cell): cell is Building => (BUILDINGS as readonly string[]).includes(cell);

/**
 * The island every kingdom starts on, one character per cell: '.' grass, '~' lake, 'T' forest.
 * Buildings only go on grass.
 */
export const MAP = [
  'TT......~~',
  'T........~',
  '...~......',
  '...~~...T.',
  '.......TT.',
  '~.........',
  '~~...T....',
];

const TERRAIN: Record<string, Terrain> = { '.': 'grass', '~': 'lake', T: 'forest' };

export function startingGrid(): Cell[][] {
  return MAP.map((row) => [...row].map((c) => TERRAIN[c]));
}
