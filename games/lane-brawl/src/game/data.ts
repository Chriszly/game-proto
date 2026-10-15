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
  /** Stun in ms for champions and minions hit (only from upgrades). */
  stun?: number;
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
  /** The full price. A recipe item costs less by the parts it builds from that the buyer owns. */
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
  /** The parts this item builds from: owned ones are used up and knocked off the price. */
  from?: string[];
  /** An active the item adds, cast with its key (see `ACTIVES`). */
  active?: ActiveId;
}

/**
 * Bought at the shop by a champion standing near its Nexus. Each item can be owned once. The first
 * seven are parts (cheap, and the flask), the last five build from them.
 */
export const ITEMS: ItemDef[] = [
  { id: 'sword', name: 'Long Sword', cost: 350, dmg: 12 },
  { id: 'dagger', name: 'Dagger', cost: 300, atk: 15 },
  { id: 'cloth', name: 'Cloth Armor', cost: 300, armor: 6 },
  { id: 'ruby', name: 'Ruby Crystal', cost: 300, hp: 100 },
  { id: 'boots', name: 'Swift Boots', cost: 300, speed: 25 },
  { id: 'sapphire', name: 'Sapphire', cost: 300, cdr: 8 },
  { id: 'flask', name: 'Healing Flask', cost: 150, active: 'flask' },
  { id: 'blade', name: 'Brutal Edge', cost: 950, dmg: 30, atk: 20, from: ['sword', 'dagger'] },
  { id: 'thorns', name: 'Thornmail', cost: 900, armor: 16, hp: 180, from: ['cloth', 'ruby'] },
  { id: 'phase', name: 'Phase Boots', cost: 600, speed: 40, active: 'dash', from: ['boots'] },
  { id: 'cloak', name: "Sage's Cloak", cost: 900, cdr: 20, hp: 120, from: ['sapphire', 'ruby'] },
  { id: 'belt', name: "Giant's Belt", cost: 700, hp: 320, from: ['ruby'] },
];
/** A champion carries at most this many items. */
export const MAX_ITEMS = 6;

export type ActiveId = 'dash' | 'flask';
export interface ActiveDef {
  id: ActiveId;
  /** The key that casts it, and the button's label. */
  key: 'D' | 'H';
  name: string;
  cd: number;
  /** dash: how far it goes. */
  range?: number;
  /** flask: health restored. */
  heal?: number;
}
/** The item actives, each on its own key and button. */
export const ACTIVES: ActiveDef[] = [
  { id: 'dash', key: 'D', name: 'Dash', cd: 18_000, range: 220 },
  { id: 'flask', key: 'H', name: 'Flask', cd: 40_000, heal: 220 },
];

/** How close a champion must stand to its Nexus to shop. */
export const SHOP_RANGE = 700;

/** Which lane each AI champion walks, in roster order without the player's champion. */
export const ALLY_LANES: LaneId[] = ['top', 'mid', 'bottom', 'mid'];
export const ENEMY_LANES: LaneId[] = ['top', 'mid', 'bottom', 'mid', 'top'];

/** The colour of each side's rings, bolts and lines. */
export const SIDE_COLOR = { blue: '#3d8bfd', red: '#e0553f', neutral: '#f4d35e' } as const;

// ---------------------------------------------------------------------------------------------
// Match objectives: one goal at a time for the player's team, with a time limit and a reward.

export type ObjectiveKind = 'tower' | 'camp' | 'champion' | 'beast';
export interface ObjectiveDef {
  kind: ObjectiveKind;
  /** Time to finish it, in ms. */
  ms: number;
  /** Gold paid to the player's champion when it is done. */
  gold: number;
  /** A perk that comes with it: the siege banner adds damage against towers and the Nexus for a while. */
  banner?: 'siege';
}
/** The goals in the order they come; the list repeats. */
export const OBJECTIVES: ObjectiveDef[] = [
  { kind: 'tower', ms: 150_000, gold: 200, banner: 'siege' },
  { kind: 'camp', ms: 90_000, gold: 120 },
  { kind: 'champion', ms: 120_000, gold: 150 },
  { kind: 'beast', ms: 120_000, gold: 250 },
];
/** The pause between one objective ending and the next one starting. */
export const OBJECTIVE_GAP_MS = 4000;
/** The siege banner: the player's champion deals this much more damage to towers and the Nexus. */
export const SIEGE = { mult: 1.25, ms: 60_000 };

// ---------------------------------------------------------------------------------------------
// Upgrades: each new level offers the player two upgrades to its abilities, and it keeps one.

export interface UpgradeDef {
  id: string;
  key: AbilityKey;
  name: string;
  desc: string;
  /** Percent changes to the ability's numbers (cd is negative for a shorter cooldown). */
  radius?: number;
  damage?: number;
  range?: number;
  heal?: number;
  shield?: number;
  cd?: number;
  /** Stun in ms for champions and minions hit. */
  stun?: number;
  /** Slow in ms for champions and minions hit. */
  slow?: number;
  /** More bolts. */
  count?: number;
}

const up = (id: string, key: AbilityKey, name: string, desc: string, fx: Partial<UpgradeDef>): UpgradeDef => ({ ...fx, id, key, name, desc });

/** Per champion, the two upgrades offered at levels 2, 3, 4 and 5 (index 0 is level 2). */
export const UPGRADES: Record<string, [UpgradeDef, UpgradeDef][]> = {
  warden: [
    [up('wide-slam', 'Q', 'Wide Slam', 'Slam radius +30%', { radius: 30 }), up('stun-slam', 'Q', 'Stun Slam', 'Slam stuns for 0.6s', { stun: 600 })],
    [up('iron-bulwark', 'W', 'Iron Bulwark', 'Bulwark shield +40%', { shield: 40 }), up('long-charge', 'E', 'Long Charge', 'Charge range +30%', { range: 30 })],
    [up('titan-stand', 'R', 'Titan Stand', 'Last Stand damage +25%', { damage: 25 }), up('quick-slam', 'Q', 'Quick Slam', 'Slam cooldown -25%', { cd: -25 })],
    [up('crushing-charge', 'E', 'Crushing Charge', 'Charge damage +40%', { damage: 40 }), up('wide-bulwark', 'W', 'Wide Bulwark', 'Bulwark radius +40%', { radius: 40 })],
  ],
  blade: [
    [up('deep-strike', 'Q', 'Deep Strike', 'Dash Strike range +30%', { range: 30 }), up('keen-strike', 'Q', 'Keen Strike', 'Dash Strike damage +30%', { damage: 30 })],
    [up('wide-whirl', 'W', 'Wide Whirl', 'Whirl radius +30%', { radius: 30 }), up('quick-step', 'E', 'Quick Step', 'Shadow Step cooldown -30%', { cd: -30 })],
    [up('brutal-execute', 'R', 'Brutal Execute', 'Execute damage +25%', { damage: 25 }), up('crippling-whirl', 'W', 'Crippling Whirl', 'Whirl slows for 1.2s', { slow: 1200 })],
    [up('swift-strike', 'Q', 'Swift Strike', 'Dash Strike cooldown -25%', { cd: -25 }), up('long-step', 'E', 'Long Step', 'Shadow Step range +30%', { range: 30 })],
  ],
  archer: [
    [up('heavy-arrow', 'Q', 'Heavy Arrow', 'Piercing Arrow damage +30%', { damage: 30 }), up('wide-volley', 'W', 'Wide Volley', 'Volley fires 2 more arrows', { count: 2 })],
    [up('long-roll', 'E', 'Long Roll', 'Roll range +40%', { range: 40 }), up('quick-arrow', 'Q', 'Quick Arrow', 'Piercing Arrow cooldown -25%', { cd: -25 })],
    [up('wide-rain', 'R', 'Wide Rain', 'Arrow Rain radius +30%', { radius: 30 }), up('hard-volley', 'W', 'Hard Volley', 'Volley damage +30%', { damage: 30 })],
    [up('pinning-arrow', 'Q', 'Pinning Arrow', 'Piercing Arrow stuns for 0.5s', { stun: 500 }), up('heavy-rain', 'R', 'Heavy Rain', 'Arrow Rain damage +25%', { damage: 25 })],
  ],
  mage: [
    [up('big-fireball', 'Q', 'Big Fireball', 'Fireball damage +30%', { damage: 30 }), up('swift-fireball', 'Q', 'Swift Fireball', 'Fireball cooldown -25%', { cd: -25 })],
    [up('deep-freeze', 'W', 'Deep Freeze', 'Frost Nova stuns for 0.6s', { stun: 600 }), up('far-blink', 'E', 'Far Blink', 'Blink range +30%', { range: 30 })],
    [up('huge-meteor', 'R', 'Huge Meteor', 'Meteor radius +30%', { radius: 30 }), up('wide-nova', 'W', 'Wide Nova', 'Frost Nova radius +30%', { radius: 30 })],
    [up('long-fireball', 'Q', 'Long Fireball', 'Fireball range +30%', { range: 30 }), up('heavy-meteor', 'R', 'Heavy Meteor', 'Meteor damage +25%', { damage: 25 })],
  ],
  priest: [
    [up('deep-mend', 'W', 'Deep Mend', 'Mend heals +30%', { heal: 30 }), up('wide-mend', 'W', 'Wide Mend', 'Mend radius +30%', { radius: 30 })],
    [up('holy-smite', 'Q', 'Holy Smite', 'Smite damage +30%', { damage: 30 }), up('strong-ward', 'E', 'Strong Ward', 'Ward shield +40%', { shield: 40 })],
    [up('wide-sanctuary', 'R', 'Wide Sanctuary', 'Sanctuary radius +25%', { radius: 25 }), up('quick-ward', 'E', 'Quick Ward', 'Ward cooldown -25%', { cd: -25 })],
    [up('binding-smite', 'Q', 'Binding Smite', 'Smite stuns for 0.5s', { stun: 500 }), up('quick-mend', 'W', 'Quick Mend', 'Mend cooldown -25%', { cd: -25 })],
  ],
};

export function upgradeById(id: string): UpgradeDef | undefined {
  for (const pairs of Object.values(UPGRADES)) for (const pair of pairs) for (const u of pair) if (u.id === id) return u;
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Last hits: the player's unbroken run of last hits on minions pays more from this streak on.

export const STREAK = { at: 4, bonus: 0.25 };
/** How far past its reach the player's champion looks for a minion its next hit would kill. */
export const LAST_HIT_LOOK = 140;

// ---------------------------------------------------------------------------------------------
// The guardian beast: a big neutral monster in a pit between the middle and bottom lanes, the same
// distance from both Nexuses. The team that slays it gets stronger minions for a while.

export const BEAST = {
  x: 1340,
  y: 1040,
  hp: 3200,
  dmg: 48,
  attackMs: 1400,
  /** Its claws reach this far; past that, up to `leash`, it hurls rocks. */
  range: 150,
  radius: 38,
  /** Units this close to what it strikes take the blow too. */
  splash: 110,
  /** It gives up on an attacker this far from its pit, and heals while nobody fights it. */
  leash: 520,
  regenPerSec: 160,
  /** It first wakes at this game time, then this long after it falls. */
  firstAt: 90_000,
  respawnMs: 150_000,
  gold: 150,
  xp: 250,
  /** How long the slayers' minions stay empowered. */
  buffMs: 90_000,
};
/** Empowered minions deal this much more damage and take this much of what they would. */
export const BEAST_BUFF = { dmg: 1.5, taken: 0.65 };
/** How many AI champions of each team go to fight over the beast while it is awake. */
export const BEAST_CONTESTERS = 2;

// ---------------------------------------------------------------------------------------------
// Inhibitors: one per lane per team, behind the lane's towers. It can only be hurt once both of its
// lane's towers are down; when it falls, the other team's minions on that lane come out as super
// minions. The Nexus can only be hurt once one of its inhibitors has fallen.

export interface InhibitorSpot {
  team: Team;
  lane: LaneId;
  x: number;
  y: number;
}
export const INHIBITORS: InhibitorSpot[] = [
  { team: 'blue', lane: 'top', x: 260, y: 1150 },
  { team: 'blue', lane: 'mid', x: 425, y: 1245 },
  { team: 'blue', lane: 'bottom', x: 450, y: 1340 },
  { team: 'red', lane: 'top', x: 1950, y: 260 },
  { team: 'red', lane: 'mid', x: 1975, y: 355 },
  { team: 'red', lane: 'bottom', x: 2140, y: 450 },
];
export const INHIBITOR = { hp: 1600, radius: 24, gold: 120 };
/** Super minions have this much more health and damage. */
export const SUPER_MINION = 1.6;

// ---------------------------------------------------------------------------------------------
// Bushes: patches of tall grass. A champion inside one can't be seen or targeted by enemies unless
// one of them stands in the same patch or right next to it. Attacking or casting shows it briefly.

export interface Bush {
  x: number;
  y: number;
  rx: number;
  ry: number;
}
/** Four pairs, each mirrored under the map's 180-degree turn. */
export const BUSHES: Bush[] = [
  { x: 1330, y: 506, rx: 78, ry: 48 },
  { x: 1070, y: 1094, rx: 78, ry: 48 },
  { x: 880, y: 764, rx: 78, ry: 48 },
  { x: 1520, y: 836, rx: 78, ry: 48 },
  { x: 430, y: 560, rx: 60, ry: 62 },
  { x: 1970, y: 1040, rx: 60, ry: 62 },
  { x: 560, y: 420, rx: 70, ry: 50 },
  { x: 1840, y: 1180, rx: 70, ry: 50 },
];
/** An enemy this close sees into a bush. */
export const BUSH_REVEAL = 90;
/** How long attacking or casting from a bush shows the champion, in ms. */
export const REVEAL_MS = 1500;

/** The bush a point is in, or -1. */
export function bushAt(p: Vec): number {
  return BUSHES.findIndex((b) => ((p.x - b.x) / b.rx) ** 2 + ((p.y - b.y) / b.ry) ** 2 <= 1);
}

// ---------------------------------------------------------------------------------------------
// Team plans for the AI: now and then a champion leaves its lane to gang up on a weak enemy, and
// champions that are hurt or outnumbered fall back together.

export const GANK = { firstAt: 100_000, every: 70_000, ms: 22_000, minHp: 0.6, from: 550 };
export const RETREAT = {
  /** Health ratio under which a champion with an enemy champion near falls back. */
  hp: 0.25,
  /** Enemy champions are counted this close. */
  look: 480,
  /** Fall back when the enemies outnumber the allies near by this many. */
  outnumber: 2,
  /** Allied AI champions this close fall back too. */
  call: 420,
  ms: 3500,
};
