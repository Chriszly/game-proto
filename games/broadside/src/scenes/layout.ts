// Where things are drawn in the 960x540 view. The sea itself is WORLD in src/game/state.ts, and
// the camera follows the player's ship across it.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;
/** The two helm buttons, held to turn: port (left) and starboard (right), by their centres. */
export const HELM = { port: { x: 86, y: 456 }, starboard: { x: 874, y: 456 }, r: 62 };
/**
 * The two fire controls, held to aim and charge a broadside and let go to fire it: each above the
 * helm wheel on its own side, clear of it, so one thumb can steer while the other fires.
 */
export const FIRE = { port: { x: 86, y: 314 }, starboard: { x: 874, y: 314 }, r: 44 };
/** The captain's order card under the top bar, by its top-left corner. */
export const ORDER_CARD = { x: 16, y: 50 };
/** The harbor panel between waves, by its centre, with one row per thing to buy. */
export const HARBOR = { x: 480, y: 290, w: 660, h: 460, rowW: 600, rowH: 34, firstRowY: 164, rowGap: 36, loadY: 436 };
/** The prize draft at the harbor: three cards side by side, by the middle card's centre, each `w` by `h` and `gap` apart. */
export const DRAFT = { x: 480, y: 300, w: 196, h: 250, gap: 16, titleY: 118 };
/** The game-over panel, by its centre: the ship choice (`shipY`, `shipW` buttons) above the Admiralty's rewards as rows. */
export const OVER = { x: 480, y: 290, w: 620, h: 460, rowW: 520, rowH: 30, firstRowY: 290, rowGap: 35, shipY: 248, shipW: 164 };
/** The wind rose under the top bar on the right, by its centre. */
export const WIND = { x: 904, y: 98, r: 34 };
/** The Admiralty's bounty for the wave, written under the captain's order card, by its left edge. */
export const BOUNTY = { x: 18, y: 128 };
/** The button to scuttle a prize, under the bounty, by its centre. */
export const SCUTTLE = { x: 166, y: 166, w: 300, h: 36 };
export const BUTTON = { w: 200, h: 42 };

export const UI_DEPTH = 10_000;
export const FONT = "Georgia, 'Times New Roman', Times, serif";
