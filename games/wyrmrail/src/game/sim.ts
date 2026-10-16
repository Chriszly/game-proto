import { byDifficulty } from '../../../../shared/settings';
import {
  CARGO_NAMES,
  ROOST,
  TRACK_COST,
  WORKSHOPS,
  generateValley,
  key,
  manhattan,
  neighbours,
  opposite,
  sameTile,
  terrainAt,
  type Cargo,
  type Tile,
  type Village,
} from './map';
import {
  BANNER_MS,
  BASE_SPEED,
  CHARTERS,
  CHARTER_ROUND,
  DEADLINE_BASE_MS,
  DEADLINE_PER_TILE_MS,
  EAT_MS,
  FESTIVAL_GOAL,
  FESTIVAL_ROUND,
  FOOD_PER_TILE,
  HAZARD_EVERY_MS,
  HAZARD_ROUND,
  HAZARD_WARN_MS,
  HOARD_BONUS,
  HUNGRY,
  JUNCTION_WAIT_MS,
  LOAD_MS,
  MAX_ORDERS,
  MOOD_GAP_MS,
  MOOD_GAP_PER_VILLAGE_MS,
  MOOD_MAX,
  MOOD_PAY,
  MOOD_ROUND,
  MOOD_RUSH,
  ORDER_EVERY_MS,
  PASSENGER_CHANCE,
  PASSENGER_PAY,
  PASSENGER_ROUND,
  PASSENGER_TIME,
  PAY_BASE,
  PAY_PER_TILE,
  POP_MS,
  SECOND_WYRM_ROUND,
  STARVING_SLOWDOWN,
  START_COINS,
  START_HEARTS,
  SWITCH_MS,
  UPGRADE_COSTS,
  WAGONS,
  WINGS_SPEED,
  WORKSHOP_CHANCE,
  WORKSHOP_PAY,
  isPassengers,
  roundGoal,
  type Charter,
  type GameState,
  type Job,
  type Order,
  type Upgrade,
  type Wyrm,
} from './state';

// All the rules. Only this file changes the game state; the scene reads it and calls these.

const newWyrm = (): Wyrm => ({ at: { ...ROOST }, path: [], progress: 0, from: null, job: null, loadMs: 0, switchMs: 0, food: 1, eatMs: 0, waitMs: 0 });

export function newGame(): GameState {
  const valley = generateValley();
  const s: GameState = {
    phase: 'play',
    valley,
    coins: START_COINS,
    hearts: START_HEARTS,
    round: 1,
    delivered: 0,
    totalDelivered: 0,
    track: [],
    orders: [],
    queue: [],
    switches: {},
    cuts: [],
    crossings: [],
    moods: valley.villages.map(() => 0),
    idleMs: valley.villages.map(() => 0),
    hazard: null,
    hazardTimerMs: HAZARD_EVERY_MS,
    charter: null,
    charterOffer: null,
    wyrms: [newWyrm()],
    upgrades: { wings: 0, hoard: 0, second: 0 },
    orderTimerMs: ORDER_EVERY_MS,
    banner: { text: 'Lay track from the Roost to Millbrook and Ashford', ms: BANNER_MS * 1.5 },
    pops: [],
    nextId: 1,
  };
  // The first order is always grain from Millbrook to Ashford.
  addOrder(s, 0, 1);
  return s;
}

/** Every village of this game's valley, open or not; orders index into it. */
export const villages = (s: GameState): readonly Village[] => s.valley.villages;

/** The villages on the line this round. */
export const openVillages = (s: GameState) => villages(s).filter((v) => v.round <= s.round);

/** The village the festival is held at in the last round: the last to join the line. */
export const festivalHost = (s: GameState) => villages(s).length - 1;

/** The workshop of a village, if it has one. */
export const workshopOf = (v: Village) => WORKSHOPS[v.name] ?? null;

/** A station: the Roost or a village that has joined the line. */
function isStation(s: GameState, t: Tile) {
  return sameTile(t, ROOST) || openVillages(s).some((v) => sameTile(v, t));
}

/** A tile the wyrm can stand on: track or a station. */
function onLine(s: GameState, t: Tile) {
  return s.track.includes(key(t)) || isStation(s, t);
}

/** What a piece of track on `t` would cost, or null if none can go there. */
export function trackCost(s: GameState, t: Tile): number | null {
  const terrain = terrainAt(s.valley, t);
  if (terrain === 'mountain' || s.track.includes(key(t))) return null;
  if (sameTile(t, ROOST) || villages(s).some((v) => sameTile(v, t))) return null;
  // Track grows from the line: next to track, the Roost or an open village.
  if (!neighbours(t).some((n) => onLine(s, n))) return null;
  return Math.max(1, Math.round(TRACK_COST[terrain] * (s.charter?.track ?? 1)));
}

export function canBuild(s: GameState, t: Tile) {
  const cost = trackCost(s, t);
  return s.phase === 'play' && cost !== null && cost <= s.coins;
}

/**
 * Lays track on `t`. By default it joins every neighbour on the line. Laid plain, it joins only the
 * piece it continues (`from`, the tile the drag came from, else its first neighbour on the line)
 * and the tile straight across from that; with track on all four sides it is a crossing, two
 * straights that don't join.
 */
export function buildTrack(s: GameState, t: Tile, plain = false, from: Tile | null = null) {
  if (!canBuild(s, t)) return false;
  const cost = trackCost(s, t)!;
  s.coins -= cost;
  if (plain) {
    const line = neighbours(t).filter((n) => onLine(s, n));
    if (line.length === 4) s.crossings.push(key(t));
    else {
      const origin = from && line.some((n) => sameTile(n, from)) ? from : line[0];
      const across = opposite(t, origin);
      for (const n of line) if (!sameTile(n, origin) && !sameTile(n, across)) s.cuts.push(cutKey(t, n));
    }
  }
  s.track.push(key(t));
  syncSwitches(s, t);
  pop(s, `-${cost}`, t, '#f0c070');
  return true;
}

const cutKey = (a: Tile, b: Tile) => [key(a), key(b)].sort().join('|');
/** Whether two tiles next to each other on the line are not joined. */
export const isCut = (s: GameState, a: Tile, b: Tile) => s.cuts.includes(cutKey(a, b));
/** A crossing: track where two straights cross without joining, so the wyrm can only go straight over it. */
export const isCrossing = (s: GameState, t: Tile) => s.crossings.includes(key(t));
const tileOf = (k: string): Tile => {
  const [c, r] = k.split(',').map(Number);
  return { c, r };
};

/** Track can be taken up for half its cost, unless the wyrm stands on it or is about to cross it. */
export function canRemove(s: GameState, t: Tile) {
  if (s.phase !== 'play' || !s.track.includes(key(t))) return false;
  return s.wyrms.every((w) => !sameTile(w.at, t) && !w.path.some((p) => sameTile(p, t)));
}

export function removeTrack(s: GameState, t: Tile) {
  if (!canRemove(s, t)) return false;
  s.track = s.track.filter((k) => k !== key(t));
  if (s.hazard && sameTile(s.hazard.tile, t)) s.hazard = null;
  syncSwitches(s);
  const refund = Math.floor(TRACK_COST[terrainAt(s.valley, t) as keyof typeof TRACK_COST] / 2);
  s.coins += refund;
  pop(s, `+${refund}`, t, '#f3c64e');
  return true;
}

/** The tiles next to `t` that are on the line and joined to it. */
export function arms(s: GameState, t: Tile) {
  return neighbours(t).filter((n) => onLine(s, n) && !isCut(s, t, n));
}

/**
 * Gives every junction (track with three or four arms) a switch and drops the switches that are no
 * longer on one. A new switch is set against `newest` when that is one of its arms (the branch just
 * laid), else against its last arm.
 */
function syncSwitches(s: GameState, newest?: Tile) {
  // A cut goes with the track on either side of it; a crossing with fewer than four arms is plain track.
  s.cuts = s.cuts.filter((c) => c.split('|').every((k) => onLine(s, tileOf(k))));
  s.crossings = s.crossings.filter((k) => s.track.includes(k) && arms(s, tileOf(k)).length === 4);
  const next: Record<string, string> = {};
  for (const k of s.track) {
    if (s.crossings.includes(k)) continue;
    const a = arms(s, tileOf(k)).map(key);
    if (a.length < 3) continue;
    const old = s.switches[k];
    next[k] = old && a.includes(old) ? old : newest && a.includes(key(newest)) ? key(newest) : a[a.length - 1];
  }
  s.switches = next;
}

/** Throws the switch on a junction: it is set against the next of its arms. */
export function throwSwitch(s: GameState, t: Tile) {
  const closed = s.switches[key(t)];
  if (s.phase !== 'play' || !closed) return false;
  const a = arms(s, t).map(key);
  s.switches[key(t)] = a[(a.indexOf(closed) + 1) % a.length];
  return true;
}

/** Whether going from `at` to `next`, having come in from `from`, uses the arm the switch on `at` is set against. */
function againstSwitch(s: GameState, from: Tile | null, at: Tile, next: Tile) {
  const closed = s.switches[key(at)];
  return !!closed && (closed === key(next) || (!!from && closed === key(from)));
}

/** A wyrm throws the switch on `at` itself: set against an arm this move doesn't use. */
function setSwitchFor(s: GameState, from: Tile | null, at: Tile, next: Tile) {
  const used = [key(next), from ? key(from) : ''];
  const free = arms(s, at).map(key).filter((k) => !used.includes(k));
  if (s.switches[key(at)] && free.length) s.switches[key(at)] = free[0];
}

/**
 * A way along the line from `a` to `b`, without `a`, for a wyrm that came to `a` from `from`; null
 * if there is none. It searches (tile, came-from) pairs: it goes straight over a crossing, and it
 * only turns back at a station, at the end of a line, or where it starts. Loose, it is the shortest
 * such way, switches or not. Strict, it is the shortest way the switches leave open: it never uses a
 * junction's barred arm.
 */
export function route(s: GameState, a: Tile, b: Tile, from: Tile | null = null, strict = false): Tile[] | null {
  type Step = { t: Tile; prev: Tile | null; back: Step | null };
  const seen = new Set<string>();
  const id = (t: Tile, prev: Tile | null) => `${key(t)}<${prev ? key(prev) : ''}`;
  const queue: Step[] = [{ t: a, prev: from, back: null }];
  seen.add(id(a, from));
  while (queue.length) {
    const step = queue.shift()!;
    if (sameTile(step.t, b)) {
      const path: Tile[] = [];
      for (let at: Step | null = step; at?.back; at = at.back) path.unshift(at.t);
      return path;
    }
    const closed = s.switches[key(step.t)];
    const out = arms(s, step.t);
    const crossing = step.back && step.prev && isCrossing(s, step.t) ? opposite(step.t, step.prev) : null;
    for (const n of out) {
      if (seen.has(id(n, step.t))) continue;
      if (crossing && !sameTile(n, crossing)) continue;
      const back = step.prev && sameTile(n, step.prev);
      if (back && step.back && out.length > 1 && !isStation(s, step.t)) continue;
      if (strict && closed && (closed === key(n) || (step.prev && closed === key(step.prev)))) continue;
      seen.add(id(n, step.t));
      queue.push({ t: n, prev: step.t, back: step });
    }
  }
  return null;
}

/** The way a wyrm takes to `b`: the way the switches are set if there is one, else the shortest way, throwing switches as it goes. */
function planRoute(s: GameState, w: Wyrm, b: Tile) {
  return route(s, w.at, b, w.from, true) ?? route(s, w.at, b, w.from);
}

/** Whether a wyrm could fetch and deliver this order along the track laid so far. */
export function routable(s: GameState, o: Order) {
  const from = villages(s)[o.from];
  return s.wyrms.some((w) => route(s, w.at, from) !== null) && route(s, from, villages(s)[o.to]) !== null;
}

/** Sends the wyrms for a waiting order; they fetch and deliver sent orders nearest stop first. */
export function dispatch(s: GameState, id: number) {
  const o = s.orders.find((o) => o.id === id);
  if (s.phase !== 'play' || !o || o.status !== 'waiting' || !routable(s, o)) return false;
  o.status = 'queued';
  s.queue.push(id);
  return true;
}

/** Why an upgrade can't be bought yet, whatever the coins: the second wyrm comes late in the game. */
export const upgradeLocked = (s: GameState, u: Upgrade) => u === 'second' && s.round < SECOND_WYRM_ROUND;

export const upgradeCost = (s: GameState, u: Upgrade): number | null => (UPGRADE_COSTS[u] as readonly number[])[s.upgrades[u]] ?? null;

export function buyUpgrade(s: GameState, u: Upgrade) {
  const cost = upgradeCost(s, u);
  if (s.phase !== 'play' || cost === null || cost > s.coins || upgradeLocked(s, u)) return false;
  s.coins -= cost;
  s.upgrades[u]++;
  if (u === 'second') {
    s.wyrms.push(newWyrm());
    s.banner = { text: 'A second wyrm wakes in the Roost', ms: BANNER_MS };
  }
  return true;
}

/** A wyrm's speed in tiles a second: Swift wings make it faster, an empty belly slower. */
export const wyrmSpeed = (s: GameState, w: Wyrm) =>
  (BASE_SPEED + WINGS_SPEED * s.upgrades.wings) * (w.food <= 0 ? STARVING_SLOWDOWN : 1);

/** What delivering an order pays, with the Golden hoard. */
export const orderPay = (s: GameState, o: Order) => Math.round(o.pay * (1 + HOARD_BONUS * s.upgrades.hoard));

/** The order a job is for, if any. */
export const jobOrder = (job: Job | null) => (job && job.leg !== 'feed' ? job.order : null);

/** Where a job takes the wyrm, or null if its order is gone. */
function jobTarget(s: GameState, job: Job): Tile | null {
  if (job.leg === 'feed') return ROOST;
  const o = s.orders.find((o) => o.id === job.order);
  return o ? villages(s)[job.leg === 'pickup' ? o.from : o.to] : null;
}

/** Picks one of the two charters on offer for the round; the game goes on. */
export function pickCharter(s: GameState, i: number) {
  const charter = s.charterOffer?.[i];
  if (s.phase !== 'play' || !charter) return false;
  s.charter = charter;
  s.charterOffer = null;
  s.banner = { text: `Charter: ${charter.name}`, ms: BANNER_MS };
  return true;
}

/** A charter's pay for this cargo, times the usual: its `pay` for every cargo, or only for its own. */
const charterPay = (s: GameState, cargo: Cargo) => (s.charter && (!s.charter.cargo || s.charter.cargo === cargo) ? s.charter.pay : 1);

/** Moves the game on by `dt` milliseconds of game time. The game waits while a charter is on offer. */
export function tick(s: GameState, dt: number) {
  for (const p of s.pops) p.ms -= dt;
  s.pops = s.pops.filter((p) => p.ms > 0);
  if (s.banner && (s.banner.ms -= dt) <= 0) s.banner = null;
  if (s.phase !== 'play' || s.charterOffer) return;

  if (s.orders.length < MAX_ORDERS && (s.orderTimerMs -= dt * (s.charter?.orders ?? 1)) <= 0) {
    s.orderTimerMs = ORDER_EVERY_MS;
    randomOrder(s);
  }
  for (const o of [...s.orders]) {
    if ((o.timeLeftMs -= dt) <= 0) failOrder(s, o);
    if (s.phase !== 'play') return;
  }
  tickMoods(s, dt);
  tickHazard(s, dt);
  for (let i = 0; i < s.wyrms.length && s.phase === 'play'; i++) moveWyrm(s, i, dt);
}

/** A village's mood, as the orders it sends feel it: nothing before `MOOD_ROUND`. */
export const moodOf = (s: GameState, v: number) => (s.round >= MOOD_ROUND ? s.moods[v] : 0);

/** Cheers (`by` > 0) or sours a village. At rock bottom it loses faith in the line: a heart goes, and it sulks on. */
function cheer(s: GameState, v: number, by: number) {
  if (s.round < MOOD_ROUND) return;
  s.moods[v] = Math.max(-MOOD_MAX, Math.min(MOOD_MAX, s.moods[v] + by));
  if (s.moods[v] > -MOOD_MAX) return;
  s.moods[v] = 1 - MOOD_MAX;
  s.hearts--;
  pop(s, `${villages(s)[v].name} loses faith!`, villages(s)[v], '#f08a6a');
  if (s.hearts <= 0) s.phase = 'over';
}

/** Every open village waits for a visit; one that waits too long sours. The wait allowed grows with the villages on the line. */
function tickMoods(s: GameState, dt: number) {
  if (s.round < MOOD_ROUND) return;
  const open = openIndexes(s);
  const gap = MOOD_GAP_MS + MOOD_GAP_PER_VILLAGE_MS * open.length;
  for (const v of open) {
    if ((s.idleMs[v] += dt) < gap) continue;
    s.idleMs[v] = 0;
    pop(s, `${villages(s)[v].name} feels forgotten`, villages(s)[v], '#d8c7a6');
    cheer(s, v, -1);
    if (s.phase !== 'play') return;
  }
}

/** The track a washout (a bridge) or a rockfall (track beside a mountain) could take. */
function hazardKind(s: GameState, t: Tile): 'washout' | 'rockfall' | null {
  if (terrainAt(s.valley, t) === 'river') return 'washout';
  return neighbours(t).some((n) => terrainAt(s.valley, n) === 'mountain') ? 'rockfall' : null;
}

/** From `HAZARD_ROUND`, a washout or a rockfall is warned every so often and takes a tile's track when its time is up. */
function tickHazard(s: GameState, dt: number) {
  if (s.round < HAZARD_ROUND) return;
  if (s.hazard) {
    if ((s.hazard.ms -= dt) <= 0) strikeHazard(s);
    return;
  }
  if ((s.hazardTimerMs -= dt) > 0) return;
  s.hazardTimerMs = HAZARD_EVERY_MS;
  const spots = s.track.map(tileOf).filter((t) => hazardKind(s, t));
  if (!spots.length) return;
  const tile = spots[Math.floor(Math.random() * spots.length)];
  const kind = hazardKind(s, tile)!;
  s.hazard = { tile, kind, ms: HAZARD_WARN_MS };
  s.banner = {
    text: kind === 'washout' ? 'The river is rising: a bridge is about to wash out!' : 'Stones are loosening: a rockfall is coming down on the track!',
    ms: BANNER_MS,
  };
}

/** The hazard takes its tile's track, once no wyrm is on it or about to cross it; the wyrms heading over it stop short and think again. */
function strikeHazard(s: GameState) {
  const h = s.hazard!;
  if (s.wyrms.some((w) => sameTile(w.at, h.tile) || (w.progress > 0 && w.path.length && sameTile(w.path[0], h.tile)))) {
    h.ms = 500;
    return;
  }
  s.hazard = null;
  s.track = s.track.filter((k) => k !== key(h.tile));
  syncSwitches(s);
  pop(s, h.kind === 'washout' ? 'Washed out!' : 'Rockfall!', h.tile, '#f08a6a');
  for (const w of s.wyrms) {
    const i = w.path.findIndex((t) => sameTile(t, h.tile));
    if (i < 0) continue;
    w.path = w.path.slice(0, i);
    dropJob(s, w);
  }
}

/** A wyrm gives up the stop it was heading for: a pickup goes back to the queue, cargo stays aboard. */
function dropJob(s: GameState, w: Wyrm) {
  const o = s.orders.find((o) => o.id === jobOrder(w.job));
  if (o && w.job?.leg === 'pickup') {
    o.wyrm = null;
    s.queue.unshift(o.id);
  }
  w.job = null;
}

function moveWyrm(s: GameState, i: number, dt: number) {
  const w = s.wyrms[i];
  if (w.switchMs > 0) {
    if ((w.switchMs -= dt) > 0) return;
    w.switchMs = 0;
    if (w.path.length) setSwitchFor(s, w.from, w.at, w.path[0]);
  }
  if (w.loadMs > 0) {
    if ((w.loadMs -= dt) > 0) return;
    w.loadMs = 0;
    const o = s.orders.find((o) => o.id === jobOrder(w.job));
    if (o) o.status = 'carrying';
    w.job = null;
  }
  if (w.eatMs > 0) {
    if ((w.eatMs -= dt) > 0) return;
    w.eatMs = 0;
    w.food = 1;
    w.job = null;
  }
  // A new stop is picked once the wyrm stands still on a tile.
  if (!w.job && !w.path.length) nextStop(s, i);
  if (w.path.length) {
    if (w.progress === 0) {
      if (againstSwitch(s, w.from, w.at, w.path[0])) return void stopForSwitch(s, w);
      if (waitForOther(s, i, dt)) return;
    }
    w.progress += (wyrmSpeed(s, w) * dt) / 1000;
    while (w.progress >= 1 && w.path.length) {
      w.from = w.at;
      w.at = w.path.shift()!;
      w.progress -= 1;
      if (!s.charter?.fed) w.food = Math.max(0, w.food - FOOD_PER_TILE);
      // On every tile it looks again at the switches ahead, so a switch thrown on the fly steers it.
      const target = w.job && w.path.length ? jobTarget(s, w.job) : null;
      if (target) w.path = planRoute(s, w, target) ?? w.path;
      if (!w.path.length) break;
      if (againstSwitch(s, w.from, w.at, w.path[0])) return void stopForSwitch(s, w);
      if (waitForOther(s, i, 0)) return void (w.progress = 0);
    }
    if (w.path.length) return;
    w.progress = 0;
  }
  if (w.job) arrive(s, i);
}

/** The switch ahead is set against the wyrm and no open way is left: it stops on the junction to throw it. */
function stopForSwitch(s: GameState, w: Wyrm) {
  w.progress = 0;
  w.switchMs = SWITCH_MS;
  pop(s, 'Switch!', w.at, '#f0c070');
}

/**
 * Whether a wyrm about to move on has to wait: the tile ahead is a junction the other wyrm is on or
 * heading into. It waits `JUNCTION_WAIT_MS` at most, so two wyrms never block each other for good.
 */
function waitForOther(s: GameState, i: number, dt: number) {
  const w = s.wyrms[i];
  const next = w.path[0];
  const held =
    !!s.switches[key(next)] &&
    s.wyrms.some((o, j) => j !== i && (sameTile(o.at, next) || (o.path.length > 0 && sameTile(o.path[0], next))));
  if (!held || w.waitMs >= JUNCTION_WAIT_MS) {
    w.waitMs = 0;
    return false;
  }
  w.waitMs += dt;
  return true;
}

/**
 * Picks a wyrm's next stop. A hungry wyrm flies to the Roost to eat first. Otherwise it is the
 * nearest of the villages its cargo is going to and, while a wagon is free, the villages with sent
 * orders to fetch.
 */
function nextStop(s: GameState, i: number) {
  const w = s.wyrms[i];
  if (w.food <= HUNGRY) {
    const path = planRoute(s, w, ROOST);
    if (path) {
      w.job = { leg: 'feed' };
      w.path = path;
      if (!path.length) arrive(s, i);
      return;
    }
  }
  const carrying = s.orders.filter((o) => o.status === 'carrying' && o.wyrm === i);
  const stops: { order: Order; leg: 'pickup' | 'drop' }[] = carrying.map((order) => ({ order, leg: 'drop' }));
  // Passengers take both wagons: a wyrm fetches them only when empty, and loads nothing else with them.
  if (carrying.length < WAGONS && !carrying.some(isPassengers)) {
    for (const id of s.queue) {
      const order = s.orders.find((o) => o.id === id);
      if (order && !(isPassengers(order) && carrying.length)) stops.push({ order, leg: 'pickup' });
    }
  }
  let best: { order: Order; leg: 'pickup' | 'drop'; path: Tile[] } | null = null;
  for (const stop of stops) {
    const path = planRoute(s, w, villages(s)[stop.leg === 'pickup' ? stop.order.from : stop.order.to]);
    if (path && (!best || path.length < best.path.length)) best = { ...stop, path };
  }
  if (!best) return;
  if (best.leg === 'pickup') {
    s.queue = s.queue.filter((id) => id !== best.order.id);
    best.order.wyrm = i;
  }
  w.job = { order: best.order.id, leg: best.leg };
  w.path = best.path;
}

/** A wyrm has reached the end of its path. */
function arrive(s: GameState, i: number) {
  const w = s.wyrms[i];
  if (w.job?.leg === 'feed') {
    w.eatMs = EAT_MS;
    pop(s, 'Munch!', ROOST, '#c9e8c0');
    return;
  }
  const o = s.orders.find((o) => o.id === jobOrder(w.job));
  if (!o) return void (w.job = null);
  if (w.job!.leg === 'pickup') {
    o.status = 'loading';
    w.loadMs = LOAD_MS;
    s.idleMs[o.from] = 0;
    return;
  }
  // Delivered, in time: the village is visited and cheered.
  const pay = orderPay(s, o);
  s.coins += pay;
  s.orders = s.orders.filter((x) => x !== o);
  w.job = null;
  s.delivered++;
  s.totalDelivered++;
  s.idleMs[o.to] = 0;
  cheer(s, o.to, 1);
  pop(s, `+${pay}`, villages(s)[o.to], '#f3c64e');
  const shop = workshopOf(villages(s)[o.to]);
  if (shop && shop.takes === o.cargo) makeGoods(s, o.to);
  if (s.delivered < roundGoal(s.round)) return;
  if (s.round === FESTIVAL_ROUND) {
    s.phase = 'won';
    s.banner = null;
  } else nextRound(s);
}

/** A workshop turns the goods just brought into better ones, and sends them on as a new order. */
function makeGoods(s: GameState, at: number) {
  if (s.orders.length > MAX_ORDERS) return;
  const open = openIndexes(s).filter((i) => i !== at);
  const host = festivalHost(s);
  const to = s.round === FESTIVAL_ROUND && host !== at ? host : open[Math.floor(Math.random() * open.length)];
  if (to === undefined) return;
  addOrder(s, at, to, true);
  const v = villages(s)[at];
  pop(s, `${CARGO_NAMES[workshopOf(v)!.makes]}!`, { c: v.c, r: v.r - 1 }, '#f3e9d2');
}

function nextRound(s: GameState) {
  s.round++;
  s.delivered = 0;
  syncSwitches(s);
  const joining = villages(s).find((v) => v.round === s.round);
  if (joining) s.idleMs[villages(s).indexOf(joining)] = 0;
  s.charter = null;
  if (s.round >= CHARTER_ROUND) s.charterOffer = offerCharters(s);
  s.banner = {
    text:
      s.round === FESTIVAL_ROUND
        ? `Festival at ${villages(s)[festivalHost(s)].name}: bring it ${FESTIVAL_GOAL} loads!`
        : joining
          ? `Round ${s.round}: ${joining.name} joins the line`
          : `Round ${s.round}`,
    ms: BANNER_MS * (s.round === FESTIVAL_ROUND ? 1.5 : 1),
  };
}

/**
 * Two charters for the round to choose from, no two alike. A cargo charter is for a cargo an open
 * village sends.
 */
function offerCharters(s: GameState): Charter[] {
  const pool = [...CHARTERS];
  const offer: Charter[] = [];
  while (offer.length < 2 && pool.length) {
    const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (!c.cargo) {
      offer.push(c);
      continue;
    }
    const cargos = [...new Set(openIndexes(s).map((i) => villages(s)[i].cargo))];
    const cargo = cargos[Math.floor(Math.random() * cargos.length)];
    offer.push({ ...c, cargo, text: c.text.replace('%c', CARGO_NAMES[cargo]) });
  }
  return offer;
}

/** The order ran out of time: it leaves the board, the village that waited for it sours, and the line loses a heart. */
function failOrder(s: GameState, o: Order) {
  s.orders = s.orders.filter((x) => x !== o);
  s.queue = s.queue.filter((id) => id !== o.id);
  for (const w of s.wyrms) {
    if (jobOrder(w.job) !== o.id) continue;
    w.job = null;
    w.loadMs = 0;
    // It stops at the next tile it reaches.
    w.path = w.progress > 0 ? w.path.slice(0, 1) : [];
  }
  s.hearts--;
  pop(s, `${CARGO_NAMES[o.cargo]} late!`, villages(s)[o.to], '#f08a6a');
  if (s.hearts <= 0) return void (s.phase = 'over');
  cheer(s, o.to, -1);
}

/**
 * A new order from one village to another: ordinary goods, a workshop's goods, or passengers. The
 * sending village's mood sets its pay (cheerful or delighted) or its time (sulking); the round's
 * charter and passengers scale both.
 */
function addOrder(s: GameState, from: number, to: number, made = false, passengers = false) {
  const vs = villages(s);
  const dist = manhattan(vs[from], vs[to]);
  const cargo: Cargo = passengers ? 'passengers' : made ? workshopOf(vs[from])!.makes : vs[from].cargo;
  const mood = moodOf(s, from);
  const charter = s.charter;
  const time = (mood < 0 ? MOOD_RUSH : 1) * (passengers ? PASSENGER_TIME : 1) * (charter?.time ?? 1);
  const totalMs = Math.round((DEADLINE_BASE_MS + DEADLINE_PER_TILE_MS * dist) * byDifficulty(1.5, 1, 0.7) * time);
  const pay = (made ? WORKSHOP_PAY : 1) * MOOD_PAY[Math.max(0, mood)] * (passengers ? PASSENGER_PAY : 1) * charterPay(s, cargo);
  s.orders.push({
    id: s.nextId++,
    cargo,
    from,
    to,
    pay: Math.round((PAY_BASE + PAY_PER_TILE * dist) * pay),
    timeLeftMs: totalMs,
    totalMs,
    status: 'waiting',
    wyrm: null,
    made,
  });
}

const openIndexes = (s: GameState) => villages(s).map((_, i) => i).filter((i) => villages(s)[i].round <= s.round);

/**
 * A new order between two open villages, picked with Math.random. Goods a workshop takes often go
 * to that workshop; from `PASSENGER_ROUND` now and then the order is passengers; in the festival
 * every order goes to the festival.
 */
function randomOrder(s: GameState) {
  const open = openIndexes(s);
  const pick = (list: number[]) => list[Math.floor(Math.random() * list.length)];
  const host = festivalHost(s);
  const passengers = s.round >= PASSENGER_ROUND && Math.random() < PASSENGER_CHANCE;
  if (s.round === FESTIVAL_ROUND) return addOrder(s, pick(open.filter((i) => i !== host)), host, false, passengers);
  const from = pick(open);
  const others = open.filter((i) => i !== from);
  if (passengers) return addOrder(s, from, pick(others), false, true);
  const shops = others.filter((i) => workshopOf(villages(s)[i])?.takes === villages(s)[from].cargo);
  addOrder(s, from, shops.length && Math.random() < WORKSHOP_CHANCE ? pick(shops) : pick(others));
}

function pop(s: GameState, text: string, t: Tile, color: string) {
  s.pops.push({ id: s.nextId++, text, x: t.c, y: t.r, color, ms: POP_MS });
}
