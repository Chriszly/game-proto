import type { Tile } from '../game/map';

// Where things are drawn in the 960x540 view. The villages' places on the grid are in
// src/game/map.ts.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 44;

/** The valley's grid: its top left corner on screen and the size of a tile. */
export const GRID = { x: 0, y: 48, tile: 64 };

/** The centre of a tile on screen. */
export const tileCenter = (t: Tile) => ({ x: GRID.x + (t.c + 0.5) * GRID.tile, y: GRID.y + (t.r + 0.5) * GRID.tile });

/** The orders and upgrades panel on the right, by its centre line. */
export const PANEL = { x: 864, w: 176, top: 48 };
/** The order cards, by their centres. */
export const ORDER_CARD = { y: 108, h: 76, gap: 8 };
/** The upgrade buttons and the Remove track toggle, by their centres. */
export const BUTTONS = { wings: 356, hoard: 402, remove: 448, h: 40 };
/** The hint line under the grid. */
export const HINT_Y = 518;
/** The button on the game over panel. */
export const PANEL_BUTTON = { x: 384, y: 330 };

/** How far apart the wyrm's head, coils and wagon ride, along the track. */
export const SEGMENT_GAP = 26;

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
