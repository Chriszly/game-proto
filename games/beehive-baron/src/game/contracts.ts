// Orchard contracts: a farmer offers to borrow a few bees for a while to pollinate the orchard,
// and pays for them up front. The bees bring no nectar meanwhile, so idle bees get a second job.

/** Contracts come once this many jars are sold, so the first round has none. */
export const CONTRACTS_FROM = 5;
/** Game time between one contract ending (or lapsing) and the next offer, and how long an offer stands. */
export const CONTRACT_GAP_MS = 50_000;
export const OFFER_MS = 40_000;
/** How long the bees are away, and what the farmer pays per bee. */
export const CONTRACT_MS = 90_000;
export const CONTRACT_COINS_PER_BEE = 25;
/** How many bees a farmer asks for; the hive always keeps one bee back. */
export const CONTRACT_BEES = { min: 2, max: 6 };

export interface Contract {
  /** Bees asked for, and what the farmer pays for them. */
  bees: number;
  pay: number;
  /** An offer waiting to be taken, or the bees away at the orchard. */
  phase: 'offer' | 'lent';
  /** Time left: for the offer to stand, or until the bees come home. */
  leftMs: number;
}
