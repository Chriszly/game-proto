import { byDifficulty } from '../../../../shared/settings';
import {
  CARGO_NAMES,
  ROOST,
  TRACK_COST,
  VILLAGES,
  key,
  manhattan,
  neighbours,
  sameTile,
  terrainAt,
  type Tile,
} from './map';
import {
  BANNER_MS,
  BASE_SPEED,
  DEADLINE_BASE_MS,
  DEADLINE_PER_TILE_MS,
  HOARD_BONUS,
  LOAD_MS,
  MAX_ORDERS,
  ORDER_EVERY_MS,
  PAY_BASE,
  PAY_PER_TILE,
  POP_MS,
  START_COINS,
  START_HEARTS,
  UPGRADE_COSTS,
  WINGS_SPEED,
  roundGoal,
  type GameState,
  type Order,
  type Upgrade,
} from './state';

// All the rules. Only this file changes the game state; the scene reads it and calls these.

export function newGame(): GameState {
  const s: GameState = {
    phase: 'play',
    coins: START_COINS,
    hearts: START_HEARTS,
    round: 1,
    delivered: 0,
    totalDelivered: 0,
    track: [],
    orders: [],
    queue: [],
    wyrm: { at: { ...ROOST }, path: [], progress: 0, job: null, loadMs: 0 },
    upgrades: { wings: 0, hoard: 0 },
    orderTimerMs: ORDER_EVERY_MS,
    banner: { text: 'Lay track from the Roost to Millbrook and Ashford', ms: BANNER_MS * 1.5 },
    pops: [],
    nextId: 1,
  };
  // The first order is always grain from Millbrook to Ashford.
  addOrder(s, 0, 1);
  return s;
}

/** The villages on the line this round. */
export const openVillages = (s: GameState) => VILLAGES.filter((v) => v.round <= s.round);

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
  const terrain = terrainAt(t.c, t.r);
  if (terrain === 'mountain' || s.track.includes(key(t))) return null;
  if (sameTile(t, ROOST) || VILLAGES.some((v) => sameTile(v, t))) return null;
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
  pop(s, `-${cost}`, t, '#f0c070');
  return true;
}

/** Track can be taken up for half its cost, unless the wyrm stands on it or is about to cross it. */
export function canRemove(s: GameState, t: Tile) {
  if (s.phase !== 'play' || !s.track.includes(key(t))) return false;
  const w = s.wyrm;
  return !sameTile(w.at, t) && !w.path.some((p) => sameTile(p, t));
}

export function removeTrack(s: GameState, t: Tile) {
  if (!canRemove(s, t)) return false;
  s.track = s.track.filter((k) => k !== key(t));
  const refund = Math.floor(TRACK_COST[terrainAt(t.c, t.r) as keyof typeof TRACK_COST] / 2);
  s.coins += refund;
  pop(s, `+${refund}`, t, '#f3c64e');
  return true;
}

/** The shortest way along the line from `a` to `b`, without `a`; null if there is none. */
export function route(s: GameState, a: Tile, b: Tile): Tile[] | null {
  const from = new Map<string, Tile | null>([[key(a), null]]);
  const queue = [a];
  while (queue.length) {
    const t = queue.shift()!;
    if (sameTile(t, b)) {
      const path: Tile[] = [];
      for (let at: Tile | null = t; at && !sameTile(at, a); at = from.get(key(at))!) path.unshift(at);
      return path;
    }
    for (const n of neighbours(t)) {
      if (from.has(key(n)) || !onLine(s, n)) continue;
      from.set(key(n), t);
      queue.push(n);
    }
  }
  return null;
}

/** Whether the wyrm could fetch and deliver this order along the track laid so far. */
export function routable(s: GameState, o: Order) {
  const from = VILLAGES[o.from];
  return route(s, s.wyrm.at, from) !== null && route(s, from, VILLAGES[o.to]) !== null;
}

/** Sends the wyrm for a waiting order; it works through them in the order they were sent. */
export function dispatch(s: GameState, id: number) {
  const o = s.orders.find((o) => o.id === id);
  if (s.phase !== 'play' || !o || o.status !== 'waiting' || !routable(s, o)) return false;
  o.status = 'queued';
  s.queue.push(id);
  return true;
}

export const upgradeCost = (s: GameState, u: Upgrade): number | null => UPGRADE_COSTS[u][s.upgrades[u]] ?? null;

export function buyUpgrade(s: GameState, u: Upgrade) {
  const cost = upgradeCost(s, u);
  if (s.phase !== 'play' || cost === null || cost > s.coins) return false;
  s.coins -= cost;
  s.upgrades[u]++;
  return true;
}

export const wyrmSpeed = (s: GameState) => BASE_SPEED + WINGS_SPEED * s.upgrades.wings;

/** What delivering an order pays, with the Golden hoard. */
export const orderPay = (s: GameState, o: Order) => Math.round(o.pay * (1 + HOARD_BONUS * s.upgrades.hoard));

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
  moveWyrm(s, dt);
}

function moveWyrm(s: GameState, dt: number) {
  const w = s.wyrm;
  if (w.loadMs > 0) {
    if ((w.loadMs -= dt) > 0) return;
    w.loadMs = 0;
    const o = s.orders.find((o) => o.id === w.job?.order);
    if (!o) return void (w.job = null);
    o.status = 'carrying';
    const path = route(s, w.at, VILLAGES[o.to]);
    // The way was cut while loading: the cargo goes back on the board.
    if (!path) return void dropJob(s, o);
    w.job = { order: o.id, leg: 'drop' };
    w.path = path;
  }
  // A new job starts once the wyrm stands still on a tile.
  if (!w.job && !w.path.length) {
    const id = s.queue.shift();
    const o = s.orders.find((o) => o.id === id);
    if (!o) return;
    const path = route(s, w.at, VILLAGES[o.from]);
    if (!path) return void (o.status = 'waiting');
    w.job = { order: o.id, leg: 'pickup' };
    w.path = path;
  }
  if (w.path.length) {
    w.progress += (wyrmSpeed(s) * dt) / 1000;
    while (w.progress >= 1 && w.path.length) {
      w.at = w.path.shift()!;
      w.progress -= 1;
    }
    if (w.path.length) return;
    w.progress = 0;
  }
  if (w.job) arrive(s);
}

/** The wyrm has reached the end of its path. */
function arrive(s: GameState) {
  const w = s.wyrm;
  const o = s.orders.find((o) => o.id === w.job?.order);
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
  pop(s, `+${pay}`, VILLAGES[o.to], '#f3c64e');
  if (s.delivered >= roundGoal(s.round)) nextRound(s);
}

function nextRound(s: GameState) {
  s.round++;
  s.delivered = 0;
  const joining = VILLAGES.find((v) => v.round === s.round);
  s.banner = { text: joining ? `Round ${s.round}: ${joining.name} joins the line` : `Round ${s.round}`, ms: BANNER_MS };
}

/** The order ran out of time: it leaves the board and the villages trust the line a little less. */
function failOrder(s: GameState, o: Order) {
  s.orders = s.orders.filter((x) => x !== o);
  s.queue = s.queue.filter((id) => id !== o.id);
  if (s.wyrm.job?.order === o.id) {
    s.wyrm.job = null;
    s.wyrm.loadMs = 0;
    // It stops at the next tile it reaches.
    s.wyrm.path = s.wyrm.progress > 0 ? s.wyrm.path.slice(0, 1) : [];
  }
  s.hearts--;
  pop(s, `${CARGO_NAMES[o.cargo]} late!`, VILLAGES[o.to], '#f08a6a');
  if (s.hearts <= 0) s.phase = 'over';
}

function dropJob(s: GameState, o: Order) {
  o.status = 'waiting';
  s.wyrm.job = null;
}

function addOrder(s: GameState, from: number, to: number) {
  const dist = manhattan(VILLAGES[from], VILLAGES[to]);
  const totalMs = Math.round((DEADLINE_BASE_MS + DEADLINE_PER_TILE_MS * dist) * byDifficulty(1.5, 1, 0.7));
  s.orders.push({
    id: s.nextId++,
    cargo: VILLAGES[from].cargo,
    from,
    to,
    pay: PAY_BASE + PAY_PER_TILE * dist,
    timeLeftMs: totalMs,
    totalMs,
    status: 'waiting',
  });
}

/** A new order between two open villages, picked with Math.random. */
function randomOrder(s: GameState) {
  const open = VILLAGES.map((_, i) => i).filter((i) => VILLAGES[i].round <= s.round);
  const from = open[Math.floor(Math.random() * open.length)];
  const others = open.filter((i) => i !== from);
  addOrder(s, from, others[Math.floor(Math.random() * others.length)]);
}

function pop(s: GameState, text: string, t: Tile, color: string) {
  s.pops.push({ id: s.nextId++, text, x: t.c, y: t.r, color, ms: POP_MS });
}
