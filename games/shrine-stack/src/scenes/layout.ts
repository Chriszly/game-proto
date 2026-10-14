// Where things are drawn in the 960x540 view. The temple itself is placed by `TOWER_X` and the
// sizes in src/game/state.ts.

export const VIEW = { w: 960, h: 540 };
/** The y of the plinth's top in the world; the camera scrolls up from here as the temple grows. */
export const PLINTH_Y = 468;
/** The camera keeps the temple's top at or below this height on screen. */
export const TOP_SCREEN_Y = 300;
/** The side panel on the left. */
export const PANEL = { x: 16, y: 16, w: 214, h: 508 };
/** The three blessing cards, by their centres. */
export const CARDS = { xs: [350, 590, 830], y: 268, w: 220, h: 196 };
export const BUTTON = { w: 200, h: 40 };
/** The offer's title, and the reroll button beside it, by their centres. */
export const OFFER_TITLE = { x: 520, y: 118 };
export const REROLL = { x: 842, y: 118, w: 156, h: 36 };
/** The curse toggle under the cards, by its centre. */
export const CURSE = { x: 590, y: 396, w: 700, h: 40 };
/** The shop's title and its row of buttons, by their centres. */
export const SHOP_TITLE = { x: 590, y: 432 };
export const SHOP_ROW = { xs: [372, 590, 808], y: 466, w: 200, h: 40 };
/** The button that ends a break after a wobbly tier, where the cards would be. */
export const BUILD_ON = { x: 590, y: 268, w: 240, h: 52 };
/** The goal box in the side panel: its top, and the size and gap of its tier pips. */
export const GOAL = { y: 360, pip: 13, gap: 2 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
