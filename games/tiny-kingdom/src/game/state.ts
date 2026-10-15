import { byDifficulty } from '../../../../shared/settings';
import { DECREE_BONUS, decreeFor, decreeMarks, type Decree } from './decree';
import { GIFT_INFO, giftsFor, newSpecial, type Gift } from './gifts';
import type { Kingdom, Mode } from './islands';
import { seasonBonus, seasonFor, type Season } from './seasons';
import { AROUND, BUILDINGS, SIDES, SPECIALS, isBuilding, isHome, randomIsland, startingGrid, type Building, type Cell, type Special } from './tiles';

// The rules in plain TypeScript, with no Phaser. The score is the whole board's score plus the
// bonuses won (decrees and seasons): each building's points depend on its neighbours, so a
// placement can also raise the buildings next to it.

export type Pouch = Record<Building, number>;

export interface GameState {
  round: number;
  /** The score that ends this round and brings the next round's tiles and a gift. */
  goal: number;
  /** `boardScore(grid)` plus `bonus`. */
  score: number;
  /** Points won from fulfilled decrees and from seasons' doubled buildings. */
  bonus: number;
  /** Tiles left to place. */
  pouch: Pouch;
  /** The building the next tap places, if any. */
  selected: Building | null;
  /** Which island this kingdom is built on; `islandMap` lays it out. */
  island: number;
  /** How the island was chosen: at random, typed in, the island of the day or a campaign level. */
  mode: Mode;
  /** The campaign level being played (1 and up), or 0 outside the campaign. */
  level: number;
  /** The island of the day's date (YYYY-MM-DD), or '' for any other kingdom. */
  day: string;
  /** The board by row, then column. */
  grid: Cell[][];
  placed: number;
  /** 'gift' while a reached goal's gift waits to be chosen; nothing can be placed then. */
  phase: 'playing' | 'gift' | 'over';
  /** The best final score of any finished game, saved in the browser. */
  best: number;
  /** Crowns won from decrees, in every kingdom so far; saved in the browser. */
  crowns: number;
  /** This round's royal decree, or null when no side goal fits the board. */
  decree: Decree | null;
  /** The two gifts on offer for reaching `goal` (or, in the 'gift' phase, the goal just reached). */
  gifts: [Gift, Gift];
  /** Gifts still to choose: one per goal reached. */
  giftsDue: number;
  /** The gift buildings won so far, in the order they were won; each adds a tile button. */
  unlocked: Special[];
  /** The board as it was before the last placement, if that placement can be undone. */
  undo: Snapshot | null;
  /** The round in which the undo was last used; 0 if none yet. One undo per round. */
  undoneIn: number;
}

/** What `undo` puts back: everything a placement or merge changes, as it stood before it. */
export interface Snapshot {
  grid: Cell[][];
  pouch: Pouch;
  score: number;
  bonus: number;
  selected: Building | null;
  placed: number;
}

/** The first round's tiles. */
export const FIRST_POUCH: Pouch = { farm: 4, house: 4, tower: 2, windmill: 0, market: 0, harbor: 0, lumber: 0 };
/** The tiles each later round adds to whatever is left. */
export const ROUND_POUCH: Pouch = { farm: 3, house: 3, tower: 2, windmill: 0, market: 0, harbor: 0, lumber: 0 };

/**
 * The score that ends round `round`: 20, 45, 75, 110, ... (each round asks 5 more than the last),
 * a fifth lower on Easy and a fifth higher on Hard.
 */
export const goalFor = (round: number) => Math.round(((5 * round * round + 35 * round) / 2) * byDifficulty(0.8, 1, 1.2));

/** The season of the round being played. */
export const season = (s: GameState): Season => seasonFor(s.round);

/** A new kingdom on island `island` (a random one unless given), chosen as `kingdom` says. */
export function newGame(best = 0, crowns = 0, island = randomIsland(), kingdom: Kingdom = { mode: 'random' }): GameState {
  const grid = startingGrid(island);
  return {
    round: 1,
    goal: goalFor(1),
    score: 0,
    bonus: 0,
    pouch: { ...FIRST_POUCH },
    selected: null,
    island,
    mode: kingdom.mode,
    level: kingdom.level ?? 0,
    day: kingdom.day ?? '',
    grid,
    placed: 0,
    phase: 'playing',
    best,
    crowns,
    decree: decreeFor(island, 1, grid),
    gifts: giftsFor(island, 1, []),
    giftsDue: 0,
    unlocked: [],
    undo: null,
    undoneIn: 0,
  };
}

/** One neighbour's share of a building's points. */
export interface Share {
  col: number;
  row: number;
  pts: number;
}

/**
 * What the building at (col, row) is worth, split into a base and each neighbour's share; empty
 * for land. `cellScore` is their sum, so the hover's neighbour links always add up.
 */
export function cellParts(grid: Cell[][], col: number, row: number): { base: number; from: Share[] } {
  const cell = grid[row][col];
  const from: Share[] = [];
  /** Adds `pts` from each cell in `dirs` that `count` accepts. */
  const add = (dirs: readonly (readonly [number, number])[], count: (c: Cell) => number) => {
    for (const [dc, dr] of dirs) {
      const c = grid[row + dr]?.[col + dc];
      const pts = c === undefined ? 0 : count(c);
      if (pts) from.push({ col: col + dc, row: row + dr, pts });
    }
  };
  switch (cell) {
    case 'farm':
      add(SIDES, (c) => (c === 'lake' || c === 'windmill' ? 1 : 0));
      return { base: 1, from };
    case 'house':
      add(SIDES, (c) => (c === 'farm' ? 2 : isHome(c) || c === 'forest' || c === 'lumber' ? 1 : 0));
      return { base: 0, from };
    case 'manor':
      add(SIDES, (c) => (c === 'farm' ? 3 : isHome(c) || c === 'forest' ? 1 : 0));
      return { base: 4, from };
    case 'tower':
      if (SIDES.some(([dc, dr]) => grid[row + dr]?.[col + dc] === 'tower')) return { base: 0, from };
      add(AROUND, (c) => (isHome(c) ? 2 : 0));
      return { base: 0, from };
    case 'windmill':
      add(AROUND, (c) => (c === 'farm' ? 1 : 0));
      return { base: 0, from };
    case 'market': {
      // +1 for each kind of building around it, credited to the first one of that kind.
      const seen = new Set<Cell>();
      add(AROUND, (c) => (isBuilding(c) && !seen.has(c) ? (seen.add(c), 1) : 0));
      return { base: 0, from };
    }
    case 'harbor':
      add(SIDES, (c) => (c === 'lake' ? 2 : isHome(c) ? 1 : 0));
      return { base: 0, from };
    case 'lumber':
      add(SIDES, (c) => (c === 'forest' ? 2 : 0));
      return { base: 0, from };
    default:
      return { base: 0, from };
  }
}

/** What the building at (col, row) is worth where it stands; 0 for land. */
export function cellScore(grid: Cell[][], col: number, row: number) {
  const { base, from } = cellParts(grid, col, row);
  return from.reduce((t, s) => t + s.pts, base);
}

export function boardScore(grid: Cell[][]) {
  let total = 0;
  grid.forEach((cells, row) => cells.forEach((_, col) => (total += cellScore(grid, col, row))));
  return total;
}

const beside = (grid: Cell[][], col: number, row: number, cell: Cell) => SIDES.some(([dc, dr]) => grid[row + dr]?.[col + dc] === cell);

/**
 * Whether `kind` can go at (col, row): on grass while playing, a harbor only on a lake's shore and
 * a lumber camp only beside a forest. Without a kind, whether anything could go there.
 */
export function canPlace(s: GameState, col: number, row: number, kind: Building | null = null) {
  if (s.phase !== 'playing' || s.grid[row]?.[col] !== 'grass') return false;
  if (kind === 'harbor') return beside(s.grid, col, row, 'lake');
  if (kind === 'lumber') return beside(s.grid, col, row, 'forest');
  return true;
}

/** What placing a building would bring: points in all, its own base, each neighbour's share and the season's bonus. */
export interface Preview {
  gained: number;
  base: number;
  /** One link per neighbour whose share is not 0: what it adds to the new building plus what it gains itself. */
  links: Share[];
  /** What the season adds for this building, 0 if the season does not double it. */
  season: number;
}

/** What placing `kind` at (col, row) would add to the score, split by neighbour, or null where it can't go. */
export function previewPlacement(s: GameState, kind: Building, col: number, row: number): Preview | null {
  if (!canPlace(s, col, row, kind) || s.pouch[kind] <= 0) return null;
  const grid = s.grid.map((cells) => [...cells]);
  grid[row][col] = kind;
  const own = cellParts(grid, col, row);
  const shares = new Map<string, Share>();
  const give = (c: number, r: number, pts: number) => {
    const k = `${c},${r}`;
    const share = shares.get(k) ?? { col: c, row: r, pts: 0 };
    share.pts += pts;
    shares.set(k, share);
  };
  for (const f of own.from) give(f.col, f.row, f.pts);
  // Only the eight cells around can change worth, as no rule reaches further.
  for (const [dc, dr] of AROUND) {
    const c = col + dc;
    const r = row + dr;
    if (!grid[r]?.[c] || !isBuilding(grid[r][c])) continue;
    const change = cellScore(grid, c, r) - cellScore(s.grid, c, r);
    if (change) give(c, r, change);
  }
  const links = [...shares.values()].filter((l) => l.pts !== 0);
  const bonus = seasonBonus(season(s), kind, cellScore(grid, col, row));
  return { gained: boardScore(grid) - boardScore(s.grid) + bonus, base: own.base, links, season: bonus };
}

/** What placing `kind` at (col, row) would add to the score, or null where it can't go. */
export function previewScore(s: GameState, kind: Building, col: number, row: number) {
  return previewPlacement(s, kind, col, row)?.gained ?? null;
}

export function select(s: GameState, kind: Building) {
  if (s.phase !== 'playing' || s.pouch[kind] <= 0) return false;
  s.selected = kind;
  return true;
}

export interface Placed {
  /** Points gained, in all, the decree's and the season's bonus included. */
  gained: number;
  /** What each building whose worth changed gained (the new one with the season's bonus); a merged-away house shows its loss. */
  changes: { col: number; row: number; gained: number }[];
  /** True when the placement fulfilled the round's decree. */
  decree: boolean;
  /** True when the placement reached the goal: a new round began and a gift waits. */
  newRound: boolean;
  /** What the season added. */
  season: number;
}

/** Whether the last placement can be taken back: once per round, and not one that began a round or fulfilled a decree. */
export const canUndo = (s: GameState) => s.phase === 'playing' && s.undo !== null && s.undoneIn !== s.round;

/** Takes back the last placement or merge, once per round. Returns false if that is not allowed now. */
export function undo(s: GameState) {
  if (!s.undo || !canUndo(s)) return false;
  Object.assign(s, s.undo, { undo: null, undoneIn: s.round });
  return true;
}

/** Whether any tile left in the pouch has somewhere to go. */
export function anyPlace(s: GameState) {
  return BUILDINGS.some((b) => s.pouch[b] > 0 && s.grid.some((cells, row) => cells.some((_, col) => canPlace(s, col, row, b))));
}

/** Ends the kingdom when no tiles are left, or none can go anywhere and no merge would make room. */
function checkEnd(s: GameState) {
  const tilesLeft = BUILDINGS.some((b) => s.pouch[b] > 0);
  if (!tilesLeft || (!anyPlace(s) && !anyMerge(s))) {
    s.phase = 'over';
    s.best = Math.max(s.best, s.score);
  }
}

/**
 * Ends the kingdom by the player's choice when no tile has room left but two houses could still
 * merge to make some. Returns false while a tile can still be placed.
 */
export function finish(s: GameState) {
  if (s.phase !== 'playing' || anyPlace(s)) return false;
  s.phase = 'over';
  s.best = Math.max(s.best, s.score);
  return true;
}

const snapshot = (s: GameState): Snapshot => ({
  grid: s.grid.map((cells) => [...cells]),
  pouch: { ...s.pouch },
  score: s.score,
  bonus: s.bonus,
  selected: s.selected,
  placed: s.placed,
});

/**
 * Settles a change already made to the grid: popups, the season's bonus, the decree, rounds, undo
 * and the end. `prior` is the state before the change and `at` the cell that was built on.
 */
function settle(s: GameState, prior: Snapshot, at: { col: number; row: number }, seasonal: number): Placed {
  const changes: Placed['changes'] = [];
  s.grid.forEach((cells, r) =>
    cells.forEach((cell, c) => {
      const main = c === at.col && r === at.row;
      const gained = cellScore(s.grid, c, r) - cellScore(prior.grid, c, r) + (main ? seasonal : 0);
      if ((isBuilding(cell) || isBuilding(prior.grid[r][c])) && (gained !== 0 || main)) changes.push({ col: c, row: r, gained });
    }),
  );
  s.bonus += seasonal;

  // The decree pays once, the first time the board fulfils it.
  let decree = false;
  if (s.decree && !s.decree.done && decreeMarks(s.grid, s.decree).have >= s.decree.need) {
    s.decree.done = true;
    s.bonus += DECREE_BONUS;
    s.crowns++;
    decree = true;
  }
  const score = boardScore(s.grid) + s.bonus;
  const gained = score - s.score;
  s.score = score;

  let newRound = false;
  while (s.score >= s.goal) {
    s.round++;
    s.goal = goalFor(s.round);
    for (const b of BUILDINGS) s.pouch[b] += ROUND_POUCH[b];
    s.giftsDue++;
    newRound = true;
  }
  if (newRound) {
    s.decree = decreeFor(s.island, s.round, s.grid, s.decree);
    s.phase = 'gift';
  }
  // A change that began a round or won a crown is kept: undoing it would hand back what was paid.
  s.undo = newRound || decree ? null : prior;
  if (!s.selected || s.pouch[s.selected] <= 0) s.selected = BUILDINGS.find((b) => s.pouch[b] > 0) ?? null;
  // A goal reached carries on to its gift, even with the pouch empty, unless the island is full.
  if (s.phase === 'gift' && !s.grid.some((cells) => cells.includes('grass'))) s.giftsDue = 0;
  if (s.phase === 'playing' || s.giftsDue === 0) checkEnd(s);
  return { gained, changes, decree, newRound, season: seasonal };
}

/** Places the selected building at (col, row); null if it can't go there. */
export function place(s: GameState, col: number, row: number): Placed | null {
  const kind = s.selected;
  if (!kind || !canPlace(s, col, row, kind) || s.pouch[kind] <= 0) return null;
  const prior = snapshot(s);
  s.grid[row][col] = kind;
  s.pouch[kind]--;
  s.placed++;
  return settle(s, prior, { col, row }, seasonBonus(season(s), kind, cellScore(s.grid, col, row)));
}

/** Whether the house at `from` can merge into the house beside it at `to`. */
export function canMerge(s: GameState, from: { col: number; row: number }, to: { col: number; row: number }) {
  if (s.phase !== 'playing' || s.grid[from.row]?.[from.col] !== 'house' || s.grid[to.row]?.[to.col] !== 'house') return false;
  return Math.abs(from.col - to.col) + Math.abs(from.row - to.row) === 1;
}

/** Whether the house at (col, row) has a house beside it to merge with. */
export const mergeable = (s: GameState, col: number, row: number) =>
  SIDES.some(([dc, dr]) => canMerge(s, { col, row }, { col: col + dc, row: row + dr }));

/** Whether any two houses on the board could merge. */
const anyMerge = (s: GameState) => s.grid.some((cells, row) => cells.some((_, col) => mergeable(s, col, row)));

/** What merging the house at `from` into the one at `to` would add to the score (it can be negative), or null. */
export function previewMerge(s: GameState, from: { col: number; row: number }, to: { col: number; row: number }) {
  if (!canMerge(s, from, to)) return null;
  const grid = s.grid.map((cells) => [...cells]);
  grid[to.row][to.col] = 'manor';
  grid[from.row][from.col] = 'grass';
  return boardScore(grid) - boardScore(s.grid);
}

/**
 * Merges the house at `from` into the house beside it at `to`: `to` becomes a manor and `from`
 * is grass again, free to build on. It takes no tile and counts like a placement for the decree,
 * the goal and the undo. Null if the two can't merge.
 */
export function merge(s: GameState, from: { col: number; row: number }, to: { col: number; row: number }): Placed | null {
  if (!canMerge(s, from, to)) return null;
  const prior = snapshot(s);
  s.grid[to.row][to.col] = 'manor';
  s.grid[from.row][from.col] = 'grass';
  return settle(s, prior, to, 0);
}

/** Takes one of the gifts on offer while one is due. Returns false if that is not allowed now. */
export function chooseGift(s: GameState, gift: Gift) {
  if (s.phase !== 'gift' || s.giftsDue <= 0 || !s.gifts.includes(gift)) return false;
  const tiles = GIFT_INFO[gift].tiles;
  for (const b of BUILDINGS) s.pouch[b] += tiles[b] ?? 0;
  const won = newSpecial(gift);
  if (won && !s.unlocked.includes(won)) s.unlocked.push(won);
  s.giftsDue--;
  // The next offer is for the goal ahead (or the next one still due).
  s.gifts = giftsFor(s.island, s.round - s.giftsDue, s.unlocked);
  if (s.giftsDue === 0) {
    s.phase = 'playing';
    if (!s.selected || s.pouch[s.selected] <= 0) s.selected = BUILDINGS.find((b) => s.pouch[b] > 0) ?? null;
    checkEnd(s);
  }
  return true;
}

/** The buildings with a tile button: the first three, then the gift buildings in the order they were won. */
export const shownKinds = (s: GameState): Building[] => [...BUILDINGS.filter((b) => !(SPECIALS as readonly Building[]).includes(b)), ...s.unlocked];
