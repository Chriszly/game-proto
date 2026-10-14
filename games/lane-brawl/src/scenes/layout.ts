// Where things sit on the 960x540 screen. The map itself is drawn in world pixels and scrolls.

export const VIEW = { w: 960, h: 540 };
export const FONT = 'monospace';

export const TOP_BAR = { x: 0, y: 0, w: VIEW.w, h: 34 };
export const BOTTOM_BAR = { x: 0, y: 412, w: VIEW.w, h: 128 };

/** The champion's portrait, health and experience at the bottom left. */
export const PORTRAIT = { x: 12, y: 420, w: 214, h: 112 };

/** Q, W, E and R, in a row. */
export const ABILITY_BOX = { x0: 240, y: 428, size: 58, gap: 8 };
export function abilityBox(i: number) {
  return { x: ABILITY_BOX.x0 + i * (ABILITY_BOX.size + ABILITY_BOX.gap), y: ABILITY_BOX.y, w: ABILITY_BOX.size, h: ABILITY_BOX.size };
}

export const SHOP_BUTTON = { x: 508, y: 428, w: 96, h: 58 };
/** The minimap, showing the whole map in the bottom right corner. */
export const MINIMAP = { x: 790, y: 420, w: 158, h: 106 };

/** The shop panel, opened with the button or the B key. */
export const SHOP_PANEL = { x: 260, y: 96, w: 440, h: 240 };
export function shopRow(i: number) {
  return { x: SHOP_PANEL.x + 16, y: SHOP_PANEL.y + 58 + i * 60, w: SHOP_PANEL.w - 32, h: 52 };
}

/** The five champion cards on the pick screen. */
export const PICK_CARD = { w: 168, h: 226, gap: 12, y: 150 };
export function pickCard(i: number) {
  const total = 5 * PICK_CARD.w + 4 * PICK_CARD.gap;
  return { x: (VIEW.w - total) / 2 + i * (PICK_CARD.w + PICK_CARD.gap), y: PICK_CARD.y, w: PICK_CARD.w, h: PICK_CARD.h };
}

/** The panel and button shown when a match is won or lost. */
export const END_PANEL = { x: 280, y: 150, w: 400, h: 200 };
export const PLAY_AGAIN = { x: 380, y: 290, w: 200, h: 44 };
