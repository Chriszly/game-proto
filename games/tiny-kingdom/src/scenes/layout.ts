// Where things are drawn in the 960x540 view.

export const VIEW = { w: 960, h: 540 };
/** The board: its top left corner, its size in cells, and each cell's size in pixels. */
export const GRID = { x: 24, y: 46, cols: 10, rows: 7, cell: 64 };
/** The side panel on the right. */
export const PANEL = { x: 688, y: 24, w: 252, h: 492 };
/** The goal bar under the score. */
export const GOAL_BAR = { x: 704, y: 128, w: 220, h: 16 };
/** The three tile buttons, by their centres, in the order of BUILDINGS. */
export const TILE_BUTTONS = { x: 814, ys: [218, 314, 410], w: 228, h: 84 };
/** The undo button under the tile buttons, by its centre. */
export const UNDO_BUTTON = { x: 814, y: 474, w: 228, h: 28 };
export const BUTTON = { w: 200, h: 40 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';

/** The middle of the cell at (col, row), in view pixels. */
export const cellCentre = (col: number, row: number) => ({
  x: GRID.x + col * GRID.cell + GRID.cell / 2,
  y: GRID.y + row * GRID.cell + GRID.cell / 2,
});
