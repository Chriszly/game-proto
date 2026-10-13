// The garden: a grid of soil cells with a dirt path the pests walk along to the Heartwood.
// Plain TypeScript with no Phaser, so the rules can use the same geometry the scene draws.

/** The board: its top left corner in view pixels, its size in cells, and each cell's size. */
export const GRID = { x: 16, y: 64, cols: 12, rows: 7, cell: 64 };

/**
 * The path's corners as (col, row) cells, from where the pests come in (off the left edge) to
 * the Heartwood they eat at the end.
 */
export const PATH_CORNERS: readonly [number, number][] = [
  [-1, 1],
  [3, 1],
  [3, 5],
  [7, 5],
  [7, 2],
  [11, 2],
];

export type Cell = 'soil' | 'path' | 'heart';

/** The middle of the cell at (col, row), in view pixels. */
export const cellCentre = (col: number, row: number) => ({
  x: GRID.x + col * GRID.cell + GRID.cell / 2,
  y: GRID.y + row * GRID.cell + GRID.cell / 2,
});

/** The cell under a point in view pixels, or null off the board. */
export function cellAt(x: number, y: number) {
  const col = Math.floor((x - GRID.x) / GRID.cell);
  const row = Math.floor((y - GRID.y) / GRID.cell);
  if (col < 0 || row < 0 || col >= GRID.cols || row >= GRID.rows) return null;
  return { col, row };
}

/** What every cell is, indexed `[row][col]`. */
export const MAP: Cell[][] = (() => {
  const map: Cell[][] = Array.from({ length: GRID.rows }, () => Array<Cell>(GRID.cols).fill('soil'));
  for (let i = 1; i < PATH_CORNERS.length; i++) {
    const [c0, r0] = PATH_CORNERS[i - 1];
    const [c1, r1] = PATH_CORNERS[i];
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let s = 0; s <= steps; s++) {
      const col = c0 + Math.sign(c1 - c0) * s;
      const row = r0 + Math.sign(r1 - r0) * s;
      if (col >= 0) map[row][col] = 'path';
    }
  }
  const [hc, hr] = PATH_CORNERS[PATH_CORNERS.length - 1];
  map[hr][hc] = 'heart';
  return map;
})();

const POINTS = PATH_CORNERS.map(([c, r]) => cellCentre(c, r));
const SEGMENTS = POINTS.slice(1).map((p, i) => Math.hypot(p.x - POINTS[i].x, p.y - POINTS[i].y));

/** How far a pest walks, in pixels, from coming in to reaching the Heartwood. */
export const PATH_LENGTH = SEGMENTS.reduce((a, b) => a + b, 0);

/** Where a pest `dist` pixels along the path stands, and which way it faces (-1 left, 1 right). */
export function pathPoint(dist: number) {
  let left = Math.max(0, dist);
  for (let i = 0; i < SEGMENTS.length; i++) {
    const a = POINTS[i];
    const b = POINTS[i + 1];
    if (left <= SEGMENTS[i] || i === SEGMENTS.length - 1) {
      const t = Math.min(1, left / SEGMENTS[i]);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, facing: b.x < a.x ? -1 : 1 };
    }
    left -= SEGMENTS[i];
  }
  return { ...POINTS[POINTS.length - 1], facing: 1 };
}
