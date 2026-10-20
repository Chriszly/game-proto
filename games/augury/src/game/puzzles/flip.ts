import type { PuzzleDef } from '../kinds';
import { neighbours, shuffle, type Rand } from '../rng';

// Tile Flip: tapping a tile flips it and its four neighbours; turn every tile dark. Made by
// pressing tiles on a dark board, so it can always be solved, and the presses still needed are
// the made presses less the player's (pressing twice undoes a press).

export const FLIP_SIZES = [3, 4, 5, 5] as const;
const PRESSES = [2, 4, 6, 9] as const;

export interface FlipState {
  size: number;
  /** 1 lit. */
  lit: number[];
  /** The presses the board was made with, then toggled by each of the player's presses. */
  needed: number[];
  taps: number;
}

function press(s: FlipState, cell: number) {
  for (const c of [cell, ...neighbours(cell, s.size, s.size)]) s.lit[c] ^= 1;
  s.needed[cell] ^= 1;
}

export const flip: PuzzleDef<FlipState> = {
  id: 'flip',
  undo: true,
  limit: [60, 75, 100, 130],
  make(rand: Rand, level) {
    const size = FLIP_SIZES[level];
    for (;;) {
      const s: FlipState = { size, lit: Array(size * size).fill(0), needed: Array(size * size).fill(0), taps: 0 };
      const cells = shuffle(rand, Array.from({ length: size * size }, (_, i) => i));
      for (const c of cells.slice(0, PRESSES[level])) press(s, c);
      if (s.lit.some((v) => v)) return s;
    }
  },
  solved: (s) => s.lit.every((v) => v === 0),
  hint(s) {
    const cell = s.needed.indexOf(1);
    if (cell < 0) return false;
    flipTap(s, cell);
    return true;
  },
};

export function flipTap(s: FlipState, cell: number) {
  press(s, cell);
  s.taps++;
  return true;
}
