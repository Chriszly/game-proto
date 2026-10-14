import { byDifficulty } from '../../../../shared/settings';
import { CHAINS, LANTERN_SPOTS, batEntry, mothRest } from './places';

// The rules in plain TypeScript, with no Phaser. Each night begins with a dusk: tap a lantern and
// an idle moth flies from the jar to light it, then flies home. A lit lantern burns its oil and
// goes out when the oil runs dry. When dusk ends, night falls and every lantern still lit pays;
// too few lit costs one of the keep's hearths. Between nights the coins buy upgrades. Each night
// the herald orders a bonus goal, gusts blow out lanterns no moth is sitting on, and a refill that
// saves a nearly dry lantern pays a little at once. Each night also has a kind, bats come to snuff
// lanterns, lanterns in a chain pay together, and reaching the Great Festival is a win.

export const UPGRADE_IDS = ['wick', 'oil', 'moths', 'wings', 'firefly'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export interface Upgrade {
  name: string;
  /** What one level does, shown on its button. */
  blurb: string;
  /** The cost of each level; its length is the most levels there are. */
  costs: readonly number[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  wick: { name: 'Wicks', blurb: 'Lanterns catch 25% faster', costs: [10, 20, 35] },
  oil: { name: 'Oil', blurb: 'Lanterns burn 6s longer', costs: [10, 20, 35] },
  moths: { name: 'Moths', blurb: 'One more moth in the jar', costs: [15, 30, 50] },
  wings: { name: 'Wings', blurb: 'Moths fly 20% faster', costs: [10, 20, 35] },
  firefly: { name: 'Firefly', blurb: 'A firefly lights two lanterns', costs: [40] },
};

/** How long each dusk lasts before night falls, in milliseconds. */
export const DUSK_MS = 45_000;
/** Hearths the keep starts with; a night with too few lanterns lit puts one out. */
export const LIVES = 3;
/** Coins for each lantern lit at nightfall, and the bonus when every one is. */
export const PAY_PER_LANTERN = 5;
export const ALL_LIT_BONUS = 10;
/** Coins for each chain of lanterns (see CHAINS in places.ts) lit whole at nightfall. */
export const CHAIN_PAY = 4;
/** Moths in the jar, their speed (px/s) and how long a wick takes to catch, before upgrades. */
export const BASE_MOTHS = 3;
export const BASE_SPEED = 160;
export const BASE_LIGHT_MS = 1500;
/** How long a lantern burns on a full fill of oil, before upgrades: longer on Easy, shorter on Hard. */
export const baseBurnMs = () => byDifficulty(26_000, 20_000, 16_000);

/**
 * The three kinds of moth. The jar holds them in KIND_ORDER (fast, slow, heavy, fast, ...), so
 * the first night's three moths are one of each. Each multiplies the base speed, wick time and oil.
 * A firefly is bought, not drawn from the jar's cycle: it comes last in the jar and lights a second
 * lantern on the same flight.
 */
export const MOTH_KINDS = {
  fast: { name: 'Fast', speed: 1.5, wick: 1.3, oil: 1 },
  slow: { name: 'Slow', speed: 0.75, wick: 0.7, oil: 1 },
  heavy: { name: 'Heavy', speed: 0.8, wick: 1, oil: 1.5 },
  firefly: { name: 'Firefly', speed: 1.2, wick: 1, oil: 1 },
} as const;
export type MothKind = keyof typeof MOTH_KINDS;
export const KIND_ORDER: readonly Exclude<MothKind, 'firefly'>[] = ['fast', 'slow', 'heavy'];
/** Taps kept while every moth is busy; a tap past this is lost. */
export const QUEUE_MAX = 2;

/**
 * The kinds of night. Clear is the plain night; fog burns oil faster, a festival pays double and a
 * storm brings one more gust.
 */
export const NIGHT_KINDS = ['clear', 'fog', 'festival', 'storm'] as const;
export type NightKind = (typeof NIGHT_KINDS)[number];
/** Oil burns this many times faster on a foggy night. */
export const FOG_BURN = 1.5;
/** A festival night pays this many times its coins. */
export const FESTIVAL_PAY = 2;
/** Nights kept to reach the Great Festival, a win; the nights go on after it. */
export const FESTIVAL_NIGHTS = 10;
/**
 * The kind of night `night` is. The first is always clear, so the first dusk plays the same every
 * time. The rest are drawn from a fixed hash of the night number, so every run gives the same nights.
 */
export const kindFor = (night: number): NightKind =>
  night === 1 ? 'clear' : NIGHT_KINDS[(Math.imul(night, 0x9e3779b1) >>> 16) % NIGHT_KINDS.length];

/** How long before a gust its warning shows the lantern it will blow out, in milliseconds. */
export const GUST_WARN_MS = 5_000;
/**
 * When each gust hits, as dusk left in milliseconds. Night 1 has one, nights 2 and 3 two, and
 * every night after three. A stormy night adds one more, between the others.
 */
export const gustsFor = (night: number) => {
  const base = [34_000, 22_000, 10_000].slice(0, night === 1 ? 1 : night <= 3 ? 2 : 3);
  return kindFor(night) === 'storm' ? [...base, 16_000].sort((a, b) => b - a) : base;
};
/** A refill of a lantern with less than this share of its oil left is a close call... */
export const CLOSE_CALL = 0.15;
/** ...and pays this many coins at once. */
export const CLOSE_CALL_PAY = 2;

/** Bats come to snuff lanterns: as dusk left when each one comes. None on the first night. */
export const batsFor = (night: number) => (night === 1 ? [] : night <= 3 ? [30_000] : [36_000, 18_000]);
/** How fast a bat flies, in pixels per second: slow enough to see it coming and send a moth. */
export const BAT_SPEED = 46;
/** A bat hovers this far above the lantern it is after. */
export const BAT_PERCH = 26;

/**
 * The herald's order: one bonus goal a night, paid at nightfall. `lit` names lanterns that must be
 * burning at nightfall; `closeCalls` and `shields` count close-call refills and gusts a moth
 * shielded during the dusk.
 */
export type OrderGoal = { kind: 'lit'; lanterns: readonly number[] } | { kind: 'closeCalls' | 'shields'; count: number };
export interface Order {
  text: string;
  goal: OrderGoal;
  reward: number;
}
/** The orders, one a night in this order, then round again. Each only names lanterns its night has. */
export const ORDERS: readonly Order[] = [
  { text: 'Both towers + keep lit at nightfall', goal: { kind: 'lit', lanterns: [0, 1, 2] }, reward: 15 },
  { text: 'The west wall lit at nightfall', goal: { kind: 'lit', lanterns: [0, 3, 5] }, reward: 15 },
  { text: 'Save two lanterns in a close call', goal: { kind: 'closeCalls', count: 2 }, reward: 15 },
  { text: 'The east wall lit at nightfall', goal: { kind: 'lit', lanterns: [1, 4, 6] }, reward: 15 },
  { text: 'Shield a lantern from a gust', goal: { kind: 'shields', count: 1 }, reward: 15 },
];
export const orderFor = (night: number) => ORDERS[(night - 1) % ORDERS.length];

/** How far the night's order has come: `done` of `of`. */
export function orderProgress(s: GameState) {
  const goal = s.order.goal;
  if (goal.kind === 'lit') return { done: goal.lanterns.filter((i) => s.lanterns[i]?.lit).length, of: goal.lanterns.length };
  return { done: Math.min(goal.count, goal.kind === 'closeCalls' ? s.closeCalls : s.shields), of: goal.count };
}

/** Lanterns to light on night `night`: five on the first, one more each night after. */
export const lanternsFor = (night: number) => Math.min(4 + night, LANTERN_SPOTS.length);
/** Lanterns that must be lit at nightfall to keep every hearth: three in five. */
export const requiredFor = (count: number) => Math.ceil(count * 0.6);

/** The chains (from CHAINS) whose every lantern is lit now; a chain with a lantern not on this night never is. */
export const chainsLit = (s: GameState) => CHAINS.filter((chain) => chain.every((i) => s.lanterns[i]?.lit)).length;

export interface Lantern {
  x: number;
  y: number;
  lit: boolean;
  /** Oil left while lit, in milliseconds of burning. */
  oilMs: number;
  /** The oil it was filled to, so the bar shows how much is left. */
  oilMaxMs: number;
  /** True while a moth is on its way to it or lighting it, so a second tap sends no other moth. */
  claimed: boolean;
}

export interface Moth {
  kind: MothKind;
  x: number;
  y: number;
  /**
   * Waiting in the jar, flying out, lighting a wick, guarding the lantern a gust is coming for
   * (it stays after lighting it until the gust has passed), or flying home.
   */
  task: 'idle' | 'out' | 'lighting' | 'guard' | 'home';
  /** The lantern it is flying to or lighting, or -1. */
  target: number;
  /** For a firefly, the second lantern it lights on the same flight once the first is lit, or -1. */
  next: number;
  /** How long it has been lighting, in milliseconds. */
  lightingMs: number;
  /** True when it found its lit lantern with under CLOSE_CALL of its oil left: a close call. */
  closeCall: boolean;
}

/** A bat on its way to snuff a lantern. It waits above the lantern while a moth is on its way to it. */
export interface Bat {
  target: number;
  x: number;
  y: number;
  /** True once it has reached its perch above the lantern. */
  arrived: boolean;
}

/** A gust on its way: the lantern it will blow out and when, as dusk left in milliseconds. */
export interface Gust {
  target: number;
  atMs: number;
}

/** Something that just happened, for the scene to show; it empties the list every frame. */
export type GameEvent =
  | { type: 'closeCall'; lantern: number; coins: number }
  | { type: 'gust'; lantern: number; shielded: boolean }
  /** A bat was chased off by a moth (`chased`), or snuffed the lantern. */
  | { type: 'bat'; lantern: number; chased: boolean };

/** What nightfall counted, shown until the next dusk. */
export interface NightReport {
  lit: number;
  count: number;
  required: number;
  earned: number;
  lostHearth: boolean;
  /** Whether the herald's order was met; its reward is part of `earned`. */
  orderMet: boolean;
  /** Chains lit whole at nightfall; their pay is part of `earned`. */
  chains: number;
  /** Whether this night brought the Great Festival: the tenth night kept. */
  reachedFestival: boolean;
}

export interface GameState {
  night: number;
  /** The kind of this night, from kindFor. */
  kind: NightKind;
  phase: 'dusk' | 'night' | 'over';
  /** Dusk left before night falls, in milliseconds. */
  duskMs: number;
  coins: number;
  lives: number;
  lanterns: Lantern[];
  moths: Moth[];
  levels: Record<UpgradeId, number>;
  report: NightReport | null;
  /** Nights the keep met its quota. */
  kept: number;
  /** Whether the Great Festival has been reached; nights go on after it. */
  won: boolean;
  /** The most nights kept in any game, saved in the browser. */
  best: number;
  /** Lantern taps kept while every moth was busy, oldest first, at most QUEUE_MAX. */
  queue: number[];
  /** The herald's order for this night. */
  order: Order;
  /** Gusts still to come this dusk, as dusk left when each hits, soonest first. */
  gusts: number[];
  /** The gust being warned about, or null. */
  gust: Gust | null;
  /** Bats still to come this dusk, as dusk left when each comes, soonest first. */
  raids: number[];
  /** The bats on their way, or waiting above a lantern. */
  bats: Bat[];
  /** Close-call refills and gusts shielded this dusk, for the order. */
  closeCalls: number;
  shields: number;
  /** What happened since the scene last looked; the scene empties it. */
  events: GameEvent[];
}

/** Moth count, firefly count, flight speed, wick time and burn time with the bought upgrades. */
export function stats(s: GameState) {
  return {
    moths: BASE_MOTHS + s.levels.moths,
    fireflies: s.levels.firefly,
    speed: BASE_SPEED * (1 + 0.2 * s.levels.wings),
    lightMs: Math.round(BASE_LIGHT_MS * 0.75 ** s.levels.wick),
    burnMs: baseBurnMs() + 6_000 * s.levels.oil,
  };
}

/** How fast moth `m` flies, in pixels per second. */
export const mothSpeed = (s: GameState, m: Moth) => stats(s).speed * MOTH_KINDS[m.kind].speed;
/** How long moth `m` takes to catch a wick, in milliseconds. */
export const mothLightMs = (s: GameState, m: Moth) => Math.round(stats(s).lightMs * MOTH_KINDS[m.kind].wick);

function makeLanterns(night: number): Lantern[] {
  return LANTERN_SPOTS.slice(0, lanternsFor(night)).map(({ x, y }) => ({ x, y, lit: false, oilMs: 0, oilMaxMs: 0, claimed: false }));
}

/** The jar: the regular moths in KIND_ORDER, then any fireflies bought. */
function makeMoths(s: GameState): Moth[] {
  const { moths, fireflies } = stats(s);
  const kinds: MothKind[] = [
    ...Array.from({ length: moths }, (_, i) => KIND_ORDER[i % KIND_ORDER.length]),
    ...Array.from({ length: fireflies }, () => 'firefly' as const),
  ];
  return kinds.map((kind, i) => ({
    kind,
    ...mothRest(i, kinds.length),
    task: 'idle' as const,
    target: -1,
    next: -1,
    lightingMs: 0,
    closeCall: false,
  }));
}

export function newGame(best = 0): GameState {
  const s: GameState = {
    night: 1,
    kind: kindFor(1),
    phase: 'dusk',
    duskMs: DUSK_MS,
    coins: 0,
    lives: LIVES,
    lanterns: makeLanterns(1),
    moths: [],
    levels: { wick: 0, oil: 0, moths: 0, wings: 0, firefly: 0 },
    report: null,
    kept: 0,
    won: false,
    best,
    queue: [],
    order: orderFor(1),
    gusts: gustsFor(1),
    gust: null,
    raids: batsFor(1),
    bats: [],
    closeCalls: 0,
    shields: 0,
    events: [],
  };
  s.moths = makeMoths(s);
  return s;
}

/** The lantern a firefly lights after lantern `from`: the nearest one no moth is headed to, or -1. */
function nextFor(s: GameState, from: number) {
  const a = s.lanterns[from];
  let best = -1;
  let bestD = Infinity;
  s.lanterns.forEach((l, i) => {
    if (i === from || l.claimed || s.queue.includes(i)) return;
    const d = Math.hypot(l.x - a.x, l.y - a.y);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** Sends moth `moth` to light lantern `i`, or to refill it if it is already lit. */
function dispatch(s: GameState, moth: Moth, i: number) {
  moth.task = 'out';
  moth.target = i;
  s.lanterns[i].claimed = true;
  moth.next = moth.kind === 'firefly' ? nextFor(s, i) : -1;
  if (moth.next >= 0) s.lanterns[moth.next].claimed = true;
}

/**
 * Taps lantern `i`. The first idle moth goes to light it, or refill it if it is already lit. When
 * every moth is busy the tap waits in the queue (up to QUEUE_MAX) and a moth takes it when one
 * comes home. False when the tap was lost: another moth already has the lantern, the queue is full,
 * or it is not dusk.
 */
export function send(s: GameState, i: number) {
  const lantern = s.lanterns[i];
  if (s.phase !== 'dusk' || !lantern || lantern.claimed || s.queue.includes(i)) return false;
  const moth = s.moths.find((m) => m.task === 'idle');
  if (moth) {
    dispatch(s, moth, i);
    return true;
  }
  if (s.queue.length >= QUEUE_MAX) return false;
  s.queue.push(i);
  return true;
}

/** Moves a point `step` pixels towards (x, y); true once it is there. */
function flyTo(m: { x: number; y: number }, x: number, y: number, step: number) {
  const dx = x - m.x;
  const dy = y - m.y;
  const d = Math.hypot(dx, dy);
  if (d <= step) {
    m.x = x;
    m.y = y;
    return true;
  }
  m.x += (dx / d) * step;
  m.y += (dy / d) * step;
  return false;
}

/** True when a moth is sitting on lantern `i`: lighting it or guarding it. */
const sitting = (s: GameState, i: number) => s.moths.some((m) => m.target === i && (m.task === 'lighting' || m.task === 'guard'));

/** The lantern a gust warned now goes for: the lit one with the most oil left, or -1 if none is lit. */
function gustTarget(s: GameState) {
  let best = -1;
  s.lanterns.forEach((l, i) => {
    if (l.lit && (best < 0 || l.oilMs > s.lanterns[best].oilMs)) best = i;
  });
  return best;
}

/** Sends a guarding moth home and frees its lantern. */
function release(m: Moth, s: GameState) {
  s.lanterns[m.target].claimed = false;
  m.task = 'home';
  m.target = -1;
}

/** Warns of the next gust when it is GUST_WARN_MS away, and blows it when it arrives. */
function wind(s: GameState) {
  if (!s.gust && s.gusts.length && s.duskMs <= s.gusts[0] + GUST_WARN_MS) {
    const atMs = s.gusts.shift()!;
    const target = gustTarget(s);
    // With no lantern lit the wind has nothing to blow out, and passes unannounced.
    if (target >= 0) s.gust = { target, atMs };
  }
  if (s.gust && s.duskMs <= s.gust.atMs) {
    const { target } = s.gust;
    const lantern = s.lanterns[target];
    const shielded = sitting(s, target);
    if (shielded) s.shields++;
    else if (lantern.lit) {
      lantern.lit = false;
      lantern.oilMs = 0;
    }
    s.events.push({ type: 'gust', lantern: target, shielded });
    s.gust = null;
    for (const m of s.moths) if (m.task === 'guard') release(m, s);
  }
}

/** A bat comes when its time is up, for the lit lantern with the most oil that no moth or bat has. */
function raid(s: GameState) {
  if (!s.raids.length || s.duskMs > s.raids[0]) return;
  s.raids.shift();
  const free = s.lanterns
    .map((_, i) => i)
    .filter((i) => s.lanterns[i].lit && !s.lanterns[i].claimed && !s.queue.includes(i) && !s.bats.some((b) => b.target === i));
  if (!free.length) return;
  const target = free.reduce((best, i) => (s.lanterns[i].oilMs > s.lanterns[best].oilMs ? i : best));
  const entry = batEntry(s.lanterns[target].x);
  s.bats.push({ target, x: entry.x, y: entry.y, arrived: false });
}

/** Flies the bats in. A bat that reaches a lantern no moth is headed to snuffs it; one a moth is coming for waits until the moth chases it off. */
function moveBats(s: GameState, dt: number) {
  const step = (BAT_SPEED * dt) / 1000;
  s.bats = s.bats.filter((b) => {
    const lantern = s.lanterns[b.target];
    // Its lantern went out before it arrived, so it flies off.
    if (!lantern.lit && !lantern.claimed) return false;
    if (!b.arrived) {
      b.arrived = flyTo(b, lantern.x, lantern.y - BAT_PERCH, step);
      return true;
    }
    if (lantern.claimed) return true;
    lantern.lit = false;
    lantern.oilMs = 0;
    s.events.push({ type: 'bat', lantern: b.target, chased: false });
    return false;
  });
}

/** A moth arriving at lantern `i` chases off any bat after it. */
function chaseBats(s: GameState, i: number) {
  for (const b of s.bats) if (b.target === i) s.events.push({ type: 'bat', lantern: i, chased: true });
  s.bats = s.bats.filter((b) => b.target !== i);
}

/** Advances dusk by `dt` milliseconds: oil burns, moths fly and light, bats come, gusts blow, and night falls at the end. */
export function tick(s: GameState, dt: number) {
  if (s.phase !== 'dusk') return;
  const { burnMs } = stats(s);
  const burn = s.kind === 'fog' ? FOG_BURN : 1;
  s.lanterns.forEach((lantern, i) => {
    // A moth refilling a lantern holds its flame, so it burns no oil meanwhile.
    if (!lantern.lit || sitting(s, i)) return;
    lantern.oilMs -= dt * burn;
    if (lantern.oilMs <= 0) {
      lantern.lit = false;
      lantern.oilMs = 0;
    }
  });
  s.moths.forEach((m, i) => {
    const step = (mothSpeed(s, m) * dt) / 1000;
    if (m.task === 'out') {
      const lantern = s.lanterns[m.target];
      if (flyTo(m, lantern.x, lantern.y - 4, step)) {
        m.task = 'lighting';
        m.lightingMs = 0;
        m.closeCall = lantern.lit && lantern.oilMs < lantern.oilMaxMs * CLOSE_CALL;
        chaseBats(s, m.target);
      }
    } else if (m.task === 'lighting') {
      m.lightingMs += dt;
      if (m.lightingMs >= mothLightMs(s, m)) {
        const lantern = s.lanterns[m.target];
        lantern.lit = true;
        lantern.oilMs = burnMs * MOTH_KINDS[m.kind].oil;
        lantern.oilMaxMs = lantern.oilMs;
        if (m.closeCall) {
          s.coins += CLOSE_CALL_PAY;
          s.closeCalls++;
          s.events.push({ type: 'closeCall', lantern: m.target, coins: CLOSE_CALL_PAY });
          m.closeCall = false;
        }
        const next = m.next;
        m.next = -1;
        // On the lantern a gust is coming for, the moth stays to shield it.
        if (s.gust?.target === m.target) {
          m.task = 'guard';
          if (next >= 0) s.lanterns[next].claimed = false;
        } else if (next >= 0) {
          // A firefly flies on to its second lantern without going home.
          lantern.claimed = false;
          m.target = next;
          m.task = 'out';
        } else release(m, s);
      }
    } else if (m.task === 'home') {
      const rest = mothRest(i, s.moths.length);
      if (flyTo(m, rest.x, rest.y, step)) m.task = 'idle';
    }
  });
  moveBats(s, dt);
  raid(s);
  wind(s);
  // A moth that has just come home takes the oldest queued tap.
  for (const moth of s.moths) {
    if (moth.task !== 'idle' || s.queue.length === 0) continue;
    const i = s.queue.shift()!;
    if (!s.lanterns[i].claimed) dispatch(s, moth, i);
  }
  s.duskMs = Math.max(0, s.duskMs - dt);
  if (s.duskMs === 0) nightfall(s);
}

function nightfall(s: GameState) {
  const count = s.lanterns.length;
  const lit = s.lanterns.filter((l) => l.lit).length;
  const required = requiredFor(count);
  const { done, of } = orderProgress(s);
  const orderMet = done >= of;
  const chains = chainsLit(s);
  const pay = lit * PAY_PER_LANTERN + (lit === count ? ALL_LIT_BONUS : 0) + (orderMet ? s.order.reward : 0) + chains * CHAIN_PAY;
  const earned = s.kind === 'festival' ? pay * FESTIVAL_PAY : pay;
  const lostHearth = lit < required;
  s.queue = [];
  s.gust = null;
  s.gusts = [];
  s.raids = [];
  s.bats = [];
  s.coins += earned;
  if (lostHearth) s.lives--;
  else s.kept++;
  s.best = Math.max(s.best, s.kept);
  const reachedFestival = !s.won && s.kept >= FESTIVAL_NIGHTS;
  if (reachedFestival) s.won = true;
  s.report = { lit, count, required, earned, lostHearth, orderMet, chains, reachedFestival };
  s.phase = s.lives <= 0 ? 'over' : 'night';
}

/** The cost of the next level of `id`, or null when it is maxed out. */
export const nextCost = (s: GameState, id: UpgradeId) => UPGRADES[id].costs[s.levels[id]] ?? null;

/** Buys the next level of an upgrade between nights; false if it is maxed or too dear. */
export function buy(s: GameState, id: UpgradeId) {
  const cost = nextCost(s, id);
  if (s.phase !== 'night' || cost === null || s.coins < cost) return false;
  s.coins -= cost;
  s.levels[id]++;
  return true;
}

/** Starts the next night's dusk, with one more lantern, its kind, and every moth back in the jar. */
export function nextDusk(s: GameState) {
  if (s.phase !== 'night') return false;
  s.night++;
  s.kind = kindFor(s.night);
  s.phase = 'dusk';
  s.duskMs = DUSK_MS;
  s.lanterns = makeLanterns(s.night);
  s.moths = makeMoths(s);
  s.queue = [];
  s.report = null;
  s.order = orderFor(s.night);
  s.gusts = gustsFor(s.night);
  s.gust = null;
  s.raids = batsFor(s.night);
  s.bats = [];
  s.closeCalls = 0;
  s.shields = 0;
  return true;
}
