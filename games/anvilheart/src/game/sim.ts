import { byDifficulty } from '../../../../shared/settings';
import { commissionAt, grandOf, offered, type Commission } from './commissions';
import { GEM, combine, isGem, isGemmed, sword, tierOf } from './items';
import {
  BARREL,
  DESKS,
  FIRST_ORDER,
  FIRST_VISITOR_MS,
  GEM_CHANCE,
  GEM_ORDER_CHANCE,
  HAGGLER_PATIENCE,
  LOOKS,
  MAX_SLOTS,
  PATIENCE_MS,
  PATIENCE_PER_TIER_MS,
  REP_EXACT,
  REP_MAX,
  REP_WALKOFF,
  RETURN_CHANCE,
  RETURN_MS,
  RETURN_TIER,
  RUST_DROP_MS,
  RUST_MS,
  SLOTS,
  STREAK_COINS,
  STREAK_MS,
  TRAITS,
  TRAIT_CHANCE,
  autoForging,
  fitOf,
  forgeMs,
  gemsAbout,
  oreChance,
  patienceFactor,
  payFor,
  repairPay,
  rusts,
  trophyFor,
  visitorEveryMs,
  type GameState,
  type Returning,
  type Trait,
} from './state';
import { MAX_TIER, ORDER_TOP } from './swords';
import { locked, nextPrice, type UpgradeId } from './upgrades';

/**
 * Moves the smithy on by `dt` milliseconds: the forge cools (and forges by itself with the Auto
 * Forge on), swords left lying rust, adventurers come, wait and leave, and heroes return.
 */
export function tick(s: GameState, dt: number) {
  s.heatMs = Math.max(0, s.heatMs - dt);
  if (autoForging(s)) forge(s);
  s.streakMs = Math.max(0, s.streakMs - dt);
  if (s.streakMs === 0) s.streak = 0;
  rust(s, dt);

  for (const a of s.adventurers) a.patienceMs -= dt;
  for (const a of s.adventurers.filter((a) => a.patienceMs <= 0)) {
    s.adventurers.splice(s.adventurers.indexOf(a), 1);
    s.walkedOff++;
    s.reputation = Math.max(0, s.reputation - REP_WALKOFF);
    s.events.push({ kind: 'left', desk: a.desk });
  }

  for (const hero of s.returning) hero.inMs -= dt;
  const back = s.returning.find((hero) => hero.inMs <= 0);
  if (back && s.adventurers.length < DESKS && s.slots.includes(null)) {
    s.returning.splice(s.returning.indexOf(back), 1);
    comeBack(s, back);
  }

  if (s.adventurers.length < DESKS) {
    s.nextVisitorMs -= dt;
    if (s.nextVisitorMs <= 0) {
      arrive(s);
      s.nextVisitorMs = visitorEveryMs(s);
    }
  }
}

/** Swords left on an anvil dull after `RUST_MS`, and `RUST_DROP_MS` later drop a tier; the barrel keeps them safe. */
function rust(s: GameState, dt: number) {
  for (let slot = 0; slot < s.slots.length; slot++) {
    const item = s.slots[slot];
    if (!rusts(item)) {
      s.idle[slot] = 0;
      continue;
    }
    s.idle[slot] += dt;
    if (s.idle[slot] < RUST_MS + RUST_DROP_MS) continue;
    s.slots[slot] = item! - 1;
    s.idle[slot] = 0;
    s.events.push({ kind: 'rusted', slot, tier: tierOf(item! - 1) });
  }
}

/** An adventurer walks up to the first free spot at the counter with an order; a hero back from a quest keeps their look. */
function arrive(s: GameState, hero?: Returning) {
  const taken = new Set(s.adventurers.map((a) => a.desk));
  const desk = [...Array(DESKS).keys()].find((d) => !taken.has(d));
  if (desk === undefined) return null;
  // After the first order, they ask for anything up to one better than the best sword made yet.
  const top = Math.min(ORDER_TOP, Math.max(3, s.bestTier + 1));
  const wants = s.orders === 0 ? FIRST_ORDER : 1 + Math.floor(Math.random() * top);
  const look = hero ? hero.look : Math.floor(Math.random() * LOOKS);
  // Once gems are about, some ask for one set in their sword (never in a dagger).
  const gem = gemsAbout(s) && wants >= 2 && Math.random() < GEM_ORDER_CHANCE;
  // From the second order on, some come with a trait.
  const trait = s.orders === 0 ? 'none' : rollTrait();
  // Easier difficulties and a better reputation give adventurers more patience; a Haggler brings their own.
  const patience =
    (PATIENCE_MS + PATIENCE_PER_TIER_MS * wants) * byDifficulty(1.5, 1, 0.7) * patienceFactor(s) * (trait === 'haggler' ? HAGGLER_PATIENCE : 1);
  const a = { id: s.nextId++, desk, wants, gem, trait, patience, patienceMs: patience, look, returned: hero !== undefined };
  s.adventurers.push(a);
  s.orders++;
  return a;
}

function rollTrait(): Trait {
  const r = Math.random();
  return r < TRAIT_CHANCE ? TRAITS[Math.floor((r / TRAIT_CHANCE) * TRAITS.length)] : 'none';
}

/** A hero comes back to the counter with a new order, lays their battered sword on the first empty anvil and hands over a trophy. */
function comeBack(s: GameState, hero: Returning) {
  const a = arrive(s, hero);
  const slot = s.slots.indexOf(null);
  if (!a || slot < 0) return;
  s.slots[slot] = hero.item;
  s.idle[slot] = 0;
  s.coins += hero.trophy;
  s.events.push({ kind: 'returned', desk: a.desk, slot, tier: tierOf(hero.item), trophy: hero.trophy });
}

/** Forges a new sword (or now and then a gem) onto the first empty anvil, if the forge is hot and there is room. */
export function forge(s: GameState) {
  if (s.heatMs > 0) return false;
  const slot = s.slots.indexOf(null);
  if (slot < 0) return false;
  const tier = Math.random() < oreChance(s) ? 2 : 1;
  const item = gemsAbout(s) && Math.random() < GEM_CHANCE ? GEM : tier;
  s.slots[slot] = item;
  s.idle[slot] = 0;
  s.bestTier = Math.max(s.bestTier, tierOf(item));
  s.heatMs = forgeMs(s);
  s.events.push({ kind: 'forged', slot, tier: tierOf(item) });
  return true;
}

/** What lies at a place: an anvil, or the quench barrel (`BARREL`). */
export function itemAt(s: GameState, place: number) {
  return place === BARREL ? s.barrel : (s.slots[place] ?? null);
}
/** Puts an item at a place; a touched anvil's sword starts afresh against rust. */
function put(s: GameState, place: number, item: number | null) {
  if (place === BARREL) s.barrel = item;
  else {
    s.slots[place] = item;
    s.idle[place] = 0;
  }
}
/** Whether a place exists in this smithy: a bought anvil, or the bought barrel. */
const placeable = (s: GameState, place: number) => (place === BARREL ? s.ranks.barrel > 0 : place >= 0 && place < s.slots.length && place < MAX_SLOTS);

/**
 * Drops what lies at `from` onto `to` (an anvil or the barrel): onto an empty place it moves, onto
 * a sword of the same tier the two merge into one of the next tier, a gem sets into a plain
 * sword, a Rusty Dagger repairs a battered sword for a bonus, and anything else swaps. A merge
 * soon after the last one chains a hammer streak.
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
    } else if (made.repaired) {
      const coins = repairPay(made.item);
      s.coins += coins;
      s.events.push({ kind: 'repaired', slot: to, tier: tierOf(made.item), coins });
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

/** The commission that stands: the level's own in this charter, grand if that way was chosen, or null once won. */
export function standing(s: GameState): Commission | null {
  const c = commissionAt(s.commission.level, s.charter);
  return c && s.commission.grand ? grandOf(c) : c;
}

/** The crown's two offers while a choice is open: the commission as it stands and its grand way. */
export function offers(s: GameState): [Commission, Commission] | null {
  const c = commissionAt(s.commission.level, s.charter);
  return s.choosing && c ? [c, grandOf(c)] : null;
}

/** Takes one of the crown's two offers: the commission as it stands, or its grand (gemmed) way. */
export function chooseCommission(s: GameState, grand: boolean) {
  if (!s.choosing) return false;
  s.commission.grand = grand;
  s.choosing = false;
  return true;
}

/**
 * Whether the crown would take this sword now: the commission's own (gemmed, if the grand way was
 * chosen), or an Anvilheart for any lesser commission. Nothing is taken while an offer waits.
 */
export function deliverable(s: GameState, item: number | null) {
  const c = standing(s);
  if (!c || s.choosing || item === null || isGem(item)) return false;
  const tier = tierOf(item);
  if (tier === MAX_TIER && c.tier !== MAX_TIER) return true;
  return tier === c.tier && (!c.gem || isGemmed(item));
}

/**
 * Hands the sword at `from` to the crown, if the royal commission wants it. It leaves the board,
 * and once enough are delivered the commission pays its purse and a guild star, and the next one
 * is offered. An Anvilheart completes any lesser commission on its own; the last one wins the
 * smithy.
 */
export function deliver(s: GameState, from: number) {
  const item = itemAt(s, from);
  const c = standing(s);
  if (!c || !placeable(s, from) || !deliverable(s, item)) return false;
  const tier = tierOf(item!);
  put(s, from, null);
  s.commission.made = tier === MAX_TIER && c.tier !== MAX_TIER ? c.count : s.commission.made + 1;
  s.events.push({ kind: 'delivered', tier });
  if (s.commission.made < c.count) return true;
  s.coins += c.reward;
  s.stars++;
  s.commission = { level: s.commission.level + 1, made: 0, grand: false };
  s.won = commissionAt(s.commission.level, s.charter) === null;
  s.choosing = !s.won && offered(s.commission.level);
  s.events.push({ kind: 'commission', reward: c.reward, won: s.won });
  return true;
}

/**
 * Sells the sword at `from` to the adventurer `id`, if it fits their order. The exact sword asked
 * for pays a tip on top and raises the guild's reputation; a better one pays only the price asked.
 * The buyer of a fine sword may come back with it later, battered.
 */
export function sell(s: GameState, from: number, id: number) {
  const item = itemAt(s, from);
  const a = s.adventurers.find((a) => a.id === id);
  if (item === null || !a || !placeable(s, from)) return false;
  const fit = fitOf(item, a);
  if (fit === 'short') return false;
  const coins = payFor(item, a, s.stars);
  const tier = tierOf(item);
  put(s, from, null);
  s.coins += coins;
  s.sold++;
  if (fit === 'exact') s.reputation = Math.min(REP_MAX, s.reputation + REP_EXACT);
  s.adventurers.splice(s.adventurers.indexOf(a), 1);
  s.events.push({ kind: 'sold', desk: a.desk, tier, coins, fit });
  if (tier >= RETURN_TIER && Math.random() < RETURN_CHANCE) {
    s.returning.push({ inMs: RETURN_MS, item: sword(tier - 1, isGemmed(item), true), trophy: trophyFor(tier), look: a.look });
  }
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
  if (id === 'row') {
    while (s.slots.length < MAX_SLOTS) {
      s.slots.push(null);
      s.idle.push(0);
    }
  }
  return true;
}

/** Switches a bought Auto Forge on or off. */
export function toggleAutoForge(s: GameState) {
  if (s.ranks.auto === 0) return false;
  s.autoForge = !s.autoForge;
  return true;
}

/**
 * Founds a new smithy under a new charter, once the Crown Blade is in: the board, barrel, coins
 * and upgrades go, the guild stars (and the better prices they bring), reputation and the count
 * of swords sold stay, and the commissions start over, asking for more.
 */
export function foundCharter(s: GameState) {
  if (!s.won) return false;
  s.charter++;
  s.coins = 0;
  s.slots = new Array(SLOTS).fill(null);
  s.idle = new Array(SLOTS).fill(0);
  s.barrel = null;
  s.adventurers = [];
  s.returning = [];
  s.heatMs = 0;
  s.nextVisitorMs = FIRST_VISITOR_MS;
  s.bestTier = 0;
  for (const id of Object.keys(s.ranks) as UpgradeId[]) s.ranks[id] = 0;
  s.autoForge = false;
  s.commission = { level: 0, made: 0, grand: false };
  s.choosing = false;
  s.won = false;
  s.streak = 0;
  s.streakMs = 0;
  s.events.push({ kind: 'charter', charter: s.charter });
  return true;
}
