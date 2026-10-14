import type { EnemyKind } from './enemies';
import { FIRST_BREAK_MS } from './waves';
import type { RelicId } from './relics';
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

/**
 * Short-lived things drawn on the field: bursts, lightning, hits and deaths, an Arrow Rain landing,
 * and for each kill an "+N XP" pop (`xp`) and the experience orbs flying into the bar (`orb`).
 */
export interface Effect {
  id: number;
  kind: 'blast' | 'fireblast' | 'bolt' | 'death' | 'crit' | 'rain' | 'xp' | 'orb';
  x: number;
  y: number;
  /** Blast radius, or the lightning's path. */
  radius?: number;
  points?: { x: number; y: number }[];
  /** `xp` and `orb`: the experience the kill gave. `xp`: the kill streak it was part of. */
  amount?: number;
  streak?: number;
  ms: number;
  total: number;
}

/** An Arrow Rain volley in the air, landing on the ring around (x, y) when `ms` runs out. */
export interface Volley {
  id: number;
  x: number;
  y: number;
  ms: number;
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
  /** Relics won from the relic chests after the bosses, with how many of each. */
  relics: Partial<Record<RelicId, number>>;

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
  /** Time left before one of `choices` is taken at random, if none is tapped. */
  pickMs: number;
  kills: number;
  /** Arrow Rain: kills charge it up to `need`; then it can be dragged onto the field and loosed. */
  rain: { charge: number; need: number; volleys: Volley[] };
  /**
   * The kill streak: `count` kills in quick succession, each within `ms` of the last; `best` is
   * the run's longest. `bonusXp` is all the extra experience streaks gave this run.
   */
  streak: { count: number; ms: number; best: number; bonusXp: number };
  /** The relic the last boss's chest gave, shown during the break after it; null otherwise. */
  relicFound: RelicId | null;
  nextId: number;
}

export const VERSION = 1;
/** Kills that charge Arrow Rain on wave 1; later waves need more (see `rainNeed` in sim.ts). */
export const RAIN_KILLS = 4;
export const BASE_BARRICADE_HP = 200;

export const rank = (state: Pick<GameState, 'ranks'>, id: UpgradeId) => state.ranks[id] ?? 0;

/** Experience bonus of a kill streak: 5% per kill in it from two kills on, up to 50%. */
export const streakBonus = (count: number) => (count >= 2 ? Math.min(0.5, 0.05 * count) : 0);
/** How long a kill streak waits for the next kill before it ends. */
export const STREAK_MS = 2_500;

/** Everything the upgrades and relics change, worked out from their ranks and counts. */
export function stats(state: Pick<GameState, 'ranks' | 'relics'>) {
  const r = (id: UpgradeId) => rank(state, id);
  const relic = (id: RelicId) => state.relics?.[id] ?? 0;
  return {
    /** Milliseconds between two shots of the bow. */
    shotMs: 1_000 / (1 + 0.2 * r('swift')) / (1 + 0.1 * relic('drum')),
    damage: 10 * (1 + 0.25 * r('sharp')) * (1 + 0.15 * relic('feather')),
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
    barricadeMax: Math.round(BASE_BARRICADE_HP * (1 + 0.25 * r('timber')) * (1 + 0.3 * relic('oakheart'))),
    xpGain: (1 + 0.2 * r('lore')) * (1 + 0.15 * relic('crown')),
    /** Arrow Rain's kills to charge, as a share of the wave's (see `rainNeed` in sim.ts). */
    rainCharge: 0.8 ** relic('quiver'),
    streakMs: STREAK_MS + 1_000 * relic('banner'),
  };
}

export type Stats = ReturnType<typeof stats>;

/** Kills Arrow Rain needs to charge on a wave: four on wave 1, one more every other wave. */
export const rainNeed = (wave: number, s: Stats) => Math.max(2, Math.round((RAIN_KILLS + Math.floor((wave - 1) / 2)) * s.rainCharge));

/** The hero's level and upgrades, kept from one run to the next. */
export type Progress = Pick<GameState, 'level' | 'xp' | 'ranks' | 'levelUps' | 'bestWave' | 'runs' | 'relics'>;

export function freshProgress(): Progress {
  return { level: 1, xp: 0, ranks: {}, levelUps: 0, bestWave: 0, runs: 0, relics: {} };
}

/** A new run from wave 1, with the hero's progress kept. */
export function newRun(progress: Progress): GameState {
  const s = stats(progress);
  const barricadeMax = s.barricadeMax;
  return {
    version: VERSION,
    ...progress,
    ranks: { ...progress.ranks },
    relics: { ...progress.relics },
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
    pickMs: 0,
    kills: 0,
    rain: { charge: 0, need: rainNeed(1, s), volleys: [] },
    streak: { count: 0, ms: 0, best: 0, bonusXp: 0 },
    relicFound: null,
    nextId: 1,
  };
}

export function progressOf(state: GameState): Progress {
  const { level, xp, ranks, levelUps, bestWave, runs, relics } = state;
  return { level, xp, ranks: { ...ranks }, levelUps, bestWave, runs, relics: { ...relics } };
}

/** Upgrades that can still be offered: not maxed, and with what they build on already picked. */
export const offerable = (state: Pick<GameState, 'ranks'>) =>
  UPGRADE_IDS.filter((id) => {
    const u = UPGRADES[id];
    return !u.filler && rank(state, id) < u.maxRank && (!u.requires || rank(state, u.requires) > 0);
  });
