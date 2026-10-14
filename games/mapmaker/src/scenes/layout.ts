// Where things are drawn in the 960x540 view. The island grid's size is GRID in src/game/state.ts.

export const VIEW = { w: 960, h: 540 };
/** The top-left corner of the island map and the size of a tile, in screen pixels. */
export const MAP = { x: 24, y: 64, tile: 40 };
/** The side panel with the supplies, coins, commission and the Return to port button. */
export const PANEL = { x: 652, y: 24, w: 284, h: 492 };
export const RETURN_BUTTON = { x: PANEL.x + PANEL.w / 2, y: 476 };
/** The chart and harbor overlay, centred over the map. */
export const OVERLAY = { x: 324, y: 284, w: 560, h: 420 };
/** The overlay's main button: Sell chart, then Set sail. */
export const OVERLAY_BUTTON = { x: OVERLAY.x, y: OVERLAY.y + OVERLAY.h / 2 - 40 };
/** The harbor's upgrade rows: the first row's y, the gap between rows, and the Buy buttons' x. */
export const SHOP = { y: 184, gap: 56, buyX: OVERLAY.x + 196 };
export const BUTTON = { w: 200, h: 40 };
export const SMALL_BUTTON = { w: 96, h: 34 };

export const UI_DEPTH = 10_000;
export const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** The screen centre of tile (x, y). */
export const tileCentre = (x: number, y: number) => ({
  x: MAP.x + (x + 0.5) * MAP.tile,
  y: MAP.y + (y + 0.5) * MAP.tile,
});
