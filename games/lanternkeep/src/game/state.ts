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
  /** True while a moth is on its way to it or lighting it, so a second tap sends no other moth. */
  claimed: boolean;
}

export interface Moth {
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

function makeLanterns(night: number): Lantern[] {
  return LANTERN_SPOTS.slice(0, lanternsFor(night)).map(({ x, y }) => ({ x, y, lit: false, oilMs: 0, claimed: false }));
}

function makeMoths(n: number): Moth[] {
  return Array.from({ length: n }, (_, i) => ({ ...mothRest(i, n), task: 'idle' as const, target: -1, lightingMs: 0 }));
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
  };
  s.moths = makeMoths(stats(s).moths);
  return s;
}

/**
 * Sends the first idle moth to light lantern `i`, or to refill it if it is already lit. False when
 * no moth is free, another moth already has it, or it is not dusk.
 */
export function send(s: GameState, i: number) {
  const lantern = s.lanterns[i];
  if (s.phase !== 'dusk' || !lantern || lantern.claimed) return false;
  const moth = s.moths.find((m) => m.task === 'idle');
  if (!moth) return false;
  moth.task = 'out';
  moth.target = i;
  lantern.claimed = true;
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
  const { speed, lightMs, burnMs } = stats(s);
  for (const lantern of s.lanterns) {
    if (!lantern.lit) continue;
    lantern.oilMs -= dt;
    if (lantern.oilMs <= 0) {
      lantern.lit = false;
      lantern.oilMs = 0;
    }
  }
  const step = (speed * dt) / 1000;
  s.moths.forEach((m, i) => {
    if (m.task === 'out') {
      const lantern = s.lanterns[m.target];
      if (flyTo(m, lantern.x, lantern.y - 4, step)) {
        m.task = 'lighting';
        m.lightingMs = 0;
      }
    } else if (m.task === 'lighting') {
      m.lightingMs += dt;
      if (m.lightingMs >= lightMs) {
        const lantern = s.lanterns[m.target];
        lantern.lit = true;
        lantern.oilMs = burnMs;
        lantern.claimed = false;
        m.task = 'home';
        m.target = -1;
      }
    } else if (m.task === 'home') {
      const rest = mothRest(i, s.moths.length);
      if (flyTo(m, rest.x, rest.y, step)) m.task = 'idle';
    }
  });
  s.duskMs = Math.max(0, s.duskMs - dt);
  if (s.duskMs === 0) nightfall(s);
}

function nightfall(s: GameState) {
  const count = s.lanterns.length;
  const lit = s.lanterns.filter((l) => l.lit).length;
  const required = requiredFor(count);
  const earned = lit * PAY_PER_LANTERN + (lit === count ? ALL_LIT_BONUS : 0);
  const lostHearth = lit < required;
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
  s.report = null;
  return true;
}
