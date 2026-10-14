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
export const CARDS = { xs: [350, 590, 830], y: 300, w: 220, h: 220 };
export const BUTTON = { w: 200, h: 40 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
