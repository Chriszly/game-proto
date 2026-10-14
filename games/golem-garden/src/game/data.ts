// The golems you can grow, the pests that come for the Heartwood, and the waves they come in.
import { byDifficulty } from '../../../../shared/settings';

export const GOLEMS = ['pebble', 'moss', 'thorn'] as const;
export type GolemKind = (typeof GOLEMS)[number];

export interface GolemInfo {
  name: string;
  /** Sap to plant its seed. */
  cost: number;
  /** How long the seed takes to grow into a golem that fights, in ms. */
  growMs: number;
  /** Damage per throw at level 1. */
  damage: number;
  /** How far it reaches at level 1, in pixels from its cell's centre. */
  range: number;
  /** Time between throws, in ms. */
  cooldownMs: number;
  /** For a slowing golem: how much it slows a pest it hits (0.5 halves its speed) and for how long. */
  slow?: { factor: number; ms: number };
  /** Hits every pest within reach at once, instead of the one furthest along. */
  area?: boolean;
  /** Can only be planted once the Heartwood is in full bloom (`BLOOM_GOAL` buds open). */
  locked?: boolean;
  blurb: string;
}

export const GOLEM_INFO: Record<GolemKind, GolemInfo> = {
  pebble: { name: 'Pebble golem', cost: 30, growMs: 3000, damage: 7, range: 110, cooldownMs: 700, blurb: 'Throws rocks' },
  moss: {
    name: 'Moss golem',
    cost: 50,
    growMs: 4000,
    damage: 3,
    range: 140,
    cooldownMs: 800,
    slow: { factor: 0.5, ms: 1500 },
    blurb: 'Slows pests',
  },
  thorn: {
    name: 'Thorn golem',
    cost: 60,
    growMs: 4000,
    damage: 5,
    range: 80,
    cooldownMs: 600,
    area: true,
    locked: true,
    blurb: 'Pricks all near',
  },
};

/** Buds the Heartwood opens, one per cleared wave, before the Thorn golem's seed unlocks. */
export const BLOOM_GOAL = 5;
/** Extra sap for calling the next wave while the current one is still on the path. */
export const EARLY_BONUS = 15;

/** The highest level a golem reaches. */
export const MAX_LEVEL = 3;
/** Sap to raise a golem from level `n` to `n + 1`, indexed by its current level. */
export const UPGRADE_COST = [0, 40, 70];

/** A golem's damage and reach at its level: each level adds 60% damage and 12 pixels of reach. */
export function golemStats(kind: GolemKind, level: number) {
  const info = GOLEM_INFO[kind];
  return { damage: info.damage * (1 + 0.6 * (level - 1)), range: info.range + 12 * (level - 1) };
}

export const PESTS = ['beetle', 'slug', 'crow'] as const;
export type PestKind = (typeof PESTS)[number];

export interface PestInfo {
  hp: number;
  /** Pixels per second along the path. */
  speed: number;
  /** Sap it drops when a golem squashes it. */
  bounty: number;
  /** How much of the Heartwood it eats if it gets there. */
  bite: number;
}

export const PEST_INFO: Record<PestKind, PestInfo> = {
  beetle: { hp: 20, speed: 40, bounty: 5, bite: 1 },
  slug: { hp: 50, speed: 24, bounty: 9, bite: 2 },
  crow: { hp: 14, speed: 72, bounty: 6, bite: 1 },
};

/** Pest health is scaled by the hub's difficulty: 25% less on Easy, 30% more on Hard. */
export const PEST_HP_SCALE = byDifficulty(0.75, 1, 1.3);

/** One pest of a wave and when it comes in, in ms after the wave starts. */
export interface Spawn {
  kind: PestKind;
  atMs: number;
}

/**
 * The pests of wave `n`: beetles every 1.1s from the first wave, a slug more each wave from the
 * second, and two crows more each wave from the third. Later waves also get tougher, 12% more
 * health per wave.
 */
export function waveFor(n: number): { spawns: Spawn[]; hpScale: number } {
  const spawns: Spawn[] = [];
  const beetles = 6 + 2 * n;
  for (let i = 0; i < beetles; i++) spawns.push({ kind: 'beetle', atMs: i * 1100 });
  for (let i = 0; i < n - 1; i++) spawns.push({ kind: 'slug', atMs: 2000 + i * 2600 });
  for (let i = 0; i < 2 * (n - 2); i++) spawns.push({ kind: 'crow', atMs: 4000 + i * 1500 });
  spawns.sort((a, b) => a.atMs - b.atMs);
  return { spawns, hpScale: (1 + 0.12 * (n - 1)) * PEST_HP_SCALE };
}

/** How many of each pest wave `n` brings, counted from `waveFor`; shown in the wave preview. */
export function waveCounts(n: number): Record<PestKind, number> {
  const counts = { beetle: 0, slug: 0, crow: 0 };
  for (const spawn of waveFor(n).spawns) counts[spawn.kind]++;
  return counts;
}

/** Sap for clearing wave `n`. */
export const waveBonus = (n: number) => 10 + 5 * n;

/** What a new garden starts with. */
export const START = { sap: 60, heart: 10 };
