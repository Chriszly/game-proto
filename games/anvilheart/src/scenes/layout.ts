import { ANVILS, BARREL, DESKS, GRID } from '../game/state';

// Where things are drawn in the 960x540 view: the forge on the left, the anvils in the middle and
// the counter with the adventurers on the right.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;

/** The furnace's flame window (its texture's top left corner and size), and the Forge button with its heat bar below it. */
export const FURNACE_WINDOW = { x: 80, y: 160, w: 100, h: 130 };
export const FORGE_BUTTON = { x: 130, y: 344, w: 180, h: 48 };
export const HEAT_BAR = { x: 40, y: 374, w: 180, h: 10 };
/** The renown meter at the right end of the top bar: its width, and the top and height of its panes. */
export const RENOWN_BAR = { w: 80, y: 15, h: 11 };
/** The royal commission's banner in the top bar, by its top left corner. */
export const BANNER = { x: 316, y: 4, w: 330, h: 32 };
/** The upgrade buttons, by their centres. */
export const UPGRADE_BUTTONS = { x: 130, ys: [410, 458, 506], w: 200, h: 42 };

/** The anvil board: its top left corner and the size of each cell (five columns, four rows). */
export const BOARD = { x: 240, y: 56, cell: 86 };
/** The quench barrel under the board's first column, by its centre; it is one cell big. */
export const BARREL_SPOT = { x: BOARD.x + BOARD.cell / 2, y: 450 };
/** Where the instructions sit, right of the barrel. */
export const HINT_SPOT = { x: 500, y: 450 };
export const slotCentre = (slot: number) =>
  slot === BARREL
    ? { ...BARREL_SPOT }
    : {
        x: BOARD.x + (slot % GRID.cols) * BOARD.cell + BOARD.cell / 2,
        y: BOARD.y + Math.floor(slot / GRID.cols) * BOARD.cell + BOARD.cell / 2,
      };
/** The anvil (or the barrel) under a point, or null. */
export function slotAt(x: number, y: number) {
  if (Math.abs(x - BARREL_SPOT.x) < BOARD.cell / 2 && Math.abs(y - BARREL_SPOT.y) < BOARD.cell / 2) return BARREL;
  const col = Math.floor((x - BOARD.x) / BOARD.cell);
  const row = Math.floor((y - BOARD.y) / BOARD.cell);
  if (col < 0 || row < 0 || col >= GRID.cols || row >= GRID.rows) return null;
  const slot = row * GRID.cols + col;
  return slot < ANVILS ? slot : null;
}
/** Whether a point is on the royal commission's banner, where swords are delivered. */
export const onBanner = (x: number, y: number) => x >= BANNER.x && x < BANNER.x + BANNER.w && y >= 0 && y < BANNER.y + BANNER.h + 4;

/** The row of swords discovered so far, under the board: one frame per tier, by its centre. */
export const DISCOVERED = { y: 515, size: 34, gap: 40 };
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

/** The Royal Smith panel over the board when the Crown Blade is delivered, by its top left corner. */
export const WIN_PANEL = { x: 250, y: 120, w: 420, h: 280 };

export const UI_DEPTH = 10_000;
export const FONT = 'Georgia, "Times New Roman", serif';
