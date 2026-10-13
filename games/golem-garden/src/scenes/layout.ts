// Where things are drawn in the 960x540 view. The board itself is `GRID` in src/game/board.ts.
export { GRID, cellCentre } from '../game/board';

export const VIEW = { w: 960, h: 540 };
/** The bar across the top with the wave, the Heartwood's health, sap and best. */
export const HUD = { y: 32 };
/** The side panel right of the board. */
export const PANEL = { x: 800, y: 64, w: 148, h: 448 };
/** The seed buttons, by their centres, in the order of GOLEMS. */
export const SEED_BUTTONS = { x: 874, ys: [130, 226], w: 136, h: 84 };
/** The button that sends the next wave. */
export const WAVE_BUTTON = { x: 874, y: 470, w: 136, h: 48 };
export const BUTTON = { w: 200, h: 40 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
