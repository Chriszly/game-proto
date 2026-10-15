import { byDifficulty } from '../../../../shared/settings';
import type { Kind } from './honey';
import { MEADOWS } from './meadows';
import { ORDERS_FROM, ORDER_COINS_PER_JAR, ORDER_GAP_MS, ORDER_MS } from './orders';
import {
  AWAY_CAP,
  AWAY_MS_PER_DROP,
  BROOD_MS,
  CELL_CAP,
  FLOWERS,
  MAX_BEES,
  TRIP_MS,
  broodPrice,
  carry,
  cellPrice,
  demand,
  emptyCell,
  isBrood,
  isHoney,
  isOpen,
  jarCount,
  jarPrice,
  openKinds,
  ripenTime,
  room,
  touching,
  withWax,
  type Cell,
  type GameState,
} from './state';
import { nextPrice, type UpgradeId } from './upgrades';
import { WASPS_FROM, WASP_GAP, WASP_GAP_SPREAD, WASP_IN_MS, WASP_OUT_MS, WASP_STEAL_MS, type Wasp } from './wasps';

/** A forager's trip time with the clover planted so far. Easier difficulties have the flowers closer. */
export const tripMs = (s: GameState) => Math.round(TRIP_MS * Math.pow(0.8, s.ranks.clover) * byDifficulty(0.75, 1, 1.3));

/**
 * Moves the hive on by `dt` milliseconds: foragers fly and bring nectar home, full cells ripen,
 * brood cells hatch bees, the market moves, wasps raid, village orders come and go, and with the
 * Waggle Dance bees set off by themselves.
 */
export function tick(s: GameState, dt: number) {
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
  raid(s, dt);
  orders(s, dt);
  if (s.ranks.dance > 0) send(s);
}

/** A brood cell counts down to its next bee while the hive has room for one. */
function hatch(s: GameState, c: Extract<Cell, { type: 'brood' }>, slot: number, dt: number) {
  if (s.bees.length >= MAX_BEES) return;
  c.hatchMs = Math.max(0, c.hatchMs - dt);
  if (c.hatchMs > 0) return;
  c.hatchMs = BROOD_MS;
  const id = s.nextId++;
  s.bees.push({ id, tripMs: 0, trip: 0, flower: 0, kind: s.forage });
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

/** Builds a honey cell on an empty spot, if there are coins (and wax) enough; the first is free. */
export const build = (s: GameState, slot: number) => place(s, slot, cellPrice(s), emptyCell());

/** Builds a brood cell on an empty spot, which hatches a bee every `BROOD_MS`. */
export const buildBrood = (s: GameState, slot: number) => place(s, slot, broodPrice(s), { type: 'brood', hatchMs: BROOD_MS });

/** Whether there are coins and wax enough for a cell at this price. */
export const canPay = (s: GameState, price: number) => s.coins >= withWax(s, price).coins;

/** Sends every bee at home out for the nectar they forage now, if the comb has room for it. */
export function send(s: GameState) {
  if (room(s) === 0) return false;
  const home = s.bees.filter((b) => b.tripMs === 0);
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
  const jars = jarCount(s);
  if (jars === 0) return false;
  let coins = 0;
  for (const k of Object.keys(s.jars) as Kind[]) coins += s.jars[k] * jarPrice(s, k);
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
  if (!(awayMs > 0)) return 0;
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
  const open = openKinds(s);
  const kind = open[Math.floor(Math.random() * open.length)];
  const count = 3 + Math.floor(Math.random() * 3);
  s.order = { kind, count, done: 0, leftMs: ORDER_MS, premium: count * ORDER_COINS_PER_JAR };
  s.events.push({ kind: 'order', order: s.order });
}

