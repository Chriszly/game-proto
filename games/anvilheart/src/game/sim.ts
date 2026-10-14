import { byDifficulty } from '../../../../shared/settings';
import { commissionAt } from './commissions';
import {
  DESKS,
  FIRST_ORDER,
  GEM_CHANCE,
  GEM_ORDER_CHANCE,
  LOOKS,
  PATIENCE_MS,
  PATIENCE_PER_TIER_MS,
  RENOWN_EXACT,
  RENOWN_OVERKILL,
  RENOWN_WALKED_OFF,
  STREAK_COINS,
  STREAK_MS,
  VISITOR_EVERY_MS,
  autoForging,
  fitOf,
  forgeMs,
  freeAnvil,
  gemsOpen,
  offerFor,
  oreChance,
  patienceFactor,
  slotOpen,
  visitorFactor,
  type GameState,
} from './state';
import { GEM, MAX_ORDER, MAX_TIER } from './swords';
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
    renown(s, RENOWN_WALKED_OFF);
    s.events.push({ kind: 'left', desk: a.desk, renown: RENOWN_WALKED_OFF });
  }

  if (s.adventurers.length < DESKS) {
    s.nextVisitorMs -= dt;
    if (s.nextVisitorMs <= 0) {
      arrive(s);
      // Renown brings the next one sooner or later.
      s.nextVisitorMs = VISITOR_EVERY_MS * visitorFactor(s.renown);
    }
  }
}

/** Raises or lowers the guild's renown, kept between 0 and 100. */
function renown(s: GameState, by: number) {
  s.renown = Math.max(0, Math.min(100, s.renown + by));
}

/** An adventurer walks up to the first free spot at the counter with an order. */
function arrive(s: GameState) {
  const taken = new Set(s.adventurers.map((a) => a.desk));
  const desk = [...Array(DESKS).keys()].find((d) => !taken.has(d));
  if (desk === undefined) return;
  // After the first order, they ask for anything up to one better than the best sword made yet.
  const top = Math.min(MAX_ORDER, Math.max(3, s.bestTier + 1));
  const wants = s.orders === 0 ? FIRST_ORDER : 1 + Math.floor(Math.random() * top);
  // Easier difficulties and a renowned guild give adventurers more patience.
  const patience = (PATIENCE_MS + PATIENCE_PER_TIER_MS * wants) * byDifficulty(1.5, 1, 0.7) * patienceFactor(s.renown);
  const look = Math.floor(Math.random() * LOOKS);
  // Once gems are made, some adventurers want one set in their sword. The roll is only made then,
  // so the first orders draw the same random numbers as before gems.
  const gem = gemsOpen(s) && Math.random() < GEM_ORDER_CHANCE;
  s.adventurers.push({ id: s.nextId++, desk, wants, gem, patience, patienceMs: patience, look });
  s.orders++;
}

/** Forges a new sword (or, once gems are made, sometimes a gem) onto the first free anvil. */
export function forge(s: GameState) {
  if (s.heatMs > 0) return false;
  const slot = freeAnvil(s);
  if (slot < 0) return false;
  let tier = Math.random() < oreChance(s) ? 2 : 1;
  if (gemsOpen(s) && Math.random() < GEM_CHANCE) tier = GEM;
  s.slots[slot] = tier;
  s.gemmed[slot] = false;
  s.bestTier = Math.max(s.bestTier, tier);
  s.heatMs = forgeMs(s);
  s.events.push({ kind: 'forged', slot, tier });
  return true;
}

/**
 * Drops what lies on slot `from` onto slot `to`: onto an empty slot it moves, onto a sword of the
 * same tier the two merge into one of the next tier, a gem onto a sword without one is set in it,
 * and anything else swaps. A merge soon after the last one chains a hammer streak.
 */
export function drop(s: GameState, from: number, to: number) {
  const tier = s.slots[from];
  if (tier === null || from === to || !slotOpen(s, to)) return false;
  const there = s.slots[to];
  if (tier !== GEM && there === tier && tier < MAX_TIER) {
    s.slots[from] = null;
    s.slots[to] = tier + 1;
    // A gem in either sword carries over to the merged one.
    s.gemmed[to] = s.gemmed[to] || s.gemmed[from];
    s.gemmed[from] = false;
    s.bestTier = Math.max(s.bestTier, tier + 1);
    s.events.push({ kind: 'merged', slot: to, tier: tier + 1 });
    hammer(s, to);
  } else if (tier === GEM && there !== null && there !== GEM && !s.gemmed[to]) {
    s.slots[from] = null;
    s.gemmed[to] = true;
    s.events.push({ kind: 'set', slot: to });
  } else {
    [s.slots[from], s.slots[to]] = [there, tier];
    [s.gemmed[from], s.gemmed[to]] = [s.gemmed[to], s.gemmed[from]];
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

/** Whether the sword on `slot` is one the standing royal commission asks for. */
export function wanted(s: GameState, slot: number) {
  const c = commissionAt(s.commission.level);
  return c !== null && s.slots[slot] === c.tier;
}

/**
 * Hands the sword on `slot` to the crown, if the standing commission asks for it. It leaves the
 * board; once enough are delivered the commission pays its reward and a guild star, and the last
 * one (the Crown Blade) names the smith Royal Smith.
 */
export function deliver(s: GameState, slot: number) {
  const c = commissionAt(s.commission.level);
  const tier = s.slots[slot];
  if (!c || tier !== c.tier) return false;
  s.slots[slot] = null;
  s.gemmed[slot] = false;
  s.commission.made++;
  s.events.push({ kind: 'delivered', slot, tier, made: s.commission.made, count: c.count });
  if (s.commission.made < c.count) return true;
  s.coins += c.reward;
  s.stars++;
  s.commission = { level: s.commission.level + 1, made: 0 };
  s.events.push({ kind: 'commission', slot, tier, reward: c.reward });
  if (c.final) {
    s.won = true;
    s.events.push({ kind: 'crowned' });
  }
  return true;
}

/**
 * Sells the sword on slot `from` to the adventurer `id`, if it is at least what they asked for (and
 * set with a gem, for a gem order). The exact sword asked for pays a tip on top; a better one pays
 * only the price asked; a gem order pays double. A good sale raises the guild's renown.
 */
export function sell(s: GameState, from: number, id: number) {
  const tier = s.slots[from];
  const a = s.adventurers.find((a) => a.id === id);
  if (tier === null || !a || tier < a.wants) return false;
  const coins = offerFor(tier, s.gemmed[from], a);
  if (coins === 0) return false;
  const fit = fitOf(tier, a.wants);
  s.slots[from] = null;
  s.gemmed[from] = false;
  s.coins += coins;
  s.sold++;
  renown(s, fit === 'exact' ? RENOWN_EXACT : RENOWN_OVERKILL);
  s.adventurers.splice(s.adventurers.indexOf(a), 1);
  s.events.push({ kind: 'sold', desk: a.desk, tier, coins, fit, gem: a.gem });
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
  s.events.push({ kind: 'bought', id });
  return true;
}

/** Switches a bought Auto Forge on or off. */
export function toggleAutoForge(s: GameState) {
  if (s.ranks.auto === 0) return false;
  s.autoForge = !s.autoForge;
  return true;
}
