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
/** The island button at the right of the round line: shows the island and opens the islands card. */
export const ISLAND_BUTTON = { x: 878, y: 82, w: 108, h: 22 };
/** The goal bar under the score. */
export const GOAL_BAR = { x: 704, y: 120, w: 220, h: 16 };
/** The row under the goal bar showing the two gifts on offer for reaching it. */
export const GIFT_ROW = { x: 704, y: 142, h: 22 };
/** The season strip under the gift row: the round's season and its rule. */
export const SEASON = { x: 704, y: 170, w: 220, h: 22 };
/**
 * The tile buttons, by their centres, in the order they are shown: three big ones, four once the
 * windmill is won, then two columns of slim ones (with the picked one's rule under them) for five
 * to seven.
 */
export const TILE_BUTTONS = {
  x: 814,
  w: 228,
  three: { ys: [238, 324, 410], h: 80 },
  four: { ys: [230, 296, 362, 428], h: 60 },
  grid: { xs: [755, 873], w: 110, h: 50, ys: [226, 280, 334, 388], ruleY: 418 },
};
/** The undo button under the tile buttons, by its centre. */
export const UNDO_BUTTON = { x: 814, y: 474, w: 228, h: 28 };
/** The gift choice card over the board, by its centre, and its two buttons. */
export const GIFT_CARD = { x: 346, y: 270, w: 440, h: 220, button: { w: 190, h: 96, dx: 100, dy: 30 } };
export const BUTTON = { w: 200, h: 40 };
/** The islands card over the board: the campaign's levels, the island of the day and a keypad for an island number. */
export const ISLANDS_CARD = {
  x: 346,
  y: 270,
  w: 600,
  h: 432,
  level: { y: 166, w: 62, h: 62, gap: 8 },
  daily: { x: 196, y: 302, w: 236, h: 72 },
  random: { x: 196, y: 384, w: 236, h: 48 },
  code: { x: 500, y: 282, w: 196, h: 34 },
  key: { x: 500, y: 328, w: 58, h: 34, gap: 6 },
  close: { x: 586, y: 82, w: 84, h: 28 },
};

export const UI_DEPTH = 10_000;
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** The middle of the cell at (col, row), in view pixels. */
export const cellCentre = (col: number, row: number) => ({
  x: GRID.x + col * GRID.cell + GRID.cell / 2,
  y: GRID.y + row * GRID.cell + GRID.cell / 2,
});
