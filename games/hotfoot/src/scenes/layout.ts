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
/** The miniature's gold frame: the painted scene sits inside it, the vellum margin round it. */
export const FRAME = { x: 7, y: 42, w: 946, bottom: GROUND_Y + 11 };
/** The run track under the HUD: its vellum strip, and the ruled line from 0 m to its end. */
export const TRACK = { left: 220, right: 710, x0: 320, x1: 640, y: 54, h: 22 };
/** The stage's tag right of the run track: its ground and road, or the boss's stomps left. */
export const TAG = { x: 718, y: 43, w: 232, h: 22 };
/** The herald's dare under the tag, with its progress. */
export const DARE_TAG = { x: 718, y: 69, w: 232, h: 20 };
/** The stage's title, shown as it begins: its name and its rule. */
export const STAGE_TITLE = { x: 560, y: 150 };
/** The armoury panel's rows, by their centres' y, and the panel's size. */
export const ARMOURY_PANEL = { w: 640, h: 440, rowY: [-80, 10, 100] };
/** The streak chip in the HUD. */
export const STREAK_CHIP = { x: 565, y: 8, w: 98, h: 24 };
/** The scrollwork in the margin under the road, and the rubric caption. */
export const MARGIN = { scrollY: 487, captionX: 35, captionY: 525 };
/** The boon cards at a checkpoint, by their centres: two of them, or three after a met dare. The road cards use the two. */
export const CARDS = { xs: { 2: [330, 630], 3: [205, 480, 755] } as Record<number, number[]>, y: 300, w: 250, h: 260 };
export const BUTTON = { w: 180, h: 40 };
/** The round Slide and Jump buttons in the margin's bottom right, shown on touch screens: their centres and radius. */
export const ACTION_BUTTONS = { y: 490, r: 40, slideX: 780, jumpX: 890 };

export const UI_DEPTH = 10_000;
export const FONT = 'Georgia, "Times New Roman", "DejaVu Serif", serif';
