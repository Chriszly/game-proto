// Where things are drawn in the 960x540 view. The rules' own positions (field, barricade face, hero,
// bow) are in src/game/state.ts.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;
/** Where the hero's feet stand, on the road behind the barricade. */
export const HERO_FEET = { x: 66, y: 418 };
/** The barricade's top left corner. */
export const BARRICADE = { x: 150, y: 262 };
export const XP_BAR = { x: 112, y: 514, w: 752, h: 16 };
/** The 1x/2x speed switch, right of the experience bar, by its centre. */
export const SPEED = { x: 908, y: 522, w: 60, h: 22 };
export const BOSS_BAR = { x: 480, y: 66, w: 420, h: 14 };
/** The three upgrade cards on a level-up, by their centres. */
export const CARDS = { xs: [240, 480, 720], y: 300, w: 220, h: 250 };
/** The auto-pick countdown under the cards: its text's centre, and the width and height of its bar. */
export const COUNTDOWN = { x: 480, y: 450, w: 160, h: 6 };
/** The "Upgrades" button in the top bar, and the panel it opens: its size and the grid of upgrades. */
export const UPGRADE_LIST = {
  button: { x: 525, y: 20, w: 130, h: 26 },
  panel: { w: 840, h: 460 },
  cols: 3,
  colW: 270,
  rowH: 50,
  /** The top of the first row. */
  top: 120,
};
export const BUTTON = { w: 180, h: 40 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
