import { MAX_TIER } from './swords';

// The royal commission: one long goal pinned in the top bar. Each asks the smithy to make a great
// sword (or, past the Dragonslayer, several of them) and pays a big purse and a guild star. Once it
// is done the next, harder one follows.

export interface Commission {
  /** The sword the crown wants made. */
  tier: number;
  /** How many of it must be made while this commission stands. */
  count: number;
  /** Coins paid on completion, on top of a guild star. */
  reward: number;
}

/** The first three ask for one each of the top three swords. */
const FIRST: Commission[] = [
  { tier: 6, count: 1, reward: 500 },
  { tier: 7, count: 1, reward: 1200 },
  { tier: 8, count: 1, reward: 3000 },
];

/** The commission at `level` (0 for the first); after the listed ones, ever more Dragonslayers. */
export function commissionAt(level: number): Commission {
  if (level < FIRST.length) return FIRST[level];
  const count = level - FIRST.length + 2;
  return { tier: MAX_TIER, count, reward: 3000 * count };
}
