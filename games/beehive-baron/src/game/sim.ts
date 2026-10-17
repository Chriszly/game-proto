import { byDifficulty } from '../../../../shared/settings';
import { CONTRACTS_FROM, CONTRACT_BEES, CONTRACT_COINS_PER_BEE, CONTRACT_GAP_MS, CONTRACT_MS, OFFER_MS } from './contracts';
import { FAIR_GOLD } from './fair';
import { KINDS, type Kind } from './honey';
import { CASK_JARS, CASK_MS, MAX_CASKS, MEAD_MULT } from './mead';
import { MEADOWS } from './meadows';
import { ORDERS_FROM, ORDER_COINS_PER_JAR, ORDER_GAP_MS, ORDER_MIN_MS, ORDER_MS } from './orders';
import { BEES_PER_MEAL, EAT_ORDER, WINTER_EAT_MS, YEAR_MS } from './seasons';
import {
  AWAY_CAP,
  AWAY_MS_PER_DROP,
  BROOD_MS,
  CELL_CAP,
  FLOWERS,
  SLOTS,
  TRIP_MS,
  atHome,
  broodPrice,
  carry,
  cellPrice,
  crowded,
  demand,
  emptyCell,
  fairOpen,
  fairTotal,
  hiveOf,
  isBrood,
  isHoney,
  isOpen,
  isWinter,
  jarCount,
  jarPrice,
  maxBees,
  meadReady,
  meadValue,
  openKinds,
  openLeft,
  fairScore,
  ripenTime,
  room,
  season,
  touching,
  withWax,
  type Cell,
  type GameState,
} from './state';
import { CATCH_PRICE, MAX_HIVES, SWARM_MS } from './swarm';
import { nextPrice, type UpgradeId } from './upgrades';
import { WASPS_FROM, WASP_GAP, WASP_GAP_SPREAD, WASP_IN_MS, WASP_OUT_MS, WASP_STEAL_MS, type Wasp } from './wasps';

/** A forager's trip time with the clover planted so far. Easier difficulties have the flowers closer. */
export const tripMs = (s: GameState) => Math.round(TRIP_MS * Math.pow(0.8, s.ranks.clover) * byDifficulty(0.75, 1, 1.3));

/**
 * Moves the hive on by `dt` milliseconds: the year turns, foragers fly and bring nectar home, full
 * cells ripen, brood cells hatch bees, casks age, the market moves, wasps raid, village orders and
 * orchard contracts come and go, a crowded hive swarms, in winter the bees eat, and with the
 * Waggle Dance bees set off by themselves.
 */
export function tick(s: GameState, dt: number) {
  turn(s, dt);
  for (const b of s.bees) {
    if (b.tripMs <= 0) continue;
    b.tripMs = Math.max(0, b.tripMs - dt);
    if (b.tripMs === 0) deliver(s, carry(s), b.kind);
  }
  s.cells.forEach((c, slot) => {
    if (isBrood(c)) return hatch(s, c, slot, dt);
    if (c?.phase !== 'ripening') return;
    c.ripenMs = Math.max(0, c.ripenMs - dt);
    if (c.ripenMs > 0) return;
    c.phase = 'capped';
    s.events.push({ kind: 'capped', slot });
  });
  const wanted = demand(s);
  s.marketMs += dt;
  const now = demand(s);
  if (now && now !== wanted) s.events.push({ kind: 'demand', honey: now });
  for (const [i, c] of s.casks.entries()) {
    if (c.agingMs === 0) continue;
    c.agingMs = Math.max(0, c.agingMs - dt);
    if (c.agingMs === 0) s.events.push({ kind: 'mead', cask: i });
  }
  raid(s, dt);
  orders(s, dt);
  contracts(s, dt);
  swarm(s, dt);
  if (s.ranks.dance > 0) send(s);
}

/** The year turns: a new season every `SEASON_MS`, and in winter the bees eat. The foragers leave a meadow that shuts. */
function turn(s: GameState, dt: number) {
  const before = season(s);
  s.seasonMs += dt;
  if (s.seasonMs >= YEAR_MS) {
    s.seasonMs -= YEAR_MS;
    s.years++;
    s.events.push({ kind: 'year', years: s.years });
  }
  const now = season(s);
  if (now !== before) {
    s.events.push({ kind: 'season', season: now });
    s.eatIn = WINTER_EAT_MS;
  }
  if (!isOpen(s, s.forage)) s.forage = 'clover';
  if (now !== 'winter') return;
  s.eatIn -= dt;
  if (s.eatIn > 0) return;
  s.eatIn = WINTER_EAT_MS;
  // One meal for every `BEES_PER_MEAL` bees (at least one), so a big hive needs a big larder.
  for (let meals = Math.ceil(s.bees.length / BEES_PER_MEAL); meals > 0; meals--) eat(s);
}

/** The bees eat: a jar of the cheapest kind on the shelf, else the honey of a capped cell, else a bee starves (the last one never). */
function eat(s: GameState) {
  const jar = EAT_ORDER.find((k) => s.jars[k] > 0);
  if (jar) {
    s.jars[jar]--;
    return s.events.push({ kind: 'ate', what: 'jar', slot: null });
  }
  const slot = s.cells.findIndex((c) => isHoney(c) && c.phase === 'capped');
  if (slot >= 0) {
    s.cells[slot] = emptyCell();
    return s.events.push({ kind: 'ate', what: 'cell', slot });
  }
  if (s.bees.length <= 1) return;
  const gone = [...s.bees].sort((a, b) => Number(atHome(b)) - Number(atHome(a)))[0];
  s.bees = s.bees.filter((b) => b !== gone);
  s.events.push({ kind: 'ate', what: 'bee', slot: null });
}

/** A brood cell counts down to its next bee while the hive has room for one; brood rests in winter. */
function hatch(s: GameState, c: Extract<Cell, { type: 'brood' }>, slot: number, dt: number) {
  if (s.bees.length >= maxBees(s) || isWinter(s)) return;
  c.hatchMs = Math.max(0, c.hatchMs - dt);
  if (c.hatchMs > 0) return;
  c.hatchMs = BROOD_MS;
  const id = s.nextId++;
  s.bees.push({ id, tripMs: 0, trip: 0, flower: 0, kind: s.forage, lent: false });
  s.events.push({ kind: 'hatched', slot, id });
}

/** A forager is home: its drops go into the empty cells and the cells of its kind in turn, and what doesn't fit is lost. */
function deliver(s: GameState, drops: number, kind: Kind) {
  for (let slot = 0; slot < s.cells.length && drops > 0; slot++) {
    const c = s.cells[slot];
    if (!isHoney(c) || c.phase !== 'filling' || (c.kind !== null && c.kind !== kind)) continue;
    const take = Math.min(drops, CELL_CAP - c.nectar);
    c.nectar += take;
    c.kind = kind;
    drops -= take;
    s.events.push({ kind: 'nectar', slot });
    if (c.nectar === CELL_CAP) {
      c.phase = 'ripening';
      c.ripenMs = ripenTime(s);
    }
  }
  if (drops > 0) {
    s.spilled += drops;
    s.events.push({ kind: 'spilled', drops });
  }
}

/** Pays for a new cell, with wax first, and puts it on the spot. */
function place(s: GameState, slot: number, price: number, cell: Cell) {
  // Also refuses a slot off the comb, which reads as undefined.
  if (s.cells[slot] !== null) return false;
  const pay = withWax(s, price);
  if (s.coins < pay.coins) return false;
  s.coins -= pay.coins;
  s.wax -= pay.wax;
  s.cells[slot] = cell;
  s.events.push({ kind: 'built', slot, touching: touching(s, slot), wax: pay.wax });
  return true;
}

/** Builds a honey cell on an empty spot, if there are coins (and wax) enough; a hive's first is free. */
export const build = (s: GameState, slot: number) => place(s, slot, cellPrice(s, hiveOf(slot)), emptyCell());

/** Builds a brood cell on an empty spot, which hatches a bee every `BROOD_MS`. */
export const buildBrood = (s: GameState, slot: number) => place(s, slot, broodPrice(s, hiveOf(slot)), { type: 'brood', hatchMs: BROOD_MS });

/** Whether there are coins and wax enough for a cell at this price. */
export const canPay = (s: GameState, price: number) => s.coins >= withWax(s, price).coins;

/** Sends every bee at home out for the nectar they forage now, if the comb has room for it. In winter they stay in. */
export function send(s: GameState) {
  if (room(s) === 0 || isWinter(s)) return false;
  const home = s.bees.filter(atHome);
  if (home.length === 0) return false;
  const trip = tripMs(s);
  for (const b of home) {
    b.trip = trip;
    b.tripMs = trip;
    b.kind = s.forage;
    b.flower = Math.floor(Math.random() * FLOWERS);
  }
  return true;
}

/** Chooses where the foragers go next: a kind whose meadow is open. Bees already out finish their trip. */
export function forage(s: GameState, kind: Kind) {
  if (!isOpen(s, kind) || s.forage === kind) return false;
  s.forage = kind;
  return true;
}

/** Takes the honey out of a capped cell into a jar of its kind, plus a piece of wax; the cell starts filling again. */
export function harvest(s: GameState, slot: number) {
  const c = s.cells[slot];
  if (!isHoney(c) || c.phase !== 'capped') return false;
  s.jars[c.kind ?? 'clover']++;
  s.wax++;
  s.cells[slot] = emptyCell();
  s.events.push({ kind: 'harvested', slot });
  return true;
}

/**
 * Sells every jar of honey at its kind's `jarPrice`, fills the village order if it now has its jars,
 * and unlocks each meadow whose goal that reaches.
 */
export function sell(s: GameState) {
  const mead = meadReady(s);
  const jars = jarCount(s) + mead.length * CASK_JARS;
  if (jars === 0) return false;
  let coins = 0;
  for (const k of Object.keys(s.jars) as Kind[]) coins += s.jars[k] * jarPrice(s, k);
  for (const c of mead) coins += c.value;
  s.casks = s.casks.filter((c) => c.agingMs > 0);
  s.events.push({ kind: 'sold', jars, coins });
  s.coins += coins;
  s.sold += jars;
  const o = s.order;
  if (o) {
    o.done = Math.min(o.count, o.done + s.jars[o.kind]);
    if (o.done >= o.count) {
      s.coins += o.premium;
      s.events.push({ kind: 'order-done', premium: o.premium });
      s.order = null;
      s.orderIn = ORDER_GAP_MS;
    }
  }
  for (const k of Object.keys(s.jars) as Kind[]) s.jars[k] = 0;
  while (s.meadows < MEADOWS.length && s.sold >= MEADOWS[s.meadows].need) {
    s.events.push({ kind: 'unlocked', meadow: s.meadows });
    s.meadows++;
  }
  return true;
}

/**
 * The nectar the bees gathered while the page was closed for `awayMs`: one drop per bee per
 * `AWAY_MS_PER_DROP`, at most `AWAY_CAP` and never more than the comb has room for, delivered
 * into the filling cells like a forager's, of the kind they forage. Returns the drops added.
 */
export function gatherAway(s: GameState, awayMs: number) {
  if (!(awayMs > 0) || isWinter(s)) return 0;
  const drops = Math.min(AWAY_CAP, room(s), Math.floor((awayMs * s.bees.length) / AWAY_MS_PER_DROP));
  if (drops > 0) deliver(s, drops, s.forage);
  return drops;
}

/** Buys the next rank of an upgrade, if there are coins enough and ranks left. */
export function buy(s: GameState, id: UpgradeId) {
  const price = nextPrice(id, s.ranks[id]);
  if (price === null || s.coins < price) return false;
  s.coins -= price;
  s.ranks[id]++;
  return true;
}

const capped = (s: GameState) => s.cells.flatMap((c, slot) => (isHoney(c) && c.phase === 'capped' ? [slot] : []));

/**
 * Wasp raids, once the hive has sold `WASPS_FROM` jars: every so often a wasp flies in to a capped
 * cell, sits on it for `WASP_STEAL_MS` and flies off with its honey. Guard Bees drive it off as it
 * lands; a wasp whose cell is harvested first leaves empty-handed.
 */
function raid(s: GameState, dt: number) {
  for (const w of s.wasps) {
    w.ms += dt;
    const target = s.cells[w.slot];
    const ready = isHoney(target) && target.phase === 'capped';
    if (w.phase === 'in') {
      if (!ready) leave(w, Math.min(1, w.ms / WASP_IN_MS));
      else if (w.ms >= WASP_IN_MS) {
        if (s.ranks.guards > 0) {
          leave(w, 1);
          s.events.push({ kind: 'guarded', id: w.id });
        } else [w.phase, w.ms] = ['steal', 0];
      }
    } else if (w.phase === 'steal') {
      if (!ready) leave(w, 1);
      else if (w.ms >= WASP_STEAL_MS) {
        s.cells[w.slot] = emptyCell();
        s.events.push({ kind: 'stolen', slot: w.slot });
        leave(w, 1);
      }
    }
  }
  s.wasps = s.wasps.filter((w) => w.phase !== 'out' || w.ms < WASP_OUT_MS);

  if (s.sold < WASPS_FROM) return;
  const targets = capped(s);
  if (targets.length === 0 || s.wasps.some((w) => w.phase !== 'out')) return;
  s.waspIn -= dt;
  if (s.waspIn > 0) return;
  s.waspIn = WASP_GAP + Math.random() * WASP_GAP_SPREAD;
  const wasp: Wasp = { id: s.nextId++, slot: targets[Math.floor(Math.random() * targets.length)], phase: 'in', ms: 0, turned: 0 };
  s.wasps.push(wasp);
  s.events.push({ kind: 'wasp', id: wasp.id });
}

function leave(w: Wasp, turned: number) {
  w.phase = 'out';
  w.ms = 0;
  w.turned = turned;
}

/** A tap on a wasp chases it off before it steals anything. */
export function swat(s: GameState, id: number) {
  const w = s.wasps.find((w) => w.id === id);
  if (!w || w.phase === 'out') return false;
  leave(w, w.phase === 'in' ? Math.min(1, w.ms / WASP_IN_MS) : 1);
  s.events.push({ kind: 'swatted', id });
  return true;
}

/**
 * Village orders, once the hive has sold `ORDERS_FROM` jars: a new one comes `ORDER_GAP_MS` after
 * the last ended, for 3 to 5 jars of an open kind, and lapses after `ORDER_MS`. `sell` fills it.
 */
function orders(s: GameState, dt: number) {
  const o = s.order;
  if (o) {
    o.leftMs = Math.max(0, o.leftMs - dt);
    if (o.leftMs > 0) return;
    s.order = null;
    s.orderIn = ORDER_GAP_MS;
    s.events.push({ kind: 'order-failed' });
    return;
  }
  if (s.sold < ORDERS_FROM) return;
  s.orderIn -= dt;
  if (s.orderIn > 0) return;
  // Only kinds whose meadow stays open long enough to forage for the order; it lapses when its meadow shuts.
  const open = openKinds(s).filter((k) => openLeft(s, k) >= ORDER_MIN_MS);
  const kind = open[Math.floor(Math.random() * open.length)];
  const count = 3 + Math.floor(Math.random() * 3);
  s.order = { kind, count, done: 0, leftMs: Math.min(ORDER_MS, openLeft(s, kind)), premium: count * ORDER_COINS_PER_JAR };
  s.events.push({ kind: 'order', order: s.order });
}


/** The kind a cask would take now: the kind with the most jars (the dearest on a tie), or null with none to spare. */
export function caskKind(s: GameState): Kind | null {
  if (s.casks.length >= MAX_CASKS) return null;
  const best = [...KINDS].reverse().sort((a, b) => s.jars[b] - s.jars[a])[0];
  return s.jars[best] >= CASK_JARS ? best : null;
}

/** Puts `CASK_JARS` jars of one kind into a cask to age into mead, worth `MEAD_MULT` times what they would sell for now. */
export function cask(s: GameState) {
  const kind = caskKind(s);
  if (!kind) return false;
  s.casks.push({ kind, agingMs: CASK_MS, value: meadValue(s, kind, CASK_JARS, MEAD_MULT[kind]) });
  s.jars[kind] -= CASK_JARS;
  s.events.push({ kind: 'casked', honey: kind });
  return true;
}

/**
 * A crowded hive (every spot built, the bees at their most, one hive) gets ready to swarm, and
 * `SWARM_MS` later half its bees leave unless the swarm is caught into a second hive first.
 */
function swarm(s: GameState, dt: number) {
  if (!crowded(s)) {
    s.swarmIn = SWARM_MS;
    return;
  }
  if (s.swarmIn === SWARM_MS && dt > 0) s.events.push({ kind: 'swarm-ready' });
  s.swarmIn = Math.max(0, s.swarmIn - dt);
  if (s.swarmIn > 0) return;
  s.swarmIn = SWARM_MS;
  const keep = Math.ceil(s.bees.length / 2);
  // The bees at home leave first; foragers out and bees lent finish what they do.
  const stay = [...s.bees].sort((a, b) => Number(atHome(a)) - Number(atHome(b))).slice(0, keep);
  const lost = s.bees.length - keep;
  s.bees = s.bees.filter((b) => stay.includes(b));
  s.events.push({ kind: 'swarmed', lost });
}

/** Pays `CATCH_PRICE` to catch the swarm into a second hive with its own, empty comb. */
export function catchSwarm(s: GameState) {
  if (!crowded(s) || s.hives >= MAX_HIVES || s.coins < CATCH_PRICE) return false;
  s.coins -= CATCH_PRICE;
  s.hives++;
  s.cells.push(...new Array<null>(SLOTS).fill(null));
  s.swarmIn = SWARM_MS;
  s.events.push({ kind: 'caught' });
  return true;
}

/**
 * Orchard contracts, once the hive has sold `CONTRACTS_FROM` jars: a farmer offers to borrow 2 to
 * 6 bees (never the last one) for `CONTRACT_MS`, and the offer stands for `OFFER_MS`. No offers
 * come in winter. `acceptContract` takes it; the bees come home when it ends.
 */
function contracts(s: GameState, dt: number) {
  const c = s.contract;
  if (c) {
    c.leftMs = Math.max(0, c.leftMs - dt);
    if (c.leftMs > 0) return;
    s.contract = null;
    s.contractIn = CONTRACT_GAP_MS;
    if (c.phase === 'offer') return s.events.push({ kind: 'contract-lapsed' });
    for (const b of s.bees) b.lent = false;
    s.events.push({ kind: 'returned', bees: c.bees });
    return;
  }
  if (s.sold < CONTRACTS_FROM || isWinter(s) || s.bees.length <= CONTRACT_BEES.min) return;
  s.contractIn -= dt;
  if (s.contractIn > 0) return;
  const most = Math.min(CONTRACT_BEES.max, s.bees.length - 1);
  const bees = CONTRACT_BEES.min + Math.floor(Math.random() * (most - CONTRACT_BEES.min + 1));
  s.contract = { bees, pay: bees * CONTRACT_COINS_PER_BEE, phase: 'offer', leftMs: OFFER_MS };
  s.events.push({ kind: 'contract', contract: s.contract });
}

/** Takes the orchard's offer: that many bees at home go to the orchard for `CONTRACT_MS`, paid up front. */
export function acceptContract(s: GameState) {
  const c = s.contract;
  if (!c || c.phase !== 'offer') return false;
  const home = s.bees.filter(atHome);
  if (home.length < c.bees) return false;
  for (const b of home.slice(0, c.bees)) b.lent = true;
  c.phase = 'lent';
  c.leftMs = CONTRACT_MS;
  s.coins += c.pay;
  s.events.push({ kind: 'lent', bees: c.bees, coins: c.pay });
  return true;
}

/**
 * Enters a capped cell's honey in the county fair (open once every meadow is): it scores its
 * neighbours capped with honey of its kind (`fairScore`) and replaces a lower entry of its kind; the cell gives its wax
 * and starts over. With every kind entered the jars are judged, and `FAIR_GOLD` points make the
 * player the Baron.
 */
export function enterFair(s: GameState, slot: number) {
  const c = s.cells[slot];
  if (!fairOpen(s) || !isHoney(c) || c.phase !== 'capped') return false;
  const honey = c.kind ?? 'clover';
  const score = fairScore(s, slot);
  s.wax++;
  s.cells[slot] = emptyCell();
  s.fair[honey] = Math.max(s.fair[honey] ?? -1, score);
  s.events.push({ kind: 'entered', honey, score });
  const total = fairTotal(s);
  if (total === null) return true;
  if (total >= FAIR_GOLD && !s.baron) {
    s.baron = true;
    s.events.push({ kind: 'baron' });
  } else s.events.push({ kind: 'judged', total });
  return true;
}
