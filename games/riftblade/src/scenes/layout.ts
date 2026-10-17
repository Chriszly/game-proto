/** Screen layout, in game pixels of the 960x540 view. The world itself is open and endless. */

export const VIEW = { w: 960, h: 540 };
/** The hero always stands in the middle of the view; the camera follows. */
export const CENTER = { x: VIEW.w / 2, y: VIEW.h / 2 };

export const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';

/** The XP bar across the top edge. */
export const XP_BAR = { x: 0, y: 0, w: VIEW.w, h: 8 };
/** The health bar, top left, and the list of upgrades held under it. */
export const HP_BAR = { x: 16, y: 18, w: 220, h: 12 };
export const KIT = { x: 16, y: 58, row: 15 };
/** The run clock (top middle), the level (top right) and the boss's health bar. */
export const TIMER = { x: VIEW.w / 2, y: 30 };
export const LEVEL = { x: VIEW.w - 16, y: 22 };
export const BOSS_BAR = { x: VIEW.w / 2 - 160, y: 56, w: 320, h: 10 };
/** The round signature button, bottom right. */
export const SIG_BUTTON = { x: VIEW.w - 70, y: VIEW.h - 70, r: 42 };

/** The three hero cards of the select screen (centres). */
export const HERO_CARD = { w: 284, h: 372, y: 300, gap: 302 };
export function heroCardRect(i: number) {
  const cx = VIEW.w / 2 + (i - 1) * HERO_CARD.gap;
  return { x: cx - HERO_CARD.w / 2, y: HERO_CARD.y - HERO_CARD.h / 2, w: HERO_CARD.w, h: HERO_CARD.h };
}

/** The three level-up cards. */
export const LEVEL_CARD = { w: 254, h: 290, y: 296, gap: 276 };
export function levelCardRect(i: number, n = 3) {
  const cx = VIEW.w / 2 + (i - (n - 1) / 2) * LEVEL_CARD.gap;
  return { x: cx - LEVEL_CARD.w / 2, y: LEVEL_CARD.y - LEVEL_CARD.h / 2, w: LEVEL_CARD.w, h: LEVEL_CARD.h };
}

/** The end screen's "Run again" button. */
export const AGAIN = { x: VIEW.w / 2 - 110, y: 380, w: 220, h: 50 };

/** Draw order. */
export const DEPTH = { ground: 0, under: 1, pickups: 2, enemies: 3, allies: 4, hero: 5, bolts: 6, over: 7, pops: 8, hud: 20, overlay: 30 };

export type Rect = { x: number; y: number; w: number; h: number };
export const inside = (p: { x: number; y: number }, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
