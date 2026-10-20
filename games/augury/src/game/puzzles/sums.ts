import type { PuzzleDef } from '../kinds';
import { shuffle, type Rand } from '../rng';

// Cross Sums: a number crossword. Each run of open cells across or down adds up to the clue at its
// start, with no number repeated in a run. Made by filling a random grid with numbers 1 to 9 and
// writing their sums as clues; any filling that keeps the rules counts.

/** The open area's side; the grid adds a clue row on top and a clue column on the left. */
export const SUMS_SIZES = [3, 4, 5, 6] as const;
const WALLS = [0, 0.12, 0.18, 0.22] as const;

export interface Run {
  cells: number[];
  sum: number;
}

export interface SumsState {
  /** The grid's side, clue row and column included. */
  size: number;
  /** Which cells are open (take a number). */
  open: boolean[];
  solution: number[];
  /** Clues by the cell they are written in: the sum of the run to the right and the one below. */
  across: Record<number, number>;
  down: Record<number, number>;
  runs: Run[];
  values: number[];
  selected: number;
}

function runsOf(open: boolean[], size: number) {
  const across: number[][] = [];
  const down: number[][] = [];
  for (let r = 0; r < size; r++) {
    let run: number[] = [];
    for (let c = 0; c <= size; c++) {
      if (c < size && open[r * size + c]) run.push(r * size + c);
      else (run.length && across.push(run), (run = []));
    }
  }
  for (let c = 0; c < size; c++) {
    let run: number[] = [];
    for (let r = 0; r <= size; r++) {
      if (r < size && open[r * size + c]) run.push(r * size + c);
      else (run.length && down.push(run), (run = []));
    }
  }
  return { across, down };
}

function fill(rand: Rand, cells: number[], runOf: Map<number, number[][]>, values: number[]): boolean {
  if (!cells.length) return true;
  const [cell, ...rest] = cells;
  for (const d of shuffle(rand, [1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (runOf.get(cell)!.some((run) => run.some((c) => values[c] === d))) continue;
    values[cell] = d;
    if (fill(rand, rest, runOf, values)) return true;
    values[cell] = 0;
  }
  return false;
}

/** Cells whose number is repeated in one of their runs. */
export function sumsClashes(s: SumsState) {
  const out = new Set<number>();
  for (const run of s.runs) {
    for (const a of run.cells) for (const b of run.cells) if (a !== b && s.values[a] && s.values[a] === s.values[b]) out.add(a);
  }
  return out;
}

export const sums: PuzzleDef<SumsState> = {
  id: 'sums',
  undo: true,
  limit: [90, 120, 180, 240],
  make(rand: Rand, level) {
    const inner = SUMS_SIZES[level];
    const size = inner + 1;
    for (;;) {
      const open = Array.from({ length: size * size }, (_, i) => i >= size && i % size > 0 && rand() >= WALLS[level]);
      // Every open cell needs a run of at least two both ways: close the ones that don't, until none.
      for (let changed = true; changed; ) {
        changed = false;
        const { across, down } = runsOf(open, size);
        for (const run of [...across, ...down]) {
          if (run.length < 2) {
            open[run[0]] = false;
            changed = true;
          }
        }
      }
      if (open.filter(Boolean).length < inner * inner * 0.6) continue;
      const { across, down } = runsOf(open, size);
      const runOf = new Map<number, number[][]>();
      for (const run of [...across, ...down]) for (const c of run) runOf.set(c, [...(runOf.get(c) ?? []), run]);
      const values = Array(size * size).fill(0);
      const cells = [...runOf.keys()].sort((a, b) => a - b);
      if (!fill(rand, cells, runOf, values)) continue;
      const total = (run: number[]) => run.reduce((a, c) => a + values[c], 0);
      const acrossClues: Record<number, number> = {};
      const downClues: Record<number, number> = {};
      for (const run of across) acrossClues[run[0] - 1] = total(run);
      for (const run of down) downClues[run[0] - size] = total(run);
      return {
        size,
        open,
        solution: values,
        across: acrossClues,
        down: downClues,
        runs: [...across, ...down].map((cellsOf) => ({ cells: cellsOf, sum: total(cellsOf) })),
        values: values.map(() => 0),
        selected: -1,
      };
    }
  },
  solved: (s) => s.runs.every((run) => run.cells.every((c) => s.values[c]) && run.cells.reduce((a, c) => a + s.values[c], 0) === run.sum) && sumsClashes(s).size === 0,
  hint(s) {
    const cells = s.open.map((o, i) => (o ? i : -1)).filter((i) => i >= 0);
    const order = s.selected >= 0 ? [s.selected, ...cells] : cells;
    const i = order.find((k) => s.values[k] !== s.solution[k]);
    if (i === undefined) return false;
    s.values[i] = s.solution[i];
    return true;
  },
};

export function sumsSelect(s: SumsState, cell: number) {
  if (!s.open[cell]) return false;
  s.selected = cell;
  return false;
}

/** Writes a number (0 clears) in the picked cell. */
export function sumsEnter(s: SumsState, n: number) {
  if (s.selected < 0 || s.values[s.selected] === n) return false;
  s.values[s.selected] = n;
  return true;
}
