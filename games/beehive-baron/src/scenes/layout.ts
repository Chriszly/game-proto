import Phaser from 'phaser';
import { FLOWERS, GRID } from '../game/state';

// Where things are drawn in the 960x540 view: the hive with its comb on the left, the meadow the
// bees fly to on the top right, and the buttons on a board below the meadow.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;

/** The comb: the centre of the top left cell and each hexagon's radius (pointy side up). */
export const COMB = { x: 104, y: 132, r: 34 };
const HEX_W = Math.sqrt(3) * COMB.r;
const ROW_H = 1.5 * COMB.r;
export const cellCentre = (slot: number) => {
  const col = slot % GRID.cols;
  const row = Math.floor(slot / GRID.cols);
  return { x: COMB.x + col * HEX_W + (row % 2) * (HEX_W / 2), y: COMB.y + row * ROW_H };
};
/** The six corners of a cell's hexagon, `inset` pixels in from its edge. */
export function hexPoints(slot: number, inset = 0) {
  const c = cellCentre(slot);
  const r = COMB.r - inset;
  return [...Array(6).keys()].map((i) => {
    const a = ((60 * i - 90) * Math.PI) / 180;
    return new Phaser.Math.Vector2(c.x + r * Math.cos(a), c.y + r * Math.sin(a));
  });
}
/** The comb spot under a point, or null: the nearest centre, if the point is inside its hexagon. */
export function cellAt(x: number, y: number) {
  let best: number | null = null;
  let bestD = Infinity;
  for (let slot = 0; slot < GRID.cols * GRID.rows; slot++) {
    const c = cellCentre(slot);
    const d = Math.hypot(x - c.x, y - c.y);
    if (d < bestD) [best, bestD] = [slot, d];
  }
  return bestD <= HEX_W / 2 ? best : null;
}

/** The hive box's top left corner (it frames the comb), and the entrance the bees fly in and out of. */
export const HIVE = { x: 48, y: 52 };
export const ENTRANCE = { x: 233, y: 338 };
/** Where the bees at home rest: eight side by side on the landing board, the rest on the hive above them. */
export const homeSpot = (i: number) => ({ x: ENTRANCE.x - 105 + (i % 8) * 30, y: ENTRANCE.y + 6 - Math.floor(i / 8) * 24 });

/** The flowers in the meadow the foragers visit. */
export const flowerSpot = (i: number) => ({ x: 590 + (i % FLOWERS) * 66, y: i % 2 ? 196 : 160 });

/** The shelf of honey jars waiting to be sold, under the hive. */
export const SHELF = { x: 80, y: 472, jarGap: 34, jars: 10 };

/** The board under the meadow with the buttons, by their centres. */
export const BOARD = { x: 530, y: 294, w: 420, h: 212 };
export const SEND_BUTTON = { x: 635, y: 330, w: 190, h: 48 };
export const SELL_BUTTON = { x: 845, y: 330, w: 190, h: 48 };
export const SHOP_BUTTONS = { xs: [635, 845], ys: [400, 462], w: 190, h: 52 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
