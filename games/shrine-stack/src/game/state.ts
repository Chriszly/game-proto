// The rules of Shrine Stack, in plain TypeScript with no Phaser. A stone swings above the temple;
// a tap drops it. What hangs over the stone below breaks off, so the temple narrows unless the
// drops line up. Every three stones make a tier, and a tier whose stones all landed well is
// balanced and offers a blessing.

import { byDifficulty } from '../../../../shared/settings';
import { BLESSINGS, type BlessingId } from './blessings';

/** The middle of the temple, in view pixels. */
export const TOWER_X = 590;
/** The plinth the first stone rests on. */
export const PLINTH_W = 260;
/** The width of the first stone. */
export const START_W = 200;
export const STONE_H = 28;
/** How far above the temple's top the next stone swings, from its bottom edge. */
export const DROP_GAP = 120;
/** How far either side of `TOWER_X` the swinging stone's middle travels. */
export const SWING = 250;
/** How fast stones swing on the first tier on Normal, in pixels per second. */
export const BASE_SPEED = 230;
/** Each tier after the first swings this much faster. */
export const TIER_SPEEDUP = 0.05;
/** How much slower each Calm Winds makes the swing. */
export const CALM = 0.85;
/** How fast a dropped stone gains speed, in pixels per second squared. */
export const GRAVITY = 2600;
/** A drop this close to the stone below snaps onto it whole. */
export const PERFECT_PX = 5;
export const STEADY_PX = 6;
export const BROAD_PX = 40;
export const STONES_PER_TIER = 3;
/** A tier is balanced when each of its stones kept at least this share of its width. */
export const BALANCE = 0.75;
/** Favor for a perfect drop on top of the stone's own, and for a balanced tier. */
export const PERFECT_FAVOR = 2;
export const TIER_FAVOR = 5;
/** How many blessings a balanced tier offers. */
export const OFFER_SIZE = 3;
/** A stone that would keep less than this is lost instead. */
export const MIN_W = 6;

export type Phase = 'swinging' | 'falling' | 'blessing' | 'over';

/** A stone in the temple, by its middle and width. `tier` counts from 1. */
export interface Stone {
  x: number;
  w: number;
  tier: number;
  perfect: boolean;
}

/** The stone in play: swinging above the temple, then falling. `h` is its bottom's height above the plinth. */
export interface Moving {
  x: number;
  w: number;
  h: number;
  dir: 1 | -1;
  vy: number;
}

/** What the last drop did. `kept` is the width left on the temple, `share` of the stone's width. */
export interface Drop {
  x: number;
  w: number;
  kept: number;
  share: number;
  perfect: boolean;
  missed: boolean;
  caught: boolean;
}

/** Something for the scene to show once: a stone landing or falling, or a tier finished. */
export type GameEvent =
  | { type: 'placed'; drop: Drop; cut: { x: number; w: number }[] }
  | { type: 'missed'; drop: Drop }
  | { type: 'tier'; tier: number; balanced: boolean };

export interface GameState {
  phase: Phase;
  stones: Stone[];
  moving: Moving;
  /** The tier being built, from 1, and how many of its stones are placed. */
  tier: number;
  inTier: number;
  /** Whether a stone of this tier kept less than `BALANCE` of its width. */
  wobbly: boolean;
  tiersBuilt: number;
  balancedTiers: number;
  favor: number;
  /** Blessings kept, in the order chosen, and the ones on offer while choosing. */
  blessings: BlessingId[];
  offer: BlessingId[];
  /** Swing speed in pixels per second, the perfect window, favor per stone and spare stones. */
  speed: number;
  perfectPx: number;
  favorPerStone: number;
  grace: number;
  /** Stones dropped so far, missed ones included. */
  dropped: number;
  lastDrop: Drop | null;
  /** The best number of tiers built in one temple, kept between games. */
  best: number;
  events: GameEvent[];
}

/** The swing speed for a tier, with the difficulty and the Calm Winds kept. */
export function speedFor(tier: number, calm: number) {
  return BASE_SPEED * byDifficulty(0.8, 1, 1.25) * (1 + TIER_SPEEDUP * (tier - 1)) * CALM ** calm;
}

export function newGame(best = 0): GameState {
  const s: GameState = {
    phase: 'swinging',
    stones: [],
    moving: { x: 0, w: START_W, h: 0, dir: 1, vy: 0 },
    tier: 1,
    inTier: 0,
    wobbly: false,
    tiersBuilt: 0,
    balancedTiers: 0,
    favor: 0,
    blessings: [],
    offer: [],
    speed: speedFor(1, 0),
    perfectPx: PERFECT_PX,
    favorPerStone: 1,
    grace: 0,
    dropped: 0,
    lastDrop: null,
    best,
    events: [],
  };
  spawn(s);
  return s;
}

/** The temple's height above the plinth. */
export const stackHeight = (s: GameState) => s.stones.length * STONE_H;

/** What the next stone lands on: the top stone, or the plinth. */
export function topOf(s: GameState) {
  return s.stones.at(-1) ?? { x: TOWER_X, w: PLINTH_W };
}

/** Hands out the next stone, as wide as the top one, swinging in from alternate sides. */
function spawn(s: GameState) {
  const dir = s.dropped % 2 === 0 ? 1 : -1;
  const w = s.stones.length ? topOf(s).w : START_W;
  s.moving = { x: TOWER_X - dir * SWING, w, h: stackHeight(s) + DROP_GAP, dir, vy: 0 };
}

/** Moves the swinging or falling stone on by `dt` milliseconds. */
export function tick(s: GameState, dt: number) {
  const m = s.moving;
  if (s.phase === 'swinging') {
    m.x += (m.dir * s.speed * dt) / 1000;
    // Bounce off either end of the swing, keeping the distance travelled past it.
    const lo = TOWER_X - SWING;
    const hi = TOWER_X + SWING;
    while (m.x < lo || m.x > hi) {
      if (m.x > hi) m.x = 2 * hi - m.x;
      else m.x = 2 * lo - m.x;
      m.dir = m.dir === 1 ? -1 : 1;
    }
  } else if (s.phase === 'falling') {
    m.vy += (GRAVITY * dt) / 1000;
    m.h -= (m.vy * dt) / 1000;
    if (m.h <= stackHeight(s)) land(s);
  }
}

/** Drops the swinging stone where it is. Returns false when no stone is swinging. */
export function drop(s: GameState) {
  if (s.phase !== 'swinging') return false;
  s.phase = 'falling';
  s.moving.vy = 0;
  return true;
}

function land(s: GameState) {
  const m = s.moving;
  const top = topOf(s);
  s.dropped++;
  let x = m.x;
  let kept: number;
  // Only a drop that would also overlap enough to stand counts as perfect, so a wide window
  // can't save a narrow stone that misses.
  const perfect = Math.abs(m.x - top.x) <= Math.min(s.perfectPx, (top.w + m.w) / 2 - MIN_W);
  const cut: { x: number; w: number }[] = [];
  if (perfect) {
    x = top.x;
    kept = Math.min(m.w, top.w);
  } else {
    const left = Math.max(m.x - m.w / 2, top.x - top.w / 2);
    const right = Math.min(m.x + m.w / 2, top.x + top.w / 2);
    kept = Math.max(0, right - left);
    x = (left + right) / 2;
    if (left > m.x - m.w / 2) cut.push({ x: (m.x - m.w / 2 + left) / 2, w: left - (m.x - m.w / 2) });
    if (right < m.x + m.w / 2) cut.push({ x: (right + m.x + m.w / 2) / 2, w: m.x + m.w / 2 - right });
  }

  if (kept < MIN_W) {
    const caught = s.grace > 0;
    const d: Drop = { x: m.x, w: m.w, kept: 0, share: 0, perfect: false, missed: true, caught };
    s.lastDrop = d;
    s.events.push({ type: 'missed', drop: d });
    if (caught) {
      s.grace--;
      s.phase = 'swinging';
      spawn(s);
    } else {
      s.phase = 'over';
    }
    return;
  }

  const share = kept / m.w;
  const d: Drop = { x, w: m.w, kept, share, perfect, missed: false, caught: false };
  s.lastDrop = d;
  s.stones.push({ x, w: kept, tier: s.tier, perfect });
  s.favor += s.favorPerStone + (perfect ? PERFECT_FAVOR : 0);
  if (share < BALANCE) s.wobbly = true;
  s.inTier++;
  s.events.push({ type: 'placed', drop: d, cut });
  s.phase = 'swinging';

  if (s.inTier === STONES_PER_TIER) {
    const balanced = !s.wobbly;
    s.events.push({ type: 'tier', tier: s.tier, balanced });
    s.tiersBuilt++;
    s.best = Math.max(s.best, s.tiersBuilt);
    s.tier++;
    s.inTier = 0;
    s.wobbly = false;
    s.speed = speedFor(s.tier, s.blessings.filter((b) => b === 'calm').length);
    if (balanced) {
      s.balancedTiers++;
      s.favor += TIER_FAVOR;
      s.offer = pickOffer();
      s.phase = 'blessing';
    }
  }
  spawn(s);
}

/** Three different blessings, drawn with `Math.random`. */
function pickOffer() {
  const pool = [...BLESSINGS];
  const offer: BlessingId[] = [];
  while (offer.length < OFFER_SIZE) offer.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return offer;
}

/** Keeps one of the offered blessings and goes back to stacking. */
export function chooseBlessing(s: GameState, id: BlessingId) {
  if (s.phase !== 'blessing' || !s.offer.includes(id)) return false;
  s.blessings.push(id);
  s.offer = [];
  s.phase = 'swinging';
  switch (id) {
    case 'broad': {
      const top = s.stones.at(-1)!;
      top.w = Math.min(PLINTH_W, top.w + BROAD_PX);
      s.moving.w = top.w;
      break;
    }
    case 'calm':
      s.speed = speedFor(s.tier, s.blessings.filter((b) => b === 'calm').length);
      break;
    case 'steady':
      s.perfectPx += STEADY_PX;
      break;
    case 'golden':
      s.favorPerStone++;
      break;
    case 'grace':
      s.grace++;
      break;
  }
  return true;
}
