// Where the HUD and panels are drawn in the 960x540 view. The lanterns and the jar are placed by
// src/game/places.ts, since the rules move moths between them.

export const VIEW = { w: 960, h: 540 };
/** The bar across the top: night, hearths and coins on the left, dusk in the middle, lanterns lit on the right. */
export const HUD = { h: 40 };
/** The dusk bar, which empties as night comes. */
export const DUSK_BAR = { x: 330, y: 12, w: 300, h: 16 };
/** The panel shown between nights, with the night's tally and the upgrades. */
export const NIGHT_PANEL = { x: 480, y: 280, w: 600, h: 400 };
/** The upgrade buttons in that panel, by their centres, in the order of UPGRADE_IDS (two by two). */
export const SHOP = { xs: [345, 615], ys: [270, 350], w: 250, h: 66 };
/** The panel's "Next dusk" button, and the game-over "New keep" button. */
export const NEXT_BUTTON = { x: 480, y: 432 };
export const BUTTON = { w: 200, h: 40 };
/** The herald's order card, pinned under the HUD on the left. */
export const ORDER = { x: 12, y: 50, w: 256, h: 58 };
/** The gust warning plaque, beside the lantern the gust is coming for. */
export const GUST_TAG = { w: 132, h: 40 };
/** The tap area around each lantern. */
export const LANTERN_HIT = { w: 64, h: 72 };

export const UI_DEPTH = 10_000;
/** A system serif stack (no web fonts): the lettering of a carved puppet-theatre plaque. */
export const FONT = 'Georgia, "DejaVu Serif", "Times New Roman", serif';
