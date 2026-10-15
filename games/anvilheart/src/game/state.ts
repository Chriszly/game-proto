import { isGemmed, tierOf, validItem } from './items';
import { swordOf } from './swords';
import type { UpgradeId } from './upgrades';

/**
 * The anvils the swords sit on: four rows of four, numbered row by row from the top left, and a
 * fifth row once it is bought.
 */
export const GRID = { cols: 4, rows: 4, maxRows: 5 };
export const SLOTS = GRID.cols * GRID.rows;
export const MAX_SLOTS = GRID.cols * GRID.maxRows;
/** Where the quench barrel is, wherever a place on the board (0 to `MAX_SLOTS - 1`) can be given. */
export const BARREL = -1;
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

/** Guild reputation, from 0 to `REP_MAX`: where a new smithy starts, and what moves it. */
export const REP_MAX = 100;
export const REP_START = 50;
export const REP_EXACT = 5;
export const REP_WALKOFF = 10;

/** Gems: once the smithy has made a Steel Sword, the chance a forge makes a gem instead. */
export const GEM_TIER = 3;
export const GEM_CHANCE = 0.08;
/** The chance an adventurer asks for a gemmed sword, once gems are about, and what it pays. */
export const GEM_ORDER_CHANCE = 0.25;
export const GEM_PAY = 2;

export interface Adventurer {
  id: number;
  /** Which spot at the counter, from the top. */
  desk: number;
  /** The least tier they will take. */
  wants: number;
  /** Whether they want a gem set in it, which pays double. */
  gem: boolean;
  patienceMs: number;
  patience: number;
  /** Which of the adventurer pictures to draw. */
  look: number;
}

export interface GameState {
  coins: number;
  /** What lies on each anvil (see `items.ts`), or null for an empty one; 16 anvils, or 20 with the fifth row. */
  slots: (number | null)[];
  /** What lies in the quench barrel, once bought. */
  barrel: number | null;
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
  /** The standing royal commission (see `commissionAt`) and how many of its sword were delivered. */
  commission: { level: number; made: number };
  /** Guild stars, one per royal commission completed. */
  stars: number;
  /** Guild reputation, 0 to `REP_MAX`: it sets how often adventurers come and how long they wait. */
  reputation: number;
  /** Whether the Crown Blade has been delivered. */
  won: boolean;
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
  | { kind: 'set'; slot: number }
  | { kind: 'streak'; slot: number; streak: number; coins: number }
  | { kind: 'delivered'; tier: number }
  | { kind: 'commission'; reward: number; won: boolean }
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
  barrel: number | null;
  reputation: number;
  won: boolean;
}

export const freshProgress = (): Progress => ({
  coins: 0,
  slots: new Array(SLOTS).fill(null),
  sold: 0,
  bestTier: 0,
  ranks: { bellows: 0, ore: 0, auto: 0, row: 0, barrel: 0 },
  autoForge: false,
  commission: { level: 0, made: 0 },
  stars: 0,
  barrel: null,
  reputation: REP_START,
  won: false,
});

/** How many anvils the smithy has: 16, or 20 with the fifth row. */
export const anvilsOf = (ranks: Record<UpgradeId, number>) => (ranks.row > 0 ? MAX_SLOTS : SLOTS);

export function newShop(progress: Progress): GameState {
  const slots = new Array(anvilsOf(progress.ranks)).fill(null).map((_, i) => (validItem(progress.slots[i]) ? progress.slots[i] : null));
  const rep = progress.reputation;
  return {
    coins: progress.coins,
    slots,
    barrel: progress.ranks.barrel > 0 && validItem(progress.barrel) ? progress.barrel : null,
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
    reputation: typeof rep === 'number' && Number.isFinite(rep) ? Math.min(REP_MAX, Math.max(0, Math.round(rep))) : REP_START,
    won: progress.won === true,
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
  barrel: s.barrel,
  reputation: s.reputation,
  won: s.won,
});

/** A whole number of at least 0 from a save, or 0. */
const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/**
 * How a sword fits an order: exactly the one asked for, better than asked, or not good enough. A
 * loose gem fits nobody, and an adventurer who wants a gemmed sword only takes one with a gem.
 */
export type Fit = 'exact' | 'overkill' | 'short';
export function fitOf(item: number, order: { wants: number; gem: boolean }): Fit {
  const tier = tierOf(item);
  if (tier < order.wants || (order.gem && !isGemmed(item))) return 'short';
  return tier === order.wants ? 'exact' : 'overkill';
}
/** What an order is worth: the sword's price, doubled for a gemmed one. */
export const orderPrice = (order: { wants: number; gem: boolean }) => swordOf(order.wants).price * (order.gem ? GEM_PAY : 1);
/**
 * What an adventurer pays for a sword: the order's price with a tip for an exact fit, and only the
 * order's price for a better one. A worse one is not bought.
 */
export function payFor(item: number, order: { wants: number; gem: boolean }) {
  const fit = fitOf(item, order);
  const price = orderPrice(order);
  return fit === 'exact' ? Math.floor(price * (1 + EXACT_TIP)) : fit === 'overkill' ? price : 0;
}

/** The forge's heat-up time with the bellows bought so far. */
export const forgeMs = (s: GameState) => Math.round(FORGE_MS * Math.pow(0.8, s.ranks.bellows));
/** The chance the forge makes an Iron Shortsword rather than a dagger. */
export const oreChance = (s: GameState) => 0.2 * s.ranks.ore;
/** Whether the forge makes swords by itself: the Auto Forge is bought and switched on. */
export const autoForging = (s: GameState) => s.ranks.auto > 0 && s.autoForge;
/** Whether gems turn up yet: once the smithy has made a Steel Sword. */
export const gemsAbout = (s: GameState) => s.bestTier >= GEM_TIER;
/** How long after a visitor the next one comes: half again as long at no reputation, half as long at full. */
export const visitorEveryMs = (s: GameState) => Math.round(VISITOR_EVERY_MS * (1.5 - s.reputation / REP_MAX));
/** How much longer than usual adventurers wait: 25% less at no reputation, 25% more at full. */
export const patienceFactor = (s: GameState) => 0.75 + s.reputation / (2 * REP_MAX);
