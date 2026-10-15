import { BARREL as BARREL_PLACE, DESKS, GRID } from '../game/state';

// Where things are drawn in the 960x540 view: the forge on the left, the anvils in the middle and
// the counter with the adventurers on the right.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;

/** The furnace's flame window (its texture's top left corner and size), and the Forge button with its heat bar below it. */
export const FURNACE_WINDOW = { x: 80, y: 160, w: 100, h: 130 };
export const FORGE_BUTTON = { x: 130, y: 344, w: 180, h: 48 };
export const HEAT_BAR = { x: 40, y: 374, w: 180, h: 10 };
/** The royal commission's banner in the top bar, by its top left corner. Swords are delivered by dropping them on it. */
export const BANNER = { x: 316, y: 4, w: 330, h: 32 };
export const onBanner = (x: number, y: number) => x >= BANNER.x && x < BANNER.x + BANNER.w && y >= 0 && y < BANNER.y + BANNER.h + 6;
/** The guild reputation meter, top left above the furnace, by its top left corner. */
export const REPUTATION = { x: 30, y: 50, w: 200, h: 46, segments: 10 };
/** The upgrade buttons, by their centres. */
export const UPGRADE_BUTTONS = { x: 130, ys: [410, 458, 506], w: 200, h: 42 };

/** The anvil board (five rows, the last one bought): its top left corner and the size of each cell. */
export const BOARD = { x: 244, y: 50, cell: 86 };
/** How big a sword or anvil is drawn on the board, against the 100px cell it was painted for. */
export const CELL_SCALE = BOARD.cell / 100;
/** The fifth row's box while it is not bought yet, with its build button. */
export const ROW_BOX = { x: BOARD.x, y: BOARD.y + GRID.rows * BOARD.cell, w: GRID.cols * BOARD.cell, h: BOARD.cell };
export const ROW_BUTTON = { x: BOARD.x + (GRID.cols * BOARD.cell) / 2, y: ROW_BOX.y + 56, w: 250, h: 36 };
/** The quench barrel beside the board, by its centre. */
export const BARREL = { x: 636, y: 428, w: 72, h: 92 };
export const slotCentre = (slot: number) => ({
  x: BOARD.x + (slot % GRID.cols) * BOARD.cell + BOARD.cell / 2,
  y: BOARD.y + Math.floor(slot / GRID.cols) * BOARD.cell + BOARD.cell / 2,
});
/** The anvil under a point, or null. */
export function slotAt(x: number, y: number) {
  const col = Math.floor((x - BOARD.x) / BOARD.cell);
  const row = Math.floor((y - BOARD.y) / BOARD.cell);
  if (col < 0 || row < 0 || col >= GRID.cols || row >= GRID.maxRows) return null;
  return row * GRID.cols + col;
}
/** The anvil or the barrel (`BARREL_PLACE`) under a point, or null. */
export function placeAt(x: number, y: number) {
  if (Math.abs(x - BARREL.x) <= BARREL.w / 2 && Math.abs(y - BARREL.y) <= BARREL.h / 2) return BARREL_PLACE;
  return slotAt(x, y);
}

/** The row of swords discovered so far, under the board: one frame per tier, by its centre. */
export const DISCOVERED = { y: 507, size: 36, gap: 40 };
export const discoveredCentre = (tier: number, tiers: number) => ({
  x: BOARD.x + (GRID.cols * BOARD.cell) / 2 + (tier - 1 - (tiers - 1) / 2) * DISCOVERED.gap,
  y: DISCOVERED.y,
});

/** The spots at the counter, from the top: each is a box with the adventurer and their order. */
export const DESK = { x: 682, y: 54, w: 262, h: 152, gap: 4 };
export const deskBox = (desk: number) => ({ x: DESK.x, y: DESK.y + desk * (DESK.h + DESK.gap), w: DESK.w, h: DESK.h });
export const deskCentre = (desk: number) => {
  const b = deskBox(desk);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
};
export function deskAt(x: number, y: number) {
  if (x < DESK.x || x >= DESK.x + DESK.w) return null;
  const desk = Math.floor((y - DESK.y) / (DESK.h + DESK.gap));
  return desk >= 0 && desk < DESKS && y - deskBox(desk).y < DESK.h ? desk : null;
}

/** Inside a desk, relative to its top left corner: the order card, its patience bar and the fit tag. */
export const ORDER = { x: 89, y: 8, w: 162, h: 100 };
export const PATIENCE = { x: 89, y: 125, w: 162, h: 12, segments: 12 };
export const TAG = { x: 9, y: 9, w: 75, h: 33 };

/** The window shown when the Crown Blade is delivered, by its centre. */
export const WIN = { x: 480, y: 270, w: 440, h: 230 };

export const UI_DEPTH = 10_000;
export const FONT = 'Georgia, "Times New Roman", serif';
