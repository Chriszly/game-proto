import { byDifficulty } from '../../../../shared/settings';
import { CELL_CAP, FLOWERS, HONEY_PRICE, RIPEN_MS, TRIP_MS, beePrice, carry, cellPrice, room, type Bee, type GameState } from './state';
import { nextPrice, type UpgradeId } from './upgrades';

/** A forager's trip time with the clover planted so far. Easier difficulties have the flowers closer. */
export const tripMs = (s: GameState) => Math.round(TRIP_MS * Math.pow(0.8, s.ranks.clover) * byDifficulty(0.75, 1, 1.3));

/**
 * Moves the hive on by `dt` milliseconds: foragers fly and bring nectar home, full cells ripen,
 * and with the Waggle Dance bees set off by themselves.
 */
export function tick(s: GameState, dt: number) {
  for (const b of s.bees) {
    if (b.tripMs <= 0) continue;
    b.tripMs = Math.max(0, b.tripMs - dt);
    if (b.tripMs === 0) deliver(s, carry(s));
  }
  s.cells.forEach((c, slot) => {
    if (c?.phase !== 'ripening') return;
    c.ripenMs = Math.max(0, c.ripenMs - dt);
    if (c.ripenMs > 0) return;
    c.phase = 'capped';
    s.events.push({ kind: 'capped', slot });
  });
  if (s.ranks.dance > 0) send(s);
}

/** A forager is home: its drops go into the filling cells in turn, and what doesn't fit is lost. */
function deliver(s: GameState, drops: number) {
  for (let slot = 0; slot < s.cells.length && drops > 0; slot++) {
    const c = s.cells[slot];
    if (c?.phase !== 'filling') continue;
    const take = Math.min(drops, CELL_CAP - c.nectar);
    c.nectar += take;
    drops -= take;
    s.events.push({ kind: 'nectar', slot });
    if (c.nectar === CELL_CAP) {
      c.phase = 'ripening';
      c.ripenMs = RIPEN_MS;
    }
  }
  if (drops > 0) {
    s.spilled += drops;
    s.events.push({ kind: 'spilled', drops });
  }
}

/** Builds a comb cell on an empty spot, if there are coins enough (the first is free). */
export function build(s: GameState, slot: number) {
  const price = cellPrice(s);
  // Also refuses a slot off the comb, which reads as undefined.
  if (s.cells[slot] !== null || s.coins < price) return false;
  s.coins -= price;
  s.cells[slot] = { nectar: 0, phase: 'filling', ripenMs: 0 };
  s.events.push({ kind: 'built', slot });
  return true;
}

/** Sends every bee at home out to the flowers, if the comb has room for nectar. */
export function send(s: GameState) {
  if (room(s) === 0) return false;
  const home = s.bees.filter((b) => b.tripMs === 0);
  if (home.length === 0) return false;
  const trip = tripMs(s);
  for (const b of home) {
    b.trip = trip;
    b.tripMs = trip;
    b.flower = Math.floor(Math.random() * FLOWERS);
  }
  return true;
}

/** Takes the honey out of a capped cell into a jar; the cell starts filling again. */
export function harvest(s: GameState, slot: number) {
  const c = s.cells[slot];
  if (c?.phase !== 'capped') return false;
  s.cells[slot] = { nectar: 0, phase: 'filling', ripenMs: 0 };
  s.jars++;
  s.events.push({ kind: 'harvested', slot });
  return true;
}

/** Sells every jar of honey. */
export function sell(s: GameState) {
  if (s.jars === 0) return false;
  const coins = s.jars * HONEY_PRICE;
  s.events.push({ kind: 'sold', jars: s.jars, coins });
  s.coins += coins;
  s.sold += s.jars;
  s.jars = 0;
  return true;
}

/** Buys one more bee, which starts at home. */
export function buyBee(s: GameState) {
  const price = beePrice(s);
  if (price === null || s.coins < price) return false;
  s.coins -= price;
  const bee: Bee = { id: s.nextId++, tripMs: 0, trip: 0, flower: 0 };
  s.bees.push(bee);
  s.events.push({ kind: 'bee', id: bee.id });
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
