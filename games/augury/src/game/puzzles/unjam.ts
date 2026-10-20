import type { PuzzleDef } from '../kinds';
import { between, type Rand } from '../rng';

// Unjam: slide blocks along their length on a 6x6 board to free the key block through the gap in
// the right wall of its row. Made by scattering blocks and keeping the layout whose shortest
// solution (found breadth first) is longest, up to the level's target.

export const UNJAM_SIZE = 6;
export const KEY_ROW = 2;
const BLOCKS = [6, 8, 9, 10] as const;
const TARGET_MOVES = [3, 5, 7, 8] as const;
const TRIES = 160;
const MAX_STATES = 20_000;

export interface Block {
  /** Top-left cell's row and column. */
  r: number;
  c: number;
  len: number;
  across: boolean;
}

export interface UnjamState {
  /** Block 0 is the key. */
  blocks: Block[];
  /** The fewest moves the made layout needs. */
  par: number;
  /** A shortest solution from the made layout: block and the row or column it ends at. */
  solution: [number, number][];
  moves: number;
}

const SIZE = UNJAM_SIZE;

function occupied(blocks: Block[], skip = -1) {
  const grid = Array(SIZE * SIZE).fill(-1);
  blocks.forEach((b, k) => {
    if (k === skip) return;
    for (let i = 0; i < b.len; i++) grid[(b.r + (b.across ? 0 : i)) * SIZE + b.c + (b.across ? i : 0)] = k;
  });
  return grid;
}

/** The lowest and highest start (column if across, row if not) block `k` can slide to. */
export function slideRange(blocks: Block[], k: number) {
  const grid = occupied(blocks, k);
  const b = blocks[k];
  const at = (p: number) => (b.across ? grid[b.r * SIZE + p] : grid[p * SIZE + b.c]);
  const start = b.across ? b.c : b.r;
  let lo = start;
  while (lo > 0 && at(lo - 1) < 0) lo--;
  let hi = start;
  while (hi + b.len < SIZE && at(hi + b.len) < 0) hi++;
  return { lo, hi };
}

/** The shortest solution from a layout, or null if there is none within the search limit. */
export function solveUnjam(start: Block[]): [number, number][] | null {
  // A layout is each block's start along its length; the other coordinate never changes.
  const n = start.length;
  const pos0 = start.map((b) => (b.across ? b.c : b.r));
  const keyOf = (pos: number[]) => String.fromCharCode(...pos);
  const seen = new Map<string, { prev: string; move: [number, number] } | null>([[keyOf(pos0), null]]);
  const grid = new Int8Array(SIZE * SIZE);
  const cellOf = (k: number, p: number, i: number) => {
    const b = start[k];
    return b.across ? b.r * SIZE + p + i : (p + i) * SIZE + b.c;
  };
  let frontier = [pos0];
  while (frontier.length && seen.size < MAX_STATES) {
    const next: number[][] = [];
    for (const pos of frontier) {
      const key = keyOf(pos);
      if (pos[0] + start[0].len === SIZE) {
        const path: [number, number][] = [];
        for (let k = key, step = seen.get(k); step; k = step.prev, step = seen.get(k)) path.unshift(step.move);
        return path;
      }
      grid.fill(-1);
      for (let k = 0; k < n; k++) for (let i = 0; i < start[k].len; i++) grid[cellOf(k, pos[k], i)] = k;
      for (let k = 0; k < n; k++) {
        const len = start[k].len;
        const tryAt = (p: number) => {
          const moved = pos.slice();
          moved[k] = p;
          const mk = keyOf(moved);
          if (seen.has(mk)) return;
          seen.set(mk, { prev: key, move: [k, p] });
          next.push(moved);
        };
        for (let p = pos[k] - 1; p >= 0 && grid[cellOf(k, p, 0)] < 0; p--) tryAt(p);
        for (let p = pos[k] + 1; p + len <= SIZE && grid[cellOf(k, p, len - 1)] < 0; p++) tryAt(p);
      }
    }
    frontier = next;
  }
  return null;
}

function scatter(rand: Rand, count: number): Block[] {
  const blocks: Block[] = [{ r: KEY_ROW, c: between(rand, 0, 2), len: 2, across: true }];
  let grid = occupied(blocks);
  for (let tries = 0; blocks.length < count && tries < 200; tries++) {
    const across = rand() < 0.45;
    const len = rand() < 0.7 ? 2 : 3;
    const r = between(rand, 0, across ? SIZE - 1 : SIZE - len);
    const c = between(rand, 0, across ? SIZE - len : SIZE - 1);
    // A block lying across the key's row would block the gap for good.
    if (across && r === KEY_ROW) continue;
    const b = { r, c, len, across };
    let free = true;
    for (let i = 0; i < len; i++) if (grid[(r + (across ? 0 : i)) * SIZE + c + (across ? i : 0)] >= 0) free = false;
    if (!free) continue;
    blocks.push(b);
    grid = occupied(blocks);
  }
  return blocks;
}

export const unjam: PuzzleDef<UnjamState> = {
  id: 'unjam',
  undo: true,
  limit: [75, 100, 130, 160],
  make(rand: Rand, level) {
    let best: { blocks: Block[]; solution: [number, number][] } | null = null;
    for (let t = 0; t < TRIES; t++) {
      const blocks = scatter(rand, BLOCKS[level]);
      const solution = solveUnjam(blocks);
      if (!solution || solution.length < 2) continue;
      if (!best || solution.length > best.solution.length) best = { blocks, solution };
      if (solution.length >= TARGET_MOVES[level]) break;
    }
    // Never fails in practice; a lone key block two moves from the gap is the fallback.
    best ??= { blocks: [{ r: KEY_ROW, c: 0, len: 2, across: true }, { r: 0, c: 3, len: 3, across: false }], solution: [[1, 3], [0, 4]] };
    return { blocks: best.blocks, par: best.solution.length, solution: best.solution, moves: 0 };
  },
  solved: (s) => s.blocks[0].c + s.blocks[0].len === SIZE,
  hint(s) {
    const path = solveUnjam(s.blocks);
    if (!path?.length) return false;
    return unjamMove(s, path[0][0], path[0][1]);
  },
};

/** Slides block `k` so it starts at `to` (a column if it lies across, else a row), if it can get there. */
export function unjamMove(s: UnjamState, k: number, to: number) {
  const b = s.blocks[k];
  const { lo, hi } = slideRange(s.blocks, k);
  const p = Math.max(lo, Math.min(hi, to));
  if (p === (b.across ? b.c : b.r)) return false;
  s.blocks[k] = b.across ? { ...b, c: p } : { ...b, r: p };
  s.moves++;
  return true;
}

/** Which block covers a cell, or -1. */
export function blockAt(s: UnjamState, r: number, c: number) {
  return occupied(s.blocks)[r * SIZE + c];
}
