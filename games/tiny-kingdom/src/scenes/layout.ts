// Where things are drawn in the 960x540 view. The art in src/art is painted in art units, twice these.

export const VIEW = { w: 960, h: 540 };
/** The board: its top left corner, its size in cells, and each cell's size in pixels. */
export const GRID = { x: 24, y: 46, cols: 10, rows: 7, cell: 64 };
/** The walnut tray the board sits in. */
export const TRAY = { x: 18, y: 40, w: 652, h: 460 };
/** The royal decree's sign above the board. */
export const DECREE = { x: 24, y: 6, w: 644, h: 30 };
/** The side panel on the right. */
export const PANEL = { x: 688, y: 24, w: 252, h: 492 };
/** The title plaque at the top of the panel. */
export const TITLE = { x: 697, y: 31, w: 234, h: 32 };
/** The goal bar under the score. */
export const GOAL_BAR = { x: 704, y: 128, w: 220, h: 16 };
/** The row under the goal bar showing the two gifts on offer for reaching it. */
export const GIFT_ROW = { x: 704, y: 150, h: 22 };
/** The tile buttons, by their centres, in the order they are shown: three big ones, or four once the windmill is won. */
export const TILE_BUTTONS = { x: 814, w: 228, three: { ys: [218, 314, 410], h: 84 }, four: { ys: [209, 280, 351, 422], h: 64 } };
/** The undo button under the tile buttons, by its centre. */
export const UNDO_BUTTON = { x: 814, y: 474, w: 228, h: 28 };
/** The gift choice card over the board, by its centre, and its two buttons. */
export const GIFT_CARD = { x: 346, y: 270, w: 440, h: 220, button: { w: 190, h: 96, dx: 100, dy: 30 } };
export const BUTTON = { w: 200, h: 40 };

export const UI_DEPTH = 10_000;
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** The middle of the cell at (col, row), in view pixels. */
export const cellCentre = (col: number, row: number) => ({
  x: GRID.x + col * GRID.cell + GRID.cell / 2,
  y: GRID.y + row * GRID.cell + GRID.cell / 2,
});
