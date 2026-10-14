import {
  adjacent,
  collapse,
  COLS,
  findMatches,
  findRuns,
  matchesAt,
  shuffle,
  swapped,
  validMoves,
  type Board,
  type Cell,
  type Tile,
} from './board';
import { randomKind } from './kinds';
import { MOVE_BONUS } from './orders';
import { starsFor } from './ranks';
import { filled, startOrder, tileMaker, type GameState } from './state';

/** One round of a swap's outcome: the tiles matched, then the board once the rest have fallen. */
export interface Step {
  /** Every tile gathered this round, catalyst rows included. */
  cleared: (Cell & Tile)[];
  /** Tiles a match of four or more turned into Catalysts; they stay on the board. */
  brewed: (Cell & Tile)[];
  /** Rows a matched Catalyst cleared. */
  rows: number[];
  board: Board;
  /** The board had no moves left, so its tiles were shuffled. */
  shuffled?: boolean;
}

/** Runs of this length or longer brew a Catalyst. */
export const CATALYST_RUN = 4;

/**
 * Swaps two neighbouring tiles. A swap that makes no match doesn't count and returns null; one that
 * does spends a move, gathers every match and the cascades after it, and returns them step by step.
 */
export function trySwap(s: GameState, a: Cell, b: Cell): Step[] | null {
  if (s.phase !== 'play' || !adjacent(a, b)) return null;
  let board = swapped(s.board, a, b);
  if (findMatches(board).length === 0) return null;

  s.moves--;
  const newTile = tileMaker(s);
  const steps: Step[] = [];
  // On the swap's own match a Catalyst is brewed where the player moved a tile to, if it can be.
  let prefer: Cell[] = [b, a];
  for (let step = gather(s, board, prefer); step; step = gather(s, board, prefer)) {
    board = collapse(step.board, step.cleared, newTile);
    steps.push({ ...step, board });
    prefer = [];
  }
  if (validMoves(board).length === 0) {
    board = shuffle(board, newTile);
    steps.push({ cleared: [], brewed: [], rows: [], board, shuffled: true });
  }
  s.board = board;

  if (filled(s)) {
    s.phase = 'sold';
    s.earned = s.current.price + s.moves * MOVE_BONUS;
    s.coins += s.earned;
    s.orderStars = starsFor(s.moves);
    s.stars += s.orderStars;
    s.sold++;
    s.order++;
  } else if (s.moves === 0) {
    s.phase = 'failed';
  }
  return steps;
}

/**
 * The matches on `board`, if any: what they gather (with the whole row of every matched Catalyst)
 * and the Catalysts they brew. `board` in the result has the brewed tiles turned into Catalysts but
 * the cleared ones still in place.
 */
function gather(s: GameState, board: Board, prefer: Cell[]): Omit<Step, 'board'> & { board: Board } | null {
  const runs = findRuns(board);
  if (runs.length === 0) return null;
  const key = (c: Cell) => c.row * COLS + c.col;
  const hit = new Set<number>();
  for (const run of runs) for (const c of run.cells) hit.add(key(c));
  // A matched Catalyst clears its row.
  const rows = [...new Set([...hit].filter((i) => board[Math.floor(i / COLS)][i % COLS].catalyst).map((i) => Math.floor(i / COLS)))];
  for (const row of rows) for (let col = 0; col < COLS; col++) hit.add(row * COLS + col);
  s.fired += [...hit].filter((i) => board[Math.floor(i / COLS)][i % COLS].catalyst).length;

  // A run of four or more leaves one of its tiles behind as a Catalyst of its kind.
  const next = board.map((row) => [...row]);
  const brewed: (Cell & Tile)[] = [];
  for (const run of runs) {
    if (run.cells.length < CATALYST_RUN) continue;
    const free = run.cells.filter((c) => hit.has(key(c)) && !rows.includes(c.row) && !board[c.row][c.col].catalyst);
    const at = free.find((c) => prefer.some((p) => key(p) === key(c))) ?? free[Math.floor((free.length - 1) / 2)];
    if (!at) continue;
    hit.delete(key(at));
    next[at.row][at.col] = { ...board[at.row][at.col], catalyst: true };
    brewed.push({ ...at, ...next[at.row][at.col] });
  }
  s.brewed += brewed.length;

  const cleared = [...hit].sort((x, y) => x - y).map((i) => {
    const c = { row: Math.floor(i / COLS), col: i % COLS };
    return { ...c, ...board[c.row][c.col] };
  });
  for (const { kind } of cleared) s.got[kind]++;
  return { cleared, brewed, rows, board: next };
}

// ---- Bench tools: coins spent during an order ----

export type Tool = 'stir' | 'sift';
/** Stir buys moves; Sift rerolls one row of the board. */
export const TOOLS: Record<Tool, { cost: number; name: string; what: string }> = {
  stir: { cost: 40, name: 'Stir', what: '+3 moves' },
  sift: { cost: 25, name: 'Sift', what: 'reroll a row' },
};
export const STIR_MOVES = 3;

export const canUse = (s: GameState, tool: Tool) => s.phase === 'play' && s.coins >= TOOLS[tool].cost;

/** Stir: three more moves for this order. False if it can't be bought. */
export function stir(s: GameState): boolean {
  if (!canUse(s, 'stir')) return false;
  s.coins -= TOOLS.stir.cost;
  s.moves += STIR_MOVES;
  return true;
}

/**
 * Sift: every tile in `row` but its Catalysts is replaced by a new one, with no match made and a
 * move left on the board. Returns the tiles taken out, or null if it can't be bought.
 */
export function sift(s: GameState, row: number): Tile[] | null {
  if (!canUse(s, 'sift') || row < 0 || row >= s.board.length) return null;
  const newTile = tileMaker(s);
  const old = s.board[row].filter((t) => !t.catalyst);
  let next: Board = s.board;
  for (let attempt = 0; attempt < 30; attempt++) {
    next = s.board.map((r) => [...r]);
    for (let col = 0; col < COLS; col++) {
      if (s.board[row][col].catalyst) continue;
      next[row][col] = newTile();
      for (let k = 0; k < 8 && matchesAt(next, { row, col }); k++) next[row][col] = { ...next[row][col], kind: randomKind() };
    }
    if (findMatches(next).length === 0 && validMoves(next).length > 0) break;
  }
  if (findMatches(next).length > 0 || validMoves(next).length === 0) next = shuffle(next, newTile);
  s.coins -= TOOLS.sift.cost;
  s.board = next;
  return old;
}

/** After a sale, the next order; after running out of moves, the same order again. */
export const nextOrder = (s: GameState) =>
  startOrder({ order: s.order, coins: s.coins, sold: s.sold, stars: s.stars });
