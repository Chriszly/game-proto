import { COMMISSIONS } from './commissions';
import { GEM, MAX_TIER, swordOf } from './swords';
import type { UpgradeId } from './upgrades';

/**
 * The anvils the swords sit on: a 5 x 4 board, numbered row by row from the top left. The fifth
 * column is locked until the "Four more anvils" upgrade is bought.
 */
export const GRID = { cols: 5, rows: 4 };
export const ANVILS = GRID.cols * GRID.rows;
/** The columns open from the start. */
export const OPEN_COLS = 4;
/** The quench barrel under the board, stored after the anvils; it is locked until bought. */
export const BARREL = ANVILS;
/** Every place a sword can lie: the anvils and the barrel. */
export const SLOTS = ANVILS + 1;
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

/**
 * The guild's renown, 0 to 100, starting at `RENOWN_START`. Exact fits raise it, overkill sales a
 * little, and an adventurer who walks off lowers it. High renown brings adventurers sooner and
 * makes them wait longer; low renown the opposite. At the start it changes nothing.
 */
export const RENOWN_START = 50;
export const RENOWN_EXACT = 4;
export const RENOWN_OVERKILL = 1;
export const RENOWN_WALKED_OFF = -10;
export const RENOWN_BANDS = [
  { from: 75, name: 'Renowned', color: 0xf0c040 },
  { from: 50, name: 'Trusted', color: 0x4ac060 },
  { from: 25, name: 'Doubted', color: 0xe8862a },
  { from: 0, name: 'Shunned', color: 0xe05040 },
];
export const renownBand = (renown: number) => RENOWN_BANDS.find((b) => renown >= b.from)!;
/** How long until the next adventurer, as a share of `VISITOR_EVERY_MS`: 1.25 at 0 renown, 0.75 at 100. */
export const visitorFactor = (renown: number) => 1.25 - renown / 200;
/** How long adventurers wait, as a share of their usual patience: 0.8 at 0 renown, 1.2 at 100. */
export const patienceFactor = (renown: number) => 0.8 + renown / 250;

/**
 * Gems: once the smithy has made a Knight's Blade (`GEMS_FROM`), the forge sometimes makes a gem
 * instead of a sword, and some adventurers ask for a sword set with one, which pays double.
 */
export const GEMS_FROM = 4;
export const GEM_CHANCE = 0.1;
export const GEM_ORDER_CHANCE = 0.25;
export const GEM_PAY = 2;
export const gemsOpen = (s: { bestTier: number }) => s.bestTier >= GEMS_FROM;

export interface Adventurer {
  id: number;
  /** Which spot at the counter, from the top. */
  desk: number;
  /** The least tier they will take. */
  wants: number;
  /** Whether they only take a sword set with a gem (and pay double for it). */
  gem: boolean;
  patienceMs: number;
  patience: number;
  /** Which of the adventurer pictures to draw. */
  look: number;
}

export interface GameState {
  coins: number;
  /**
   * What lies in each slot (`SLOTS`: the anvils, then the barrel): a sword's tier, `GEM` (0) for a
   * loose gem, or null when empty.
   */
  slots: (number | null)[];
  /** Whether the sword in each slot is set with a gem. */
  gemmed: boolean[];
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
  /** The guild's renown, 0 to 100 (see `RENOWN_START`). */
  renown: number;
  /** Whether the Crown Blade has been delivered: the smith is Royal Smith. */
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
  | { kind: 'delivered'; slot: number; tier: number; made: number; count: number }
  | { kind: 'commission'; slot: number; tier: number; reward: number }
  | { kind: 'crowned' }
  | { kind: 'sold'; desk: number; tier: number; coins: number; fit: Fit; gem: boolean }
  | { kind: 'left'; desk: number; renown: number }
  | { kind: 'bought'; id: UpgradeId };

/** What is kept between visits: the board, the coins and the upgrades. */
export interface Progress {
  coins: number;
  slots: (number | null)[];
  gemmed: boolean[];
  sold: number;
  bestTier: number;
  ranks: Record<UpgradeId, number>;
  autoForge: boolean;
  commission: { level: number; made: number };
  stars: number;
  renown: number;
  won: boolean;
}

export const freshProgress = (): Progress => ({
  coins: 0,
  slots: new Array(SLOTS).fill(null),
  gemmed: new Array(SLOTS).fill(false),
  sold: 0,
  bestTier: 0,
  ranks: { bellows: 0, ore: 0, auto: 0, barrel: 0, anvils: 0 },
  autoForge: false,
  commission: { level: 0, made: 0 },
  stars: 0,
  renown: RENOWN_START,
  won: false,
});

/**
 * Saves from before the fifth column hold 16 anvils, four to a row; they move to the same rows and
 * columns of the five-column board.
 */
function placeOf(i: number, saved: number) {
  if (saved === SLOTS) return i;
  if (saved === 16) return Math.floor(i / 4) * GRID.cols + (i % 4);
  return -1;
}

export function newShop(progress: Progress): GameState {
  const slots: (number | null)[] = new Array(SLOTS).fill(null);
  const gemmed: boolean[] = new Array(SLOTS).fill(false);
  const saved = Array.isArray(progress.slots) ? progress.slots : [];
  saved.forEach((tier, i) => {
    const at = placeOf(i, saved.length);
    if (at < 0 || typeof tier !== 'number' || tier < GEM || tier > MAX_TIER) return;
    slots[at] = Math.floor(tier);
    gemmed[at] = slots[at] !== GEM && Array.isArray(progress.gemmed) && progress.gemmed[i] === true;
  });
  return {
    coins: progress.coins,
    slots,
    gemmed,
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
    // Saves from before the Crown Blade could stand past the last commission without having won;
    // they go on to the Crown Blade.
    commission: {
      level: progress.won === true ? count(progress.commission?.level) : Math.min(count(progress.commission?.level), COMMISSIONS.length - 1),
      made: count(progress.commission?.made),
    },
    stars: count(progress.stars),
    renown: typeof progress.renown === 'number' && Number.isFinite(progress.renown) ? Math.max(0, Math.min(100, progress.renown)) : RENOWN_START,
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
  gemmed: [...s.gemmed],
  sold: s.sold,
  bestTier: s.bestTier,
  ranks: { ...s.ranks },
  autoForge: s.autoForge,
  commission: { ...s.commission },
  stars: s.stars,
  renown: s.renown,
  won: s.won,
});

/** A whole number of at least 0 from a save, or 0. */
const count = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Whether a slot can hold a sword: an anvil of the first four columns, or a bought one, or a bought barrel. */
export function slotOpen(s: GameState, slot: number) {
  if (slot === BARREL) return s.ranks.barrel > 0;
  if (slot < 0 || slot >= ANVILS) return false;
  return slot % GRID.cols < OPEN_COLS || s.ranks.anvils > 0;
}
/** The first open, empty anvil (never the barrel), or -1 when the board is full. */
export const freeAnvil = (s: GameState) => s.slots.findIndex((t, i) => t === null && i < ANVILS && slotOpen(s, i));

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
/**
 * What adventurer `a` pays for the sword of `tier` (set with a gem or not): `payFor`, doubled for
 * a gem order, which only takes a gemmed sword. 0 when they would not buy it, or for a loose gem.
 */
export function offerFor(tier: number | null, gemmed: boolean, a: Adventurer) {
  if (tier === null || tier === GEM || (a.gem && !gemmed)) return 0;
  return payFor(tier, a.wants) * (a.gem ? GEM_PAY : 1);
}

/** The forge's heat-up time with the bellows bought so far. */
export const forgeMs = (s: GameState) => Math.round(FORGE_MS * Math.pow(0.8, s.ranks.bellows));
/** The chance the forge makes an Iron Shortsword rather than a dagger. */
export const oreChance = (s: GameState) => 0.2 * s.ranks.ore;
/** Whether the forge makes swords by itself: the Auto Forge is bought and switched on. */
export const autoForging = (s: GameState) => s.ranks.auto > 0 && s.autoForge;
