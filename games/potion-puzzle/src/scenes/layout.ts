// Where things are drawn in the 960x540 view.

export const VIEW = { w: 960, h: 540 };
/** The board's top left corner and the size of a cell. */
export const BOARD = { x: 46, y: 46, cell: 56 };
/** The order panel on the right. */
export const PANEL = { x: 536, y: 30, w: 394, h: 480 };
/** One row per ingredient the order asks for, from the top. */
export const NEEDS = { x: 566, y: 236, row: 56, barX: 608, barW: 220, barH: 14 };
export const BUTTON = { w: 200, h: 44 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';

export const cellX = (col: number) => BOARD.x + col * BOARD.cell + BOARD.cell / 2;
export const cellY = (row: number) => BOARD.y + row * BOARD.cell + BOARD.cell / 2;
