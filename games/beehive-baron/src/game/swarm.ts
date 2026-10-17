// Swarming: a hive full of bees whose comb has no spot left gets ready to swarm. Let it go and
// half the bees leave; pay to catch the swarm and it settles in a second hive with its own comb
// and its own queen, so the hive is no longer capped at 20 cells or 12 bees.

/** How long a crowded hive takes to swarm, and what catching the swarm into a second hive costs. */
export const SWARM_MS = 45_000;
export const CATCH_PRICE = 180;
/** How many hives a baron can keep. */
export const MAX_HIVES = 2;

/** The queen picked for the second hive when the swarm is caught; her bees are the swarm's and the ones her brood hatches. */
import type { TextKey } from '../i18n';

export type Queen = 'gentle' | 'hardy' | 'busy';
export const QUEENS: Record<Queen, { name: TextKey; blurb: TextKey }> = {
  gentle: { name: 'gentleQueen', blurb: 'wasplessComb' },
  hardy: { name: 'hardyQueen', blurb: 'eatsHalf' },
  busy: { name: 'busyQueen', blurb: 'plusNectar' },
};
export const QUEEN_IDS = Object.keys(QUEENS) as Queen[];
/** Extra nectar a trip for a Busy queen's bees. */
export const BUSY_NECTAR = 1;
