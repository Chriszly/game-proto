import { byDifficulty } from '../../../../shared/settings';
import { commissionAt } from './commissions';
import { GEM, combine, isGem, tierOf } from './items';
import {
  BARREL,
  DESKS,
  FIRST_ORDER,
  GEM_CHANCE,
  GEM_ORDER_CHANCE,
  LOOKS,
  MAX_SLOTS,
  PATIENCE_MS,
  PATIENCE_PER_TIER_MS,
  REP_EXACT,
  REP_MAX,
  REP_WALKOFF,
  STREAK_COINS,
  STREAK_MS,
  autoForging,
  fitOf,
  forgeMs,
  gemsAbout,
  oreChance,
  patienceFactor,
  payFor,
  visitorEveryMs,
  type GameState,
} from './state';
import { MAX_TIER, ORDER_TOP } from './swords';
import { locked, nextPrice, type UpgradeId } from './upgrades';

/**
 * Moves the smithy on by `dt` milliseconds: the forge cools (and forges by itself with the Auto
 * Forge on), adventurers come, wait and leave.
 */
export function tick(s: GameState, dt: number) {
  s.heatMs = Math.max(0, s.heatMs - dt);
  if (autoForging(s)) forge(s);
  s.streakMs = Math.max(0, s.streakMs - dt);
  if (s.streakMs === 0) s.streak = 0;

  for (const a of s.adventurers) a.patienceMs -= dt;
  for (const a of s.adventurers.filter((a) => a.patienceMs <= 0)) {
    s.adventurers.splice(s.adventurers.indexOf(a), 1);
    s.walkedOff++;
    s.reputation = Math.max(0, s.reputation - REP_WALKOFF);
    s.events.push({ kind: 'left', desk: a.desk });
  }

  if (s.adventurers.length < DESKS) {
    s.nextVisitorMs -= dt;
    if (s.nextVisitorMs <= 0) {
      arrive(s);
      s.nextVisitorMs = visitorEveryMs(s);
    }
  }
}

/** An adventurer walks up to the first free spot at the counter with an order. */
function arrive(s: GameState) {
  const taken = new Set(s.adventurers.map((a) => a.desk));
  const desk = [...Array(DESKS).keys()].find((d) => !taken.has(d));
  if (desk === undefined) return;
  // After the first order, they ask for anything up to one better than the best sword made yet.
  const top = Math.min(ORDER_TOP, Math.max(3, s.bestTier + 1));
  const wants = s.orders === 0 ? FIRST_ORDER : 1 + Math.floor(Math.random() * top);
  const look = Math.floor(Math.random() * LOOKS);
  // Once gems are about, some ask for one set in their sword (never in a dagger).
  const gem = gemsAbout(s) && wants >= 2 && Math.random() < GEM_ORDER_CHANCE;
  // Easier difficulties and a better reputation give adventurers more patience.
  const patience = (PATIENCE_MS + PATIENCE_PER_TIER_MS * wants) * byDifficulty(1.5, 1, 0.7) * patienceFactor(s);
  s.adventurers.push({ id: s.nextId++, desk, wants, gem, patience, patienceMs: patience, look });
  s.orders++;
}

/** Forges a new sword (or now and then a gem) onto the first empty anvil, if the forge is hot and there is room. */
export function forge(s: GameState) {
  if (s.heatMs > 0) return false;
  const slot = s.slots.indexOf(null);
  if (slot < 0) return false;
  const tier = Math.random() < oreChance(s) ? 2 : 1;
  const item = gemsAbout(s) && Math.random() < GEM_CHANCE ? GEM : tier;
  s.slots[slot] = item;
  s.bestTier = Math.max(s.bestTier, tierOf(item));
  s.heatMs = forgeMs(s);
  s.events.push({ kind: 'forged', slot, tier: tierOf(item) });
  return true;
}

/** What lies at a place: an anvil, or the quench barrel (`BARREL`). */
export function itemAt(s: GameState, place: number) {
  return place === BARREL ? s.barrel : (s.slots[place] ?? null);
}
function put(s: GameState, place: number, item: number | null) {
  if (place === BARREL) s.barrel = item;
  else s.slots[place] = item;
}
/** Whether a place exists in this smithy: a bought anvil, or the bought barrel. */
const placeable = (s: GameState, place: number) => (place === BARREL ? s.ranks.barrel > 0 : place >= 0 && place < s.slots.length && place < MAX_SLOTS);

/**
 * Drops what lies at `from` onto `to` (an anvil or the barrel): onto an empty place it moves, onto
 * a sword of the same tier the two merge into one of the next tier, a gem sets into a plain
 * sword, and anything else swaps. A merge soon after the last one chains a hammer streak.
 */
export function drop(s: GameState, from: number, to: number) {
  const item = itemAt(s, from);
  if (item === null || from === to || !placeable(s, from) || !placeable(s, to)) return false;
  const there = itemAt(s, to);
  const made = there === null ? null : combine(item, there);
  if (made) {
    put(s, from, null);
    put(s, to, made.item);
    if (made.merged) {
      const tier = tierOf(made.item);
      s.bestTier = Math.max(s.bestTier, tier);
      s.events.push({ kind: 'merged', slot: to, tier });
      hammer(s, to);
    } else {
      s.events.push({ kind: 'set', slot: to });
    }
  } else {
    put(s, from, there);
    put(s, to, item);
  }
  return true;
}

/** Chains a merge on `slot` into the hammer streak, paying its bonus from the second merge on. */
function hammer(s: GameState, slot: number) {
  s.streak = s.streakMs > 0 ? s.streak + 1 : 1;
  s.streakMs = STREAK_MS;
  s.streakSlot = slot;
  if (s.streak < 2) return;
  const coins = STREAK_COINS * s.streak;
  s.coins += coins;
  s.events.push({ kind: 'streak', slot, streak: s.streak, coins });
}

/** Whether the crown would take this sword now: the commission's own, or an Anvilheart for any of them. */
export function deliverable(s: GameState, item: number | null) {
  const c = commissionAt(s.commission.level);
  if (!c || item === null || isGem(item)) return false;
  const tier = tierOf(item);
  return tier === c.tier || tier === MAX_TIER;
}

/**
 * Hands the sword at `from` to the crown, if the royal commission wants it. It leaves the board,
 * and once enough are delivered the commission pays its purse and a guild star, and the next one
 * stands. An Anvilheart completes any commission on its own; the last one wins the smithy.
 */
export function deliver(s: GameState, from: number) {
  const item = itemAt(s, from);
  const c = commissionAt(s.commission.level);
  if (!c || !placeable(s, from) || !deliverable(s, item)) return false;
  const tier = tierOf(item!);
  put(s, from, null);
  s.commission.made = tier === MAX_TIER ? c.count : s.commission.made + 1;
  s.events.push({ kind: 'delivered', tier });
  if (s.commission.made < c.count) return true;
  s.coins += c.reward;
  s.stars++;
  s.commission = { level: s.commission.level + 1, made: 0 };
  s.won = commissionAt(s.commission.level) === null;
  s.events.push({ kind: 'commission', reward: c.reward, won: s.won });
  return true;
}

/**
 * Sells the sword at `from` to the adventurer `id`, if it is at least what they asked for. The
 * exact sword asked for pays a tip on top and raises the guild's reputation; a better one pays only
 * the price asked.
 */
export function sell(s: GameState, from: number, id: number) {
  const item = itemAt(s, from);
  const a = s.adventurers.find((a) => a.id === id);
  if (item === null || !a || !placeable(s, from)) return false;
  const fit = fitOf(item, a);
  if (fit === 'short') return false;
  const coins = payFor(item, a);
  put(s, from, null);
  s.coins += coins;
  s.sold++;
  if (fit === 'exact') s.reputation = Math.min(REP_MAX, s.reputation + REP_EXACT);
  s.adventurers.splice(s.adventurers.indexOf(a), 1);
  s.events.push({ kind: 'sold', desk: a.desk, tier: tierOf(item), coins, fit });
  return true;
}

/** Buys the next rank of an upgrade, if it is unlocked and there are coins enough and ranks left. */
export function buy(s: GameState, id: UpgradeId) {
  const price = nextPrice(id, s.ranks[id]);
  if (price === null || s.coins < price || locked(id, s.ranks)) return false;
  s.coins -= price;
  s.ranks[id]++;
  // A new Auto Forge starts switched on.
  if (id === 'auto') s.autoForge = true;
  // Faster Bellows also shorten a heat-up already under way.
  if (id === 'bellows') s.heatMs = Math.min(s.heatMs, forgeMs(s));
  // The fifth row adds four empty anvils at the bottom.
  if (id === 'row') while (s.slots.length < MAX_SLOTS) s.slots.push(null);
  return true;
}

/** Switches a bought Auto Forge on or off. */
export function toggleAutoForge(s: GameState) {
  if (s.ranks.auto === 0) return false;
  s.autoForge = !s.autoForge;
  return true;
}
