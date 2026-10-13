// Where things are drawn in the 960x540 view. The rules' own sizes (the knight's box, jump and
// trap heights) are in src/game/state.ts.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;
/** The top of the road, where the knight's feet run. */
export const GROUND_Y = 430;
/** Where the knight runs across the screen; the course scrolls past. */
export const RUNNER_X = 220;
/** Taps above this line jump, taps below it slide. */
export const TAP_SPLIT_Y = VIEW.h / 2;
/** The two boon cards at a checkpoint, by their centres. */
export const CARDS = { xs: [330, 630], y: 300, w: 250, h: 260 };
export const BUTTON = { w: 180, h: 40 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
