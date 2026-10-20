import type { PuzzleDef } from '../kinds';
import { between, neighbours, pick, type Rand } from '../rng';

// Path Link: join each pair of same-coloured stars with a path through neighbouring cells, so the
// paths fill every cell and never cross. Made by winding one path through every cell (shuffled by
// backbite moves) and cutting it into pieces; any filling that keeps the rules counts.

export const LINK_SIZES = [5, 6, 7, 8] as const;
const PAIRS = [4, 5, 6, 8] as const;
const MIN_PATH = 3;

export interface LinkState {
  size: number;
  /** Each pair's two end cells. */
  ends: [number, number][];
  /** The made answer: each pair's path from its first end to its second. */
  answer: number[][];
  /** The player's path for each pair, starting at one of its ends. */
  paths: number[][];
  /** The pair being drawn, or -1. */
  drawing: number;
}

const adjacent = (a: number, b: number, size: number) => neighbours(a, size, size).includes(b);

/** A path through every cell of the grid, shuffled from a back-and-forth sweep. */
function windingPath(rand: Rand, size: number) {
  let path: number[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) path.push(r * size + (r % 2 ? size - 1 - c : c));
  for (let step = 0; step < size * size * 30; step++) {
    // Backbite: an end reaches to a neighbour further along, and the part between turns round.
    if (rand() < 0.5) path.reverse();
    const end = path[0];
    const next = pick(rand, neighbours(end, size, size));
    const i = path.indexOf(next);
    if (i <= 1) continue;
    path = [...path.slice(0, i).reverse(), ...path.slice(i)];
  }
  return path;
}

/** Which pair's path holds a cell, or -1. */
export function pathAt(s: LinkState, cell: number) {
  return s.paths.findIndex((p) => p.includes(cell));
}

/** Which pair has an end on a cell, or -1. */
export function endAt(s: LinkState, cell: number) {
  return s.ends.findIndex((e) => e.includes(cell));
}

/** Whether a pair's path joins its two ends. */
export function joined(s: LinkState, k: number) {
  const p = s.paths[k];
  return p.length >= 2 && s.ends[k].includes(p[0]) && s.ends[k].includes(p[p.length - 1]) && p[0] !== p[p.length - 1];
}

export const link: PuzzleDef<LinkState> = {
  id: 'link',
  undo: true,
  limit: [60, 80, 110, 150],
  make(rand: Rand, level) {
    const size = LINK_SIZES[level];
    const pairs = PAIRS[level];
    const path = windingPath(rand, size);
    // Cut points: every piece at least MIN_PATH cells long.
    const cuts: number[] = [];
    let at = 0;
    for (let k = 0; k < pairs - 1; k++) {
      const left = path.length - at - (pairs - 1 - k) * MIN_PATH;
      const len = between(rand, MIN_PATH, Math.max(MIN_PATH, Math.min(left, Math.round((2 * (path.length - at)) / (pairs - k)))));
      at += len;
      cuts.push(at);
    }
    const answer: number[][] = [];
    let from = 0;
    for (const cut of [...cuts, path.length]) {
      answer.push(path.slice(from, cut));
      from = cut;
    }
    return {
      size,
      ends: answer.map((p) => [p[0], p[p.length - 1]] as [number, number]),
      answer,
      paths: answer.map(() => []),
      drawing: -1,
    };
  },
  solved: (s) => s.paths.every((_, k) => joined(s, k)) && s.paths.reduce((n, p) => n + p.length, 0) === s.size * s.size,
  hint(s) {
    const k = s.paths.findIndex((p, i) => p.join() !== s.answer[i].join() && p.join() !== [...s.answer[i]].reverse().join());
    if (k < 0) return false;
    for (let j = 0; j < s.paths.length; j++) {
      if (j === k) continue;
      const cut = s.paths[j].findIndex((c) => s.answer[k].includes(c));
      if (cut >= 0) s.paths[j] = s.paths[j].slice(0, cut);
    }
    s.paths[k] = [...s.answer[k]];
    s.drawing = -1;
    return true;
  },
};

/** Starts drawing at a cell: from a pair's end (afresh) or from a cell of a path (cut back to it). */
export function linkStart(s: LinkState, cell: number) {
  const end = endAt(s, cell);
  if (end >= 0) {
    s.paths[end] = [cell];
    s.drawing = end;
    return true;
  }
  const k = pathAt(s, cell);
  if (k < 0) return false;
  s.paths[k] = s.paths[k].slice(0, s.paths[k].indexOf(cell) + 1);
  s.drawing = k;
  return true;
}

/** Carries the path being drawn into a cell, a step at a time along a straight line. */
export function linkMove(s: LinkState, cell: number): boolean {
  const k = s.drawing;
  if (k < 0) return false;
  const path = s.paths[k];
  const last = path[path.length - 1];
  if (cell === last) return false;
  const size = s.size;
  // A drag that skipped cells in a straight line walks through them one by one.
  if (!adjacent(last, cell, size)) {
    const [lr, lc, r, c] = [Math.floor(last / size), last % size, Math.floor(cell / size), cell % size];
    if (lr !== r && lc !== c) return false;
    const step = lr === r ? Math.sign(c - lc) : Math.sign(r - lr) * size;
    let changed = false;
    for (let at = last + step; ; at += step) {
      changed = linkMove(s, at) || changed;
      if (at === cell || s.drawing !== k || s.paths[k][s.paths[k].length - 1] !== at) break;
    }
    return changed;
  }
  // Back along its own path: shorten it.
  const back = path.indexOf(cell);
  if (back >= 0) {
    s.paths[k] = path.slice(0, back + 1);
    return true;
  }
  if (joined(s, k)) return false;
  const end = endAt(s, cell);
  if (end >= 0 && end !== k) return false;
  // Into another path: cut that one short.
  const other = pathAt(s, cell);
  if (other >= 0) s.paths[other] = s.paths[other].slice(0, s.paths[other].indexOf(cell));
  path.push(cell);
  return true;
}

export function linkEnd(s: LinkState) {
  s.drawing = -1;
  return false;
}
