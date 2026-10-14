// Where the HUD sits, in the 960x540 game space. The world is drawn between the top bar and the panel.

export const W = 960;
export const H = 540;
export const TOP_H = 30;
export const PANEL_Y = 430;

/** The top bar's slots: icon x, and the x of the slanted bar before each slot. */
export const TOP_SLOTS = {
  wood: 8,
  food: 102,
  ore: 196,
  pop: 284,
  age: 386,
  clock: 492,
  faction: 576,
} as const;
/** Slanted bars between the slots, with their wool colours (in stitch.ts's T names). */
export const TOP_BARS: [number, 'red' | 'sage' | 'ochre' | 'indigo'][] = [
  [92, 'sage'],
  [186, 'ochre'],
  [274, 'indigo'],
  [376, 'red'],
  [482, 'sage'],
  [566, 'ochre'],
  [736, 'indigo'],
  [846, 'red'],
];
/** Where the three age pips sit. */
export const AGE_PIPS = { x: 424, y: 15, gap: 16, r: 6.5 };

/** The deeds card under the top bar, at the right. */
export const DEED_CARD = { x: 716, y: 36, w: 236, h: 92 };
/** The horn toast, centred under the top bar. */
export const TOAST = { x: 480, y: 38, w: 440, h: 24 };

/** Panel parts: the selection at the left, the buttons in the middle and the minimap at the right. */
export const SEL = { x: 12, y: PANEL_Y + 6, w: 276 };
export const BUTTONS = { x: 302, y: PANEL_Y + 7, w: 124, h: 30, dx: 130, dy: 34, cols: 4, rows: 3 };
export const BOON = { x: 302, y: PANEL_Y + 24, w: 252, h: 80, dx: 262 };
export const MINI = { x: 848, y: PANEL_Y + 8, s: 96 };
export const PANEL_BARS = [292, 828];
