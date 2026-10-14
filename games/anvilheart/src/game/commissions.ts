// The royal commissions: long goals pinned in the top bar. Each asks the smithy to deliver great
// swords to the crown (dragged onto the banner) and pays a big purse and a guild star. The last one
// asks for the Crown Blade, an Anvilheart; delivering it names the smith Royal Smith and wins.

export interface Commission {
  /** The sword the crown wants delivered. */
  tier: number;
  /** How many of it must be delivered. */
  count: number;
  /** Coins paid on completion, on top of a guild star. */
  reward: number;
  /** The last commission: delivering it wins the smithy. */
  final?: boolean;
}

export const COMMISSIONS: Commission[] = [
  { tier: 6, count: 1, reward: 500 },
  { tier: 7, count: 1, reward: 1200 },
  { tier: 8, count: 1, reward: 3000 },
  { tier: 8, count: 2, reward: 6000 },
  { tier: 9, count: 1, reward: 10000, final: true },
];

/** The commission at `level` (0 for the first), or null once the Crown Blade has been delivered. */
export const commissionAt = (level: number): Commission | null => COMMISSIONS[level] ?? null;
