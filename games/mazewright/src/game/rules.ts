import { byDifficulty } from '../../../../shared/settings';

// Mazewright's balance: towers, foes and the twenty waves. Positions and speeds are in cells and
// seconds; the scene turns cells into pixels.

/** The grid: 22 cells across, 11 down. */
export const COLS = 22;
export const ROWS = 11;

export const TOWERS = ['hedge', 'bow', 'frost', 'cannon', 'storm', 'crossbow', 'bonfire', 'puffball', 'sunglass', 'beehive', 'apple', 'whirligig'] as const;
export type TowerKind = (typeof TOWERS)[number];

/** The pouch: the towers a run can plant. Hedge and bow are always in it, with up to four more. */
export const ALWAYS: TowerKind[] = ['hedge', 'bow'];
export const POUCH_PICKS = 4;
/** Today's four, the pouch of a first game. */
export const DEFAULT_POUCH: TowerKind[] = ['hedge', 'bow', 'frost', 'cannon'];

/** What a tower's hits are made of: shells resist some kinds and crack under others. */
export const DAMAGE_KINDS = ['sharp', 'blast', 'heat', 'spark', 'cold', 'poison'] as const;
export type DamageKind = (typeof DAMAGE_KINDS)[number];

/** Foe shells and how much of each damage kind gets through (1 when not listed). */
export const SHELLS = {
  hard: { sharp: 0.5, spark: 1.5 },
  waxy: { heat: 0.5, blast: 1.5 },
  hairy: { blast: 0.5, sharp: 1.5 },
} as const satisfies Record<string, Partial<Record<DamageKind, number>>>;
export type ShellKind = keyof typeof SHELLS;
export const shellFactor = (shell: ShellKind | undefined, kind: DamageKind) =>
  (shell && (SHELLS[shell] as Partial<Record<DamageKind, number>>)[kind]) ?? 1;

/** Heat: each sunglass or bonfire hit adds `HEAT.hit`, it cools by `HEAT.cool` a second, and a fully heated foe takes `HEAT.boost` times heat damage. */
export const HEAT = { hit: 0.25, cool: 0.15, boost: 2 };

/** How a tower picks its target among the foes in reach. */
export const AIMS = ['first', 'last', 'strongest', 'weakest', 'fliers'] as const;
export type Aim = (typeof AIMS)[number];

export interface TowerDef {
  cost: number;
  /** What its hits are made of. */
  hits: DamageKind;
  /** Reach in cells; 0 for a tower that never shoots (hedge, beehive, apple tree). */
  range: number;
  /** Damage per shot (frost: per pulse), by level 1 to 3. */
  damage: [number, number, number];
  /** Seconds between shots or pulses, by level. */
  reload: [number, number, number];
  /** Whether it can hit moths, which fly. */
  air: boolean;
  /** Cannon: cells around the hit that take the damage too. */
  splash?: number;
  /** Frost: how fast a chilled foe still walks (0.5 is half speed), by level, and for how long. */
  slow?: [number, number, number];
  slowFor?: number;
  /** Storm rod: how many foes a bolt reaches in all, by level, and how far it jumps between them. */
  chain?: [number, number, number];
  jump?: number;
  /** Bonfire: burn damage per second, by level, and for how long. Puffball: the same for poison. */
  dot?: [number, number, number];
  dotFor?: number;
  /** Bonfire and sunglass point one way (an index into `DIRS`); the bonfire's cone half-width in radians. */
  faces?: boolean;
  cone?: number;
  /** Beehive: how much faster the towers round it reload, by level. */
  boost?: [number, number, number];
  /** Apple tree: gold dropped each time a wave is held, by level. */
  apples?: [number, number, number];
  /** Whirligig: the reload it spins up to, by level, and the seconds of firing it takes. */
  spinTo?: [number, number, number];
  spinUp?: number;
  /** The aim a new tower starts with (First unless set). */
  aim?: Aim;
}

export const TOWER: Record<TowerKind, TowerDef> = {
  hedge: { cost: 4, hits: 'sharp', range: 0, damage: [0, 0, 0], reload: [1, 1, 1], air: false },
  bow: { cost: 10, hits: 'sharp', range: 3, damage: [6, 10, 16], reload: [0.6, 0.55, 0.5], air: true },
  frost: { cost: 15, hits: 'cold', range: 2.5, damage: [2, 3, 5], reload: [1, 1, 1], air: true, slow: [0.55, 0.5, 0.42], slowFor: 1.5 },
  cannon: { cost: 25, hits: 'blast', range: 3.5, damage: [16, 26, 40], reload: [1.6, 1.5, 1.4], air: false, splash: 1 },
  storm: { cost: 30, hits: 'spark', range: 3, damage: [14, 22, 34], reload: [1.4, 1.3, 1.2], air: true, chain: [4, 5, 6], jump: 1.5 },
  crossbow: { cost: 35, hits: 'sharp', range: 7, damage: [50, 80, 125], reload: [2.5, 2.3, 2.1], air: true, aim: 'strongest' },
  bonfire: { cost: 25, hits: 'heat', range: 2.2, damage: [4, 7, 11], reload: [0.5, 0.5, 0.5], air: false, dot: [6, 9, 14], dotFor: 2, faces: true, cone: 0.7 },
  puffball: { cost: 20, hits: 'poison', range: 2.5, damage: [0, 0, 0], reload: [1.2, 1.1, 1], air: true, dot: [4, 6, 9], dotFor: 4 },
  sunglass: { cost: 40, hits: 'heat', range: 22, damage: [22, 34, 50], reload: [1.4, 1.3, 1.2], air: true, faces: true },
  beehive: { cost: 30, hits: 'sharp', range: 0, damage: [0, 0, 0], reload: [1, 1, 1], air: false, boost: [0.2, 0.3, 0.4] },
  apple: { cost: 30, hits: 'sharp', range: 0, damage: [0, 0, 0], reload: [1, 1, 1], air: false, apples: [5, 8, 12] },
  whirligig: { cost: 20, hits: 'sharp', range: 2.5, damage: [3, 4, 6], reload: [0.6, 0.6, 0.6], air: true, spinTo: [0.15, 0.13, 0.11], spinUp: 3 },
};

/** Whether a tower kind shoots or pulses at foes (a hedge, beehive or apple tree doesn't). */
export const attacks = (kind: TowerKind) => TOWER[kind].range > 0;
/** Whether a tower kind picks one target, so its aim can be set. */
export const aims = (kind: TowerKind) => attacks(kind) && !TOWER[kind].faces && kind !== 'frost';

/** The highest level a tower reaches; hedges stay at 1. */
export const MAX_LEVEL = 3;
/** The share of what a tower cost (with its upgrades) that selling it gives back. */
export const SELL_BACK = 0.7;
/** The cost of raising a tower from `level` to the next. */
export const upgradeCost = (kind: TowerKind, level: number) => TOWER[kind].cost * level;
/** Arrow and cannon ball speeds, in cells per second. */
export const SHOT_SPEED = { bow: 12, cannon: 7, crossbow: 20, whirligig: 14 } as const;
export type ShotKind = keyof typeof SHOT_SPEED;
/** Puffball spores jump from a poisoned foe to ground foes this close, once a second. */
export const SPREAD = { reach: 0.9, every: 1 };

export const FOES = ['beetle', 'ladybird', 'stag', 'moth', 'mole', 'weevil', 'queen'] as const;
export type FoeKind = (typeof FOES)[number];

export interface FoeDef {
  hp: number;
  /** Cells per second. */
  speed: number;
  gold: number;
  /** Lives lost when it reaches the cottage. */
  lives: number;
  /** Seconds after it before the next foe of its group comes out. */
  gap: number;
  /** Moths fly straight over the maze. */
  flies?: boolean;
  /** Moles chew through a hedge that stands in the way of a much shorter route. */
  digs?: boolean;
  /** Its shell, which resists some damage kinds (`SHELLS`). */
  shell?: ShellKind;
  /** Its body's radius in cells, for drawing and for cannon splash. */
  size: number;
}

export const FOE: Record<FoeKind, FoeDef> = {
  beetle: { hp: 30, speed: 1.6, gold: 2, lives: 1, gap: 1.1, size: 0.22 },
  ladybird: { hp: 18, speed: 2.6, gold: 2, lives: 1, gap: 0.6, size: 0.17 },
  stag: { hp: 90, speed: 1, gold: 5, lives: 2, gap: 1.6, shell: 'waxy', size: 0.3 },
  moth: { hp: 22, speed: 1.4, gold: 3, lives: 1, gap: 1, flies: true, size: 0.22 },
  mole: { hp: 50, speed: 1.3, gold: 4, lives: 1, gap: 1.4, digs: true, shell: 'hairy', size: 0.26 },
  weevil: { hp: 55, speed: 1.2, gold: 4, lives: 1, gap: 1.2, shell: 'hard', size: 0.24 },
  queen: { hp: 600, speed: 0.8, gold: 40, lives: 5, gap: 2, size: 0.42 },
};

/** Seconds a mole chews before the hedge is gone. */
export const CHEW_TIME = 3;
/** Steps a hedge must save before a mole bothers to chew it. */
export const CHEW_GAIN = 6;

/** A group of one kind of foe in a wave. */
export type Group = [FoeKind, number];

/**
 * The waves, in order. From wave `SECOND_GATE` on, foes come out of both burrows in turn; before
 * that only the first burrow is open, though both routes must stay free all game.
 */
export const WAVES: Group[][] = [
  [['beetle', 6]],
  [['beetle', 8], ['ladybird', 3]],
  [['ladybird', 10]],
  [['beetle', 10], ['stag', 2]],
  [['beetle', 8], ['mole', 3]],
  [['beetle', 12], ['ladybird', 6]],
  [['stag', 5], ['beetle', 8]],
  [['moth', 8], ['beetle', 6], ['weevil', 4]],
  [['mole', 5], ['ladybird', 10]],
  [['beetle', 10], ['queen', 1]],
  [['beetle', 10], ['weevil', 5], ['moth', 6]],
  [['stag', 8], ['mole', 4]],
  [['ladybird', 20]],
  [['moth', 12], ['stag', 4]],
  [['mole', 8], ['weevil', 8], ['beetle', 6]],
  [['stag', 10], ['ladybird', 12]],
  [['moth', 14], ['mole', 6]],
  [['beetle', 14], ['weevil', 8], ['stag', 8]],
  [['ladybird', 20], ['moth', 10], ['mole', 6]],
  [['stag', 8], ['weevil', 6], ['moth', 8], ['queen', 1]],
];
export const SECOND_GATE = 6;
/** Seconds between two groups of a wave. */
export const GROUP_GAP = 2;

/** Foes get tougher each wave: health times this per wave after the first. */
export const HP_PER_WAVE = 0.16;
/** The queen of the last wave is this much tougher again. */
export const FINAL_QUEEN = 1.6;

/** Lives and starting gold, and the difficulty's foe health. */
export const startLives = () => byDifficulty(30, 20, 12);
export const START_GOLD = 90;
export const hpScale = () => byDifficulty(0.8, 1, 1.25);
/** Gold for clearing a wave, and for calling the next one before the field is clear. */
export const waveReward = (wave: number) => 6 + wave;
export const EARLY_BONUS = 5;
