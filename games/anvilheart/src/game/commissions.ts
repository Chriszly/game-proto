import { MAX_TIER } from './swords';

// The royal commissions: one long goal pinned in the top bar. Each asks the smithy to deliver a
// great sword (or several), dragged onto the banner, and pays a big purse and a guild star. Once
// it is done the next, harder one follows, up to the Crown Blade, which wins the smithy.

export interface Commission {
  /** The sword the crown wants delivered. */
  tier: number;
  /** How many of it must be delivered. */
  count: number;
  /** Coins paid on completion, on top of a guild star. */
  reward: number;
  /** The banner's title, when it is not the sword's name. */
  title?: string;
}

export const COMMISSIONS: Commission[] = [
  { tier: 6, count: 1, reward: 500 },
  { tier: 7, count: 1, reward: 1200 },
  { tier: 8, count: 1, reward: 3000 },
  { tier: 8, count: 2, reward: 6000 },
  { tier: 8, count: 3, reward: 9000 },
  // The last: an Anvilheart for the crown. Delivering it wins the smithy.
  { tier: MAX_TIER, count: 1, reward: 20000, title: 'The Crown Blade' },
];

/** The commission at `level` (0 for the first), or null once the Crown Blade is delivered. */
export const commissionAt = (level: number): Commission | null => COMMISSIONS[level] ?? null;
