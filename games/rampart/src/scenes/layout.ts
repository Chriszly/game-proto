// Where things are drawn in the 960x540 view. The rules' own positions (field, wall face, tower
// front, bow) are in src/game/state.ts.

export const VIEW = { w: 960, h: 540 };
export const HUD_HEIGHT = 40;
/** The top of the hero's tower, and where the hero's feet stand on it. */
export const TOWER = { x: 78, y: 236 };
export const HERO_FEET = { x: 78, y: 250 };
/** The wall's top left corner. */
export const WALL = { x: 174, y: 262 };
export const XP_BAR = { x: 112, y: 514, w: 832, h: 16 };
export const BOSS_BAR = { x: 480, y: 66, w: 420, h: 14 };
/** The three upgrade cards on a level-up, by their centres. */
export const CARDS = { xs: [240, 480, 720], y: 300, w: 220, h: 250 };
export const BUTTON = { w: 180, h: 40 };

export const UI_DEPTH = 10_000;
export const FONT = 'monospace';
