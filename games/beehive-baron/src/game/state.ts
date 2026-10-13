import type { UpgradeId } from './upgrades';

/** The comb's spots for cells: a hex grid of 5 x 4, numbered row by row from the top left. */
export const GRID = { cols: 5, rows: 4 };
export const SLOTS = GRID.cols * GRID.rows;
/** How many drops of nectar fill a cell, and how long a full cell takes to ripen into honey. */
export const CELL_CAP = 4;
export const RIPEN_MS = 2500;
/** How long a forager's trip to the flowers and back takes, before any clover. */
export const TRIP_MS = 3000;
/** Each jar of honey sells for this many coins. */
export const HONEY_PRICE = 15;
/** A new hive starts with this many bees, and can hold up to `MAX_BEES`. */
export const START_BEES = 2;
export const MAX_BEES = 12;
/** How many flowers the bees can fly to. */
export const FLOWERS = 6;

/** One comb cell: filling with nectar, ripening once full, then capped honey ready to harvest. */
export interface Cell {
  nectar: number;
  phase: 'filling' | 'ripening' | 'capped';
  /** Time left until a ripening cell is capped. */
  ripenMs: number;
}

export interface Bee {
  id: number;
  /** Time left on the current trip; 0 while the bee is home. */
  tripMs: number;
  /** The whole trip's length, to know how far along it is. */
  trip: number;
  /** The flower it flies to. */
  flower: number;
}

export interface GameState {
  coins: number;
  /** The cell on each spot of the comb, or null where none is built yet. */
  cells: (Cell | null)[];
  bees: Bee[];
  /** Jars of honey harvested and not sold yet. */
  jars: number;
  /** Jars sold so far, and drops of nectar that came home to a full comb. */
  sold: number;
  spilled: number;
  ranks: Record<UpgradeId, number>;
  nextId: number;
  /** Things that just happened, for the scene to animate; it empties the list as it draws them. */
  events: GameEvent[];
}

export type GameEvent =
  | { kind: 'built'; slot: number }
  | { kind: 'nectar'; slot: number }
  | { kind: 'capped'; slot: number }
  | { kind: 'harvested'; slot: number }
  | { kind: 'spilled'; drops: number }
  | { kind: 'sold'; jars: number; coins: number }
  | { kind: 'bee'; id: number };

/** What is kept between visits: the comb, the coins, the bees and the upgrades. */
export interface Progress {
  coins: number;
  cells: (Cell | null)[];
  bees: number;
  jars: number;
  sold: number;
  ranks: Record<UpgradeId, number>;
}

export const freshProgress = (): Progress => ({
  coins: 0,
  cells: new Array(SLOTS).fill(null),
  bees: START_BEES,
  jars: 0,
  sold: 0,
  ranks: { baskets: 0, clover: 0, dance: 0 },
});

/** A saved cell, checked, or null if it is not a valid one. */
function cellOf(saved: unknown): Cell | null {
  if (!saved || typeof saved !== 'object') return null;
  const c = saved as Partial<Cell>;
  const nectar = typeof c.nectar === 'number' ? Math.max(0, Math.min(CELL_CAP, Math.floor(c.nectar))) : 0;
  const phase = c.phase === 'ripening' || c.phase === 'capped' ? c.phase : 'filling';
  const ripenMs = phase === 'ripening' && typeof c.ripenMs === 'number' ? Math.max(0, Math.min(RIPEN_MS, c.ripenMs)) : 0;
  return { nectar: phase === 'filling' ? nectar : CELL_CAP, phase, ripenMs };
}

export function newHive(progress: Progress): GameState {
  const count = Math.max(START_BEES, Math.min(MAX_BEES, Math.floor(progress.bees) || START_BEES));
  return {
    coins: progress.coins,
    cells: new Array(SLOTS).fill(null).map((_, i) => cellOf(progress.cells[i])),
    bees: [...Array(count).keys()].map((i) => ({ id: i + 1, tripMs: 0, trip: 0, flower: 0 })),
    jars: progress.jars,
    sold: progress.sold,
    spilled: 0,
    ranks: { ...progress.ranks },
    nextId: count + 1,
    events: [],
  };
}

export const progressOf = (s: GameState): Progress => ({
  coins: s.coins,
  cells: s.cells.map((c) => (c ? { ...c } : null)),
  bees: s.bees.length,
  jars: s.jars,
  sold: s.sold,
  ranks: { ...s.ranks },
});

/** How many drops each forager brings home. */
export const carry = (s: GameState) => 1 + s.ranks.baskets;
/** The price of the next comb cell: the first is free, then each costs more. */
export const cellPrice = (s: GameState) => {
  const built = s.cells.filter((c) => c !== null).length;
  return built === 0 ? 0 : Math.round(12 * Math.pow(1.25, built - 1));
};
/** The price of the next bee, or null once the hive is full. */
export const beePrice = (s: GameState) => (s.bees.length >= MAX_BEES ? null : Math.round(25 * Math.pow(1.5, s.bees.length - START_BEES)));
/** Drops of nectar the comb can still take. */
export const room = (s: GameState) => s.cells.reduce((n, c) => n + (c?.phase === 'filling' ? CELL_CAP - c.nectar : 0), 0);
