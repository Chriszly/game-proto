import { byDifficulty } from '../../../../shared/settings';
import { BUILDINGS, isBuilding, randomIsland, startingGrid, type Building, type Cell } from './tiles';

// The rules in plain TypeScript, with no Phaser. The score is always the whole board's score:
// each building's points depend on its neighbours, so a placement can also raise the buildings
// next to it.

export type Pouch = Record<Building, number>;

export interface GameState {
  round: number;
  /** The score that ends this round and brings the next round's tiles. */
  goal: number;
  score: number;
  /** Tiles left to place. */
  pouch: Pouch;
  /** The building the next tap places, if any. */
  selected: Building | null;
  /** Which island this kingdom is built on; `islandMap` lays it out. */
  island: number;
  /** The board by row, then column. */
  grid: Cell[][];
  placed: number;
  phase: 'playing' | 'over';
  /** The best final score of any finished game, saved in the browser. */
  best: number;
  /** The board as it was before the last placement, if that placement can be undone. */
  undo: Snapshot | null;
  /** The round in which the undo was last used; 0 if none yet. One undo per round. */
  undoneIn: number;
}

/** What `undo` puts back: everything a placement changes, as it stood before it. */
export interface Snapshot {
  grid: Cell[][];
  pouch: Pouch;
  score: number;
  selected: Building | null;
  placed: number;
}

/** The first round's tiles. */
export const FIRST_POUCH: Pouch = { farm: 4, house: 4, tower: 2 };
/** The tiles each later round adds to whatever is left. */
export const ROUND_POUCH: Pouch = { farm: 3, house: 3, tower: 2 };

/**
 * The score that ends round `round`: 20, 45, 75, 110, ... (each round asks 5 more than the last),
 * a fifth lower on Easy and a fifth higher on Hard.
 */
export const goalFor = (round: number) => Math.round(((5 * round * round + 35 * round) / 2) * byDifficulty(0.8, 1, 1.2));

/** A new kingdom on island `island`, a random one unless given. */
export function newGame(best = 0, island = randomIsland()): GameState {
  return {
    round: 1,
    goal: goalFor(1),
    score: 0,
    pouch: { ...FIRST_POUCH },
    selected: null,
    island,
    grid: startingGrid(island),
    placed: 0,
    phase: 'playing',
    best,
    undo: null,
    undoneIn: 0,
  };
}

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const AROUND = [...SIDES, [1, 1], [1, -1], [-1, 1], [-1, -1]];

function neighbours(grid: Cell[][], col: number, row: number, dirs: number[][]) {
  return dirs.map(([dc, dr]) => grid[row + dr]?.[col + dc]).filter((c): c is Cell => c !== undefined);
}

/** What the building at (col, row) is worth where it stands; 0 for land. */
export function cellScore(grid: Cell[][], col: number, row: number) {
  const cell = grid[row][col];
  const beside = neighbours(grid, col, row, SIDES);
  const n = (kind: Cell, cells = beside) => cells.filter((c) => c === kind).length;
  switch (cell) {
    case 'farm':
      return 1 + n('lake');
    case 'house':
      return 2 * n('farm') + n('house') + n('forest');
    case 'tower':
      return n('tower') > 0 ? 0 : 2 * n('house', neighbours(grid, col, row, AROUND));
    default:
      return 0;
  }
}

export function boardScore(grid: Cell[][]) {
  let total = 0;
  grid.forEach((cells, row) => cells.forEach((_, col) => (total += cellScore(grid, col, row))));
  return total;
}

export const canPlace = (s: GameState, col: number, row: number) => s.phase === 'playing' && s.grid[row]?.[col] === 'grass';

/** What placing `kind` at (col, row) would add to the score, or null where it can't go. */
export function previewScore(s: GameState, kind: Building, col: number, row: number) {
  if (!canPlace(s, col, row) || s.pouch[kind] <= 0) return null;
  const grid = s.grid.map((cells) => [...cells]);
  grid[row][col] = kind;
  return boardScore(grid) - s.score;
}

export function select(s: GameState, kind: Building) {
  if (s.phase !== 'playing' || s.pouch[kind] <= 0) return false;
  s.selected = kind;
  return true;
}

export interface Placed {
  /** Points gained, in all. */
  gained: number;
  /** What each building whose worth changed gained, the new one included. */
  changes: { col: number; row: number; gained: number }[];
  /** True when the placement reached the goal and a new round began. */
  newRound: boolean;
}

/** Whether the last placement can be taken back: once per round, and not one that began a round. */
export const canUndo = (s: GameState) => s.phase === 'playing' && s.undo !== null && s.undoneIn !== s.round;

/** Takes back the last placement, once per round. Returns false if that is not allowed now. */
export function undo(s: GameState) {
  if (!s.undo || !canUndo(s)) return false;
  Object.assign(s, s.undo, { undo: null, undoneIn: s.round });
  return true;
}

/** Places the selected building at (col, row); null if it can't go there. */
export function place(s: GameState, col: number, row: number): Placed | null {
  const kind = s.selected;
  if (!kind || !canPlace(s, col, row) || s.pouch[kind] <= 0) return null;
  const prior: Snapshot = {
    grid: s.grid.map((cells) => [...cells]),
    pouch: { ...s.pouch },
    score: s.score,
    selected: s.selected,
    placed: s.placed,
  };
  const before = s.grid.map((cells, r) => cells.map((_, c) => cellScore(s.grid, c, r)));
  s.grid[row][col] = kind;
  s.pouch[kind]--;
  s.placed++;
  const changes: Placed['changes'] = [];
  s.grid.forEach((cells, r) =>
    cells.forEach((cell, c) => {
      const gained = cellScore(s.grid, c, r) - before[r][c];
      if (isBuilding(cell) && (gained !== 0 || (c === col && r === row))) changes.push({ col: c, row: r, gained });
    }),
  );
  const score = boardScore(s.grid);
  const gained = score - s.score;
  s.score = score;

  let newRound = false;
  while (s.score >= s.goal) {
    s.round++;
    s.goal = goalFor(s.round);
    for (const b of BUILDINGS) s.pouch[b] += ROUND_POUCH[b];
    newRound = true;
  }
  // A placement that began a round is kept: undoing it would hand back a round already paid for.
  s.undo = newRound ? null : prior;
  if (s.pouch[kind] <= 0) s.selected = BUILDINGS.find((b) => s.pouch[b] > 0) ?? null;
  const tilesLeft = BUILDINGS.some((b) => s.pouch[b] > 0);
  const roomLeft = s.grid.some((cells) => cells.includes('grass'));
  if (!tilesLeft || !roomLeft) {
    s.phase = 'over';
    s.best = Math.max(s.best, s.score);
  }
  return { gained, changes, newRound };
}
