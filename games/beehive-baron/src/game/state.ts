import { MEADOWS, SUNFLOWER_COINS } from './meadows';
import type { UpgradeId } from './upgrades';

/** The comb's spots for cells: a hex grid of 5 x 4, numbered row by row from the top left. */
export const GRID = { cols: 5, rows: 4 };
export const SLOTS = GRID.cols * GRID.rows;
/** How many drops of nectar fill a cell, and how long a full cell takes to ripen into honey. */
export const CELL_CAP = 4;
export const RIPEN_MS = 2500;
/** How long a forager's trip to the flowers and back takes, before any clover. */
export const TRIP_MS = 3000;
/** Each jar of honey sells for this many coins, before the comb bonus and the Sunflower Ridge. */
export const HONEY_PRICE = 15;
/** A new hive starts with this many bees, and can hold up to `MAX_BEES`. */
export const START_BEES = 2;
export const MAX_BEES = 12;
/** How many flowers the bees can fly to. */
export const FLOWERS = 6;
/**
 * Nectar gathered while the page is closed: each bee brings one drop per `AWAY_MS_PER_DROP` away,
 * up to `AWAY_CAP` drops a visit (and never more than the filling cells have room for).
 */
export const AWAY_MS_PER_DROP = 30_000;
export const AWAY_CAP = 20;

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
  /** How many meadows of `MEADOWS` are unlocked, in order; each goal reached unlocks the next. */
  meadows: number;
  nextId: number;
  /** Things that just happened, for the scene to animate; it empties the list as it draws them. */
  events: GameEvent[];
}

export type GameEvent =
  | { kind: 'built'; slot: number; touching: number }
  | { kind: 'nectar'; slot: number }
  | { kind: 'capped'; slot: number }
  | { kind: 'harvested'; slot: number }
  | { kind: 'spilled'; drops: number }
  | { kind: 'sold'; jars: number; coins: number }
  | { kind: 'bee'; id: number }
  | { kind: 'unlocked'; meadow: number };

/** What is kept between visits: the comb, the coins, the bees, the upgrades and the meadows. */
export interface Progress {
  coins: number;
  cells: (Cell | null)[];
  bees: number;
  jars: number;
  sold: number;
  ranks: Record<UpgradeId, number>;
  meadows: number;
  /** When the hive was last seen (`Date.now()`), for the nectar gathered while away; 0 if never. */
  seen: number;
}

export const freshProgress = (): Progress => ({
  coins: 0,
  cells: new Array(SLOTS).fill(null),
  bees: START_BEES,
  jars: 0,
  sold: 0,
  ranks: { baskets: 0, clover: 0, dance: 0 },
  meadows: 0,
  seen: 0,
});

/** A saved cell, checked, or null if it is not a valid one. */
function cellOf(saved: unknown): Cell | null {
  if (!saved || typeof saved !== 'object') return null;
  const c = saved as Partial<Cell>;
  const nectar = typeof c.nectar === 'number' ? Math.max(0, Math.min(CELL_CAP, Math.floor(c.nectar))) : 0;
  let phase: Cell['phase'] = c.phase === 'ripening' || c.phase === 'capped' ? c.phase : 'filling';
  let ripenMs = phase === 'ripening' && typeof c.ripenMs === 'number' ? Math.max(0, Math.min(RIPEN_MS, c.ripenMs)) : 0;
  // A full cell still marked filling has no room left, so it starts ripening.
  if (phase === 'filling' && nectar >= CELL_CAP) [phase, ripenMs] = ['ripening', RIPEN_MS];
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
    meadows: Math.max(0, Math.min(MEADOWS.length, Math.floor(progress.meadows) || 0)),
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
  meadows: s.meadows,
  seen: Date.now(),
});

/** How many drops each forager brings home: one, plus the baskets, plus one with the Lavender Field. */
export const carry = (s: GameState) => 1 + s.ranks.baskets + (s.meadows >= 1 ? 1 : 0);
/** How long a full cell takes to ripen: half as long once the Heather Moor is unlocked. */
export const ripenTime = (s: GameState) => (s.meadows >= 3 ? RIPEN_MS / 2 : RIPEN_MS);
/** The price of the next comb cell: the first is free, then each costs more. */
export const cellPrice = (s: GameState) => {
  const built = s.cells.filter((c) => c !== null).length;
  return built === 0 ? 0 : Math.round(12 * Math.pow(1.25, built - 1));
};
/** The price of the next bee, or null once the hive is full. */
export const beePrice = (s: GameState) => (s.bees.length >= MAX_BEES ? null : Math.round(25 * Math.pow(1.5, s.bees.length - START_BEES)));
/** Drops of nectar the comb can still take. */
export const room = (s: GameState) => s.cells.reduce((n, c) => n + (c?.phase === 'filling' ? CELL_CAP - c.nectar : 0), 0);

/** The spots next to a spot on the comb (odd rows sit half a cell to the right). */
export function neighbours(slot: number) {
  const col = slot % GRID.cols;
  const row = Math.floor(slot / GRID.cols);
  const out: number[] = [];
  const add = (c: number, r: number) => {
    if (c >= 0 && c < GRID.cols && r >= 0 && r < GRID.rows) out.push(r * GRID.cols + c);
  };
  add(col - 1, row);
  add(col + 1, row);
  const shift = row % 2 ? [0, 1] : [-1, 0];
  for (const r of [row - 1, row + 1]) for (const k of shift) add(col + k, r);
  return out;
}
/** How many built cells a spot shares an edge with. */
export const touching = (s: GameState, slot: number) => neighbours(slot).filter((n) => s.cells[n] !== null).length;
/** Every edge two built cells share, as pairs of spots (lower spot first). */
export const sharedEdges = (s: GameState) =>
  s.cells.flatMap((c, a) => (c ? neighbours(a).filter((b) => b > a && s.cells[b] !== null).map((b) => [a, b] as const) : []));
/** The comb bonus: one coin more a jar for every edge two built cells share. */
export const combBonus = (s: GameState) => sharedEdges(s).length;
/** What one jar of honey sells for now: the base price, plus the Sunflower Ridge, plus the comb bonus. */
export const jarPrice = (s: GameState) => HONEY_PRICE + (s.meadows >= 2 ? SUNFLOWER_COINS : 0) + combBonus(s);
