import { MAX_TIER, swordOf } from './swords';
import type { UpgradeId } from './upgrades';

/** The anvils the swords sit on: a 4 x 4 board, numbered row by row from the top left. */
export const GRID = { cols: 4, rows: 4 };
export const SLOTS = GRID.cols * GRID.rows;
/** How many adventurers fit at the counter at once. */
export const DESKS = 3;
/** How many adventurer pictures there are: a knight, a ranger, a viking and a mage. */
export const LOOKS = 4;

/** How long the forge takes to heat up for the next sword, before any bellows. */
export const FORGE_MS = 1200;
/** When the first adventurer walks in, and how long after a visitor the next one comes. */
export const FIRST_VISITOR_MS = 1500;
export const VISITOR_EVERY_MS = 6000;
/** How long an adventurer waits for a sword: a base, plus more for a better sword. */
export const PATIENCE_MS = 45_000;
export const PATIENCE_PER_TIER_MS = 6_000;
/** The first adventurer always wants this tier, so the first sale takes one merge. */
export const FIRST_ORDER = 2;
/** Selling exactly the sword asked for pays this much on top of its price, rounded down. */
export const EXACT_TIP = 0.5;
/** How long after a merge the next one still chains into a hammer streak. */
export const STREAK_MS = 4000;
/** Bonus coins per merge in a streak, times the streak's length, from its second merge on. */
export const STREAK_COINS = 5;

export interface Adventurer {
  id: number;
  /** Which spot at the counter, from the top. */
  desk: number;
  /** The least tier they will take. */
  wants: number;
  patienceMs: number;
  patience: number;
  /** Which of the adventurer pictures to draw. */
  look: number;
}

export interface GameState {
  coins: number;
  /** The tier of the sword on each anvil, or null for an empty one. */
  slots: (number | null)[];
  adventurers: Adventurer[];
  /** Time left until the forge is hot again; 0 when a sword can be forged. */
  heatMs: number;
  nextVisitorMs: number;
  /** Swords sold, and adventurers who gave up waiting and left. */
  sold: number;
  walkedOff: number;
  /** The best sword made so far. */
  bestTier: number;
  ranks: Record<UpgradeId, number>;
  /** Whether the Auto Forge, once bought, is switched on. */
  autoForge: boolean;
  orders: number;
  nextId: number;
  /** The standing royal commission (see `commissionAt`) and how many of its sword were made for it. */
  commission: { level: number; made: number };
  /** Guild stars, one per royal commission completed. */
  stars: number;
  /** Merges in the current hammer streak (0 when none), the anvil of the last one and time left to chain. */
  streak: number;
  streakSlot: number;
  streakMs: number;
  /** Things that just happened, for the scene to animate; it empties the list as it draws them. */
  events: GameEvent[];
}

export type GameEvent =
  | { kind: 'forged'; slot: number; tier: number }
  | { kind: 'merged'; slot: number; tier: number }
  | { kind: 'streak'; slot: number; streak: number; coins: number }
  | { kind: 'commission'; slot: number; tier: number; reward: number }
  | { kind: 'sold'; desk: number; tier: number; coins: number; fit: Fit }
  | { kind: 'left'; desk: number };

/** What is kept between visits: the board, the coins and the upgrades. */
export interface Progress {
  coins: number;
  slots: (number | null)[];
  sold: number;
  bestTier: number;
  ranks: Record<UpgradeId, number>;
  autoForge: boolean;
  commission: { level: number; made: number };
  stars: number;
}

export const freshProgress = (): Progress => ({
  coins: 0,
  slots: new Array(SLOTS).fill(null),
  sold: 0,
  bestTier: 0,
  ranks: { bellows: 0, ore: 0, auto: 0 },
  autoForge: false,
  commission: { level: 0, made: 0 },
  stars: 0,
});

export function newShop(progress: Progress): GameState {
  const slots = new Array(SLOTS).fill(null).map((_, i) => {
    const tier = progress.slots[i];
    return typeof tier === 'number' && tier >= 1 && tier <= MAX_TIER ? Math.floor(tier) : null;
  });
  return {
    coins: progress.coins,
    slots,
    adventurers: [],
    heatMs: 0,
    nextVisitorMs: FIRST_VISITOR_MS,
    sold: progress.sold,
    walkedOff: 0,
    bestTier: progress.bestTier,
    ranks: { ...progress.ranks },
    autoForge: progress.autoForge === true,
    orders: progress.sold,
    nextId: 1,
    commission: { level: count(progress.commission?.level), made: count(progress.commission?.made) },
    stars: count(progress.stars),
    streak: 0,
    streakSlot: 0,
    streakMs: 0,
    events: [],
  };
}

export const progressOf = (s: GameState): Progress => ({
  coins: s.coins,
  slots: [...s.slots],
  sold: s.sold,
  bestTier: s.bestTier,
  ranks: { ...s.ranks },
  autoForge: s.autoForge,
  commission: { ...s.commission },
  stars: s.stars,
});

/** A whole number of at least 0 from a save, or 0. */
const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** How a sword fits an order: exactly the one asked for, better than asked, or not good enough. */
export type Fit = 'exact' | 'overkill' | 'short';
export const fitOf = (tier: number, wants: number): Fit => (tier === wants ? 'exact' : tier > wants ? 'overkill' : 'short');
/**
 * What an adventurer pays for a sword: the asked-for sword's price with a tip for an exact fit, and
 * only the asked-for price for a better one. A worse one is not bought.
 */
export function payFor(tier: number, wants: number) {
  const fit = fitOf(tier, wants);
  const price = swordOf(wants).price;
  return fit === 'exact' ? Math.floor(price * (1 + EXACT_TIP)) : fit === 'overkill' ? price : 0;
}

/** The forge's heat-up time with the bellows bought so far. */
export const forgeMs = (s: GameState) => Math.round(FORGE_MS * Math.pow(0.8, s.ranks.bellows));
/** The chance the forge makes an Iron Shortsword rather than a dagger. */
export const oreChance = (s: GameState) => 0.2 * s.ranks.ore;
/** Whether the forge makes swords by itself: the Auto Forge is bought and switched on. */
export const autoForging = (s: GameState) => s.ranks.auto > 0 && s.autoForge;
