import { byDifficulty } from '../../../../shared/settings';
import { commissionAt } from './commissions';
import { DESKS, FIRST_ORDER, LOOKS, PATIENCE_MS, PATIENCE_PER_TIER_MS, STREAK_COINS, STREAK_MS, VISITOR_EVERY_MS, autoForging, fitOf, forgeMs, oreChance, payFor, type GameState } from './state';
import { MAX_TIER } from './swords';
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
    s.events.push({ kind: 'left', desk: a.desk });
  }

  if (s.adventurers.length < DESKS) {
    s.nextVisitorMs -= dt;
    if (s.nextVisitorMs <= 0) {
      arrive(s);
      s.nextVisitorMs = VISITOR_EVERY_MS;
    }
  }
}

/** An adventurer walks up to the first free spot at the counter with an order. */
function arrive(s: GameState) {
  const taken = new Set(s.adventurers.map((a) => a.desk));
  const desk = [...Array(DESKS).keys()].find((d) => !taken.has(d));
  if (desk === undefined) return;
  // After the first order, they ask for anything up to one better than the best sword made yet.
  const top = Math.min(MAX_TIER, Math.max(3, s.bestTier + 1));
  const wants = s.orders === 0 ? FIRST_ORDER : 1 + Math.floor(Math.random() * top);
  // Easier difficulties give adventurers more patience.
  const patience = (PATIENCE_MS + PATIENCE_PER_TIER_MS * wants) * byDifficulty(1.5, 1, 0.7);
  s.adventurers.push({ id: s.nextId++, desk, wants, patience, patienceMs: patience, look: Math.floor(Math.random() * LOOKS) });
  s.orders++;
}

/** Forges a new sword onto the first empty anvil, if the forge is hot and there is room. */
export function forge(s: GameState) {
  if (s.heatMs > 0) return false;
  const slot = s.slots.indexOf(null);
  if (slot < 0) return false;
  const tier = Math.random() < oreChance(s) ? 2 : 1;
  s.slots[slot] = tier;
  s.bestTier = Math.max(s.bestTier, tier);
  s.heatMs = forgeMs(s);
  s.events.push({ kind: 'forged', slot, tier });
  return true;
}

/**
 * Drops the sword from anvil `from` onto anvil `to`: onto an empty anvil it moves, onto a sword of
 * the same tier the two merge into one of the next tier, and onto any other sword they swap.
 * A merge soon after the last one chains a hammer streak, and may fulfil the royal commission.
 */
export function drop(s: GameState, from: number, to: number) {
  const tier = s.slots[from];
  if (tier === null || from === to) return false;
  const there = s.slots[to];
  if (there === tier && tier < MAX_TIER) {
    s.slots[from] = null;
    s.slots[to] = tier + 1;
    s.bestTier = Math.max(s.bestTier, tier + 1);
    s.events.push({ kind: 'merged', slot: to, tier: tier + 1 });
    hammer(s, to);
    commissioned(s, to, tier + 1);
  } else {
    s.slots[from] = there;
    s.slots[to] = tier;
  }
  return true;
}

/** Chains a merge on anvil `slot` into the hammer streak, paying its bonus from the second merge on. */
function hammer(s: GameState, slot: number) {
  s.streak = s.streakMs > 0 ? s.streak + 1 : 1;
  s.streakMs = STREAK_MS;
  s.streakSlot = slot;
  if (s.streak < 2) return;
  const coins = STREAK_COINS * s.streak;
  s.coins += coins;
  s.events.push({ kind: 'streak', slot, streak: s.streak, coins });
}

/** Counts a new sword of `tier` towards the royal commission, and pays it out once it is done. */
function commissioned(s: GameState, slot: number, tier: number) {
  const c = commissionAt(s.commission.level);
  if (tier !== c.tier) return;
  s.commission.made++;
  if (s.commission.made < c.count) return;
  s.coins += c.reward;
  s.stars++;
  s.commission = { level: s.commission.level + 1, made: 0 };
  s.events.push({ kind: 'commission', slot, tier, reward: c.reward });
}

/**
 * Sells the sword on anvil `from` to the adventurer `id`, if it is at least what they asked for.
 * The exact sword asked for pays a tip on top; a better one pays only the price asked.
 */
export function sell(s: GameState, from: number, id: number) {
  const tier = s.slots[from];
  const a = s.adventurers.find((a) => a.id === id);
  if (tier === null || !a || tier < a.wants) return false;
  const coins = payFor(tier, a.wants);
  s.slots[from] = null;
  s.coins += coins;
  s.sold++;
  s.adventurers.splice(s.adventurers.indexOf(a), 1);
  s.events.push({ kind: 'sold', desk: a.desk, tier, coins, fit: fitOf(tier, a.wants) });
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
  return true;
}

/** Switches a bought Auto Forge on or off. */
export function toggleAutoForge(s: GameState) {
  if (s.ranks.auto === 0) return false;
  s.autoForge = !s.autoForge;
  return true;
}
