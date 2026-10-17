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
export const XP_FOR_LEVEL = [0, 280, 660, 1140, 1720, 2600, 3700, 5000];
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

export const SIGHT = { champion: 360, minion: 240, tower: 440, inhibitor: 260, nexus: 520, watchstone: 560, ward: 420 } as const;

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

/** A small edge from a champion's story, on top of the class's passive. Percents. */
export interface StoryPerk {
  /** One line for the pick screen. */
  desc: string;
  /** More damage to the guardian beast. */
  beastDmg?: number;
  /** Takes watchstones this much faster. */
  captureRate?: number;
  /** More gold from a bounty this champion claims. */
  bountyGold?: number;
}

export interface ChampionDef {
  id: string;
  /** The class's name: Warden, Blade... */
  name: string;
  role: string;
  /** The champion who plays the class: one character, the same in every match. */
  hero: string;
  /** The first name, for the portrait, notices and labels over the head. */
  short: string;
  /** What the bards call them, for the pick screen. */
  title: string;
  /** Why they fight in Kessmoor, one line for the pick screen (90 characters at most). */
  motive: string;
  /** One line on how the class plays, for the pick card. */
  blurb: string;
  perk?: StoryPerk;
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
    hero: 'Hald Oathstone',
    short: 'Hald',
    title: 'the Last Gate',
    motive: 'Lost the old gate and forty guards; now he stands with whoever is losing.',
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
    passive: { name: 'Oathbound', desc: 'Takes 15% less damage', tough: 15 },
    abilities: [
      { key: 'Q', name: 'Gatefall', kind: 'burst', cd: 6000, range: 0, radius: 170, damage: 80, slow: 1500, level: 1 },
      { key: 'W', name: 'Oathguard', kind: 'ally', cd: 10000, range: 350, radius: 120, shield: 130, level: 1 },
      { key: 'E', name: 'Gate Rush', kind: 'dash', cd: 9000, range: 280, radius: 110, damage: 60, stun: 400, level: 1 },
      { key: 'R', name: 'Last Gate', kind: 'burst', cd: 60000, range: 0, radius: 240, damage: 160, slow: 2000, level: 3 },
    ],
  },
  {
    id: 'blade',
    name: 'Blade',
    role: 'Assassin',
    hero: 'Vesna Duskedge',
    short: 'Vesna',
    title: 'the Unpaid Knife',
    motive: 'Refused a contract on a Concord judge; fights for the pardon that frees her.',
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
    passive: { name: 'Third Cut', desc: 'Every 3rd attack hits 2x', critEvery: 3, critMult: 2 },
    abilities: [
      { key: 'Q', name: 'Quick Cut', kind: 'dash', cd: 5000, range: 260, radius: 90, damage: 85, level: 1 },
      { key: 'W', name: 'Cutwind', kind: 'burst', cd: 8000, range: 0, radius: 130, damage: 70, level: 1 },
      { key: 'E', name: 'Shadow Step', kind: 'dash', cd: 12000, range: 240, level: 1 },
      { key: 'R', name: 'Last Word', kind: 'burst', cd: 60000, range: 280, radius: 60, damage: 190, executeBelow: 0.4, level: 3 },
    ],
  },
  {
    id: 'archer',
    name: 'Archer',
    role: 'Marksman',
    hero: 'Tamsin Farrow',
    short: 'Tamsin',
    title: 'Ranger of the Greenmarch',
    motive: 'Ranger of the Greywood; fights for the banner that will drain the overflow.',
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
      { key: 'Q', name: 'Heartseeker', kind: 'bolt', cd: 4500, range: 700, speed: 900, width: 26, damage: 80, pierce: true, level: 1 },
      { key: 'W', name: 'Featherfall', kind: 'bolt', cd: 9000, range: 600, speed: 800, width: 24, damage: 45, count: 3, spread: 0.2, level: 1 },
      { key: 'E', name: 'Tumble', kind: 'dash', cd: 10000, range: 180, level: 1 },
      { key: 'R', name: 'Hailstorm', kind: 'zone', cd: 60000, range: 650, radius: 230, dps: 75, ms: 2500, slow: 800, level: 3 },
    ],
  },
  {
    id: 'mage',
    name: 'Mage',
    role: 'Burst',
    hero: 'Elowen Vey',
    short: 'Elowen',
    title: 'the Rift Scholar',
    motive: 'Pulls fire and frost from the Riftwell; wants a key to it, whoever hands it over.',
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
    passive: { name: 'Rift-Touched', desc: 'Abilities deal 20% more', spellpower: 20 },
    abilities: [
      { key: 'Q', name: 'Riftflame', kind: 'bolt', cd: 4000, range: 650, speed: 750, width: 30, damage: 95, level: 1 },
      { key: 'W', name: 'Rime Ring', kind: 'burst', cd: 9000, range: 0, radius: 170, damage: 65, slow: 1800, level: 1 },
      { key: 'E', name: 'Fold Step', kind: 'dash', cd: 12000, range: 230, level: 1 },
      { key: 'R', name: 'Starfall', kind: 'burst', cd: 60000, range: 600, radius: 220, damage: 210, level: 3 },
    ],
  },
  {
    id: 'priest',
    name: 'Priest',
    role: 'Support',
    hero: 'Sister Maren',
    short: 'Maren',
    title: 'the Daykeeper',
    motive: 'Tends the wounded of both banners; fights so the contest never turns to war.',
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
    passive: { name: 'Dawnlight', desc: 'Allies near heal 2 a second', aura: 2, auraRadius: 320 },
    abilities: [
      { key: 'Q', name: 'Sunlance', kind: 'bolt', cd: 4000, range: 600, speed: 800, width: 26, damage: 60, level: 1 },
      { key: 'W', name: 'Mend', kind: 'ally', cd: 7000, range: 500, radius: 160, heal: 80, level: 1 },
      { key: 'E', name: 'Dawn Veil', kind: 'ally', cd: 10000, range: 500, radius: 120, shield: 90, level: 1 },
      { key: 'R', name: 'Noon Bell', kind: 'ally', cd: 60000, range: 400, radius: 280, heal: 70, shield: 60, level: 3 },
    ],
  },
  {
    id: 'berserker',
    name: 'Berserker',
    role: 'Fighter',
    hero: 'Torvik the Unchained',
    short: 'Torvik',
    title: 'Chief of the Skarn',
    motive: 'Rift ice drowned his hold; he will cut through anyone for land for his clan.',
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
      { key: 'W', name: 'Blood Up', kind: 'buff', cd: 12000, range: 0, ms: 4000, buff: { atk: 45 }, level: 1 },
      { key: 'E', name: 'Skyfall', kind: 'dash', cd: 10000, range: 300, radius: 100, damage: 60, slow: 1200, level: 1 },
      { key: 'R', name: 'Unchained', kind: 'buff', cd: 60000, range: 0, ms: 6000, buff: { dmg: 30, lifesteal: 20, speed: 20 }, level: 3 },
    ],
  },
  {
    id: 'harpooner',
    name: 'Harpooner',
    role: 'Catcher',
    hero: 'Morrow Deepline',
    short: 'Morrow',
    title: 'the Whaler',
    motive: 'The Rift Guardian sank his ship; whoever lets him at the beast gets his harpoon.',
    blurb: 'Hooks foes in, holds the line',
    perk: { desc: 'Deals 25% more to the Rift Guardian', beastDmg: 25 },
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
      { key: 'E', name: 'Hold Fast', kind: 'buff', cd: 12000, range: 0, ms: 3000, shield: 120, buff: { armor: 20 }, level: 1 },
      { key: 'R', name: 'Maelstrom', kind: 'zone', cd: 60000, range: 500, radius: 200, dps: 70, ms: 3000, slow: 1000, level: 3 },
    ],
  },
  {
    id: 'witch',
    name: 'Witch',
    role: 'Controller',
    hero: 'Gwyth of the Mire',
    short: 'Gwyth',
    title: 'the Bog Witch',
    motive: 'The overflow rots her mire; she curses anyone who would drain the Rift for gold.',
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
      { key: 'W', name: 'Mire Rot', kind: 'zone', cd: 9000, range: 550, radius: 120, dps: 45, ms: 3500, level: 1 },
      { key: 'E', name: 'Bramble Snare', kind: 'burst', cd: 12000, range: 500, radius: 90, damage: 40, stun: 1100, level: 1 },
      { key: 'R', name: 'Mire Bloom', kind: 'zone', cd: 60000, range: 600, radius: 240, dps: 70, ms: 4000, slow: 1500, level: 3 },
    ],
  },
  {
    id: 'stalker',
    name: 'Stalker',
    role: 'Ambusher',
    hero: 'Kaida Mistwalker',
    short: 'Kaida',
    title: 'Last of the Mistwalkers',
    motive: 'Her order of watchstone keepers was sold out; the traitor is a champion.',
    blurb: 'Vanishes, strikes from nowhere',
    perk: { desc: 'Takes watchstones twice as fast', captureRate: 100 },
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
      { key: 'Q', name: 'Mist Stars', kind: 'bolt', cd: 5000, range: 520, speed: 950, width: 22, damage: 50, count: 3, spread: 0.25, level: 1 },
      { key: 'W', name: 'Vanish', kind: 'buff', cd: 14000, range: 0, ms: 3000, buff: { stealth: true, speed: 30 }, level: 1 },
      { key: 'E', name: 'Pounce', kind: 'dash', cd: 9000, range: 260, radius: 80, damage: 70, stun: 500, level: 1 },
      { key: 'R', name: 'Final Mark', kind: 'bolt', cd: 60000, range: 700, speed: 1100, width: 30, damage: 200, executeBelow: 0.4, level: 3 },
    ],
  },
  {
    id: 'lancer',
    name: 'Lancer',
    role: 'Bruiser',
    hero: 'Dame Liora Highbanner',
    short: 'Liora',
    title: 'Knight of the Concord',
    motive: 'Carries a banner at every contest, to prove a sworn oath still means something.',
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
      { key: 'R', name: 'Rally', kind: 'ally', cd: 60000, range: 0, radius: 260, shield: 150, ms: 6000, buff: { armor: 15 }, level: 3 },
    ],
  },
  {
    id: 'gunslinger',
    name: 'Gunslinger',
    role: 'Marksman',
    hero: 'Rook Calloway',
    short: 'Rook',
    title: 'the Bounty Hunter',
    motive: 'A drifter from the rail towns; signs with whoever pays and hunts every bounty.',
    blurb: 'Six shots, smoke and a deadeye',
    perk: { desc: 'Claims 50% more bounty gold', bountyGold: 50 },
    color: '#c9925a',
    hp: 480,
    hpPerLevel: 72,
    dmg: 54,
    dmgPerLevel: 4.5,
    armor: 2,
    range: 400,
    speed: 128,
    attackMs: 850,
    passive: { name: 'Ricochet', desc: 'Shots hit beside for 35%', splash: 35, splashRadius: 90 },
    abilities: [
      { key: 'Q', name: 'Fan the Hammer', kind: 'bolt', cd: 5000, range: 560, speed: 1300, width: 20, damage: 42, count: 3, spread: 0.12, level: 1 },
      { key: 'W', name: 'Smoke Bomb', kind: 'zone', cd: 11000, range: 450, radius: 130, dps: 15, ms: 3000, slow: 1000, level: 1 },
      { key: 'E', name: 'Dodge Roll', kind: 'dash', cd: 9000, range: 200, level: 1 },
      { key: 'R', name: 'Last Round', kind: 'bolt', cd: 60000, range: 900, speed: 1500, width: 26, damage: 230, executeBelow: 0.3, level: 3 },
    ],
  },
  {
    id: 'automaton',
    name: 'Automaton',
    role: 'Tank',
    hero: 'AX-9 Boilerheart',
    short: 'AX-9',
    title: 'the Waking Engine',
    motive: 'Aether leaked into its boiler; it fights to learn whether it is alive.',
    blurb: 'Brass, steam and a rocket fist',
    color: '#d8a24a',
    hp: 700,
    hpPerLevel: 100,
    dmg: 46,
    dmgPerLevel: 3.5,
    armor: 8,
    range: 110,
    speed: 112,
    attackMs: 1000,
    passive: { name: 'Iron Hull', desc: 'Takes 12% less damage', tough: 12 },
    abilities: [
      { key: 'Q', name: 'Steam Vent', kind: 'burst', cd: 7000, range: 0, radius: 160, damage: 65, slow: 1200, level: 1 },
      { key: 'W', name: 'Overclock', kind: 'buff', cd: 13000, range: 0, ms: 4000, buff: { atk: 40, armor: 15 }, level: 1 },
      { key: 'E', name: 'Rocket Fist', kind: 'bolt', cd: 11000, range: 520, speed: 1000, width: 28, damage: 60, pull: true, stun: 500, level: 1 },
      { key: 'R', name: 'Heartburst', kind: 'burst', cd: 60000, range: 0, radius: 250, damage: 160, stun: 800, level: 3 },
    ],
  },
  {
    id: 'tinker',
    name: 'Tinker',
    role: 'Controller',
    hero: 'Winnie Voltwick',
    short: 'Winnie',
    title: 'Storm Engineer',
    motive: 'Her storm engine could replace the Rift taps, if only her banner wins.',
    blurb: 'Storm coils, jetpack, lightning',
    color: '#5fd3f0',
    hp: 480,
    hpPerLevel: 72,
    dmg: 48,
    dmgPerLevel: 3.5,
    armor: 2,
    range: 430,
    speed: 122,
    attackMs: 1000,
    passive: { name: 'Overcharge', desc: 'Abilities deal 15% more', spellpower: 15 },
    abilities: [
      { key: 'Q', name: 'Spark Bolt', kind: 'bolt', cd: 4500, range: 620, speed: 900, width: 26, damage: 75, stun: 300, level: 1 },
      { key: 'W', name: 'Coil Field', kind: 'zone', cd: 9000, range: 520, radius: 130, dps: 50, ms: 3500, slow: 800, level: 1 },
      { key: 'E', name: 'Jetpack', kind: 'dash', cd: 11000, range: 300, level: 1 },
      { key: 'R', name: 'Storm Engine', kind: 'zone', cd: 60000, range: 600, radius: 250, dps: 80, ms: 3000, slow: 1200, level: 3 },
    ],
  },
  {
    id: 'wolfkin',
    name: 'Wolfkin',
    role: 'Hunter',
    hero: 'Fenra Moonfang',
    short: 'Fenra',
    title: 'Packleader of the Greywood',
    motive: 'The wolf packs in the camps were her kin; she fights to draw the Rift out of them.',
    blurb: 'Half wolf, all teeth',
    color: '#9aa3ad',
    hp: 560,
    hpPerLevel: 84,
    dmg: 55,
    dmgPerLevel: 4.5,
    armor: 3,
    range: 110,
    speed: 135,
    attackMs: 780,
    passive: { name: 'Feral Hunger', desc: 'Heals 12% of attack damage', lifesteal: 12 },
    abilities: [
      { key: 'Q', name: 'Lunge', kind: 'dash', cd: 6000, range: 260, radius: 90, damage: 70, slow: 1000, level: 1 },
      { key: 'W', name: 'Pack Howl', kind: 'buff', cd: 12000, range: 0, ms: 4000, buff: { atk: 30, speed: 20 }, level: 1 },
      { key: 'E', name: 'Rend', kind: 'burst', cd: 8000, range: 0, radius: 130, damage: 65, slow: 1000, level: 1 },
      { key: 'R', name: 'Blood Moon', kind: 'buff', cd: 60000, range: 0, ms: 6000, buff: { dmg: 25, lifesteal: 25, speed: 25 }, level: 3 },
    ],
  },
  {
    id: 'bruin',
    name: 'Bruin',
    role: 'Brawler',
    hero: 'Old Grumm Oakback',
    short: 'Grumm',
    title: 'Keeper of the Hives',
    motive: 'Logging crews cut half his grove; he means to win the forest a voice.',
    blurb: 'A great bear who hits back',
    color: '#a0683a',
    hp: 680,
    hpPerLevel: 98,
    dmg: 50,
    dmgPerLevel: 4,
    armor: 6,
    range: 110,
    speed: 116,
    attackMs: 950,
    passive: { name: 'Thick Hide', desc: 'Heals 6 health a second', regen: 6 },
    abilities: [
      { key: 'Q', name: 'Maul', kind: 'burst', cd: 6000, range: 0, radius: 130, damage: 80, level: 1 },
      { key: 'W', name: 'Roar', kind: 'burst', cd: 10000, range: 0, radius: 220, damage: 30, slow: 1500, level: 1 },
      { key: 'E', name: 'Oak Charge', kind: 'dash', cd: 10000, range: 300, radius: 100, damage: 60, stun: 500, level: 1 },
      { key: 'R', name: 'Grovewrath', kind: 'buff', cd: 60000, range: 0, ms: 6000, shield: 150, buff: { dmg: 25, atk: 30, armor: 15 }, level: 3 },
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
  /** A consumable: buying it adds one to the champion's wards (`WARD.carry` at most) and takes no bag slot. */
  ward?: boolean;
  /** An elixir: buying it gives this buff for `ELIXIR.ms`, through death, and takes no bag slot. */
  elixir?: BuffDef;
}

/**
 * Bought at the shop by a champion standing near its Nexus. Each item can be owned once. The first
 * seven are parts (cheap, and the flask), the next five build from them, the Vision Ward is a
 * consumable (see `WARD`), and the three elixirs are timed buffs, one at a time (see `ELIXIR`).
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
  { id: 'ward', name: 'Vision Ward', cost: 75, ward: true },
  { id: 'wrath', name: 'Wrath Elixir', cost: 400, elixir: { dmg: 20 } },
  { id: 'iron', name: 'Iron Elixir', cost: 400, elixir: { armor: 15, regen: 4 } },
  { id: 'swift', name: 'Swift Elixir', cost: 400, elixir: { speed: 15, atk: 20 } },
];
/**
 * Elixirs last three minutes, through death; a new one replaces the one a champion has. An AI
 * champion buys one (`AI_ELIXIR` for its build) once its build is done and it has this much gold
 * to spare on top of the price.
 */
export const ELIXIR = { ms: 180_000, aiSpare: 300 };
export const AI_ELIXIR: Record<string, string> = { tank: 'iron', fighter: 'wrath', caster: 'swift' };
/** Each elixir's colour, for its buff chip and its gem in the shop. */
export const ELIXIR_COLOR: Record<string, string> = { wrath: '#ff5c4d', iron: '#b9c3cf', swift: '#5ce0c8' };
/** A champion carries at most this many items. */
export const MAX_ITEMS = 6;

export type ActiveId = 'dash' | 'flask' | 'ward';
export interface ActiveDef {
  id: ActiveId;
  /** The key that casts it, and the button's label. */
  key: 'D' | 'H' | 'V';
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
  { id: 'ward', key: 'V', name: 'Ward', cd: 0, range: 600 },
];

/**
 * Vision wards (LB6): a champion carries up to `carry` of them and plants one within `range` of
 * itself; it gives its team `SIGHT.ward` of sight there, bushes included, for `ms`, and dies to
 * `hits` hits of any kind. Its killer takes `gold`. The AI plants its wards at `WARD_SPOTS`.
 */
export const WARD = { carry: 2, range: 600, ms: 90_000, hits: 3, gold: 20, radius: 10 };
/** Where the AI likes its wards: the beast's pit and the three river islands; a team wards a spot once at a time. */
export const WARD_SPOTS: Vec[] = [{ x: 1950, y: 1950 }, { x: 850, y: 850 }, { x: 1200, y: 1200 }, { x: 1600, y: 1600 }];
/** An AI champion's ward goes at a spot this close to it that has no live ward of its team within `taken` px. */
export const WARD_AI = { reach: 600, taken: 320 };

/**
 * Recall (LB7): a champion channels `ms` standing still to go home to its Nexus. Taking damage,
 * moving, attacking or casting cancels it. An AI champion recalls when it is low with no enemy
 * about, or when it carries `rich` gold and something to spend it on.
 */
export const RECALL = { ms: 4000, aiLow: 0.35, aiLook: 700, rich: 900, aiEvery: 60_000 };

/**
 * Buy back (LB10): a dead champion pays `base` plus `perLevel` per level to respawn at once, then
 * waits `cd` before it may again. An AI champion buys back when an enemy champion stands within
 * `aiThreat` of its Nexus.
 */
export const BUYBACK = { base: 100, perLevel: 50, cd: 150_000, aiThreat: 800 };

/**
 * Kill streak bounties (LB8): a champion that has slain `streak` champions without dying carries a
 * bounty of `base` gold, `step` more per further kill up to `max`, paid to whoever slays it on top
 * of the kill gold. The AI's ganks go after the biggest bounty it can see, and twice as often.
 */
export const BOUNTY = { streak: 3, base: 100, step: 50, max: 300 };
/** The bounty a champion carries now, or 0. */
export function bountyOf(killStreak: number): number {
  return killStreak >= BOUNTY.streak ? Math.min(BOUNTY.max, BOUNTY.base + (killStreak - BOUNTY.streak) * BOUNTY.step) : 0;
}

/**
 * AI shopping (LB9): what an AI champion buys, in order, by its class's role, whenever it is home or
 * dead and can pay. A part is skipped once the item it builds into is owned; each build fills the
 * six slots. Roles not listed shop like a fighter.
 */
export const AI_BUILDS: Record<string, string[]> = {
  tank: ['flask', 'cloth', 'ruby', 'thorns', 'boots', 'belt', 'sword', 'phase', 'dagger', 'blade', 'sapphire'],
  fighter: ['flask', 'sword', 'dagger', 'blade', 'boots', 'phase', 'ruby', 'belt', 'cloth', 'thorns', 'sapphire'],
  caster: ['flask', 'sapphire', 'ruby', 'cloak', 'boots', 'sword', 'belt', 'phase', 'dagger', 'blade', 'cloth'],
};
export const AI_BUILD_FOR: Record<string, keyof typeof AI_BUILDS> = {
  Tank: 'tank',
  Bruiser: 'tank',
  Brawler: 'tank',
  Catcher: 'tank',
  Burst: 'caster',
  Support: 'caster',
  Controller: 'caster',
};

/** How close a champion must stand to its Nexus to shop. */
export const SHOP_RANGE = 700;
/** A champion within `radius` of its own Nexus heals `share` of its health a second. */
export const FOUNTAIN = { radius: 420, share: 0.12 };

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

/** The levels that offer an upgrade pair; the others past 1 rank up the R (`ULT_RANK_LEVELS`). */
export const UPGRADE_LEVELS = [2, 3, 4, 5, 7];
/** Levels 6 and 8 rank up the R: each rank adds `ULT_RANK`'s percents to its numbers. */
export const ULT_RANK_LEVELS = [6, 8];
export const ULT_RANK = { damage: 20, heal: 20, shield: 20, cd: -15 };

/** How many ranks the R has at a level (0 to 2). */
export const ultRank = (level: number) => ULT_RANK_LEVELS.filter((l) => level >= l).length;

const up = (id: string, key: AbilityKey, name: string, desc: string, fx: Partial<UpgradeDef>): UpgradeDef => ({ ...fx, id, key, name, desc });

/** Per champion, the two upgrades offered at each of `UPGRADE_LEVELS`, in order. */
export const UPGRADES: Record<string, [UpgradeDef, UpgradeDef][]> = {
  warden: [
    [up('wide-slam', 'Q', 'Wide Gatefall', 'Gatefall radius +30%', { radius: 30 }), up('stun-slam', 'Q', 'Stun Gatefall', 'Gatefall stuns for 0.6s', { stun: 600 })],
    [up('iron-bulwark', 'W', 'Iron Oath', 'Oathguard shield +40%', { shield: 40 }), up('long-charge', 'E', 'Long Rush', 'Gate Rush range +30%', { range: 30 })],
    [up('titan-stand', 'R', 'Iron Gate', 'Last Gate damage +25%', { damage: 25 }), up('quick-slam', 'Q', 'Quick Gatefall', 'Gatefall cooldown -25%', { cd: -25 })],
    [up('crushing-charge', 'E', 'Crushing Rush', 'Gate Rush damage +40%', { damage: 40 }), up('wide-bulwark', 'W', 'Wide Oath', 'Oathguard radius +40%', { radius: 40 })],
    [up('quick-oath', 'W', 'Unbroken Oath', 'Oathguard cooldown -30%', { cd: -30 }), up('gatebreaker', 'E', 'Gatebreaker', 'Gate Rush stuns 0.4s longer', { stun: 400 })],
  ],
  blade: [
    [up('deep-strike', 'Q', 'Deep Cut', 'Quick Cut range +30%', { range: 30 }), up('keen-strike', 'Q', 'Keen Cut', 'Quick Cut damage +30%', { damage: 30 })],
    [up('wide-whirl', 'W', 'Wide Wind', 'Cutwind radius +30%', { radius: 30 }), up('quick-step', 'E', 'Quick Step', 'Shadow Step cooldown -30%', { cd: -30 })],
    [up('brutal-execute', 'R', 'Final Word', 'Last Word damage +25%', { damage: 25 }), up('crippling-whirl', 'W', 'Crippling Wind', 'Cutwind slows for 1.2s', { slow: 1200 })],
    [up('swift-strike', 'Q', 'Swift Cut', 'Quick Cut cooldown -25%', { cd: -25 }), up('long-step', 'E', 'Long Step', 'Shadow Step range +30%', { range: 30 })],
    [up('debt-collected', 'R', 'Debt Collected', 'Last Word cooldown -30%', { cd: -30 }), up('twin-wind', 'W', 'Twin Wind', 'Cutwind damage +40%', { damage: 40 })],
  ],
  archer: [
    [up('heavy-arrow', 'Q', 'Heavy Seeker', 'Heartseeker damage +30%', { damage: 30 }), up('wide-volley', 'W', 'Wide Feathers', 'Featherfall fires 2 more arrows', { count: 2 })],
    [up('long-roll', 'E', 'Long Tumble', 'Tumble range +40%', { range: 40 }), up('quick-arrow', 'Q', 'Quick Seeker', 'Heartseeker cooldown -25%', { cd: -25 })],
    [up('wide-rain', 'R', 'Wide Hail', 'Hailstorm radius +30%', { radius: 30 }), up('hard-volley', 'W', 'Hard Feathers', 'Featherfall damage +30%', { damage: 30 })],
    [up('pinning-arrow', 'Q', 'Pinning Seeker', 'Heartseeker stuns for 0.5s', { stun: 500 }), up('heavy-rain', 'R', 'Heavy Hail', 'Hailstorm damage +25%', { damage: 25 })],
    [up('long-hail', 'R', 'Long Hail', 'Hailstorm lasts 40% longer', { ms: 40 }), up('quick-tumble', 'E', 'Quick Tumble', 'Tumble cooldown -30%', { cd: -30 })],
  ],
  mage: [
    [up('big-fireball', 'Q', 'Big Riftflame', 'Riftflame damage +30%', { damage: 30 }), up('swift-fireball', 'Q', 'Swift Riftflame', 'Riftflame cooldown -25%', { cd: -25 })],
    [up('deep-freeze', 'W', 'Deep Rime', 'Rime Ring stuns for 0.6s', { stun: 600 }), up('far-blink', 'E', 'Far Fold', 'Fold Step range +30%', { range: 30 })],
    [up('huge-meteor', 'R', 'Huge Starfall', 'Starfall radius +30%', { radius: 30 }), up('wide-nova', 'W', 'Wide Ring', 'Rime Ring radius +30%', { radius: 30 })],
    [up('long-fireball', 'Q', 'Long Riftflame', 'Riftflame range +30%', { range: 30 }), up('heavy-meteor', 'R', 'Heavy Starfall', 'Starfall damage +25%', { damage: 25 })],
    [up('quick-fold', 'E', 'Quick Fold', 'Fold Step cooldown -30%', { cd: -30 }), up('hard-rime', 'W', 'Hard Rime', 'Rime Ring damage +40%', { damage: 40 })],
  ],
  priest: [
    [up('deep-mend', 'W', 'Deep Mend', 'Mend heals +30%', { heal: 30 }), up('wide-mend', 'W', 'Wide Mend', 'Mend radius +30%', { radius: 30 })],
    [up('holy-smite', 'Q', 'Bright Lance', 'Sunlance damage +30%', { damage: 30 }), up('strong-ward', 'E', 'Strong Veil', 'Dawn Veil shield +40%', { shield: 40 })],
    [up('wide-sanctuary', 'R', 'Loud Bell', 'Noon Bell radius +25%', { radius: 25 }), up('quick-ward', 'E', 'Quick Veil', 'Dawn Veil cooldown -25%', { cd: -25 })],
    [up('binding-smite', 'Q', 'Binding Lance', 'Sunlance stuns for 0.5s', { stun: 500 }), up('quick-mend', 'W', 'Quick Mend', 'Mend cooldown -25%', { cd: -25 })],
    [up('bright-bell', 'R', 'Bright Bell', 'Noon Bell heals +40%', { heal: 40 }), up('long-lance', 'Q', 'Long Lance', 'Sunlance range +30%', { range: 30 })],
  ],
  berserker: [
    [up('wide-cleave', 'Q', 'Wide Cleave', 'Cleave radius +30%', { radius: 30 }), up('savage-cleave', 'Q', 'Savage Cleave', 'Cleave damage +30%', { damage: 30 })],
    [up('long-frenzy', 'W', 'Long Blood', 'Blood Up lasts 50% longer', { ms: 50 }), up('far-leap', 'E', 'Far Skyfall', 'Skyfall range +30%', { range: 30 })],
    [up('endless-rampage', 'R', 'Endless Chains', 'Unchained lasts 40% longer', { ms: 40 }), up('crushing-leap', 'E', 'Crushing Skyfall', 'Skyfall stuns for 0.5s', { stun: 500 })],
    [up('quick-cleave', 'Q', 'Quick Cleave', 'Cleave cooldown -25%', { cd: -25 }), up('quick-frenzy', 'W', 'Quick Blood', 'Blood Up cooldown -30%', { cd: -30 })],
    [up('quick-skyfall', 'E', 'Quick Skyfall', 'Skyfall cooldown -30%', { cd: -30 }), up('quick-chains', 'R', 'Quick Chains', 'Unchained cooldown -30%', { cd: -30 })],
  ],
  harpooner: [
    [up('long-harpoon', 'Q', 'Long Harpoon', 'Harpoon range +25%', { range: 25 }), up('barbed-harpoon', 'Q', 'Barbed Harpoon', 'Harpoon damage +40%', { damage: 40 })],
    [up('deep-undertow', 'W', 'Deep Riptide', 'Riptide radius +30%', { radius: 30 }), up('iron-brace', 'E', 'Iron Grip', 'Hold Fast shield +50%', { shield: 50 })],
    [up('wide-maelstrom', 'R', 'Wide Maelstrom', 'Maelstrom radius +25%', { radius: 25 }), up('quick-harpoon', 'Q', 'Quick Harpoon', 'Harpoon cooldown -25%', { cd: -25 })],
    [up('stunning-undertow', 'W', 'Stunning Riptide', 'Riptide stuns for 0.5s', { stun: 500 }), up('raging-maelstrom', 'R', 'Raging Maelstrom', 'Maelstrom damage +30%', { damage: 30 })],
    [up('long-maelstrom', 'R', 'Long Maelstrom', 'Maelstrom lasts 40% longer', { ms: 40 }), up('quick-hold', 'E', 'Quick Hold', 'Hold Fast cooldown -30%', { cd: -30 })],
  ],
  witch: [
    [up('cruel-hex', 'Q', 'Cruel Hex', 'Hex Bolt damage +30%', { damage: 30 }), up('lasting-blight', 'W', 'Lasting Rot', 'Mire Rot lasts 40% longer', { ms: 40 })],
    [up('wide-snare', 'E', 'Wide Snare', 'Bramble Snare radius +40%', { radius: 40 }), up('quick-hex', 'Q', 'Quick Hex', 'Hex Bolt cooldown -25%', { cd: -25 })],
    [up('wide-plague', 'R', 'Wide Bloom', 'Mire Bloom radius +25%', { radius: 25 }), up('foul-blight', 'W', 'Foul Rot', 'Mire Rot damage +35%', { damage: 35 })],
    [up('deep-roots', 'E', 'Deep Roots', 'Bramble Snare holds 0.5s longer', { stun: 500 }), up('long-plague', 'R', 'Long Bloom', 'Mire Bloom lasts 30% longer', { ms: 30 })],
    [up('wide-rot', 'W', 'Wide Rot', 'Mire Rot radius +30%', { radius: 30 }), up('quick-snare', 'E', 'Quick Snare', 'Bramble Snare cooldown -30%', { cd: -30 })],
  ],
  stalker: [
    [up('sharp-shuriken', 'Q', 'Sharp Stars', 'Mist Stars damage +30%', { damage: 30 }), up('wide-fan', 'Q', 'Wide Stars', 'Mist Stars throws 2 more', { count: 2 })],
    [up('long-vanish', 'W', 'Long Vanish', 'Vanish lasts 50% longer', { ms: 50 }), up('far-pounce', 'E', 'Far Pounce', 'Pounce range +30%', { range: 30 })],
    [up('deadly-mark', 'R', 'Deadly Mark', 'Final Mark damage +25%', { damage: 25 }), up('quick-vanish', 'W', 'Quick Vanish', 'Vanish cooldown -30%', { cd: -30 })],
    [up('stunning-pounce', 'E', 'Stunning Pounce', 'Pounce stuns 0.4s longer', { stun: 400 }), up('quick-shuriken', 'Q', 'Quick Stars', 'Mist Stars cooldown -25%', { cd: -25 })],
    [up('quick-pounce', 'E', 'Quick Pounce', 'Pounce cooldown -30%', { cd: -30 }), up('long-stars', 'Q', 'Long Stars', 'Mist Stars range +30%', { range: 30 })],
  ],
  lancer: [
    [up('long-thrust', 'Q', 'Long Thrust', 'Thrust range +30%', { range: 30 }), up('hard-thrust', 'Q', 'Hard Thrust', 'Thrust damage +30%', { damage: 30 })],
    [up('wide-sweep', 'W', 'Wide Sweep', 'Sweep radius +25%', { radius: 25 }), up('high-vault', 'E', 'High Vault', 'Vault range +30%', { range: 30 })],
    [up('iron-phalanx', 'R', 'Iron Rally', 'Rally shield +40%', { shield: 40 }), up('crippling-sweep', 'W', 'Crippling Sweep', 'Sweep slows for 1.2s', { slow: 1200 })],
    [up('stunning-vault', 'E', 'Stunning Vault', 'Vault stuns 0.4s longer', { stun: 400 }), up('quick-thrust', 'Q', 'Quick Thrust', 'Thrust cooldown -25%', { cd: -25 })],
    [up('quick-rally', 'R', 'Quick Rally', 'Rally cooldown -30%', { cd: -30 }), up('hard-sweep', 'W', 'Hard Sweep', 'Sweep damage +40%', { damage: 40 })],
  ],
  gunslinger: [
    [up('more-hammer', 'Q', 'Six Shooter', 'Fan the Hammer fires 2 more', { count: 2 }), up('hot-lead', 'Q', 'Hot Lead', 'Fan the Hammer damage +30%', { damage: 30 })],
    [up('thick-smoke', 'W', 'Thick Smoke', 'Smoke Bomb radius +30%', { radius: 30 }), up('quick-roll', 'E', 'Quick Roll', 'Dodge Roll cooldown -30%', { cd: -30 })],
    [up('steady-aim', 'R', 'Steady Aim', 'Last Round damage +25%', { damage: 25 }), up('long-smoke', 'W', 'Long Smoke', 'Smoke Bomb lasts 40% longer', { ms: 40 })],
    [up('stunning-shot', 'Q', 'Stunning Shot', 'Fan the Hammer stuns 0.3s', { stun: 300 }), up('quick-hammer', 'Q', 'Quick Hammer', 'Fan the Hammer cooldown -25%', { cd: -25 })],
    [up('quick-draw', 'R', 'Quick Draw', 'Last Round cooldown -30%', { cd: -30 }), up('far-roll', 'E', 'Far Roll', 'Dodge Roll range +30%', { range: 30 })],
  ],
  automaton: [
    [up('wide-vent', 'Q', 'Wide Vent', 'Steam Vent radius +30%', { radius: 30 }), up('scalding-vent', 'Q', 'Scalding Vent', 'Steam Vent damage +30%', { damage: 30 })],
    [up('long-overclock', 'W', 'Long Overclock', 'Overclock lasts 50% longer', { ms: 50 }), up('long-fist', 'E', 'Long Fist', 'Rocket Fist range +25%', { range: 25 })],
    [up('big-overload', 'R', 'Big Heartburst', 'Heartburst radius +25%', { radius: 25 }), up('quick-vent', 'Q', 'Quick Vent', 'Steam Vent cooldown -25%', { cd: -25 })],
    [up('heavy-fist', 'E', 'Heavy Fist', 'Rocket Fist damage +40%', { damage: 40 }), up('quick-overclock', 'W', 'Quick Overclock', 'Overclock cooldown -30%', { cd: -30 })],
    [up('quick-fist', 'E', 'Quick Fist', 'Rocket Fist cooldown -30%', { cd: -30 }), up('hot-heart', 'R', 'Hot Heart', 'Heartburst damage +30%', { damage: 30 })],
  ],
  tinker: [
    [up('hot-spark', 'Q', 'Hot Spark', 'Spark Bolt damage +30%', { damage: 30 }), up('quick-spark', 'Q', 'Quick Spark', 'Spark Bolt cooldown -25%', { cd: -25 })],
    [up('wide-field', 'W', 'Wide Coil', 'Coil Field radius +30%', { radius: 30 }), up('long-jet', 'E', 'Long Jet', 'Jetpack range +30%', { range: 30 })],
    [up('wide-storm', 'R', 'Wide Storm', 'Storm Engine radius +25%', { radius: 25 }), up('strong-field', 'W', 'Strong Coil', 'Coil Field damage +35%', { damage: 35 })],
    [up('stunning-spark', 'Q', 'Stunning Spark', 'Spark Bolt stuns 0.4s longer', { stun: 400 }), up('long-storm', 'R', 'Long Storm', 'Storm Engine lasts 30% longer', { ms: 30 })],
    [up('quick-coil', 'W', 'Quick Coil', 'Coil Field cooldown -30%', { cd: -30 }), up('long-spark', 'Q', 'Long Spark', 'Spark Bolt range +30%', { range: 30 })],
  ],
  wolfkin: [
    [up('far-lunge', 'Q', 'Far Lunge', 'Lunge range +30%', { range: 30 }), up('savage-lunge', 'Q', 'Savage Lunge', 'Lunge damage +30%', { damage: 30 })],
    [up('long-howl', 'W', 'Long Howl', 'Pack Howl lasts 50% longer', { ms: 50 }), up('wide-rend', 'E', 'Wide Rend', 'Rend radius +30%', { radius: 30 })],
    [up('long-moon', 'R', 'Long Moon', 'Blood Moon lasts 40% longer', { ms: 40 }), up('quick-lunge', 'Q', 'Quick Lunge', 'Lunge cooldown -25%', { cd: -25 })],
    [up('deep-rend', 'E', 'Deep Rend', 'Rend damage +40%', { damage: 40 }), up('quick-howl', 'W', 'Quick Howl', 'Pack Howl cooldown -30%', { cd: -30 })],
    [up('quick-rend', 'E', 'Quick Rend', 'Rend cooldown -30%', { cd: -30 }), up('red-moon', 'R', 'Red Moon', 'Blood Moon cooldown -30%', { cd: -30 })],
  ],
  bruin: [
    [up('wide-maul', 'Q', 'Wide Maul', 'Maul radius +30%', { radius: 30 }), up('heavy-maul', 'Q', 'Heavy Maul', 'Maul damage +30%', { damage: 30 })],
    [up('loud-roar', 'W', 'Loud Roar', 'Roar radius +25%', { radius: 25 }), up('long-rush', 'E', 'Long Charge', 'Oak Charge range +30%', { range: 30 })],
    [up('long-wrath', 'R', 'Long Wrath', 'Grovewrath lasts 40% longer', { ms: 40 }), up('quick-maul', 'Q', 'Quick Maul', 'Maul cooldown -25%', { cd: -25 })],
    [up('stunning-roar', 'W', 'Stunning Roar', 'Roar stuns for 0.5s', { stun: 500 }), up('crushing-rush', 'E', 'Crushing Charge', 'Oak Charge damage +40%', { damage: 40 })],
    [up('quick-roar', 'W', 'Quick Roar', 'Roar cooldown -30%', { cd: -30 }), up('quick-wrath', 'R', 'Quick Wrath', 'Grovewrath cooldown -30%', { cd: -30 })],
  ],
};

/** The upgrade pair a level offers a champion, or undefined (a rank-up level, or none left). */
export function upgradePairAt(champId: string, level: number): [UpgradeDef, UpgradeDef] | undefined {
  const i = UPGRADE_LEVELS.indexOf(level);
  return i < 0 ? undefined : UPGRADES[champId]?.[i];
}

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
