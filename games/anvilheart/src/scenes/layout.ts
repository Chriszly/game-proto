import { DESKS, GRID } from '../game/state';

// Where things are drawn in the 960x540 view: the forge on the left, the anvils in the middle and
// the counter with the adventurers on the right.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;

/** The furnace's centre, and the Forge button with its heat bar below it. */
export const FURNACE = { x: 130, y: 196 };
export const FORGE_BUTTON = { x: 130, y: 344, w: 180, h: 48 };
export const HEAT_BAR = { x: 40, y: 374, w: 180, h: 10 };
/** The upgrade buttons, by their centres. */
export const UPGRADE_BUTTONS = { x: 130, ys: [410, 458, 506], w: 200, h: 42 };

/** The anvil board: its top left corner and the size of each cell. */
export const BOARD = { x: 256, y: 60, cell: 100 };
export const slotCentre = (slot: number) => ({
  x: BOARD.x + (slot % GRID.cols) * BOARD.cell + BOARD.cell / 2,
  y: BOARD.y + Math.floor(slot / GRID.cols) * BOARD.cell + BOARD.cell / 2,
});
/** The anvil under a point, or null. */
export function slotAt(x: number, y: number) {
  const col = Math.floor((x - BOARD.x) / BOARD.cell);
  const row = Math.floor((y - BOARD.y) / BOARD.cell);
  if (col < 0 || row < 0 || col >= GRID.cols || row >= GRID.rows) return null;
  return row * GRID.cols + col;
}

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

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
