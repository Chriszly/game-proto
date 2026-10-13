import { BOONS, type BoonId } from './boons';

// The run in plain numbers. The course runs left to right along x in world pixels; heights are
// measured up from the ground, so the knight's feet are at h = 0 when running.

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
export const START_HEARTS = 3;
/** How near a coin has to be to the knight's box to be picked up. */
export const COIN_REACH = 14;
/** Length of a stage, from one checkpoint to the next, and the clear run at its start. */
export const STAGE_LEN = 3200;
export const LEAD_IN = 700;

/** Running speed on a stage, in pixels per second. */
export const speedOf = (stage: number) => Math.min(480, 260 + 30 * (stage - 1));

export type TrapKind = 'spikes' | 'pit' | 'blade';

export interface Trap {
  id: number;
  kind: TrapKind;
  /** Left edge and width along the course. */
  x: number;
  w: number;
}

/** What height each trap fills: spikes on the ground, and a blade hanging down to `lo`. */
export const TRAP_SPAN: Record<Exclude<TrapKind, 'pit'>, { lo: number; hi: number }> = {
  spikes: { lo: 0, hi: 24 },
  blade: { lo: 34, hi: 1000 },
};

export interface Coin {
  id: number;
  x: number;
  h: number;
  /** Set once a lodestone has caught it; it then flies to the knight. */
  pulled: boolean;
}

export interface Effect {
  id: number;
  kind: 'coin' | 'hit' | 'block' | 'dust';
  x: number;
  h: number;
  ms: number;
  total: number;
}

export interface Runner {
  /** Height of the feet above the ground, and upward speed. */
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
  /** Hits taken this run, blocked ones included. */
  hits: number;
  /** Hits the aegis will still shrug off before the next checkpoint. */
  shields: number;
  ranks: Partial<Record<BoonId, number>>;
  /** The two boons on offer at a checkpoint, or null while running. */
  choices: BoonId[] | null;
  /** Where the current stage started and where its checkpoint stands. */
  stageStart: number;
  checkpointX: number;
  traps: Trap[];
  course: Coin[];
  effects: Effect[];
  /** Best distance reached in any run, in metres. */
  best: number;
  nextId: number;
}

/** Pixels to a metre, for the distance shown. */
export const PX_PER_M = 32;
export const metres = (distance: number) => Math.floor(distance / PX_PER_M);

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

export function freshState(best = 0): GameState {
  return {
    stage: 1,
    phase: 'running',
    distance: 0,
    speed: speedOf(1),
    runner: { h: 0, vh: 0, slideMs: 0, slideQueued: false, jumps: 1, hurtMs: 0 },
    hearts: START_HEARTS,
    coins: 0,
    hits: 0,
    shields: 0,
    ranks: {},
    choices: null,
    stageStart: 0,
    checkpointX: STAGE_LEN,
    traps: [],
    course: [],
    effects: [],
    best,
    nextId: 1,
  };
}
