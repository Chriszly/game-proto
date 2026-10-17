// Where things are drawn in the 960x540 view. The sea itself is WORLD in src/game/state.ts, and
// the camera follows the player's ship across it.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;
/**
 * The two helm buttons, held to turn: port (left) and starboard (right), by their centres. They sit
 * high enough to keep clear of the shared corner buttons (full screen, sound, pause) at the bottom left.
 */
export const HELM = { port: { x: 86, y: 420 }, starboard: { x: 874, y: 420 }, r: 62 };
/**
 * The two fire controls, held to aim and charge a broadside and let go to fire it: each above the
 * helm wheel on its own side, clear of it, so one thumb can steer while the other fires.
 */
export const FIRE = { port: { x: 86, y: 286 }, starboard: { x: 874, y: 286 }, r: 44 };
/** The captain's order card under the top bar, by its top-left corner. */
export const ORDER_CARD = { x: 16, y: 50 };
/** The harbor panel between waves, by its centre, with one row per thing to buy. */
export const HARBOR = { x: 480, y: 272, w: 660, h: 510, rowW: 600, rowH: 34, firstRowY: 132, rowGap: 36, loadY: 440 };
/** The two sail buttons that replace "Set sail" when the harbor offers a choice of course, each `w` by `h`. */
export const COURSE = { w: 292, h: 46, gap: 12 };
/** The prize draft at the harbor: three (after a Hunter patrol four) cards side by side, centred, by the middle card's centre, each `w` by `h` and `gap` apart. */
export const DRAFT = { x: 480, y: 300, w: 196, h: 250, gap: 16, titleY: 118 };
/** The game-over panel, by its centre: the ship choice (`shipY`, `shipW` buttons) above the Admiralty's rewards as rows. */
export const OVER = { x: 480, y: 290, w: 620, h: 460, rowW: 520, rowH: 30, firstRowY: 290, rowGap: 35, shipY: 248, shipW: 164 };
/** The wind rose under the top bar on the right, by its centre. */
export const WIND = { x: 904, y: 98, r: 34 };
/** The Admiralty's bounty for the wave, written under the captain's order card, by its left edge. */
export const BOUNTY = { x: 18, y: 128 };
/** The convoy's line on convoy waves, under the bounty (or in its place), by its left edge. */
export const CONVOY = { x: 18, y: 146 };
/** The button to scuttle a prize, under the bounty and the convoy, by its centre. */
export const SCUTTLE = { x: 166, y: 184, w: 300, h: 36 };
export const BUTTON = { w: 200, h: 42 };

export const UI_DEPTH = 10_000;
export const FONT = "Georgia, 'Times New Roman', Times, serif";
