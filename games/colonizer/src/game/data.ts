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

/**
 * Villagers and trade carts are civil; melee, ranged, cavalry, siege (the ram) and the faction's
 * champion are soldiers. `isSoldier` and `isCivil` are the two sides of that line.
 */
export type Role = 'villager' | 'melee' | 'ranged' | 'cavalry' | 'cart' | 'siege' | 'champion';
export const isCivil = (role: Role) => role === 'villager' || role === 'cart';
export const isSoldier = (role: Role) => !isCivil(role);
/** Soldiers that earn veteran ranks by kills: every soldier but the ram. */
export const earnsRanks = (role: Role) => isSoldier(role) && role !== 'siege';

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
  | 'watchtower'
  | 'forge'
  | 'dock'
  | 'grove'
  | 'wall'
  | 'gate'
  | 'market'
  | 'monument';

export interface UnitDef {
  id: string;
  /** `neutral` units (villagers) belong to every faction; `wild` ones guard the neutral camps. */
  faction: FactionId | 'neutral' | 'wild';
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
  /** The age a player needs before training it. */
  age?: 2 | 3;
  /** At most this many alive or in training per player (the champion). */
  limit?: number;
  /** A champion's gift: a damage aura for nearby soldiers, far sight, or healing nearby units. */
  gift?: 'aura' | 'sight' | 'heal';
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
  // Trained at the Market (Age II): drives to a trading post in the middle of the map and back for ore.
  cart: {
    id: 'cart', faction: 'neutral', role: 'cart', name: 'Trade Cart',
    cost: { wood: 80, food: 40 }, time: 12000, hp: 45, dmg: 0, range: 1, speed: 1.9, sight: 4, cooldown: 1000, trainer: 'market',
  },
  // The siege ram (Age II, Barracks): slow, smashes buildings, walls and gates, and can't hurt a unit.
  ram: {
    id: 'ram', faction: 'neutral', role: 'siege', name: 'Ram',
    cost: { wood: 160, ore: 60 }, time: 22000, hp: 220, dmg: 32, range: 1, speed: 1.05, sight: 4, cooldown: 2200, trainer: 'barracks', age: 2,
  },
  // Each faction's champion (Age III, Town Center, one at a time).
  'ember-warlord': {
    id: 'ember-warlord', faction: 'ember', role: 'champion', name: 'Warlord',
    cost: { food: 200, ore: 150 }, time: 30000, hp: 170, dmg: 11, range: 1, speed: 2.1, sight: 7, cooldown: 1100, trainer: 'town', age: 3, limit: 1, gift: 'aura',
  },
  'tide-seer': {
    id: 'tide-seer', faction: 'tide', role: 'champion', name: 'Seer',
    cost: { food: 200, ore: 150 }, time: 30000, hp: 90, dmg: 6, range: 5, speed: 2.2, sight: 14, cooldown: 1200, trainer: 'town', age: 3, limit: 1, gift: 'sight',
  },
  'thorn-druid': {
    id: 'thorn-druid', faction: 'thorn', role: 'champion', name: 'Druid',
    cost: { food: 200, ore: 150 }, time: 30000, hp: 130, dmg: 5, range: 1, speed: 2.1, sight: 7, cooldown: 1200, trainer: 'town', age: 3, limit: 1, gift: 'heal',
  },
  // The guards of the neutral camps (see CAMPS); nobody trains them.
  'wild-brigand': {
    id: 'wild-brigand', faction: 'wild', role: 'melee', name: 'Brigand',
    cost: {}, time: 0, hp: 60, dmg: 5, range: 1, speed: 1.9, sight: 5, cooldown: 1100, trainer: 'town',
  },
  'wild-poacher': {
    id: 'wild-poacher', faction: 'wild', role: 'ranged', name: 'Poacher',
    cost: {}, time: 0, hp: 35, dmg: 5, range: 4.5, speed: 2, sight: 6, cooldown: 1300, trainer: 'town',
  },
};

/** The unit a faction trains for each role; villagers, carts and rams are shared by every faction. */
export function unitFor(faction: FactionId, role: Role): UnitDef {
  const def = Object.values(UNITS).find((u) => (u.faction === faction || u.faction === 'neutral') && u.role === role);
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
  /** Only this faction can build it: each faction has one unique building. */
  faction?: FactionId;
  /** The age a player needs before placing it. */
  age?: 2 | 3;
  /** Must touch water (the Dock). */
  shore?: boolean;
  /** At most this many per player. */
  limit?: number;
  /** A palisade piece, placed by dragging a line; walls and gates are never auto-targeted. */
  palisade?: boolean;
  /** Villagers shelter inside when the town bell rings, up to this many; each adds an arrow to its volleys. */
  shelter?: number;
  /** Swaps wood and food for ore at a moving rate, and trains trade carts. */
  market?: boolean;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  town: { id: 'town', name: 'Town Center', cost: {}, time: 0, w: 4, h: 4, hp: 2000, sight: 8, pop: 10, drops: 'all', trains: ['villager', 'champion'], tower: { dmg: 10, range: 6, cooldown: 1500 }, shelter: 12 },
  house: { id: 'house', name: 'House', cost: { wood: 50 }, time: 25000, w: 2, h: 2, hp: 400, sight: 3, pop: 6 },
  farm: { id: 'farm', name: 'Farm', cost: { wood: 60 }, time: 15000, w: 2, h: 2, hp: 300, sight: 2, farm: true },
  lumber: { id: 'lumber', name: 'Lumber Camp', cost: { wood: 80 }, time: 20000, w: 2, h: 2, hp: 300, sight: 3, drops: ['wood'] },
  mine: { id: 'mine', name: 'Mining Camp', cost: { wood: 80 }, time: 20000, w: 2, h: 2, hp: 300, sight: 3, drops: ['ore'] },
  barracks: { id: 'barracks', name: 'Barracks', cost: { wood: 150 }, time: 40000, w: 3, h: 3, hp: 700, sight: 4, trains: ['melee', 'siege'] },
  range: { id: 'range', name: 'Archery Range', cost: { wood: 170 }, time: 40000, w: 3, h: 3, hp: 650, sight: 4, trains: ['ranged'] },
  stable: { id: 'stable', name: 'Stable', cost: { wood: 180 }, time: 45000, w: 3, h: 3, hp: 650, sight: 4, trains: ['cavalry'] },
  academy: { id: 'academy', name: 'Academy', cost: { wood: 150, food: 100 }, time: 40000, w: 3, h: 3, hp: 700, sight: 4, research: true },
  watchtower: { id: 'watchtower', name: 'Watchtower', cost: { wood: 125, ore: 50 }, time: 30000, w: 2, h: 2, hp: 900, sight: 7, tower: { dmg: 12, range: 7, cooldown: 1500 }, shelter: 5 },
  forge: { id: 'forge', name: 'Forge', cost: { wood: 150, ore: 50 }, time: 35000, w: 3, h: 3, hp: 700, sight: 4, faction: 'ember', limit: 1 },
  dock: { id: 'dock', name: 'Dock', cost: { wood: 140 }, time: 30000, w: 2, h: 2, hp: 500, sight: 5, faction: 'tide', shore: true, limit: 3 },
  grove: { id: 'grove', name: 'Grove', cost: { wood: 100, food: 50 }, time: 30000, w: 2, h: 2, hp: 500, sight: 4, drops: ['wood'], faction: 'thorn', limit: 2 },
  wall: { id: 'wall', name: 'Palisade', cost: { wood: 4 }, time: 2500, w: 1, h: 1, hp: 250, sight: 1, palisade: true },
  gate: { id: 'gate', name: 'Gate', cost: { wood: 25 }, time: 8000, w: 1, h: 1, hp: 450, sight: 2, palisade: true },
  market: { id: 'market', name: 'Market', cost: { wood: 150, food: 50 }, time: 35000, w: 3, h: 3, hp: 600, sight: 4, age: 2, limit: 1, drops: ['ore'], trains: ['cart'], market: true },
  monument: { id: 'monument', name: 'Monument', cost: { wood: 500, food: 300, ore: 400 }, time: 90000, w: 3, h: 3, hp: 2500, sight: 5, age: 3, limit: 1 },
};

/** The build list's first page; the faction's own building comes after these. */
export const BUILD_ORDER: BuildingId[] = ['house', 'farm', 'lumber', 'mine', 'barracks', 'range', 'stable', 'academy', 'watchtower'];
/** The build list's second page. */
export const BUILD_MORE: BuildingId[] = ['wall', 'gate', 'market', 'monument'];
/** Each faction's unique building. */
export const UNIQUE: Record<FactionId, BuildingId> = { ember: 'forge', tide: 'dock', thorn: 'grove' };
/** What each unique building does, for the menu and the panel. */
export const UNIQUE_TEXT: Record<FactionId, string> = {
  ember: 'Forge: soldiers cost 20% less',
  tide: 'Dock: fishes 10 food every 12 s',
  thorn: 'Grove: regrows trees, takes wood',
};
/** Soldier costs with a finished Forge (Ember Legion). */
export const FORGE_COST = 0.8;
/** A finished Dock lands this much food every DOCK_MS (Tide Coven). */
export const DOCK_FOOD = 10;
export const DOCK_MS = 12000;
/** A finished Grove plants a tree within GROVE_RANGE tiles every GROVE_MS, up to GROVE_TREES around it (Thorn Grove). */
export const GROVE_MS = 15000;
export const GROVE_RANGE = 4;
export const GROVE_TREES = 14;

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

/** Units closer than this, in tiles, push each other apart, so armies don't stack on one spot. */
export const UNIT_GAP = 0.55;

/**
 * Neutral camps, guarded by wild Brigands and Poachers. A cache gives its pile once to the first side
 * that stands at it with its guards dead; a relic gives a small lasting bonus to whichever side holds
 * it, and changes hands when the other side stands at it alone.
 */
export const RELICS = {
  plenty: { id: 'plenty', name: 'Relic of Plenty', text: 'Villagers gather 10% faster' },
  valor: { id: 'valor', name: 'Relic of Valor', text: 'Soldiers deal +1 damage' },
  haste: { id: 'haste', name: 'Relic of Haste', text: 'Every unit moves 10% faster' },
} as const;
export type RelicId = keyof typeof RELICS;
export const RELIC_GATHER = 1.1;
export const RELIC_DAMAGE = 1;
export const RELIC_SPEED = 1.1;
/** How close, in tiles from a camp's middle, a unit must stand to claim it. */
export const CLAIM_RANGE = 2.6;
/** A guard walks back to its camp when it strays this far from it. */
export const LEASH = 7;

/**
 * The town bell: villagers within BELL_RANGE tiles of a shelter (the Town Center or a finished
 * Watchtower, up to its `shelter`) run inside, and each adds an arrow of GARRISON_ARROW damage to
 * its volleys until they are sent back to work.
 */
export const BELL_RANGE = 14;
export const GARRISON_ARROW = 3;

/**
 * Veteran ranks: a soldier earns rank I, II and III at these kills, each adding RANK_HP health and
 * RANK_DMG damage.
 */
export const RANK_KILLS = [2, 5, 9] as const;
export const RANK_HP = 10;
export const RANK_DMG = 1;
export const RANK_NAMES = ['', 'Seasoned', 'Veteran', 'Champion'] as const;

/**
 * The Market (Age II) swaps MARKET_LOT wood or food for ore. Buying a lot costs MARKET_BASE ore
 * times the resource's rate, selling one pays MARKET_SELL of that; every buy raises the rate by
 * MARKET_STEP and every sale lowers it, and rates drift back towards 1 by MARKET_DRIFT a second.
 * Trade carts drive to a trading post in the middle of the map and bring TRADE_ORE back each trip.
 */
export const MARKET_LOT = 100;
export const MARKET_BASE = 70;
export const MARKET_SELL = 0.6;
export const MARKET_STEP = 0.12;
export const MARKET_RATE_MIN = 0.4;
export const MARKET_RATE_MAX = 3;
export const MARKET_DRIFT = 0.005;
export const TRADE_ORE = 40;

/** The champions' gifts: the Warlord's aura, the Druid's healing. The Seer's gift is its sight. */
export const AURA_RANGE = 6;
export const AURA_DMG = 2;
export const HEAL_RANGE = 5;
export const HEAL_HP = 3;
export const HEAL_MS = 1500;

/** The Monument (Age III): if it stands this long once built, its owner wins. */
export const MONUMENT_MS = 180000;

/**
 * The AI's raids, paced so the opening is the player's to build: no raid before FIRST_RAID_MS of game time, and RAID_REST_MS between the end of one and the start of the next.
 * A raid has a goal: the first ones go for the player's outlying economy, later ones for a relic the
 * player holds, and from RAID_TOWN_FROM on (or in Age III) for the Town Center. An economy or relic
 * raid sends a party of RAID_PARTY and keeps the rest home; it turns back when half the party has
 * fallen, when its goal is done, or after RAID_MAX_MS.
 */
export const FIRST_RAID_MS = 600000;
export const RAID_REST_MS = 180000;
export const RAID_PARTY = 10;
export const RAID_TOWN_FROM = 3;
export const RAID_MAX_MS = 150000;
/**
 * The player's attacks on the AI's base count as raids too: ASSAULT_MIN or more of the player's
 * soldiers within BELL_RANGE of the AI's Town Center start one, and it is repelled (the AI's raid
 * deed) when they are all gone from ASSAULT_CLEAR tiles of it and at least half of them fell.
 */
export const ASSAULT_MIN = 3;
export const ASSAULT_CLEAR = 20;
