import type { PuzzleDef } from '../kinds';
import type { Rand } from '../rng';

// Picture Grid: fill cells so every row and column shows its runs of filled cells, in order. Any
// filling that matches the clues counts, so the made picture is only the hint's guide.

export const NONO_SIZES = [5, 6, 7, 8] as const;

export interface NonoState {
  size: number;
  /** The made picture, row by row: 1 filled. */
  picture: number[];
  rowClues: number[][];
  colClues: number[][];
  /** The player's cells: 0 empty, 1 filled, 2 marked empty. */
  cells: number[];
}

/** The runs of filled cells in a line, or [0] for none. */
export function runs(line: number[]) {
  const out: number[] = [];
  let n = 0;
  for (const v of line) {
    if (v === 1) n++;
    else if (n) out.push(n), (n = 0);
  }
  if (n) out.push(n);
  return out.length ? out : [0];
}

function row(cells: number[], size: number, r: number) {
  return cells.slice(r * size, r * size + size);
}

function col(cells: number[], size: number, c: number) {
  return Array.from({ length: size }, (_, r) => cells[r * size + c]);
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Whether a row (`r` < size) or column (`size + c`) of the player's cells matches its clue. */
export function lineDone(s: NonoState, line: number) {
  const { size } = s;
  return line < size ? same(runs(row(s.cells, size, line)), s.rowClues[line]) : same(runs(col(s.cells, size, line - size)), s.colClues[line - size]);
}

export const nonogram: PuzzleDef<NonoState> = {
  id: 'nonogram',
  undo: true,
  limit: [90, 120, 150, 200],
  make(rand: Rand, level) {
    const size = NONO_SIZES[level];
    const picture: number[] = [];
    const mirror = rand() < 0.5;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const src = mirror && c >= size / 2 ? picture[r * size + (size - 1 - c)] : undefined;
        picture.push(src ?? (rand() < 0.58 ? 1 : 0));
      }
    }
    return {
      size,
      picture,
      rowClues: Array.from({ length: size }, (_, r) => runs(row(picture, size, r))),
      colClues: Array.from({ length: size }, (_, c) => runs(col(picture, size, c))),
      cells: picture.map(() => 0),
    };
  },
  solved(s) {
    for (let i = 0; i < 2 * s.size; i++) if (!lineDone(s, i)) return false;
    return true;
  },
  hint(s) {
    // First a filled cell the picture leaves empty, then an empty one it fills.
    let i = s.cells.findIndex((v, k) => v === 1 && s.picture[k] === 0);
    if (i < 0) i = s.cells.findIndex((v, k) => v !== 1 && s.picture[k] === 1);
    if (i < 0) return false;
    s.cells[i] = s.picture[i] ? 1 : 2;
    return true;
  },
};

/** A tap on a cell: empty, then filled, then marked empty, then empty again. */
export function nonoTap(s: NonoState, cell: number) {
  s.cells[cell] = (s.cells[cell] + 1) % 3;
  return true;
}
