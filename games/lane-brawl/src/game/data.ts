// The map, champions, items and balance numbers of Lane Brawl. Plain data, free of Phaser.

export type Team = 'blue' | 'red';
export type LaneId = 'top' | 'mid' | 'bottom';
export interface Vec {
  x: number;
  y: number;
}

export const WORLD = { w: 2400, h: 1600 };

/** The two Nexuses: the blue team (the player's) bottom-left, the red team top-right. */
export const BASE: Record<Team, Vec> = { blue: { x: 260, y: 1340 }, red: { x: 2140, y: 260 } };

/** Each lane runs from the blue Nexus to the red one. Red walks the same lane backwards. */
export const LANES: Record<LaneId, Vec[]> = {
  top: [BASE.blue, { x: 260, y: 260 }, BASE.red],
  mid: [BASE.blue, BASE.red],
  bottom: [BASE.blue, { x: 2140, y: 1340 }, BASE.red],
};

export interface TowerSpot {
  team: Team;
  lane: LaneId;
  x: number;
  y: number;
}
/** Two towers per team on each lane, the blue ones closest to the blue Nexus. */
export const TOWERS: TowerSpot[] = [
  { team: 'blue', lane: 'top', x: 260, y: 880 },
  { team: 'blue', lane: 'top', x: 260, y: 540 },
  { team: 'blue', lane: 'mid', x: 824, y: 1016 },
  { team: 'blue', lane: 'mid', x: 542, y: 1178 },
  { team: 'blue', lane: 'bottom', x: 700, y: 1340 },
  { team: 'blue', lane: 'bottom', x: 1020, y: 1340 },
  { team: 'red', lane: 'top', x: 1380, y: 260 },
  { team: 'red', lane: 'top', x: 1700, y: 260 },
  { team: 'red', lane: 'mid', x: 1576, y: 584 },
  { team: 'red', lane: 'mid', x: 1858, y: 422 },
  { team: 'red', lane: 'bottom', x: 2140, y: 720 },
  { team: 'red', lane: 'bottom', x: 2140, y: 1060 },
];

/** Neutral jungle camps, two on each side of the map. */
export const CAMPS: Vec[] = [
  { x: 560, y: 820 },
  { x: 900, y: 1200 },
  { x: 1840, y: 780 },
  { x: 1500, y: 400 },
];

export const NEXUS_HP = 3000;
export const NEXUS_RADIUS = 48;
export const TOWER = { hp: 1400, dmg: 55, attackMs: 1000, range: 300, radius: 26, gold: 150 };
export const CAMP = { hp: 600, dmg: 28, attackMs: 1200, range: 150, radius: 26, gold: 80, xp: 120, respawnMs: 60_000 };
export const MINION = { hp: 260, dmg: 12, attackMs: 1000, range: 40, radius: 12, speed: 75, aggro: 200, gold: 19, xp: 30 };
/** Minions of a team leave their Nexus every wave, 3 per lane. */
export const WAVE_MS = 25_000;

export const START_GOLD = 400;
/** Gold every champion earns just by being alive. */
export const GOLD_PER_SEC = 1.5;
/** Champion kills pay gold and XP to the killer. */
export const KILL = { gold: 300, xp: 200 };
/** XP needed to reach each level: index 0 is level 1. */
export const XP_FOR_LEVEL = [0, 280, 660, 1140, 1720];
export const MAX_LEVEL = XP_FOR_LEVEL.length;
/** Minion and camp XP reaches champions within this distance. */
export const XP_RANGE = 900;

/** How far a champion looks for an enemy to fight, and how far a minion does. */
export const CHAMP_AGGRO = 360;
export const RESPAWN_BASE_MS = 6000;
export const RESPAWN_PER_LEVEL_MS = 1000;

export type AbilityKey = 'Q' | 'W' | 'E' | 'R';
export const ABILITY_KEYS: AbilityKey[] = ['Q', 'W', 'E', 'R'];
/**
 * How an ability works. `burst` hits enemies around a point (or around the caster when its range is
 * 0), `bolt` fires projectiles, `dash` moves the caster and hits around where it lands, and `ally`
 * heals and shields allied champions around a point.
 */
export type AbilityKind = 'burst' | 'bolt' | 'dash' | 'ally';

export interface AbilityDef {
  key: AbilityKey;
  name: string;
  kind: AbilityKind;
  /** Cooldown in ms. */
  cd: number;
  /** burst and ally: how far the centre may be from the caster (0 centres on the caster). bolt and dash: distance. */
  range: number;
  /** Pixels around the centre (burst, ally) or where a dash lands (dash). */
  radius?: number;
  damage?: number;
  heal?: number;
  shield?: number;
  /** Slow in ms for champions and minions hit. */
  slow?: number;
  /** Bolt speed in pixels per second. */
  speed?: number;
  /** Hit distance around a bolt. */
  width?: number;
  /** A bolt goes through every enemy on its way. */
  pierce?: boolean;
  /** Bolts fired at once, spread over `spread` radians. */
  count?: number;
  spread?: number;
  /** Champion level needed to cast. */
  level: number;
}

export type Shape = 'hex' | 'tri' | 'square' | 'diamond' | 'circle';

export interface ChampionDef {
  id: string;
  name: string;
  role: string;
  color: string;
  shape: Shape;
  hp: number;
  hpPerLevel: number;
  dmg: number;
  dmgPerLevel: number;
  armor: number;
  range: number;
  speed: number;
  attackMs: number;
  /** Q, W, E, R in that order. */
  abilities: AbilityDef[];
}

export const CHAMPIONS: ChampionDef[] = [
  {
    id: 'warden',
    name: 'Warden',
    role: 'Tank',
    color: '#c98b3b',
    shape: 'hex',
    hp: 620,
    hpPerLevel: 95,
    dmg: 52,
    dmgPerLevel: 4,
    armor: 6,
    range: 110,
    speed: 115,
    attackMs: 900,
    abilities: [
      { key: 'Q', name: 'Slam', kind: 'burst', cd: 6000, range: 0, radius: 170, damage: 80, slow: 1500, level: 1 },
      { key: 'W', name: 'Bulwark', kind: 'ally', cd: 10000, range: 350, radius: 120, shield: 130, level: 1 },
      { key: 'E', name: 'Charge', kind: 'dash', cd: 9000, range: 280, radius: 110, damage: 60, level: 1 },
      { key: 'R', name: 'Last Stand', kind: 'burst', cd: 60000, range: 0, radius: 240, damage: 160, slow: 2000, level: 3 },
    ],
  },
  {
    id: 'blade',
    name: 'Blade',
    role: 'Assassin',
    color: '#8e6cf0',
    shape: 'tri',
    hp: 540,
    hpPerLevel: 80,
    dmg: 62,
    dmgPerLevel: 4,
    armor: 3,
    range: 120,
    speed: 150,
    attackMs: 700,
    abilities: [
      { key: 'Q', name: 'Dash Strike', kind: 'dash', cd: 5000, range: 260, radius: 90, damage: 90, level: 1 },
      { key: 'W', name: 'Whirl', kind: 'burst', cd: 8000, range: 0, radius: 130, damage: 70, level: 1 },
      { key: 'E', name: 'Shadow Step', kind: 'dash', cd: 12000, range: 240, level: 1 },
      { key: 'R', name: 'Execute', kind: 'burst', cd: 60000, range: 280, radius: 60, damage: 240, level: 3 },
    ],
  },
  {
    id: 'archer',
    name: 'Archer',
    role: 'Marksman',
    color: '#e6c03a',
    shape: 'square',
    hp: 480,
    hpPerLevel: 70,
    dmg: 58,
    dmgPerLevel: 3.5,
    armor: 2,
    range: 420,
    speed: 135,
    attackMs: 800,
    abilities: [
      { key: 'Q', name: 'Piercing Arrow', kind: 'bolt', cd: 4500, range: 700, speed: 900, width: 26, damage: 90, pierce: true, level: 1 },
      { key: 'W', name: 'Volley', kind: 'bolt', cd: 9000, range: 600, speed: 800, width: 24, damage: 45, count: 3, spread: 0.2, level: 1 },
      { key: 'E', name: 'Roll', kind: 'dash', cd: 10000, range: 180, level: 1 },
      { key: 'R', name: 'Arrow Rain', kind: 'burst', cd: 60000, range: 650, radius: 230, damage: 180, level: 3 },
    ],
  },
  {
    id: 'mage',
    name: 'Mage',
    role: 'Burst',
    color: '#3fd0d9',
    shape: 'diamond',
    hp: 440,
    hpPerLevel: 60,
    dmg: 42,
    dmgPerLevel: 3,
    armor: 1,
    range: 400,
    speed: 130,
    attackMs: 900,
    abilities: [
      { key: 'Q', name: 'Fireball', kind: 'bolt', cd: 4000, range: 650, speed: 700, width: 30, damage: 85, level: 1 },
      { key: 'W', name: 'Frost Nova', kind: 'burst', cd: 9000, range: 0, radius: 170, damage: 50, slow: 1800, level: 1 },
      { key: 'E', name: 'Blink', kind: 'dash', cd: 12000, range: 230, level: 1 },
      { key: 'R', name: 'Meteor', kind: 'burst', cd: 60000, range: 600, radius: 220, damage: 220, level: 3 },
    ],
  },
  {
    id: 'priest',
    name: 'Priest',
    role: 'Support',
    color: '#6fe07f',
    shape: 'circle',
    hp: 470,
    hpPerLevel: 65,
    dmg: 30,
    dmgPerLevel: 2.5,
    armor: 2,
    range: 380,
    speed: 135,
    attackMs: 1000,
    abilities: [
      { key: 'Q', name: 'Smite', kind: 'bolt', cd: 4000, range: 600, speed: 800, width: 26, damage: 60, level: 1 },
      { key: 'W', name: 'Mend', kind: 'ally', cd: 7000, range: 500, radius: 160, heal: 120, level: 1 },
      { key: 'E', name: 'Ward', kind: 'ally', cd: 10000, range: 500, radius: 120, shield: 110, level: 1 },
      { key: 'R', name: 'Sanctuary', kind: 'ally', cd: 60000, range: 400, radius: 280, heal: 90, shield: 60, level: 3 },
    ],
  },
];

export interface ItemDef {
  id: string;
  name: string;
  cost: number;
  /** Flat bonuses to a champion's stats. */
  dmg?: number;
  armor?: number;
  hp?: number;
  speed?: number;
  /** Percent faster attacks. */
  atk?: number;
  /** Percent shorter ability cooldowns. */
  cdr?: number;
}

/** Bought at the shop by a champion standing near its Nexus. Each item can be bought once. */
export const ITEMS: ItemDef[] = [
  { id: 'sword', name: 'Long Sword', cost: 350, dmg: 12 },
  { id: 'mail', name: 'Chain Mail', cost: 350, armor: 6, hp: 90 },
  { id: 'boots', name: 'Swift Boots', cost: 300, speed: 25 },
  { id: 'belt', name: "Giant's Belt", cost: 400, hp: 200 },
  { id: 'thorns', name: 'Thornmail', cost: 420, armor: 14 },
  { id: 'bow', name: 'Rapid Bow', cost: 400, atk: 25 },
  { id: 'cloak', name: 'Cloak of Haste', cost: 350, cdr: 15 },
  { id: 'blade', name: 'Brutal Edge', cost: 650, dmg: 24 },
];

/** How close a champion must stand to its Nexus to shop. */
export const SHOP_RANGE = 700;

/** Which lane each AI champion walks, in roster order without the player's champion. */
export const ALLY_LANES: LaneId[] = ['top', 'mid', 'bottom', 'mid'];
export const ENEMY_LANES: LaneId[] = ['top', 'mid', 'bottom', 'mid', 'top'];

/** The colour of each side's rings, bolts and lines. */
export const SIDE_COLOR = { blue: '#3d8bfd', red: '#e0553f', neutral: '#f4d35e' } as const;
