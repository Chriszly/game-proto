// The map, champions, items and balance numbers of Lane Brawl. Plain data, free of Phaser.

export type Team = 'blue' | 'red';
export type LaneId = 'top' | 'mid' | 'bottom';
export interface Vec {
  x: number;
  y: number;
}

/** The map is a square. Everything on red's half is blue's turned 180 degrees round the middle. */
export const WORLD = { w: 2800, h: 2800 };
/** A point turned 180 degrees round the middle of the map: where red's copy of a blue spot sits. */
export const mirror = (p: Vec): Vec => ({ x: WORLD.w - p.x, y: WORLD.h - p.y });
/** Blue spots and their red copies, in that order. */
const both = <T extends Vec>(spots: T[]): T[] => [...spots, ...spots.map((p) => ({ ...p, ...mirror(p) }))];

/** The two Nexuses: the blue team (the player's) bottom-left, the red team top-right. */
export const BASE: Record<Team, Vec> = { blue: { x: 300, y: 2500 }, red: { x: 2500, y: 300 } };

/** Each lane runs from the blue Nexus to the red one. Red walks the same lane backwards. */
export const LANES: Record<LaneId, Vec[]> = {
  top: [BASE.blue, { x: 300, y: 300 }, BASE.red],
  mid: [BASE.blue, BASE.red],
  bottom: [BASE.blue, { x: 2500, y: 2500 }, BASE.red],
};

/**
 * The river runs from the top-left corner to the bottom-right one, across the middle lane, and
 * splits each team's jungle in two. It is only scenery: units cross it at full speed.
 */
export const RIVER = { from: { x: 420, y: 420 }, to: { x: 2380, y: 2380 }, half: 62 };

export interface TowerSpot {
  team: Team;
  lane: LaneId;
  x: number;
  y: number;
}
/** Two towers per team on each lane, the blue ones closest to the blue Nexus. */
export const TOWERS: TowerSpot[] = both<TowerSpot>([
  { team: 'blue', lane: 'top', x: 300, y: 1950 },
  { team: 'blue', lane: 'top', x: 300, y: 1300 },
  { team: 'blue', lane: 'mid', x: 689, y: 2111 },
  { team: 'blue', lane: 'mid', x: 1007, y: 1793 },
  { team: 'blue', lane: 'bottom', x: 850, y: 2500 },
  { team: 'blue', lane: 'bottom', x: 1500, y: 2500 },
]).map((t, i) => (i < 6 ? t : { ...t, team: 'red', lane: t.lane === 'top' ? 'bottom' : t.lane === 'bottom' ? 'top' : 'mid' }));

// ---------------------------------------------------------------------------------------------
// The jungle: neutral camps of three kinds in each of the four quarters between the lanes and the
// river. Boars stand alone, wolves come as a pack, and the two brutes give their slayer a buff.

export type CampKind = 'boar' | 'wolf' | 'pup' | 'ember' | 'moss';
export interface CampDef {
  kind: CampKind;
  name: string;
  hp: number;
  dmg: number;
  attackMs: number;
  range: number;
  radius: number;
  armor: number;
  gold: number;
  xp: number;
  respawnMs: number;
  /** The buff its slayer gets (see `BUFFS`). */
  buff?: 'ember' | 'moss';
}
export const CAMP_KINDS: Record<CampKind, CampDef> = {
  boar: { kind: 'boar', name: 'Boar', hp: 600, dmg: 28, attackMs: 1200, range: 150, radius: 26, armor: 0, gold: 80, xp: 120, respawnMs: 60_000 },
  wolf: { kind: 'wolf', name: 'Alpha wolf', hp: 460, dmg: 24, attackMs: 1000, range: 120, radius: 22, armor: 0, gold: 60, xp: 90, respawnMs: 60_000 },
  pup: { kind: 'pup', name: 'Wolf', hp: 200, dmg: 12, attackMs: 900, range: 100, radius: 16, armor: 0, gold: 20, xp: 30, respawnMs: 60_000 },
  ember: { kind: 'ember', name: 'Ember brute', hp: 1150, dmg: 40, attackMs: 1300, range: 150, radius: 30, armor: 8, gold: 100, xp: 170, respawnMs: 90_000, buff: 'ember' },
  moss: { kind: 'moss', name: 'Moss brute', hp: 1150, dmg: 40, attackMs: 1300, range: 150, radius: 30, armor: 8, gold: 100, xp: 170, respawnMs: 90_000, buff: 'moss' },
};
export interface CampSpot extends Vec {
  /** The camp's kind: a wolf pack is an alpha and two pups. */
  kind: 'boar' | 'wolf' | 'ember' | 'moss';
}
/** Six camps per team's half: blue's first, then their red copies. */
export const CAMPS: CampSpot[] = both<CampSpot>([
  { kind: 'ember', x: 640, y: 1300 },
  { kind: 'boar', x: 900, y: 1520 },
  { kind: 'wolf', x: 620, y: 1850 },
  { kind: 'moss', x: 1500, y: 2160 },
  { kind: 'boar', x: 1280, y: 1900 },
  { kind: 'wolf', x: 950, y: 2180 },
]);
/** Where a wolf pack's two pups stand, from the alpha. */
export const PUPS: Vec[] = [
  { x: -46, y: 26 },
  { x: 46, y: 26 },
];

export const NEXUS_HP = 3000;
export const NEXUS_RADIUS = 48;
export const TOWER = { hp: 1400, dmg: 55, attackMs: 1000, range: 300, radius: 26, gold: 150, aggroMs: 2500 };
export const MINION = { hp: 260, dmg: 12, attackMs: 1000, range: 40, radius: 12, speed: 90, aggro: 200, gold: 19, xp: 30 };
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

// ---------------------------------------------------------------------------------------------
// Fog of war: each team sees only what lies within sight of one of its own units. Structures are
// always seen; champions, minions and the jungle are hidden anywhere else.

export const SIGHT = { champion: 360, minion: 240, tower: 440, inhibitor: 260, nexus: 520, watchstone: 560 } as const;

/**
 * Watchstones: standing stones on the river. A team whose champions stand by one with no enemy
 * champion near takes it after a few seconds, and then sees far around it.
 */
export const WATCHSTONES: Vec[] = [
  { x: 850, y: 850 },
  { x: 1200, y: 1200 },
  { x: 1600, y: 1600 },
];
export const WATCH = { radius: 150, captureMs: 3000 };

// ---------------------------------------------------------------------------------------------
// Champions: ten classes, each with a passive and four abilities.

export type AbilityKey = 'Q' | 'W' | 'E' | 'R';
export const ABILITY_KEYS: AbilityKey[] = ['Q', 'W', 'E', 'R'];
/**
 * How an ability works. `burst` hits enemies around a point (or around the caster when its range is
 * 0), `bolt` fires projectiles, `dash` moves the caster and hits around where it lands, `ally`
 * heals, shields and buffs allied champions around a point, `buff` strengthens the caster for a
 * while, and `zone` leaves a patch on the ground that hurts enemies standing in it.
 */
export type AbilityKind = 'burst' | 'bolt' | 'dash' | 'ally' | 'buff' | 'zone';

/** A stat change that lasts a while, from an ability, a passive or a jungle buff. Percents unless noted. */
export interface BuffDef {
  /** Faster attacks. */
  atk?: number;
  /** More damage from attacks and abilities. */
  dmg?: number;
  /** Faster walking. */
  speed?: number;
  /** Health back from attack damage dealt. */
  lifesteal?: number;
  /** Flat armor. */
  armor?: number;
  /** Shorter ability cooldowns. */
  cdr?: number;
  /** Health back per second, flat. */
  regen?: number;
  /** Attacks slow what they hit for this many ms. */
  slowHit?: number;
  /** Unseen by enemies that are not right next to it; attacking or casting ends it. */
  stealth?: boolean;
}

export interface AbilityDef {
  key: AbilityKey;
  name: string;
  kind: AbilityKind;
  /** Cooldown in ms. */
  cd: number;
  /** burst, ally and zone: how far the centre may be from the caster (0 centres on the caster). bolt and dash: distance. */
  range: number;
  /** Pixels around the centre (burst, ally, zone) or where a dash lands (dash). */
  radius?: number;
  damage?: number;
  heal?: number;
  shield?: number;
  /** Slow in ms for champions and minions hit. */
  slow?: number;
  /** Stun in ms for champions and minions hit. */
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
  /** A bolt drags the first champion or minion it hits to the caster. */
  pull?: boolean;
  /** A burst pushes what it hits this many pixels away from its centre. */
  knock?: number;
  /** Double damage to a target below this share of its health. */
  executeBelow?: number;
  /** zone: damage per second to enemies inside. */
  dps?: number;
  /** buff and zone: how long it lasts, in ms (ally: how long its buff lasts). */
  ms?: number;
  /** buff and ally: the stat change it gives. */
  buff?: BuffDef;
  /** Champion level needed to cast. */
  level: number;
}

/** What a champion always has. */
export interface PassiveDef {
  name: string;
  desc: string;
  /** Percent less damage taken. */
  tough?: number;
  /** Every Nth attack hits for `critMult` times its damage. */
  critEvery?: number;
  critMult?: number;
  /** Percent faster walking for `hasteMs` after each attack. */
  haste?: number;
  hasteMs?: number;
  /** Percent more ability damage. */
  spellpower?: number;
  /** Allied champions within `auraRadius` (and the caster) heal this much per second. */
  aura?: number;
  auraRadius?: number;
  /** Percent of attack damage dealt healed back. */
  lifesteal?: number;
  /** Flat health back per second. */
  regen?: number;
  /** Attacks slow what they hit for this many ms. */
  slowHit?: number;
  /** The first attack after a while out of a fight hits for this many times its damage. */
  ambush?: number;
  /** Attacks also hit enemies within `splashRadius` of the target for this percent. */
  splash?: number;
  splashRadius?: number;
}

export interface ChampionDef {
  id: string;
  /** The class's name: Warden, Blade... A champion in a match also has a name of its own. */
  name: string;
  role: string;
  /** One line on how the class plays, for the pick card. */
  blurb: string;
  color: string;
  hp: number;
  hpPerLevel: number;
  dmg: number;
  dmgPerLevel: number;
  armor: number;
  range: number;
  speed: number;
  attackMs: number;
  passive: PassiveDef;
  /** Q, W, E, R in that order. */
  abilities: AbilityDef[];
}

export const CHAMPIONS: ChampionDef[] = [
  {
    id: 'warden',
    name: 'Warden',
    role: 'Tank',
    blurb: 'Soaks blows, guards friends',
    color: '#c98b3b',
    hp: 640,
    hpPerLevel: 95,
    dmg: 48,
    dmgPerLevel: 3.5,
    armor: 6,
    range: 110,
    speed: 120,
    attackMs: 900,
    passive: { name: 'Stalwart', desc: 'Takes 15% less damage', tough: 15 },
    abilities: [
      { key: 'Q', name: 'Slam', kind: 'burst', cd: 6000, range: 0, radius: 170, damage: 80, slow: 1500, level: 1 },
      { key: 'W', name: 'Bulwark', kind: 'ally', cd: 10000, range: 350, radius: 120, shield: 130, level: 1 },
      { key: 'E', name: 'Charge', kind: 'dash', cd: 9000, range: 280, radius: 110, damage: 60, stun: 400, level: 1 },
      { key: 'R', name: 'Last Stand', kind: 'burst', cd: 60000, range: 0, radius: 240, damage: 160, slow: 2000, level: 3 },
    ],
  },
  {
    id: 'blade',
    name: 'Blade',
    role: 'Assassin',
    blurb: 'Finishes the weak, slips away',
    color: '#8e6cf0',
    hp: 570,
    hpPerLevel: 80,
    dmg: 60,
    dmgPerLevel: 4,
    armor: 3,
    range: 120,
    speed: 150,
    attackMs: 700,
    passive: { name: 'Keen Edge', desc: 'Every 3rd attack hits 2x', critEvery: 3, critMult: 2 },
    abilities: [
      { key: 'Q', name: 'Dash Strike', kind: 'dash', cd: 5000, range: 260, radius: 90, damage: 85, level: 1 },
      { key: 'W', name: 'Whirl', kind: 'burst', cd: 8000, range: 0, radius: 130, damage: 70, level: 1 },
      { key: 'E', name: 'Shadow Step', kind: 'dash', cd: 12000, range: 240, level: 1 },
      { key: 'R', name: 'Execute', kind: 'burst', cd: 60000, range: 280, radius: 60, damage: 190, executeBelow: 0.4, level: 3 },
    ],
  },
  {
    id: 'archer',
    name: 'Archer',
    role: 'Marksman',
    blurb: 'Shoots far, runs between shots',
    color: '#e6c03a',
    hp: 490,
    hpPerLevel: 72,
    dmg: 56,
    dmgPerLevel: 4,
    armor: 2,
    range: 420,
    speed: 135,
    attackMs: 800,
    passive: { name: 'Fleetfoot', desc: 'Runs 30% faster after a shot', haste: 30, hasteMs: 1500 },
    abilities: [
      { key: 'Q', name: 'Piercing Arrow', kind: 'bolt', cd: 4500, range: 700, speed: 900, width: 26, damage: 80, pierce: true, level: 1 },
      { key: 'W', name: 'Volley', kind: 'bolt', cd: 9000, range: 600, speed: 800, width: 24, damage: 45, count: 3, spread: 0.2, level: 1 },
      { key: 'E', name: 'Roll', kind: 'dash', cd: 10000, range: 180, level: 1 },
      { key: 'R', name: 'Arrow Rain', kind: 'zone', cd: 60000, range: 650, radius: 230, dps: 75, ms: 2500, slow: 800, level: 3 },
    ],
  },
  {
    id: 'mage',
    name: 'Mage',
    role: 'Burst',
    blurb: 'Big spells, fragile up close',
    color: '#3fd0d9',
    hp: 480,
    hpPerLevel: 66,
    dmg: 44,
    dmgPerLevel: 3,
    armor: 2,
    range: 400,
    speed: 130,
    attackMs: 900,
    passive: { name: 'Arcane Power', desc: 'Abilities deal 20% more', spellpower: 20 },
    abilities: [
      { key: 'Q', name: 'Fireball', kind: 'bolt', cd: 4000, range: 650, speed: 750, width: 30, damage: 95, level: 1 },
      { key: 'W', name: 'Frost Nova', kind: 'burst', cd: 9000, range: 0, radius: 170, damage: 65, slow: 1800, level: 1 },
      { key: 'E', name: 'Blink', kind: 'dash', cd: 12000, range: 230, level: 1 },
      { key: 'R', name: 'Meteor', kind: 'burst', cd: 60000, range: 600, radius: 220, damage: 210, level: 3 },
    ],
  },
  {
    id: 'priest',
    name: 'Priest',
    role: 'Support',
    blurb: 'Heals and shields the team',
    color: '#6fe07f',
    hp: 480,
    hpPerLevel: 68,
    dmg: 32,
    dmgPerLevel: 2.5,
    armor: 2,
    range: 380,
    speed: 135,
    attackMs: 1000,
    passive: { name: 'Blessed Aura', desc: 'Allies near heal 2 a second', aura: 2, auraRadius: 320 },
    abilities: [
      { key: 'Q', name: 'Smite', kind: 'bolt', cd: 4000, range: 600, speed: 800, width: 26, damage: 60, level: 1 },
      { key: 'W', name: 'Mend', kind: 'ally', cd: 7000, range: 500, radius: 160, heal: 80, level: 1 },
      { key: 'E', name: 'Ward', kind: 'ally', cd: 10000, range: 500, radius: 120, shield: 90, level: 1 },
      { key: 'R', name: 'Sanctuary', kind: 'ally', cd: 60000, range: 400, radius: 280, heal: 70, shield: 60, level: 3 },
    ],
  },
  {
    id: 'berserker',
    name: 'Berserker',
    role: 'Fighter',
    blurb: 'Heals by hitting, grows wild',
    color: '#ff8a3d',
    hp: 570,
    hpPerLevel: 85,
    dmg: 52,
    dmgPerLevel: 4.5,
    armor: 3,
    range: 115,
    speed: 125,
    attackMs: 850,
    passive: { name: 'Bloodthirst', desc: 'Heals 10% of attack damage', lifesteal: 10 },
    abilities: [
      { key: 'Q', name: 'Cleave', kind: 'burst', cd: 6000, range: 0, radius: 150, damage: 75, level: 1 },
      { key: 'W', name: 'Frenzy', kind: 'buff', cd: 12000, range: 0, ms: 4000, buff: { atk: 45 }, level: 1 },
      { key: 'E', name: 'Leap', kind: 'dash', cd: 10000, range: 300, radius: 100, damage: 60, slow: 1200, level: 1 },
      { key: 'R', name: 'Rampage', kind: 'buff', cd: 60000, range: 0, ms: 6000, buff: { dmg: 30, lifesteal: 20, speed: 20 }, level: 3 },
    ],
  },
  {
    id: 'harpooner',
    name: 'Harpooner',
    role: 'Catcher',
    blurb: 'Hooks foes in, holds the line',
    color: '#2fb39a',
    hp: 580,
    hpPerLevel: 88,
    dmg: 48,
    dmgPerLevel: 4,
    armor: 5,
    range: 140,
    speed: 120,
    attackMs: 950,
    passive: { name: 'Sea Legs', desc: 'Heals 4 health a second', regen: 4 },
    abilities: [
      { key: 'Q', name: 'Harpoon', kind: 'bolt', cd: 9000, range: 620, speed: 950, width: 26, damage: 70, pull: true, stun: 400, level: 1 },
      { key: 'W', name: 'Riptide', kind: 'burst', cd: 8000, range: 0, radius: 160, damage: 60, knock: 120, level: 1 },
      { key: 'E', name: 'Brace', kind: 'buff', cd: 12000, range: 0, ms: 3000, shield: 120, buff: { armor: 20 }, level: 1 },
      { key: 'R', name: 'Maelstrom', kind: 'zone', cd: 60000, range: 500, radius: 200, dps: 70, ms: 3000, slow: 1000, level: 3 },
    ],
  },
  {
    id: 'witch',
    name: 'Witch',
    role: 'Controller',
    blurb: 'Curses ground, roots foes',
    color: '#c55fae',
    hp: 460,
    hpPerLevel: 64,
    dmg: 40,
    dmgPerLevel: 3,
    armor: 1,
    range: 400,
    speed: 128,
    attackMs: 950,
    passive: { name: 'Hex', desc: 'Attacks slow for 0.6s', slowHit: 600 },
    abilities: [
      { key: 'Q', name: 'Hex Bolt', kind: 'bolt', cd: 4500, range: 620, speed: 750, width: 28, damage: 70, slow: 1500, level: 1 },
      { key: 'W', name: 'Blight', kind: 'zone', cd: 9000, range: 550, radius: 120, dps: 45, ms: 3500, level: 1 },
      { key: 'E', name: 'Bramble Snare', kind: 'burst', cd: 12000, range: 500, radius: 90, damage: 40, stun: 1100, level: 1 },
      { key: 'R', name: 'Plague Field', kind: 'zone', cd: 60000, range: 600, radius: 240, dps: 70, ms: 4000, slow: 1500, level: 3 },
    ],
  },
  {
    id: 'stalker',
    name: 'Stalker',
    role: 'Ambusher',
    blurb: 'Vanishes, strikes from nowhere',
    color: '#8fa0b8',
    hp: 520,
    hpPerLevel: 78,
    dmg: 58,
    dmgPerLevel: 4.5,
    armor: 3,
    range: 115,
    speed: 145,
    attackMs: 750,
    passive: { name: 'Ambush', desc: '2.3x first hit from hiding', ambush: 2.3 },
    abilities: [
      { key: 'Q', name: 'Shuriken Fan', kind: 'bolt', cd: 5000, range: 520, speed: 950, width: 22, damage: 50, count: 3, spread: 0.25, level: 1 },
      { key: 'W', name: 'Vanish', kind: 'buff', cd: 14000, range: 0, ms: 3000, buff: { stealth: true, speed: 30 }, level: 1 },
      { key: 'E', name: 'Pounce', kind: 'dash', cd: 9000, range: 260, radius: 80, damage: 70, stun: 500, level: 1 },
      { key: 'R', name: 'Final Mark', kind: 'bolt', cd: 60000, range: 700, speed: 1100, width: 30, damage: 200, executeBelow: 0.4, level: 3 },
    ],
  },
  {
    id: 'lancer',
    name: 'Lancer',
    role: 'Bruiser',
    blurb: 'Long reach, guards the team',
    color: '#d8cfb4',
    hp: 610,
    hpPerLevel: 90,
    dmg: 56,
    dmgPerLevel: 4.5,
    armor: 5,
    range: 170,
    speed: 122,
    attackMs: 900,
    passive: { name: 'Wide Reach', desc: 'Hits beside the target for 40%', splash: 40, splashRadius: 80 },
    abilities: [
      { key: 'Q', name: 'Thrust', kind: 'bolt', cd: 5000, range: 380, speed: 1100, width: 30, damage: 90, pierce: true, level: 1 },
      { key: 'W', name: 'Sweep', kind: 'burst', cd: 8000, range: 0, radius: 190, damage: 55, knock: 90, level: 1 },
      { key: 'E', name: 'Vault', kind: 'dash', cd: 10000, range: 260, radius: 90, damage: 50, stun: 300, level: 1 },
      { key: 'R', name: 'Phalanx', kind: 'ally', cd: 60000, range: 0, radius: 260, shield: 150, ms: 6000, buff: { armor: 15 }, level: 3 },
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

/** The jungle buffs: the slayer of an ember or moss brute carries one until it dies or it runs out. */
export const BUFFS: Record<'ember' | 'moss', { name: string; ms: number; color: string; buff: BuffDef }> = {
  ember: { name: 'Ember', ms: 60_000, color: '#ff8a3d', buff: { dmg: 15, slowHit: 800 } },
  moss: { name: 'Moss', ms: 60_000, color: '#7fe08a', buff: { cdr: 20, regen: 8 } },
};

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
  /** Also scales a zone's damage per second. */
  damage?: number;
  range?: number;
  heal?: number;
  shield?: number;
  cd?: number;
  /** How long a buff or a zone lasts. */
  ms?: number;
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
  berserker: [
    [up('wide-cleave', 'Q', 'Wide Cleave', 'Cleave radius +30%', { radius: 30 }), up('savage-cleave', 'Q', 'Savage Cleave', 'Cleave damage +30%', { damage: 30 })],
    [up('long-frenzy', 'W', 'Long Frenzy', 'Frenzy lasts 50% longer', { ms: 50 }), up('far-leap', 'E', 'Far Leap', 'Leap range +30%', { range: 30 })],
    [up('endless-rampage', 'R', 'Endless Rampage', 'Rampage lasts 40% longer', { ms: 40 }), up('crushing-leap', 'E', 'Crushing Leap', 'Leap stuns for 0.5s', { stun: 500 })],
    [up('quick-cleave', 'Q', 'Quick Cleave', 'Cleave cooldown -25%', { cd: -25 }), up('quick-frenzy', 'W', 'Quick Frenzy', 'Frenzy cooldown -30%', { cd: -30 })],
  ],
  harpooner: [
    [up('long-harpoon', 'Q', 'Long Harpoon', 'Harpoon range +25%', { range: 25 }), up('barbed-harpoon', 'Q', 'Barbed Harpoon', 'Harpoon damage +40%', { damage: 40 })],
    [up('deep-undertow', 'W', 'Deep Riptide', 'Riptide radius +30%', { radius: 30 }), up('iron-brace', 'E', 'Iron Brace', 'Brace shield +50%', { shield: 50 })],
    [up('wide-maelstrom', 'R', 'Wide Maelstrom', 'Maelstrom radius +25%', { radius: 25 }), up('quick-harpoon', 'Q', 'Quick Harpoon', 'Harpoon cooldown -25%', { cd: -25 })],
    [up('stunning-undertow', 'W', 'Stunning Riptide', 'Riptide stuns for 0.5s', { stun: 500 }), up('raging-maelstrom', 'R', 'Raging Maelstrom', 'Maelstrom damage +30%', { damage: 30 })],
  ],
  witch: [
    [up('cruel-hex', 'Q', 'Cruel Hex', 'Hex Bolt damage +30%', { damage: 30 }), up('lasting-blight', 'W', 'Lasting Blight', 'Blight lasts 40% longer', { ms: 40 })],
    [up('wide-snare', 'E', 'Wide Snare', 'Bramble Snare radius +40%', { radius: 40 }), up('quick-hex', 'Q', 'Quick Hex', 'Hex Bolt cooldown -25%', { cd: -25 })],
    [up('wide-plague', 'R', 'Wide Plague', 'Plague Field radius +25%', { radius: 25 }), up('foul-blight', 'W', 'Foul Blight', 'Blight damage +35%', { damage: 35 })],
    [up('deep-roots', 'E', 'Deep Roots', 'Bramble Snare holds 0.5s longer', { stun: 500 }), up('long-plague', 'R', 'Long Plague', 'Plague Field lasts 30% longer', { ms: 30 })],
  ],
  stalker: [
    [up('sharp-shuriken', 'Q', 'Sharp Shuriken', 'Shuriken Fan damage +30%', { damage: 30 }), up('wide-fan', 'Q', 'Wide Fan', 'Shuriken Fan throws 2 more', { count: 2 })],
    [up('long-vanish', 'W', 'Long Vanish', 'Vanish lasts 50% longer', { ms: 50 }), up('far-pounce', 'E', 'Far Pounce', 'Pounce range +30%', { range: 30 })],
    [up('deadly-mark', 'R', 'Deadly Mark', 'Final Mark damage +25%', { damage: 25 }), up('quick-vanish', 'W', 'Quick Vanish', 'Vanish cooldown -30%', { cd: -30 })],
    [up('stunning-pounce', 'E', 'Stunning Pounce', 'Pounce stuns 0.4s longer', { stun: 400 }), up('quick-shuriken', 'Q', 'Quick Shuriken', 'Shuriken Fan cooldown -25%', { cd: -25 })],
  ],
  lancer: [
    [up('long-thrust', 'Q', 'Long Thrust', 'Thrust range +30%', { range: 30 }), up('hard-thrust', 'Q', 'Hard Thrust', 'Thrust damage +30%', { damage: 30 })],
    [up('wide-sweep', 'W', 'Wide Sweep', 'Sweep radius +25%', { radius: 25 }), up('high-vault', 'E', 'High Vault', 'Vault range +30%', { range: 30 })],
    [up('iron-phalanx', 'R', 'Iron Phalanx', 'Phalanx shield +40%', { shield: 40 }), up('crippling-sweep', 'W', 'Crippling Sweep', 'Sweep slows for 1.2s', { slow: 1200 })],
    [up('stunning-vault', 'E', 'Stunning Vault', 'Vault stuns 0.4s longer', { stun: 400 }), up('quick-thrust', 'Q', 'Quick Thrust', 'Thrust cooldown -25%', { cd: -25 })],
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
// The guardian beast: a big neutral monster in a pit on the river between the middle and bottom
// lanes, the same distance from both Nexuses. The team that slays it gets stronger minions for a while.

export const BEAST = {
  x: 1950,
  y: 1950,
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
export const INHIBITORS: InhibitorSpot[] = both<InhibitorSpot>([
  { team: 'blue', lane: 'top', x: 300, y: 2250 },
  { team: 'blue', lane: 'mid', x: 477, y: 2323 },
  { team: 'blue', lane: 'bottom', x: 550, y: 2500 },
]).map((t, i) => (i < 3 ? t : { ...t, team: 'red', lane: t.lane === 'top' ? 'bottom' : t.lane === 'bottom' ? 'top' : 'mid' }));
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
/** Nine pairs, each mirrored under the map's 180-degree turn: by the lanes, in the jungle and on the river banks. */
export const BUSHES: Bush[] = both<Bush>([
  { x: 1150, y: 1450, rx: 78, ry: 48 },
  { x: 1750, y: 2100, rx: 70, ry: 50 },
  { x: 780, y: 1680, rx: 72, ry: 52 },
  { x: 1120, y: 2050, rx: 72, ry: 52 },
  { x: 440, y: 900, rx: 60, ry: 62 },
  { x: 1900, y: 2360, rx: 70, ry: 50 },
  { x: 520, y: 1100, rx: 60, ry: 60 },
  { x: 1300, y: 2300, rx: 70, ry: 50 },
  { x: 700, y: 980, rx: 70, ry: 50 },
]);
/** An enemy this close sees into a bush, and through stealth. */
export const BUSH_REVEAL = 90;
/** How long attacking or casting from a bush shows the champion, in ms. */
export const REVEAL_MS = 1500;

/** The bush a point is in, or -1. */
export function bushAt(p: Vec): number {
  return BUSHES.findIndex((b) => ((p.x - b.x) / b.rx) ** 2 + ((p.y - b.y) / b.ry) ** 2 <= 1);
}

// ---------------------------------------------------------------------------------------------
// Team plans for the AI: now and then a champion leaves its lane to gang up on a weak enemy, takes a
// jungle buff or a watchstone, and champions that are hurt or outnumbered fall back together.

export const GANK = { firstAt: 100_000, every: 70_000, ms: 24_000, minHp: 0.6, from: 650 };
/** Each team sends a champion into the jungle for a buff or a watchstone this often, from `firstAt`. */
export const JUNGLE = { firstAt: 120_000, every: 45_000, ms: 30_000, minHp: 0.6 };
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
