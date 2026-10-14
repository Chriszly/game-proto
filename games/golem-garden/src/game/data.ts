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

/** Of the sap spent on a golem (its seed and levels), the share uprooting it gives back. */
export const UPROOT_REFUND = 0.7;
/** Sap to move a golem to another soil cell. */
export const MOVE_FEE = 10;
/** How much faster the game plays with the speed button on. */
export const FAST = 2;

/**
 * Golem combos, between golems side by side (one cell up, down, left or right), both grown: a
 * pebble golem next to a moss golem hits slowed pests harder, and a thorn golem next to a moss
 * golem pricks twice.
 */
export const COMBO = { slowedDamage: 1.5, thornPricks: 2 };

/** The highest level a golem reaches. */
export const MAX_LEVEL = 3;
/** Sap to raise a golem from level `n` to `n + 1`, indexed by its current level. */
export const UPGRADE_COST = [0, 40, 70];

/** A golem's damage and reach at its level: each level adds 60% damage and 12 pixels of reach. */
export function golemStats(kind: GolemKind, level: number) {
  const info = GOLEM_INFO[kind];
  return { damage: info.damage * (1 + 0.6 * (level - 1)), range: info.range + 12 * (level - 1) };
}

export const PESTS = ['beetle', 'slug', 'crow', 'mole', 'snail', 'aphid', 'queen'] as const;
export type PestKind = (typeof PESTS)[number];

export interface PestInfo {
  hp: number;
  /** Pixels per second along the path. */
  speed: number;
  /** Sap it drops when a golem squashes it. */
  bounty: number;
  /** How much of the Heartwood it eats if it gets there. */
  bite: number;
  /** Taken off every hit, down to 1: small hits barely dent it. */
  armour?: number;
  /** Tunnels under the path between these shares of its route, out of every golem's reach. */
  tunnel?: [number, number];
  /** Leaves a slime trail that slows the throws of golems on and beside the cells it crosses. */
  slime?: boolean;
  /** A boss: one comes every `BOSS_EVERY` waves. */
  boss?: boolean;
}

export const PEST_INFO: Record<PestKind, PestInfo> = {
  beetle: { hp: 20, speed: 40, bounty: 5, bite: 1 },
  slug: { hp: 50, speed: 24, bounty: 9, bite: 2 },
  crow: { hp: 14, speed: 72, bounty: 6, bite: 1 },
  mole: { hp: 34, speed: 34, bounty: 8, bite: 1, tunnel: [0.3, 0.6] },
  snail: { hp: 36, speed: 20, bounty: 11, bite: 2, armour: 4 },
  aphid: { hp: 5, speed: 46, bounty: 1, bite: 1 },
  queen: { hp: 620, speed: 13, bounty: 80, bite: 5, slime: true, boss: true },
};

/** A Queen Slug comes every this many waves. */
export const BOSS_EVERY = 10;
/** How long a cell stays slimed after the Queen Slug passes, in ms, and how much it slows throws. */
export const SLIME = { ms: 6000, slow: 0.5 };

/** Pest health is scaled by the hub's difficulty: 25% less on Easy, 30% more on Hard. */
export const PEST_HP_SCALE = byDifficulty(0.75, 1, 1.3);

/** One pest of a wave and when it comes in, in ms after the wave starts. */
export interface Spawn {
  kind: PestKind;
  atMs: number;
}

/**
 * The pests of wave `n`: beetles every 1.1s from the first wave, a slug more each wave from the
 * second, two crows more each wave from the third, a mole more each wave from the fourth, an
 * armoured snail more every other wave from the fifth, and from the sixth a swarm of aphids that
 * grows each wave (two swarms from the twelfth). Every tenth wave the Queen Slug leads. Later
 * waves also get tougher, 12% more health per wave.
 */
export function waveFor(n: number): { spawns: Spawn[]; hpScale: number } {
  const spawns: Spawn[] = [];
  const beetles = 6 + 2 * n;
  for (let i = 0; i < beetles; i++) spawns.push({ kind: 'beetle', atMs: i * 1100 });
  for (let i = 0; i < n - 1; i++) spawns.push({ kind: 'slug', atMs: 2000 + i * 2600 });
  for (let i = 0; i < 2 * (n - 2); i++) spawns.push({ kind: 'crow', atMs: 4000 + i * 1500 });
  for (let i = 0; i < n - 3; i++) spawns.push({ kind: 'mole', atMs: 3000 + i * 2900 });
  for (let i = 0; i < Math.floor((n - 3) / 2); i++) spawns.push({ kind: 'snail', atMs: 5000 + i * 3400 });
  const swarms = n >= 12 ? 2 : n >= 6 ? 1 : 0;
  for (let w = 0; w < swarms; w++) {
    for (let i = 0; i < 6 + Math.floor(n / 2); i++) spawns.push({ kind: 'aphid', atMs: 6000 + w * 9000 + i * 140 });
  }
  if (n % BOSS_EVERY === 0) spawns.push({ kind: 'queen', atMs: 1500 });
  spawns.sort((a, b) => a.atMs - b.atMs);
  return { spawns, hpScale: (1 + 0.12 * (n - 1)) * PEST_HP_SCALE };
}

/** How many of each pest wave `n` brings, counted from `waveFor`; shown in the wave preview. */
export function waveCounts(n: number): Record<PestKind, number> {
  const counts = Object.fromEntries(PESTS.map((kind) => [kind, 0])) as Record<PestKind, number>;
  for (const spawn of waveFor(n).spawns) counts[spawn.kind]++;
  return counts;
}

/** Sap for clearing wave `n`. */
export const waveBonus = (n: number) => 10 + 5 * n;

/** What a new garden starts with. */
export const START = { sap: 60, heart: 10 };
