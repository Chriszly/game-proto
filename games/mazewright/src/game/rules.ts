import { byDifficulty } from '../../../../shared/settings';

// Mazewright's balance: towers, foes and the twenty waves. Positions and speeds are in cells and
// seconds; the scene turns cells into pixels.

/** The grid: 22 cells across, 11 down. */
export const COLS = 22;
export const ROWS = 11;

export const TOWERS = ['hedge', 'bow', 'frost', 'cannon'] as const;
export type TowerKind = (typeof TOWERS)[number];

export interface TowerDef {
  cost: number;
  /** Reach in cells; 0 for a hedge, which only blocks. */
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
}

export const TOWER: Record<TowerKind, TowerDef> = {
  hedge: { cost: 4, range: 0, damage: [0, 0, 0], reload: [1, 1, 1], air: false },
  bow: { cost: 10, range: 3, damage: [6, 10, 16], reload: [0.6, 0.55, 0.5], air: true },
  frost: { cost: 15, range: 2.5, damage: [2, 3, 5], reload: [1, 1, 1], air: true, slow: [0.55, 0.5, 0.42], slowFor: 1.5 },
  cannon: { cost: 25, range: 3.5, damage: [16, 26, 40], reload: [1.6, 1.5, 1.4], air: false, splash: 1 },
};

/** The highest level a tower reaches; hedges stay at 1. */
export const MAX_LEVEL = 3;
/** The share of what a tower cost (with its upgrades) that selling it gives back. */
export const SELL_BACK = 0.7;
/** The cost of raising a tower from `level` to the next. */
export const upgradeCost = (kind: TowerKind, level: number) => TOWER[kind].cost * level;
/** Arrow and cannon ball speeds, in cells per second. */
export const SHOT_SPEED = { bow: 12, cannon: 7 } as const;

export const FOES = ['beetle', 'ladybird', 'stag', 'moth', 'mole', 'queen'] as const;
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
  /** Its body's radius in cells, for drawing and for cannon splash. */
  size: number;
}

export const FOE: Record<FoeKind, FoeDef> = {
  beetle: { hp: 30, speed: 1.6, gold: 2, lives: 1, gap: 1.1, size: 0.22 },
  ladybird: { hp: 18, speed: 2.6, gold: 2, lives: 1, gap: 0.6, size: 0.17 },
  stag: { hp: 90, speed: 1, gold: 5, lives: 2, gap: 1.6, size: 0.3 },
  moth: { hp: 22, speed: 1.4, gold: 3, lives: 1, gap: 1, flies: true, size: 0.22 },
  mole: { hp: 50, speed: 1.3, gold: 4, lives: 1, gap: 1.4, digs: true, size: 0.26 },
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
  [['moth', 8], ['beetle', 10]],
  [['mole', 5], ['ladybird', 10]],
  [['beetle', 10], ['queen', 1]],
  [['beetle', 16], ['moth', 6]],
  [['stag', 8], ['mole', 4]],
  [['ladybird', 20]],
  [['moth', 12], ['stag', 4]],
  [['mole', 8], ['beetle', 14]],
  [['stag', 10], ['ladybird', 12]],
  [['moth', 14], ['mole', 6]],
  [['beetle', 24], ['stag', 8]],
  [['ladybird', 20], ['moth', 10], ['mole', 6]],
  [['stag', 8], ['moth', 8], ['queen', 1]],
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
