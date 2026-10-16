// The county honey fair, the game's ending: once the Heather Moor is open, enter one jar of each
// kind straight from a capped cell. A jar scores the edges its cell shares with built cells, so
// honey from a well-joined comb scores higher. Enough points in all takes gold, which makes the
// player the Beehive Baron.

import type { Kind } from './honey';

/** Points in all (over the three kinds, each up to 6) that win gold. */
export const FAIR_GOLD = 14;

/** The best entry of each kind so far, as its points, or null while none is entered. */
export type FairEntries = Record<Kind, number | null>;
export const noEntries = (): FairEntries => ({ clover: null, lavender: null, heather: null });
