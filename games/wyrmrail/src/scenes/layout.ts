import type { Tile } from '../game/map';

// Where things are drawn in the 960x540 view. The villages' places on the grid are in
// src/game/map.ts.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 44;

/** The board: the part of the view left of the panel, between the HUD and the hint line. */
export const BOARD = { x: 0, y: 48, w: 768, h: 448 };

/**
 * The valley seen isometrically: a tile is a diamond `tw` wide and `th` tall, and (`ox`, `oy`) is
 * the screen point of the grid's top corner (column 0, row 0). Columns run down to the right, rows
 * down to the left. `depth` is how deep the blocks under the tiles are.
 */
export const ISO = { ox: 288, oy: 84, tw: 76, th: 38, depth: 15 };

/** The screen point of a spot on the valley floor (`u` along columns, `v` along rows, in tiles), `z` pixels up. */
export const iso = (u: number, v: number, z = 0) => ({ x: ISO.ox + ((u - v) * ISO.tw) / 2, y: ISO.oy + ((u + v) * ISO.th) / 2 - z });

/** The centre of a tile on screen, on the valley floor. */
export const tileCenter = (t: Tile) => iso(t.c + 0.5, t.r + 0.5);

/** The tile under a screen point (it may be off the grid). */
export function tileAt(x: number, y: number): Tile {
  const a = (x - ISO.ox) / (ISO.tw / 2);
  const b = (y - ISO.oy) / (ISO.th / 2);
  return { c: Math.floor((a + b) / 2), r: Math.floor((b - a) / 2) };
}

/** Draw order for things standing on the valley: further down the screen is in front. */
export const groundDepth = (y: number) => 100 + y;

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

/** How far behind the head each of the wyrm's parts rides along the track, in pixels: three coils, then two wagons. */
export const SEGMENT_GAPS = [0, 17, 31, 44, 68, 96];

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
