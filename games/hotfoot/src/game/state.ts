import { byDifficulty } from '../../../../shared/settings';
import { BOONS, type BoonId } from './boons';

// The run in plain numbers. The course runs left to right along x in world pixels; heights are
// measured up from the road, so the knight's feet are at h = 0 when running on it and at a
// ledge's height when running on top of one.

/** The knight's box: its width, and its height standing and sliding. */
export const RUNNER = { w: 28, h: 60, slideH: 26 };
/** Pull of the ground, in pixels per second squared, and the speed a jump leaves the ground at. */
export const GRAVITY = 2400;
export const JUMP_V = 860;
/** Speed of a drop when sliding in the air: the knight falls fast and slides on landing. */
export const DROP_V = 1100;
export const SLIDE_MS = 620;
/** How long the knight can't be hurt again after a hit. */
export const HURT_MS = 1100;
/** Hearts at the start of a run: more on Easy, fewer on Hard. */
export const START_HEARTS = byDifficulty(5, 3, 2);
/** How near a coin has to be to the knight's box to be picked up. */
export const COIN_REACH = 14;
/** Length of a stage, from one checkpoint to the next, and the clear run at its start. */
export const STAGE_LEN = 3200;
export const LEAD_IN = 700;
/** Coins to buy the boon missed at the last checkpoint, to start the next run with it. */
export const BOON_PRICE = 30;

/**
 * The coin streak: every `step` coins taken in a row without a hit raise the multiplier by one, up
 * to `max`. A coin is worth its value times the multiplier reached before it.
 */
export const STREAK = { step: 10, max: 5 };
/** The coin multiplier after `streak` coins in a row. */
export const streakMult = (streak: number) => Math.min(STREAK.max, 1 + Math.floor(streak / STREAK.step));

/**
 * A wayside shrine: one stands on the road once a stage from stage `from`. Sliding into it trades
 * `price` run coins for one heart, when the knight has the coins and is below full hearts.
 */
export const SHRINE = { from: 2, price: 15, w: 46 };

/** Running speed on a stage, in pixels per second. */
export const speedOf = (stage: number) => Math.min(480, 260 + 30 * (stage - 1));

export type TrapKind = 'spikes' | 'pit' | 'blade' | 'flames' | 'goblin' | 'bat';
/** The traps that move along the course and can be stomped on from above. */
export const FOES: readonly TrapKind[] = ['goblin', 'bat'];

export interface Trap {
  id: number;
  kind: TrapKind;
  /** Left edge and width along the course. */
  x: number;
  w: number;
  /** Height of the ground it stands on, up from the road; a bat's is where it flies. */
  h: number;
  /** Speed along the course: a goblin's walk, a bat's flight (negative is towards the knight). */
  vx: number;
  /** A goblin walks back and forth between these; a fire vent starts its burn this far in. */
  from?: number;
  to?: number;
  phase?: number;
}

/**
 * What height each trap fills, up from its own `h`: spikes on the ground, a blade hanging down
 * to `lo`, flames while lit, a goblin standing and a bat in flight.
 */
export const TRAP_SPAN: Record<Exclude<TrapKind, 'pit'>, { lo: number; hi: number }> = {
  spikes: { lo: 0, hi: 24 },
  blade: { lo: 34, hi: 1000 },
  flames: { lo: 0, hi: 64 },
  goblin: { lo: 0, hi: 34 },
  bat: { lo: 0, hi: 20 },
};

/** Goblins and bats start moving once they are this close ahead, just off the right of the screen. */
export const AWAKE = 760;

/** A fire vent burns for `lit` ms of every `cycle`, and sputters for `warn` ms before. */
export const FLAMES = { cycle: 1800, lit: 800, warn: 300 };

/** Where a fire vent is in its burn: off, about to flare, or lit. */
export function flameOf(s: Pick<GameState, 'time'>, t: Trap): 'off' | 'warn' | 'lit' {
  const at = (s.time + (t.phase ?? 0)) % FLAMES.cycle;
  if (at < FLAMES.lit) return 'lit';
  return at >= FLAMES.cycle - FLAMES.warn ? 'warn' : 'off';
}

/** A raised stretch of ground: the knight jumps up onto it and drops off its far end. */
export interface Ledge {
  id: number;
  x: number;
  w: number;
  /** Height of its top above the road. */
  h: number;
}

/** Height of the ground under a stretch of course: the highest ledge over it, or the road. */
export function floorAt(s: Pick<GameState, 'ledges'>, x0: number, x1 = x0) {
  let h = 0;
  for (const l of s.ledges) if (x1 > l.x && x0 < l.x + l.w) h = Math.max(h, l.h);
  return h;
}

/** A wayside shrine on the road: `used` once it has traded a heart, `tried` once slid into without one. */
export interface Shrine {
  id: number;
  x: number;
  w: number;
  used: boolean;
  tried: boolean;
}

export interface Coin {
  id: number;
  x: number;
  h: number;
  /** Set once a lodestone has caught it; it then flies to the knight. */
  pulled: boolean;
}

export interface Effect {
  id: number;
  kind: 'coin' | 'hit' | 'block' | 'dust' | 'stomp' | 'pop' | 'heal' | 'refuse';
  x: number;
  h: number;
  ms: number;
  total: number;
  /** The words of a `pop` ("+3") or a `refuse` ("Hearts full"). */
  text?: string;
}

export interface Runner {
  /** Height of the feet above the road, and upward speed. */
  h: number;
  vh: number;
  /** Time left on the current slide; 0 when not sliding. */
  slideMs: number;
  /** Slide as soon as the feet touch the ground (after a drop). */
  slideQueued: boolean;
  /** Jumps left before touching the ground again. */
  jumps: number;
  /** Time left unhurtable after a hit. */
  hurtMs: number;
}

export interface GameState {
  stage: number;
  phase: 'running' | 'checkpoint' | 'over';
  /** Where the knight is along the course: the middle of their box. */
  distance: number;
  speed: number;
  runner: Runner;
  hearts: number;
  coins: number;
  /** Coins taken in a row since the last hit; sets the coin multiplier (`streakMult`). */
  streak: number;
  /** Hits taken this run, blocked ones included. */
  hits: number;
  /** Goblins and bats stomped on this run. */
  stomps: number;
  /** Time spent running this run, in ms; fire vents burn by it. */
  time: number;
  /** Hits the aegis will still shrug off before the next checkpoint. */
  shields: number;
  ranks: Partial<Record<BoonId, number>>;
  /** The two boons on offer at a checkpoint, or null while running. */
  choices: BoonId[] | null;
  /** Where the current stage started and where its checkpoint stands. */
  stageStart: number;
  checkpointX: number;
  traps: Trap[];
  ledges: Ledge[];
  shrines: Shrine[];
  course: Coin[];
  effects: Effect[];
  /** Best distance reached in any run, in metres. */
  best: number;
  /** Coins banked from finished runs, to spend between runs. */
  bank: number;
  /** A boon bought at the game-over screen, which the next run starts with. */
  pending: BoonId | null;
  /** The boon offered at the last checkpoint and not taken, or null before any checkpoint. */
  missed: BoonId | null;
  nextId: number;
}

/** Pixels to a metre, for the distance shown. */
export const PX_PER_M = 32;
export const metres = (distance: number) => Math.floor(distance / PX_PER_M);

/**
 * The run track under the HUD, in metres: where the knight is, the best run to chase, a banner at
 * every checkpoint (every 100 m) up to the track's end, and how far the next banner is.
 */
export function trackOf(s: Pick<GameState, 'distance' | 'checkpointX' | 'best'>) {
  const at = metres(s.distance);
  const banner = metres(s.checkpointX);
  const length = Math.ceil((Math.max(s.best, at, banner) + 30) / 50) * 50;
  const banners: number[] = [];
  for (let m = 100; m <= length; m += 100) banners.push(m);
  return { at, best: s.best, length, banners, next: banner - at };
}

/** The knight's numbers with the boons taken so far. */
export function stats(s: Pick<GameState, 'ranks'>) {
  const r = (id: BoonId) => s.ranks[id] ?? 0;
  return {
    maxHearts: START_HEARTS + r('heart'),
    jumpV: JUMP_V * Math.sqrt(1 + 0.12 * r('boots')),
    jumps: 1 + r('double'),
    slideMs: SLIDE_MS * (1 + 0.3 * r('greaves')),
    hurtMs: HURT_MS * (1 + 0.5 * r('cloak')),
    reach: COIN_REACH + 45 * r('magnet'),
    coinValue: 1 + r('greed'),
    shields: r('aegis'),
  };
}

export function rankOf(s: Pick<GameState, 'ranks'>, id: BoonId) {
  return s.ranks[id] ?? 0;
}

export const canTake = (s: Pick<GameState, 'ranks'>, id: BoonId) => rankOf(s, id) < BOONS[id].maxRank;

export function freshState(best = 0, bank = 0): GameState {
  return {
    stage: 1,
    phase: 'running',
    distance: 0,
    speed: speedOf(1),
    runner: { h: 0, vh: 0, slideMs: 0, slideQueued: false, jumps: 1, hurtMs: 0 },
    hearts: START_HEARTS,
    coins: 0,
    streak: 0,
    hits: 0,
    stomps: 0,
    time: 0,
    shields: 0,
    ranks: {},
    choices: null,
    stageStart: 0,
    checkpointX: STAGE_LEN,
    traps: [],
    ledges: [],
    shrines: [],
    course: [],
    effects: [],
    best,
    bank,
    pending: null,
    missed: null,
    nextId: 1,
  };
}
