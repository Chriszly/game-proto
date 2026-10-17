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
/** The planet ("2/4 Swamp world") and the credits, under the level. */
export const PLANET_TAG = { x: VIEW.w - 16, y: 44 };
export const CREDITS_TAG = { x: VIEW.w - 16, y: 63 };
export const BOSS_BAR = { x: VIEW.w / 2 - 160, y: 56, w: 320, h: 10 };
/** The round signature button, bottom right. */
export const SIG_BUTTON = { x: VIEW.w - 70, y: VIEW.h - 70, r: 42 };
/** The floating touch stick: rim radius (full speed there), knob radius and dead zone. */
export const STICK = { r: 60, knob: 24, dead: 6 };

/**
 * The hero select screen: two rows of six small cards on the left (the soldiers first, then the
 * knights, then Elara Voss and Triad-77), and the chosen hero's details on the right with the Fight
 * button.
 */
export const HERO_CARD = { w: 96, h: 196, top: 84, gap: 8, cols: 6, left: 14 };
export function heroCardRect(i: number) {
  const col = i % HERO_CARD.cols;
  const row = Math.floor(i / HERO_CARD.cols);
  return { x: HERO_CARD.left + col * (HERO_CARD.w + HERO_CARD.gap), y: HERO_CARD.top + row * (HERO_CARD.h + HERO_CARD.gap), w: HERO_CARD.w, h: HERO_CARD.h };
}
export const HERO_DETAIL = { x: 642, y: 84, w: 304, h: 400 };
export const FIGHT = { x: 658, y: 416, w: 272, h: 50 };

/** The new-hero panel shown mid-run, and its Continue button. */
export const UNLOCK = { x: VIEW.w / 2 - 200, y: 96, w: 400, h: 340 };
export const CONTINUE = { x: VIEW.w / 2 - 110, y: 362, w: 220, h: 48 };

/** The level-up cards: three, or four narrower and taller ones (Elara Voss's Hope). */
export const LEVEL_CARD = { w: 254, h: 290, y: 296, gap: 276 };
export const LEVEL_CARD4 = { w: 214, h: 316, y: 300, gap: 228 };
export function levelCardRect(i: number, n = 3) {
  const c = n > 3 ? LEVEL_CARD4 : LEVEL_CARD;
  const cx = VIEW.w / 2 + (i - (n - 1) / 2) * c.gap;
  return { x: cx - c.w / 2, y: c.y - c.h / 2, w: c.w, h: c.h };
}

/** The star map: the planet just cleared (left), the next one (right) and the nodes between. */
export const MAP = { from: { x: 120, y: 290 }, to: { x: 840, y: 290 }, node: { x: 400, r: 34, w: 300, h: 92 } };
export function mapNodeRect(i: number, n: number) {
  const cy = 290 + (i - (n - 1) / 2) * 118;
  return { x: MAP.node.x - 50, y: cy - MAP.node.h / 2, w: MAP.node.w, h: MAP.node.h };
}
/** Where a node's round icon sits. */
export function mapNodeSpot(i: number, n: number) {
  const r = mapNodeRect(i, n);
  return { x: MAP.node.x, y: r.y + r.h / 2 };
}

/** The trader's three offers and its two buttons. */
export const TRADE_CARD = { w: 236, h: 236, y: 268, gap: 256 };
export function tradeCardRect(i: number) {
  const cx = VIEW.w / 2 + (i - 1) * TRADE_CARD.gap;
  return { x: cx - TRADE_CARD.w / 2, y: TRADE_CARD.y - TRADE_CARD.h / 2, w: TRADE_CARD.w, h: TRADE_CARD.h };
}
export const REROLL = { x: VIEW.w / 2 - 250, y: 424, w: 230, h: 48 };
export const LEAVE = { x: VIEW.w / 2 + 20, y: 424, w: 230, h: 48 };

/** An event's two options. */
export function eventOptionRect(i: number) {
  return { x: VIEW.w / 2 - 300, y: 290 + i * 92, w: 600, h: 76 };
}

/** The end screen's "Run again" button. */
export const AGAIN = { x: VIEW.w / 2 - 110, y: 380, w: 220, h: 50 };

/** Draw order. */
export const DEPTH = { ground: 0, under: 1, pickups: 2, enemies: 3, allies: 4, hero: 5, bolts: 6, over: 7, pops: 8, hud: 20, overlay: 30 };

export type Rect = { x: number; y: number; w: number; h: number };
export const inside = (p: { x: number; y: number }, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
