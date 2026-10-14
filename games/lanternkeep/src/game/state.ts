import { byDifficulty } from '../../../../shared/settings';
import { LANTERN_SPOTS, mothRest } from './places';

// The rules in plain TypeScript, with no Phaser. Each night begins with a dusk: tap a lantern and
// an idle moth flies from the jar to light it, then flies home. A lit lantern burns its oil and
// goes out when the oil runs dry. When dusk ends, night falls and every lantern still lit pays;
// too few lit costs one of the keep's hearths. Between nights the coins buy upgrades.

export const UPGRADE_IDS = ['wick', 'oil', 'moths', 'wings'] as const;
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
};

/** How long each dusk lasts before night falls, in milliseconds. */
export const DUSK_MS = 45_000;
/** Hearths the keep starts with; a night with too few lanterns lit puts one out. */
export const LIVES = 3;
/** Coins for each lantern lit at nightfall, and the bonus when every one is. */
export const PAY_PER_LANTERN = 5;
export const ALL_LIT_BONUS = 10;
/** Moths in the jar, their speed (px/s) and how long a wick takes to catch, before upgrades. */
export const BASE_MOTHS = 3;
export const BASE_SPEED = 160;
export const BASE_LIGHT_MS = 1500;
/** How long a lantern burns on a full fill of oil, before upgrades: longer on Easy, shorter on Hard. */
export const baseBurnMs = () => byDifficulty(26_000, 20_000, 16_000);

/**
 * The three kinds of moth. The jar holds them in KIND_ORDER (fast, slow, heavy, fast, ...), so
 * the first night's three moths are one of each. Each multiplies the base speed, wick time and oil.
 */
export const MOTH_KINDS = {
  fast: { name: 'Fast', speed: 1.5, wick: 1.3, oil: 1 },
  slow: { name: 'Slow', speed: 0.75, wick: 0.7, oil: 1 },
  heavy: { name: 'Heavy', speed: 0.8, wick: 1, oil: 1.5 },
} as const;
export type MothKind = keyof typeof MOTH_KINDS;
export const KIND_ORDER: readonly MothKind[] = ['fast', 'slow', 'heavy'];
/** Taps kept while every moth is busy; a tap past this is lost. */
export const QUEUE_MAX = 2;

/** Lanterns to light on night `night`: five on the first, one more each night after. */
export const lanternsFor = (night: number) => Math.min(4 + night, LANTERN_SPOTS.length);
/** Lanterns that must be lit at nightfall to keep every hearth: three in five. */
export const requiredFor = (count: number) => Math.ceil(count * 0.6);

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
  /** Waiting in the jar, flying out, lighting a wick, or flying home. */
  task: 'idle' | 'out' | 'lighting' | 'home';
  /** The lantern it is flying to or lighting, or -1. */
  target: number;
  /** How long it has been lighting, in milliseconds. */
  lightingMs: number;
}

/** What nightfall counted, shown until the next dusk. */
export interface NightReport {
  lit: number;
  count: number;
  required: number;
  earned: number;
  lostHearth: boolean;
}

export interface GameState {
  night: number;
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
  /** The most nights kept in any game, saved in the browser. */
  best: number;
  /** Lantern taps kept while every moth was busy, oldest first, at most QUEUE_MAX. */
  queue: number[];
}

/** Moth count, flight speed, wick time and burn time with the bought upgrades. */
export function stats(s: GameState) {
  return {
    moths: BASE_MOTHS + s.levels.moths,
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

function makeMoths(n: number): Moth[] {
  return Array.from({ length: n }, (_, i) => ({
    kind: KIND_ORDER[i % KIND_ORDER.length],
    ...mothRest(i, n),
    task: 'idle' as const,
    target: -1,
    lightingMs: 0,
  }));
}

export function newGame(best = 0): GameState {
  const s: GameState = {
    night: 1,
    phase: 'dusk',
    duskMs: DUSK_MS,
    coins: 0,
    lives: LIVES,
    lanterns: makeLanterns(1),
    moths: [],
    levels: { wick: 0, oil: 0, moths: 0, wings: 0 },
    report: null,
    kept: 0,
    best,
    queue: [],
  };
  s.moths = makeMoths(stats(s).moths);
  return s;
}

/** Sends moth `moth` to light lantern `i`, or to refill it if it is already lit. */
function dispatch(s: GameState, moth: Moth, i: number) {
  moth.task = 'out';
  moth.target = i;
  s.lanterns[i].claimed = true;
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

/** Moves a moth `step` pixels towards (x, y); true once it is there. */
function flyTo(m: Moth, x: number, y: number, step: number) {
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

/** Advances dusk by `dt` milliseconds: oil burns, moths fly and light, and night falls at the end. */
export function tick(s: GameState, dt: number) {
  if (s.phase !== 'dusk') return;
  const { burnMs } = stats(s);
  for (const lantern of s.lanterns) {
    if (!lantern.lit) continue;
    lantern.oilMs -= dt;
    if (lantern.oilMs <= 0) {
      lantern.lit = false;
      lantern.oilMs = 0;
    }
  }
  s.moths.forEach((m, i) => {
    const step = (mothSpeed(s, m) * dt) / 1000;
    if (m.task === 'out') {
      const lantern = s.lanterns[m.target];
      if (flyTo(m, lantern.x, lantern.y - 4, step)) {
        m.task = 'lighting';
        m.lightingMs = 0;
      }
    } else if (m.task === 'lighting') {
      m.lightingMs += dt;
      if (m.lightingMs >= mothLightMs(s, m)) {
        const lantern = s.lanterns[m.target];
        lantern.lit = true;
        lantern.oilMs = burnMs * MOTH_KINDS[m.kind].oil;
        lantern.oilMaxMs = lantern.oilMs;
        lantern.claimed = false;
        m.task = 'home';
        m.target = -1;
      }
    } else if (m.task === 'home') {
      const rest = mothRest(i, s.moths.length);
      if (flyTo(m, rest.x, rest.y, step)) m.task = 'idle';
    }
  });
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
  const earned = lit * PAY_PER_LANTERN + (lit === count ? ALL_LIT_BONUS : 0);
  const lostHearth = lit < required;
  s.queue = [];
  s.coins += earned;
  if (lostHearth) s.lives--;
  else s.kept++;
  s.best = Math.max(s.best, s.kept);
  s.report = { lit, count, required, earned, lostHearth };
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

/** Starts the next night's dusk, with one more lantern and every moth back in the jar. */
export function nextDusk(s: GameState) {
  if (s.phase !== 'night') return false;
  s.night++;
  s.phase = 'dusk';
  s.duskMs = DUSK_MS;
  s.lanterns = makeLanterns(s.night);
  s.moths = makeMoths(stats(s).moths);
  s.queue = [];
  s.report = null;
  return true;
}
