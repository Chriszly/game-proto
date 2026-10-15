import { MAX_TIER } from './swords';

// What can lie on an anvil, stored as one number so the board stays a plain array: a sword of tier
// 1 to MAX_TIER, a loose gem (`GEM`), or a sword with a gem set in its guard (its tier plus `SET`).

export const GEM = -1;
export const SET = 100;

/** The sword's tier, or 0 for a loose gem. */
export const tierOf = (item: number) => (item === GEM ? 0 : item > SET ? item - SET : item);
export const isGem = (item: number) => item === GEM;
export const isGemmed = (item: number) => item > SET;

/** Whether a saved number is something that can lie on an anvil. */
export const validItem = (item: unknown): item is number =>
  typeof item === 'number' && Number.isInteger(item) && (item === GEM || (item >= 1 && item <= MAX_TIER) || (item > SET && item <= SET + MAX_TIER));

/**
 * What `held` dropped on `there` makes, or null if they don't combine (they swap instead). Two
 * swords of a tier merge into the next (keeping a gem if either had one), and a gem sets into a
 * plain sword.
 */
export function combine(held: number, there: number): { item: number; merged: boolean } | null {
  const a = tierOf(held);
  const b = tierOf(there);
  if (a > 0 && a === b && a < MAX_TIER) {
    const tier = a + 1;
    return { item: isGemmed(held) || isGemmed(there) ? tier + SET : tier, merged: true };
  }
  if (isGem(held) && b > 0 && !isGemmed(there)) return { item: b + SET, merged: false };
  if (isGem(there) && a > 0 && !isGemmed(held)) return { item: a + SET, merged: false };
  return null;
}
