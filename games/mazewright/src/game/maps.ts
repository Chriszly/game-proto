import { COLS, ROWS } from './rules';

/** A cell as [column, row]. */
export type Cell = [number, number];

export interface MapDef {
  id: string;
  /** The two burrows the foes come out of; the second opens at wave `SECOND_GATE`. */
  gates: [Cell, Cell];
  /** The cottage they walk to. */
  goal: Cell;
  /** Boulders that block for good: nothing is built on them. */
  rocks: Cell[];
}

/** The three gardens, each with its own rocks and burrows, so each asks for its own maze. */
export const MAPS: MapDef[] = [
  {
    id: 'meadow',
    gates: [[0, 2], [0, 8]],
    goal: [21, 5],
    rocks: [[9, 2], [12, 8], [16, 3], [18, 7], [10, 5]],
  },
  {
    id: 'orchard',
    gates: [[0, 1], [0, 9]],
    goal: [21, 5],
    rocks: [[6, 3], [6, 7], [10, 1], [10, 5], [10, 9], [14, 3], [14, 7], [18, 5]],
  },
  {
    id: 'millpond',
    gates: [[0, 5], [11, 0]],
    goal: [21, 10],
    rocks: [[7, 4], [8, 4], [7, 5], [8, 5], [14, 6], [15, 6], [14, 7], [17, 2], [4, 9]],
  },
];

export const cellIndex = ([x, y]: Cell) => y * COLS + x;
export const cellOf = (i: number): Cell => [i % COLS, Math.floor(i / COLS)];
export const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
