import { MAX_TIER } from './swords';

// What can lie on an anvil, stored as one number so the board stays a plain array: a sword of tier
// 1 to MAX_TIER, a loose gem (`GEM`), or a sword with flags added: `SET` for a gem set in its
// guard, `BATTERED` for one a hero brought back from a quest, or both.

export const GEM = -1;
export const SET = 100;
export const BATTERED = 200;

/** The sword's tier, or 0 for a loose gem. */
export const tierOf = (item: number) => (item === GEM ? 0 : item % 100);
export const isGem = (item: number) => item === GEM;
export const isGemmed = (item: number) => item > 0 && Math.floor(item / SET) % 2 === 1;
export const isBattered = (item: number) => item >= BATTERED;
/** A sword of `tier` with its flags. */
export const sword = (tier: number, gemmed = false, battered = false) => tier + (gemmed ? SET : 0) + (battered ? BATTERED : 0);

/** Whether a saved number is something that can lie on an anvil. */
export const validItem = (item: unknown): item is number =>
  typeof item === 'number' && Number.isInteger(item) && (item === GEM || (item > 0 && item < BATTERED + SET + 100 && tierOf(item) >= 1 && tierOf(item) <= MAX_TIER));

/**
 * What `held` dropped on `there` makes, or null if they don't combine (they swap instead). Two
 * swords of a tier merge into the next (keeping a gem if either had one, and reforged whole if
 * either was battered), a gem sets into a plain sword, and a Rusty Dagger repairs a battered sword.
 */
export function combine(held: number, there: number): { item: number; merged: boolean; repaired?: boolean } | null {
  const a = tierOf(held);
  const b = tierOf(there);
  if (a > 0 && a === b && a < MAX_TIER) return { item: sword(a + 1, isGemmed(held) || isGemmed(there)), merged: true };
  if (isGem(held) && b > 0 && !isGemmed(there)) return { item: there + SET, merged: false };
  if (isGem(there) && a > 0 && !isGemmed(held)) return { item: held + SET, merged: false };
  if (a === 1 && !isBattered(held) && isBattered(there)) return { item: there - BATTERED, merged: false, repaired: true };
  if (b === 1 && !isBattered(there) && isBattered(held)) return { item: held - BATTERED, merged: false, repaired: true };
  return null;
}
