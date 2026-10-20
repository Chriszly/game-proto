import type { PuzzleDef } from '../kinds';
import { neighbours, pick, shuffle, type Rand } from '../rng';

// Calc Cages: fill the grid so every row and column holds each number once, and the numbers in
// each outlined cage make its target with its sign (+, -, x, ÷; a lone cell just shows its
// number). Any filling that keeps the rules counts.

export const CALC_SIZES = [4, 4, 5, 6] as const;

export type Op = '+' | '-' | 'x' | '/' | '=';

export interface Cage {
  cells: number[];
  op: Op;
  target: number;
}

export interface CalcState {
  size: number;
  solution: number[];
  cages: Cage[];
  /** The cage of each cell. */
  cageOf: number[];
  /** 0 empty. */
  values: number[];
  selected: number;
}

function latin(rand: Rand, n: number) {
  const rows = shuffle(rand, Array.from({ length: n }, (_, i) => i));
  const cols = shuffle(rand, Array.from({ length: n }, (_, i) => i));
  const digits = shuffle(rand, Array.from({ length: n }, (_, i) => i + 1));
  return Array.from({ length: n * n }, (_, i) => digits[(rows[Math.floor(i / n)] + cols[i % n]) % n]);
}

/** Whether a cage's numbers, all filled in, make its target. */
export function cageMet(cage: Cage, values: number[]) {
  const v = cage.cells.map((c) => values[c]);
  if (v.some((x) => !x)) return false;
  switch (cage.op) {
    case '=':
      return v[0] === cage.target;
    case '+':
      return v.reduce((a, b) => a + b, 0) === cage.target;
    case 'x':
      return v.reduce((a, b) => a * b, 1) === cage.target;
    case '-':
      return Math.abs(v[0] - v[1]) === cage.target;
    case '/':
      return Math.max(...v) / Math.min(...v) === cage.target;
  }
}

/** Cells whose number is repeated in their row or column. */
export function clashes(values: number[], size: number) {
  const out = new Set<number>();
  for (let i = 0; i < size * size; i++) {
    if (!values[i]) continue;
    for (let j = i + 1; j < size * size; j++) {
      const sameLine = Math.floor(i / size) === Math.floor(j / size) || i % size === j % size;
      if (sameLine && values[i] === values[j]) out.add(i).add(j);
    }
  }
  return out;
}

export const calc: PuzzleDef<CalcState> = {
  id: 'calc',
  undo: true,
  limit: [90, 120, 180, 240],
  make(rand: Rand, level) {
    const size = CALC_SIZES[level];
    const solution = latin(rand, size);
    const cageOf = Array(size * size).fill(-1);
    const cages: Cage[] = [];
    for (const start of shuffle(rand, Array.from({ length: size * size }, (_, i) => i))) {
      if (cageOf[start] >= 0) continue;
      const roll = rand();
      const want = roll < 0.12 ? 1 : roll < 0.62 ? 2 : 3;
      const cells = [start];
      cageOf[start] = cages.length;
      while (cells.length < want) {
        const free = cells.flatMap((c) => neighbours(c, size, size)).filter((c) => cageOf[c] < 0);
        if (!free.length) break;
        const next = pick(rand, free);
        cageOf[next] = cages.length;
        cells.push(next);
      }
      const v = cells.map((c) => solution[c]);
      let op: Op;
      if (cells.length === 1) op = '=';
      else if (cells.length === 2 && level >= 2 && Math.max(...v) % Math.min(...v) === 0 && rand() < 0.5) op = '/';
      else if (cells.length === 2 && level >= 1 && rand() < 0.4) op = '-';
      else op = level >= 2 && rand() < 0.4 ? 'x' : '+';
      const target =
        op === '=' ? v[0] : op === '+' ? v.reduce((a, b) => a + b, 0) : op === 'x' ? v.reduce((a, b) => a * b, 1) : op === '-' ? Math.abs(v[0] - v[1]) : Math.max(...v) / Math.min(...v);
      cages.push({ cells, op, target });
    }
    return { size, solution, cages, cageOf, values: solution.map(() => 0), selected: -1 };
  },
  solved: (s) => s.values.every((v) => v) && clashes(s.values, s.size).size === 0 && s.cages.every((c) => cageMet(c, s.values)),
  hint(s) {
    const order = s.selected >= 0 ? [s.selected, ...s.values.keys()] : [...s.values.keys()];
    const i = order.find((k) => s.values[k] !== s.solution[k]);
    if (i === undefined) return false;
    s.values[i] = s.solution[i];
    return true;
  },
};

export function calcSelect(s: CalcState, cell: number) {
  s.selected = cell;
  return false;
}

/** Writes a number (0 clears) in the picked cell. */
export function calcEnter(s: CalcState, n: number) {
  if (s.selected < 0 || n > s.size || s.values[s.selected] === n) return false;
  s.values[s.selected] = n;
  return true;
}
