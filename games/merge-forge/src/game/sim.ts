import { DESKS, FIRST_ORDER, PATIENCE_MS, PATIENCE_PER_TIER_MS, VISITOR_EVERY_MS, forgeMs, oreChance, type GameState } from './state';
import { MAX_TIER, swordOf } from './swords';
import { nextPrice, type UpgradeId } from './upgrades';

/** Moves the smithy on by `dt` milliseconds: the forge cools, adventurers come, wait and leave. */
export function tick(s: GameState, dt: number) {
  s.heatMs = Math.max(0, s.heatMs - dt);

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
  const patience = PATIENCE_MS + PATIENCE_PER_TIER_MS * wants;
  s.adventurers.push({ id: s.nextId++, desk, wants, patience, patienceMs: patience, look: Math.floor(Math.random() * 4) });
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
  } else {
    s.slots[from] = there;
    s.slots[to] = tier;
  }
  return true;
}

/** Sells the sword on anvil `from` to the adventurer `id`, if it is at least what they asked for. */
export function sell(s: GameState, from: number, id: number) {
  const tier = s.slots[from];
  const a = s.adventurers.find((a) => a.id === id);
  if (tier === null || !a || tier < a.wants) return false;
  const coins = swordOf(tier).price;
  s.slots[from] = null;
  s.coins += coins;
  s.sold++;
  s.adventurers.splice(s.adventurers.indexOf(a), 1);
  s.events.push({ kind: 'sold', desk: a.desk, tier, coins });
  return true;
}

/** Buys the next rank of an upgrade, if there are coins enough and ranks left. */
export function buy(s: GameState, id: UpgradeId) {
  const price = nextPrice(id, s.ranks[id]);
  if (price === null || s.coins < price) return false;
  s.coins -= price;
  s.ranks[id]++;
  return true;
}
