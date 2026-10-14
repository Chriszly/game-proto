// Where things are drawn in the 960x540 view. The rules' own positions (field, barricade face, hero,
// bow) are in src/game/state.ts.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;
/** Where the hero's feet stand, on the road behind the barricade. */
export const HERO_FEET = { x: 66, y: 418 };
/** The barricade texture's top left corner (its log stands at x 182, from y 264 down). */
export const BARRICADE = { x: 112, y: 250 };
export const XP_BAR = { x: 112, y: 514, w: 752, h: 16 };
/** The 1x/2x speed switch, right of the experience bar, by its centre. */
export const SPEED = { x: 908, y: 522, w: 60, h: 22 };
/** The boss's stacked health bars, by their top centre, right of the wave track. */
export const BOSS_BAR = { x: 640, y: 66, w: 400, h: 14 };
/** The wave track under the top bar: its panel, and the first of its ten marks and their spacing. */
export const TRACK = { x: 12, y: 46, w: 344, h: 46, markX: 22, markY: 77, step: 27 };
/** The Arrow Rain button above the ranger, by its centre, and its radius for taps and drags. */
export const RAIN = { x: 66, y: 308, r: 26 };
/** The "Drag onto the horde" hint over the field while Arrow Rain is charged. */
export const RAIN_HINT = { x: 715, y: 220 };
/** The kill streak chip over the experience bar, by its centre. */
export const STREAK = { x: 650, y: 499, w: 168, h: 21 };
/** The three upgrade cards on a level-up, by their centres. */
export const CARDS = { xs: [240, 480, 720], y: 300, w: 220, h: 250 };
/** The auto-pick countdown under the cards: its text's centre, and the width and height of its bar. */
export const COUNTDOWN = { x: 480, y: 450, w: 160, h: 6 };
/** The "Skill book" button in the top bar, and the book it opens: its size and the grid of slots. */
export const SKILL_BOOK = {
  button: { x: 520, y: 20, w: 150, h: 26 },
  panel: { w: 900, h: 500 },
  cols: 3,
  colW: 290,
  rowH: 62,
  /** The top of the first row. */
  top: 92,
};
export const BUTTON = { w: 180, h: 40 };

export const UI_DEPTH = 10_000;
export const FONT = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
