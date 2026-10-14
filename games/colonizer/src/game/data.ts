// Balance numbers and rosters for Colonizer. Times are in milliseconds, speeds in tiles per second,
// ranges and sight in tiles. Only this file and the other files in src/game/ know the numbers.

export const TILE = 32;
export const MAP_SIZE = 128;

export const RESOURCES = ['wood', 'food', 'ore'] as const;
export type Resource = (typeof RESOURCES)[number];
export type Cost = Partial<Record<Resource, number>>;

export const FACTION_IDS = ['ember', 'tide', 'thorn'] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export interface Faction {
  id: FactionId;
  name: string;
  blurb: string;
  cloth: number;
  clothDark: number;
  trim: number;
  horse: number;
}

export const FACTIONS: Record<FactionId, Faction> = {
  ember: {
    id: 'ember',
    name: 'Ember Legion',
    blurb: 'Hard-hitting militia and knights. Strong in a head-on fight.',
    cloth: 0xb8432f,
    clothDark: 0x7a2a1d,
    trim: 0xf0a040,
    horse: 0x8b5a2b,
  },
  tide: {
    id: 'tide',
    name: 'Tide Coven',
    blurb: 'Spearmen that punish cavalry, slingers and fast riders.',
    cloth: 0x2f6fb0,
    clothDark: 0x1d4672,
    trim: 0x9fd3f0,
    horse: 0xc9d6e3,
  },
  thorn: {
    id: 'thorn',
    name: 'Thorn Grove',
    blurb: 'Tough brutes, long-range hunters and quick stalkers.',
    cloth: 0x3f8a3a,
    clothDark: 0x25552a,
    trim: 0xc7e07a,
    horse: 0x4a3526,
  },
};

export type Role = 'villager' | 'melee' | 'ranged' | 'cavalry';

export type BuildingId =
  | 'town'
  | 'house'
  | 'farm'
  | 'lumber'
  | 'mine'
  | 'barracks'
  | 'range'
  | 'stable'
  | 'academy'
  | 'watchtower';

export interface UnitDef {
  id: string;
  faction: FactionId | 'neutral';
  role: Role;
  name: string;
  cost: Cost;
  time: number;
  hp: number;
  dmg: number;
  range: number;
  speed: number;
  sight: number;
  cooldown: number;
  trainer: BuildingId;
  /** Extra damage against cavalry, for units that counter riders. */
  vsCavalry?: number;
}

export const UNITS: Record<string, UnitDef> = {
  villager: {
    id: 'villager', faction: 'neutral', role: 'villager', name: 'Villager',
    cost: { food: 50 }, time: 8000, hp: 25, dmg: 2, range: 1, speed: 2.2, sight: 5, cooldown: 1200, trainer: 'town',
  },
  'ember-militia': {
    id: 'ember-militia', faction: 'ember', role: 'melee', name: 'Militia',
    cost: { food: 50, wood: 30 }, time: 9000, hp: 60, dmg: 6, range: 1, speed: 2, sight: 5, cooldown: 1000, trainer: 'barracks',
  },
  'ember-archer': {
    id: 'ember-archer', faction: 'ember', role: 'ranged', name: 'Archer',
    cost: { food: 30, wood: 50 }, time: 10000, hp: 35, dmg: 6, range: 4.5, speed: 2.1, sight: 6, cooldown: 1200, trainer: 'range',
  },
  'ember-knight': {
    id: 'ember-knight', faction: 'ember', role: 'cavalry', name: 'Knight',
    cost: { food: 70, ore: 40 }, time: 14000, hp: 90, dmg: 8, range: 1, speed: 3.2, sight: 6, cooldown: 1100, trainer: 'stable',
  },
  'tide-spearman': {
    id: 'tide-spearman', faction: 'tide', role: 'melee', name: 'Spearman',
    cost: { food: 50, wood: 35 }, time: 9000, hp: 55, dmg: 6, range: 1, speed: 2, sight: 5, cooldown: 1000, trainer: 'barracks',
    vsCavalry: 2,
  },
  'tide-slinger': {
    id: 'tide-slinger', faction: 'tide', role: 'ranged', name: 'Slinger',
    cost: { food: 30, wood: 50 }, time: 10000, hp: 30, dmg: 6, range: 5, speed: 2.1, sight: 6, cooldown: 1100, trainer: 'range',
  },
  'tide-rider': {
    id: 'tide-rider', faction: 'tide', role: 'cavalry', name: 'Rider',
    cost: { food: 60, ore: 30 }, time: 13000, hp: 70, dmg: 7, range: 1, speed: 3.6, sight: 6, cooldown: 1100, trainer: 'stable',
  },
  'thorn-brute': {
    id: 'thorn-brute', faction: 'thorn', role: 'melee', name: 'Brute',
    cost: { food: 60, wood: 40 }, time: 11000, hp: 85, dmg: 5, range: 1, speed: 1.7, sight: 5, cooldown: 1100, trainer: 'barracks',
  },
  'thorn-hunter': {
    id: 'thorn-hunter', faction: 'thorn', role: 'ranged', name: 'Hunter',
    cost: { food: 30, wood: 60 }, time: 10000, hp: 30, dmg: 7, range: 6, speed: 2.2, sight: 7, cooldown: 1300, trainer: 'range',
  },
  'thorn-stalker': {
    id: 'thorn-stalker', faction: 'thorn', role: 'cavalry', name: 'Stalker',
    cost: { food: 60, ore: 30 }, time: 13000, hp: 60, dmg: 8, range: 1, speed: 3.4, sight: 6, cooldown: 1000, trainer: 'stable',
  },
};

/** The unit a faction trains for each combat role; villagers are shared. */
export function unitFor(faction: FactionId, role: Role): UnitDef {
  const def = Object.values(UNITS).find((u) => u.faction === faction && u.role === role);
  if (!def) throw new Error(`no ${role} for ${faction}`);
  return def;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  cost: Cost;
  /** Build time for one builder, in ms. */
  time: number;
  w: number;
  h: number;
  hp: number;
  sight: number;
  /** Population this building adds once it is finished. */
  pop?: number;
  /** Resources a villager can drop off here. */
  drops?: Resource[] | 'all';
  /** Roles this building trains. */
  trains?: Role[];
  research?: boolean;
  /** A farm: an endless food source a villager can gather from. */
  farm?: boolean;
  tower?: { dmg: number; range: number; cooldown: number };
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  town: { id: 'town', name: 'Town Center', cost: {}, time: 0, w: 4, h: 4, hp: 2000, sight: 8, pop: 10, drops: 'all', trains: ['villager'], tower: { dmg: 10, range: 6, cooldown: 1500 } },
  house: { id: 'house', name: 'House', cost: { wood: 50 }, time: 25000, w: 2, h: 2, hp: 400, sight: 3, pop: 6 },
  farm: { id: 'farm', name: 'Farm', cost: { wood: 60 }, time: 15000, w: 2, h: 2, hp: 300, sight: 2, farm: true },
  lumber: { id: 'lumber', name: 'Lumber Camp', cost: { wood: 80 }, time: 20000, w: 2, h: 2, hp: 300, sight: 3, drops: ['wood'] },
  mine: { id: 'mine', name: 'Mining Camp', cost: { wood: 80 }, time: 20000, w: 2, h: 2, hp: 300, sight: 3, drops: ['ore'] },
  barracks: { id: 'barracks', name: 'Barracks', cost: { wood: 150 }, time: 40000, w: 3, h: 3, hp: 700, sight: 4, trains: ['melee'] },
  range: { id: 'range', name: 'Archery Range', cost: { wood: 170 }, time: 40000, w: 3, h: 3, hp: 650, sight: 4, trains: ['ranged'] },
  stable: { id: 'stable', name: 'Stable', cost: { wood: 180 }, time: 45000, w: 3, h: 3, hp: 650, sight: 4, trains: ['cavalry'] },
  academy: { id: 'academy', name: 'Academy', cost: { wood: 150, food: 100 }, time: 40000, w: 3, h: 3, hp: 700, sight: 4, research: true },
  watchtower: { id: 'watchtower', name: 'Watchtower', cost: { wood: 125, ore: 50 }, time: 30000, w: 2, h: 2, hp: 900, sight: 7, tower: { dmg: 12, range: 7, cooldown: 1500 } },
};

export const BUILD_ORDER: BuildingId[] = ['house', 'farm', 'lumber', 'mine', 'barracks', 'range', 'stable', 'academy', 'watchtower'];

export interface TechDef {
  id: string;
  name: string;
  /** Which building researches it: the Academy, or the Town Center for the Age II upgrade. */
  at: 'academy' | 'town';
  cost: Cost;
  time: number;
  /** Needs Age II first. */
  age2?: boolean;
  /** An age advance: Age II needs nothing more, Age III also needs the three deeds (DEEDS). */
  advance?: 2 | 3;
}

export const TECHS: Record<string, TechDef> = {
  axes: { id: 'axes', name: 'Axes', at: 'academy', cost: { wood: 100, food: 50 }, time: 30000 },
  baskets: { id: 'baskets', name: 'Baskets', at: 'academy', cost: { food: 120, wood: 50 }, time: 30000 },
  picks: { id: 'picks', name: 'Picks', at: 'academy', cost: { wood: 150, food: 100 }, time: 30000 },
  ironworks: { id: 'ironworks', name: 'Ironworks', at: 'academy', cost: { food: 150, ore: 50 }, time: 35000 },
  fletching: { id: 'fletching', name: 'Fletching', at: 'academy', cost: { food: 100, wood: 100 }, time: 35000 },
  age2: { id: 'age2', name: 'Age II', at: 'town', cost: { food: 400, wood: 200 }, time: 50000, advance: 2 },
  age3: { id: 'age3', name: 'Age III', at: 'town', cost: { food: 500, wood: 300, ore: 200 }, time: 60000, advance: 3 },
  stirrups: { id: 'stirrups', name: 'Stirrups', at: 'academy', cost: { ore: 100, food: 100 }, time: 40000, age2: true },
  bodkin: { id: 'bodkin', name: 'Bodkin', at: 'academy', cost: { wood: 150, ore: 50 }, time: 40000, age2: true },
};

/** Game time for a unit to gather one resource, in ms. */
export const GATHER_MS: Record<Resource, number> = { wood: 1000, food: 1000, ore: 1300 };
export const CARRY = 10;

export const START = { wood: 200, food: 200, ore: 100 } as const;
export const START_VILLAGERS = 4;

/**
 * Age III is earned, not only bought: the Town Center can research it once these three deeds are
 * done. The sim keeps each player's progress in `Player.deeds`.
 */
export const DEEDS = [
  { id: 'age2', name: 'Reach Age II' },
  { id: 'army', name: 'Field 14 soldiers' },
  { id: 'raid', name: 'Repel a raid' },
] as const;
export type DeedId = (typeof DEEDS)[number]['id'];
/** Soldiers alive at once for the army deed (the AI raids with as many). */
export const ARMY_DEED = 14;
/** What Age III gives: extra damage for every soldier. */
export const AGE3_DAMAGE = 2;

/** The one-time pick offered when a player reaches Age II. */
export const BOONS = {
  shieldwall: { id: 'shieldwall', name: 'Shieldwall', text: 'Your melee infantry take 20% less damage' },
  harvest: { id: 'harvest', name: 'Harvest Rites', text: 'Farms gather 20% faster' },
} as const;
export type BoonId = keyof typeof BOONS;
/** Move speed for cavalry under Stirrups (Academy tech, after Age II). */
export const STIRRUPS_SPEED = 1.2;
/** Damage a melee unit takes under Shieldwall. */
export const SHIELDWALL_TAKEN = 0.8;
/** Gather speed on farms under Harvest Rites. */
export const HARVEST_RITES = 1.2;
