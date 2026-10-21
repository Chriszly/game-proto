// The golems you can grow, the pests that come for the Heartwood, and the waves they come in.
// Names and texts are keys of `i18n/en.ts`, shown with `t`.
import { byDifficulty } from '../../../../shared/settings';
import type { TextKey } from '../i18n';

export const GOLEMS = ['pebble', 'moss', 'thorn'] as const;
export type GolemKind = (typeof GOLEMS)[number];
/** What a seed card plants: a golem on soil, or a hedge on the path. */
export const SEEDS = [...GOLEMS, 'hedge'] as const;
export type SeedKind = (typeof SEEDS)[number];

export interface GolemInfo {
  name: TextKey;
  /** Its name inside a sentence. */
  lower: TextKey;
  /** Its name on two lines, for a tall seed card. */
  card: TextKey;
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
  blurb: TextKey;
}

export const GOLEM_INFO: Record<GolemKind, GolemInfo> = {
  pebble: {
    name: 'pebbleName',
    lower: 'pebbleLower',
    card: 'pebbleCard',
    cost: 30,
    growMs: 3000,
    damage: 7,
    range: 110,
    cooldownMs: 700,
    blurb: 'pebbleBlurb',
  },
  moss: {
    name: 'mossName',
    lower: 'mossLower',
    card: 'mossCard',
    cost: 50,
    growMs: 4000,
    damage: 3,
    range: 140,
    cooldownMs: 800,
    slow: { factor: 0.5, ms: 1500 },
    blurb: 'mossBlurb',
  },
  thorn: {
    name: 'thornName',
    lower: 'thornLower',
    card: 'thornCard',
    cost: 60,
    growMs: 4000,
    damage: 5,
    range: 80,
    cooldownMs: 600,
    area: true,
    locked: true,
    blurb: 'thornBlurb',
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

/** The forms a golem can take at level `MAX_LEVEL`: two per kind, and the raise to 3 picks one. */
export const FORMS = ['boulder', 'sling', 'bog', 'spore', 'bramble', 'barb'] as const;
export type FormKind = (typeof FORMS)[number];

export interface FormInfo {
  /** The golem kind it is a form of. */
  of: GolemKind;
  name: TextKey;
  blurb: TextKey;
  /** Multiplies the level-3 damage. */
  damage?: number;
  /** Added to the level-3 reach, in pixels. */
  range?: number;
  /** Multiplies the time between throws. */
  cooldown?: number;
  /** Replaces the golem's slow. */
  slow?: { factor: number; ms: number };
  /** Hits every pest within reach at once. */
  area?: boolean;
  /** Its hit also lands, at half strength, on every other pest within this many pixels of the target. */
  splash?: number;
  /** Its hits ignore armour. */
  pierce?: boolean;
  /** The form's colour, for its level bead and badge. */
  colour: number;
}

export const FORM_INFO: Record<FormKind, FormInfo> = {
  boulder: { of: 'pebble', name: 'boulderName', blurb: 'boulderBlurb', damage: 2, cooldown: 1.6, splash: 44, colour: 0x8a8680 },
  sling: { of: 'pebble', name: 'slingName', blurb: 'slingBlurb', damage: 0.8, cooldown: 0.55, range: 50, colour: 0xf2c44a },
  bog: { of: 'moss', name: 'bogName', blurb: 'bogBlurb', slow: { factor: 0.25, ms: 3000 }, colour: 0x3a6a8a },
  spore: { of: 'moss', name: 'sporeName', blurb: 'sporeBlurb', area: true, damage: 0.7, colour: 0xb0d860 },
  bramble: { of: 'thorn', name: 'brambleName', blurb: 'brambleBlurb', range: 60, colour: 0x6fae4a },
  barb: { of: 'thorn', name: 'barbName', blurb: 'barbBlurb', damage: 1.5, pierce: true, colour: 0xf2a6c8 },
};

/** The two forms a golem of `kind` can take at level 3. */
export const formsOf = (kind: GolemKind) => FORMS.filter((form) => FORM_INFO[form].of === kind);

/** How a golem picks its target, among the pests within reach. */
export const TARGETS = ['first', 'strongest', 'weakest', 'flyers'] as const;
export type Target = (typeof TARGETS)[number];
export const TARGET_INFO: Record<Target, { name: TextKey; blurb: TextKey }> = {
  first: { name: 'firstName', blurb: 'firstBlurb' },
  strongest: { name: 'strongestName', blurb: 'strongestBlurb' },
  weakest: { name: 'weakestName', blurb: 'weakestBlurb' },
  flyers: { name: 'flyersName', blurb: 'flyersBlurb' },
};

/** What a golem throws with at its level and form. */
export interface GolemStats {
  damage: number;
  range: number;
  cooldownMs: number;
  slow?: { factor: number; ms: number };
  area: boolean;
  splash: number;
  pierce: boolean;
}

/**
 * A golem's stats at its level: each level adds 60% damage and 12 pixels of reach, and at level 3
 * its form changes what it does.
 */
export function golemStats(kind: GolemKind, level: number, form: FormKind | null = null): GolemStats {
  const info = GOLEM_INFO[kind];
  const f = form && level >= MAX_LEVEL ? FORM_INFO[form] : undefined;
  return {
    damage: info.damage * (1 + 0.6 * (level - 1)) * (f?.damage ?? 1),
    range: info.range + 12 * (level - 1) + (f?.range ?? 0),
    cooldownMs: info.cooldownMs * (f?.cooldown ?? 1),
    slow: f?.slow ?? info.slow,
    area: !!(info.area || f?.area),
    splash: f?.splash ?? 0,
    pierce: !!f?.pierce,
  };
}

/** A hedge: a cheap seed for a path cell that pests must chew through before they walk on. */
export const HEDGE = { name: 'hedgeName' as TextKey, cost: 15, hp: 60 };
/** Health a chewing pest takes off a hedge every second, per leaf it bites. */
export const CHEW_PER_BITE = 6;

/**
 * Compost: from wave `fromWave`, clearing a wave also pays `rate` of the sap still unspent, at most
 * `cap`.
 */
export const COMPOST = { fromWave: 3, rate: 0.1, cap: 30 };

/** The wave whose clearing is a garden's harvest: it earns stars by the leaves kept, then goes on endless. */
export const HARVEST_WAVE = 30;
/** Leaves the Heartwood must still have at the harvest for one, two and three stars. */
export const STAR_LEAVES = [1, 6, 10];
/** Stars a harvest earns with `heart` leaves left. */
export const harvestStars = (heart: number) => STAR_LEAVES.filter((leaves) => heart >= leaves).length;

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
  /** Flies: over hedges, and first in a golem's 'flyers' targeting. */
  flies?: boolean;
}

export const PEST_INFO: Record<PestKind, PestInfo> = {
  beetle: { hp: 20, speed: 40, bounty: 5, bite: 1 },
  slug: { hp: 50, speed: 24, bounty: 9, bite: 2 },
  crow: { hp: 14, speed: 72, bounty: 6, bite: 1, flies: true },
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
 * waves also get tougher, 12% more health per wave. A thorny garden with the 'crows' twist doubles the crows.
 */
export function waveFor(n: number, twist: Twist | null = null): { spawns: Spawn[]; hpScale: number } {
  const spawns: Spawn[] = [];
  const beetles = 6 + 2 * n;
  for (let i = 0; i < beetles; i++) spawns.push({ kind: 'beetle', atMs: i * 1100 });
  for (let i = 0; i < n - 1; i++) spawns.push({ kind: 'slug', atMs: 2000 + i * 2600 });
  for (let i = 0; i < 2 * (n - 2); i++) spawns.push({ kind: 'crow', atMs: 4000 + i * 1500 });
  // A thorny garden's crows come in pairs.
  if (twist === 'crows') for (let i = 0; i < 2 * (n - 2); i++) spawns.push({ kind: 'crow', atMs: 4700 + i * 1500 });
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
export function waveCounts(n: number, twist: Twist | null = null): Record<PestKind, number> {
  const counts = Object.fromEntries(PESTS.map((kind) => [kind, 0])) as Record<PestKind, number>;
  for (const spawn of waveFor(n, twist).spawns) counts[spawn.kind]++;
  return counts;
}

/** Sap for clearing wave `n`. */
export const waveBonus = (n: number) => 10 + 5 * n;

/** What a new garden starts with. */
export const START = { sap: 60, heart: 10 };

/**
 * Regrowing a leaf (GG12): between waves, a tap on the Heartwood buys back one lost leaf for
 * `base` sap, `step` more for each leaf already regrown in this garden.
 */
export const REGROW = { base: 25, step: 25 };
/** What regrowing the next leaf costs, after `regrown` leaves this garden. */
export const regrowCost = (regrown: number) => REGROW.base + REGROW.step * regrown;

/** Garden boons (GG11), one picked from three after each Queen Slug wave. They last the garden. */
export const BOONS = ['moss', 'sun', 'leaf', 'hedge', 'pebble', 'compost'] as const;
export type Boon = (typeof BOONS)[number];
export const BOON_INFO: Record<Boon, { name: TextKey; blurb: TextKey }> = {
  moss: { name: 'longMossName', blurb: 'longMossBlurb' },
  sun: { name: 'sunnyRowName', blurb: 'sunnyRowBlurb' },
  leaf: { name: 'newGrowthName', blurb: 'newGrowthBlurb' },
  hedge: { name: 'thickHedgesName', blurb: 'thickHedgesBlurb' },
  pebble: { name: 'sharpRocksName', blurb: 'sharpRocksBlurb' },
  compost: { name: 'richCompostName', blurb: 'richCompostBlurb' },
};
/** What each boon does, in numbers: each pick of it adds this much again. */
export const BOON = { mossSlow: 0.5, sunReach: 20, leaves: 2, hedgeHp: 0.5, pebbleDamage: 0.2, compostCap: 15 };
/**
 * The three boons offered after the `nth` Queen Slug (1 for wave 10): two sets of three, in turn.
 * With the 'hedges' twist, where no hedge can be planted, Long moss takes Thick hedges' place.
 */
export const boonOffer = (nth: number, twist: Twist | null = null): Boon[] =>
  BOONS.slice(((nth - 1) % 2) * 3, ((nth - 1) % 2) * 3 + 3).map((b) => (b === 'hedge' && twist === 'hedges' ? 'moss' : b));

/**
 * Thorny variants (GG13): three stars on a garden unlock its thorny variant, played with one twist
 * (`GARDEN_TWISTS`, in GARDENS order). Its harvest at wave HARVEST_WAVE wins the garden's laurel.
 */
export const TWISTS = ['hedges', 'crows', 'sap'] as const;
export type Twist = (typeof TWISTS)[number];
export const TWIST_INFO: Record<Twist, { name: TextKey }> = {
  hedges: { name: 'noHedgesName' },
  crows: { name: 'doubleCrowsName' },
  sap: { name: 'leanStartName' },
};
export const GARDEN_TWISTS: Twist[] = ['hedges', 'crows', 'sap'];
/** Stars on a garden that unlock its thorny variant. */
export const THORNY_STARS = 3;
/** Sap a garden with the 'sap' twist starts with. */
export const LEAN_SAP = 30;
