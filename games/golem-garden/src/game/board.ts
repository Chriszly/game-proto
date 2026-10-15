// The gardens: a grid of soil cells with dirt paths the pests walk along to the Heartwood.
// Plain TypeScript with no Phaser, so the rules can use the same geometry the scene draws.

/** The board: its top left corner in view pixels, its size in cells, and each cell's size. */
export const GRID = { x: 16, y: 64, cols: 12, rows: 7, cell: 64 };

export type Cell = 'soil' | 'path' | 'heart';

/** One way through a garden, from where pests come in (off the left edge) to the Heartwood. */
export interface Route {
  /** The route's corners as (col, row) cells; straight runs only, starting at col -1. */
  corners: readonly [number, number][];
  /** The corners' centres in view pixels. */
  points: { x: number; y: number }[];
  /** The length of each run between corners, in pixels. */
  segments: number[];
  /** How far a pest walks on this route, in pixels. */
  length: number;
}

export interface Garden {
  name: string;
  /** What sets it apart, shown on its card. */
  blurb: string;
  /** The best wave (most waves ever cleared) that unlocks it. */
  unlockAt: number;
  /** The ways through it; a forked garden has more than one, and pests take them in turn. */
  routes: Route[];
  /** What every cell is, indexed `[row][col]`. */
  map: Cell[][];
  /** The Heartwood's cell, where every route ends. */
  heart: { col: number; row: number };
}

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

function route(corners: readonly [number, number][]): Route {
  const points = corners.map(([c, r]) => cellCentre(c, r));
  const segments = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  return { corners, points, segments, length: segments.reduce((a, b) => a + b, 0) };
}

function garden(name: string, blurb: string, unlockAt: number, routes: (readonly [number, number][])[]): Garden {
  const map: Cell[][] = Array.from({ length: GRID.rows }, () => Array<Cell>(GRID.cols).fill('soil'));
  for (const corners of routes) {
    for (let i = 1; i < corners.length; i++) {
      const [c0, r0] = corners[i - 1];
      const [c1, r1] = corners[i];
      const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
      for (let s = 0; s <= steps; s++) {
        const col = c0 + Math.sign(c1 - c0) * s;
        const row = r0 + Math.sign(r1 - r0) * s;
        if (col >= 0) map[row][col] = 'path';
      }
    }
  }
  const [hc, hr] = routes[0][routes[0].length - 1];
  map[hr][hc] = 'heart';
  return { name, blurb, unlockAt, routes: routes.map(route), map, heart: { col: hc, row: hr } };
}

/**
 * Every garden, in the order they unlock. The Meadow is the first garden and the one a new player
 * (and the playthrough) starts in.
 */
export const GARDENS: Garden[] = [
  garden('Meadow', 'One winding path', 0, [
    [[-1, 1], [3, 1], [3, 5], [7, 5], [7, 2], [11, 2]],
  ]),
  garden('Forked Brook', 'The path splits round a bed and meets again', 5, [
    [[-1, 3], [2, 3], [2, 1], [8, 1], [8, 3], [11, 3]],
    [[-1, 3], [2, 3], [2, 5], [8, 5], [8, 3], [11, 3]],
  ]),
  garden('Two Gates', 'Pests come in by two gates', 10, [
    [[-1, 1], [5, 1], [5, 3], [9, 3], [9, 1], [11, 1]],
    [[-1, 5], [5, 5], [5, 3], [9, 3], [9, 1], [11, 1]],
  ]),
];

/** Where a pest `dist` pixels along `route` stands, and which way it faces (-1 left, 1 right). */
export function pathPoint(route: Route, dist: number) {
  const { points, segments } = route;
  let left = Math.max(0, dist);
  for (let i = 0; i < segments.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (left <= segments[i] || i === segments.length - 1) {
      const t = Math.min(1, left / segments[i]);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, facing: b.x < a.x ? -1 : 1 };
    }
    left -= segments[i];
  }
  return { ...points[points.length - 1], facing: 1 };
}
