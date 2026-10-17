// The depth ladder: beating the Hollow Queen unlocks the next depth, and each depth stacks one more
// rule on the run. Depth 0 is the game as designed. The best depth unlocked is the game's one save.

import { t, type TextKey } from '../i18n';

const KEY = 'catacomb-best-depth';

/** How much tougher foes are at depth 1, and again at every depth past 3. */
export const DEPTH_FOE_HP = 0.2;
/** What a rest heals from depth 2 on, instead of REST_HEAL. */
export const DEEP_REST_HEAL = 0.15;
/** The curse the deck starts with from depth 3 on. */
export const DEPTH_CURSE = 'wound';

/** Each depth's new rule (keys of `i18n/en.ts`), for the hero panel and the README. */
export const DEPTH_RULES: TextKey[] = ['depthFoes', 'depthRest', 'depthWound', 'depthMore'];

/** The rules in force at this depth, as one line in the hub's language. */
export function depthText(depth: number) {
  if (depth <= 0) return t('depthNone');
  return DEPTH_RULES.slice(0, Math.min(depth, DEPTH_RULES.length)).map((rule) => t(rule)).join('. ') + '.';
}

/** The foes' health multiplier at this depth. */
export const depthFoeHp = (depth: number) => 1 + DEPTH_FOE_HP * ((depth >= 1 ? 1 : 0) + Math.max(0, depth - 3));

export function loadBestDepth() {
  try {
    const n = Number(localStorage.getItem(KEY) ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveBestDepth(depth: number) {
  try {
    localStorage.setItem(KEY, String(depth));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}
