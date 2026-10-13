// Where things are drawn in the 960x540 view. The sea itself is WORLD in src/game/state.ts, and
// the camera follows the player's ship across it.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;
/** The two helm buttons, held to turn: port (left) and starboard (right), by their centres. */
export const HELM = { port: { x: 86, y: 456 }, starboard: { x: 874, y: 456 }, r: 62 };
/** The harbor panel between waves, by its centre, with one row per thing to buy. */
export const HARBOR = { x: 480, y: 290, w: 660, h: 440, rowW: 600, rowH: 42, firstRowY: 168, rowGap: 48 };
export const BUTTON = { w: 200, h: 42 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
