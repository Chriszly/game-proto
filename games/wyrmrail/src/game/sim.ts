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
  sameTile,
  terrainAt,
  type Tile,
  type Village,
} from './map';
import {
  BANNER_MS,
  BASE_SPEED,
  DEADLINE_BASE_MS,
  DEADLINE_PER_TILE_MS,
  EAT_MS,
  FESTIVAL_GOAL,
  FESTIVAL_ROUND,
  FOOD_PER_TILE,
  HOARD_BONUS,
  HUNGRY,
  JUNCTION_WAIT_MS,
  LOAD_MS,
  MAX_ORDERS,
  ORDER_EVERY_MS,
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
  roundGoal,
  type GameState,
  type Job,
  type Order,
  type Upgrade,
  type Wyrm,
} from './state';

// All the rules. Only this file changes the game state; the scene reads it and calls these.

const newWyrm = (): Wyrm => ({ at: { ...ROOST }, path: [], progress: 0, from: null, job: null, loadMs: 0, switchMs: 0, food: 1, eatMs: 0, waitMs: 0 });

export function newGame(): GameState {
  const s: GameState = {
    phase: 'play',
    valley: generateValley(),
    coins: START_COINS,
    hearts: START_HEARTS,
    round: 1,
    delivered: 0,
    totalDelivered: 0,
    track: [],
    orders: [],
    queue: [],
    switches: {},
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
  return TRACK_COST[terrain];
}

export function canBuild(s: GameState, t: Tile) {
  const cost = trackCost(s, t);
  return s.phase === 'play' && cost !== null && cost <= s.coins;
}

export function buildTrack(s: GameState, t: Tile) {
  if (!canBuild(s, t)) return false;
  const cost = trackCost(s, t)!;
  s.coins -= cost;
  s.track.push(key(t));
  syncSwitches(s, t);
  pop(s, `-${cost}`, t, '#f0c070');
  return true;
}

/** Track can be taken up for half its cost, unless the wyrm stands on it or is about to cross it. */
export function canRemove(s: GameState, t: Tile) {
  if (s.phase !== 'play' || !s.track.includes(key(t))) return false;
  return s.wyrms.every((w) => !sameTile(w.at, t) && !w.path.some((p) => sameTile(p, t)));
}

export function removeTrack(s: GameState, t: Tile) {
  if (!canRemove(s, t)) return false;
  s.track = s.track.filter((k) => k !== key(t));
  syncSwitches(s);
  const refund = Math.floor(TRACK_COST[terrainAt(s.valley, t) as keyof typeof TRACK_COST] / 2);
  s.coins += refund;
  pop(s, `+${refund}`, t, '#f3c64e');
  return true;
}

/** The tiles next to `t` that are on the line. */
function arms(s: GameState, t: Tile) {
  return neighbours(t).filter((n) => onLine(s, n));
}

/**
 * Gives every junction (track with three or four arms) a switch and drops the switches that are no
 * longer on one. A new switch is set against `newest` when that is one of its arms (the branch just
 * laid), else against its last arm.
 */
function syncSwitches(s: GameState, newest?: Tile) {
  const next: Record<string, string> = {};
  for (const k of s.track) {
    const [c, r] = k.split(',').map(Number);
    const a = arms(s, { c, r }).map(key);
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
 * if there is none. Loose, it is the shortest way, switches or not. Strict, it is the shortest way
 * the switches leave open: it never uses a junction's barred arm, and it only turns back at a
 * station, at the end of a line, or where it starts.
 */
export function route(s: GameState, a: Tile, b: Tile, from: Tile | null = null, strict = false): Tile[] | null {
  type Step = { t: Tile; prev: Tile | null; back: Step | null };
  const seen = new Set<string>();
  const id = (t: Tile, prev: Tile | null) => (strict ? `${key(t)}<${prev ? key(prev) : ''}` : key(t));
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
    for (const n of out) {
      if (seen.has(id(n, step.t))) continue;
      if (strict) {
        if (closed && (closed === key(n) || (step.prev && closed === key(step.prev)))) continue;
        const back = step.prev && sameTile(n, step.prev);
        if (back && step.back && out.length > 1 && !isStation(s, step.t)) continue;
      }
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

/** Moves the game on by `dt` milliseconds of game time. */
export function tick(s: GameState, dt: number) {
  for (const p of s.pops) p.ms -= dt;
  s.pops = s.pops.filter((p) => p.ms > 0);
  if (s.banner && (s.banner.ms -= dt) <= 0) s.banner = null;
  if (s.phase !== 'play') return;

  if (s.orders.length < MAX_ORDERS && (s.orderTimerMs -= dt) <= 0) {
    s.orderTimerMs = ORDER_EVERY_MS;
    randomOrder(s);
  }
  for (const o of [...s.orders]) {
    if ((o.timeLeftMs -= dt) <= 0) failOrder(s, o);
    if (s.phase !== 'play') return;
  }
  for (let i = 0; i < s.wyrms.length && s.phase === 'play'; i++) moveWyrm(s, i, dt);
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
      w.food = Math.max(0, w.food - FOOD_PER_TILE);
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
  if (carrying.length < WAGONS) {
    for (const id of s.queue) {
      const order = s.orders.find((o) => o.id === id);
      if (order) stops.push({ order, leg: 'pickup' });
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
    return;
  }
  // Delivered.
  const pay = orderPay(s, o);
  s.coins += pay;
  s.orders = s.orders.filter((x) => x !== o);
  w.job = null;
  s.delivered++;
  s.totalDelivered++;
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

/** The order ran out of time: it leaves the board and the villages trust the line a little less. */
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
  if (s.hearts <= 0) s.phase = 'over';
}

function addOrder(s: GameState, from: number, to: number, made = false) {
  const vs = villages(s);
  const dist = manhattan(vs[from], vs[to]);
  const totalMs = Math.round((DEADLINE_BASE_MS + DEADLINE_PER_TILE_MS * dist) * byDifficulty(1.5, 1, 0.7));
  s.orders.push({
    id: s.nextId++,
    cargo: made ? workshopOf(vs[from])!.makes : vs[from].cargo,
    from,
    to,
    pay: Math.round((PAY_BASE + PAY_PER_TILE * dist) * (made ? WORKSHOP_PAY : 1)),
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
 * to that workshop; in the festival every order goes to the festival.
 */
function randomOrder(s: GameState) {
  const open = openIndexes(s);
  const pick = (list: number[]) => list[Math.floor(Math.random() * list.length)];
  const host = festivalHost(s);
  if (s.round === FESTIVAL_ROUND) return addOrder(s, pick(open.filter((i) => i !== host)), host);
  const from = pick(open);
  const others = open.filter((i) => i !== from);
  const shops = others.filter((i) => workshopOf(villages(s)[i])?.takes === villages(s)[from].cargo);
  addOrder(s, from, shops.length && Math.random() < WORKSHOP_CHANCE ? pick(shops) : pick(others));
}

function pop(s: GameState, text: string, t: Tile, color: string) {
  s.pops.push({ id: s.nextId++, text, x: t.c, y: t.r, color, ms: POP_MS });
}
