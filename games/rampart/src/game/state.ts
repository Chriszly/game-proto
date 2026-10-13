import type { EnemyKind } from './enemies';
import { FIRST_BREAK_MS } from './waves';
import { UPGRADES, UPGRADE_IDS, type UpgradeId } from './upgrades';

// The battlefield, in the 960x540 view. Foes walk in from the right towards the barricade, and past
// it to the hero once it falls.
export const FIELD = { top: 286, bottom: 488 };
export const SPAWN_X = 1_000;
/** Where the hero stands on the ground behind the barricade, and where arrows leave the bow. */
export const HERO = { x: 66, y: 387 };
export const BOW = { x: 88, y: 382 };
/** A foe whose front reaches this far left has got to the hero, and the run is over. */
export const HERO_FRONT = 96;
/** The barricade's face towards the foes. */
export const BARRICADE_FRONT = 214;

/** Experience needed to go up from `level` to the next. */
export const xpToNext = (level: number) => 8 + 6 * (level - 1);

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Bosses only: how many health bars `maxHp` is split over. */
  bars: number;
  /** Chilled: walks and hits at (1 - slow) of its speed until `slowMs` runs out. */
  slow: number;
  slowMs: number;
  /** Burning: takes `burnDps` a second until `burnMs` runs out. */
  burnDps: number;
  burnMs: number;
  /** Whether it stands at the barricade, hitting it. */
  attacking: boolean;
  /** Counts down after each hit, for the flash. */
  hitMs: number;
}

export type MissileKind = 'arrow' | 'fireball';

export interface Missile {
  id: number;
  kind: MissileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** The foe it homes in on, or null to fly straight on. */
  target: number | null;
  /** Foes it has hit, so a piercing arrow doesn't hit the same one twice. */
  hit: number[];
  /** How many more foes an arrow passes through. */
  pierce: number;
}

/** Short-lived things drawn on the field: bursts, lightning, hits and deaths. */
export interface Effect {
  id: number;
  kind: 'blast' | 'fireblast' | 'bolt' | 'death' | 'crit';
  x: number;
  y: number;
  /** Blast radius, or the lightning's path. */
  radius?: number;
  points?: { x: number; y: number }[];
  ms: number;
  total: number;
}

export type Phase = 'break' | 'fighting' | 'over';

export interface GameState {
  version: number;
  // Kept from run to run: the hero's level, experience and upgrades.
  level: number;
  xp: number;
  ranks: Partial<Record<UpgradeId, number>>;
  /** Level-ups still to be picked. */
  levelUps: number;
  /** The highest wave ever cleared, and how many runs have been played. */
  bestWave: number;
  runs: number;

  // This run.
  wave: number;
  phase: Phase;
  /** Time left in the break before the wave comes on. */
  breakMs: number;
  /** Foes of this wave still to come on, and the time until the next one does. */
  toSpawn: EnemyKind[];
  spawnMs: number;
  barricade: { hp: number; max: number };
  enemies: Enemy[];
  missiles: Missile[];
  effects: Effect[];
  /** Time until each weapon shoots again. */
  cooldown: { arrow: number; fireball: number; storm: number };
  /** The three upgrades offered for the next level-up; the battle waits until one is picked. */
  choices: UpgradeId[] | null;
  kills: number;
  nextId: number;
}

export const VERSION = 1;
export const BASE_BARRICADE_HP = 200;

export const rank = (state: Pick<GameState, 'ranks'>, id: UpgradeId) => state.ranks[id] ?? 0;

/** Everything the upgrades change, worked out from their ranks. */
export function stats(state: Pick<GameState, 'ranks'>) {
  const r = (id: UpgradeId) => rank(state, id);
  return {
    /** Milliseconds between two shots of the bow. */
    shotMs: 1_000 / (1 + 0.2 * r('swift')),
    damage: 10 * (1 + 0.25 * r('sharp')),
    arrows: 1 + r('volley'),
    pierce: r('pierce'),
    critChance: 0.1 * r('crit'),
    burn: r('fire') ? { dps: 5 * (1 + 0.5 * r('wildfire')), ms: 3_000 } : null,
    chill: r('frost') ? { slow: 0.35 + 0.1 * r('deepFreeze'), ms: 1_500 + 500 * r('deepFreeze') } : null,
    burst: r('blast') ? { radius: 45 + 15 * r('bigBlast'), share: 0.4 + 0.15 * r('bigBlast') } : null,
    fireball: r('fireball')
      ? { ms: 3_000 * 0.85 ** r('pyromancy'), damage: 30 * (1 + 0.4 * r('pyromancy')), radius: 70 }
      : null,
    storm: r('storm') ? { ms: 3_500, damage: 20 * (1 + 0.25 * r('forked')), leaps: 3 + r('forked') } : null,
    barricadeMax: Math.round(BASE_BARRICADE_HP * (1 + 0.25 * r('timber'))),
    xpGain: 1 + 0.2 * r('lore'),
  };
}

export type Stats = ReturnType<typeof stats>;

/** The hero's level and upgrades, kept from one run to the next. */
export type Progress = Pick<GameState, 'level' | 'xp' | 'ranks' | 'levelUps' | 'bestWave' | 'runs'>;

export function freshProgress(): Progress {
  return { level: 1, xp: 0, ranks: {}, levelUps: 0, bestWave: 0, runs: 0 };
}

/** A new run from wave 1, with the hero's progress kept. */
export function newRun(progress: Progress): GameState {
  const barricadeMax = stats(progress).barricadeMax;
  return {
    version: VERSION,
    ...progress,
    ranks: { ...progress.ranks },
    wave: 1,
    phase: 'break',
    breakMs: FIRST_BREAK_MS,
    toSpawn: [],
    spawnMs: 0,
    barricade: { hp: barricadeMax, max: barricadeMax },
    enemies: [],
    missiles: [],
    effects: [],
    cooldown: { arrow: 0, fireball: 0, storm: 0 },
    choices: null,
    kills: 0,
    nextId: 1,
  };
}

export function progressOf(state: GameState): Progress {
  const { level, xp, ranks, levelUps, bestWave, runs } = state;
  return { level, xp, ranks: { ...ranks }, levelUps, bestWave, runs };
}

/** Upgrades that can still be offered: not maxed, and with what they build on already picked. */
export const offerable = (state: Pick<GameState, 'ranks'>) =>
  UPGRADE_IDS.filter((id) => {
    const u = UPGRADES[id];
    return !u.filler && rank(state, id) < u.maxRank && (!u.requires || rank(state, u.requires) > 0);
  });
