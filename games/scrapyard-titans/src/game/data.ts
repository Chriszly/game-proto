/**
 * Every rule and number of Scrapyard Titans: the robots, their traits, the parts and items, the
 * power cards, the commanders, the neutral monsters and the round schedule. The sim (`battle.ts`)
 * and the match (`match.ts`) read these; nothing here changes during a match.
 */

export type SetId = 'scrap' | 'neon';
export type OriginId = 'heavy' | 'drone' | 'sparker' | 'magnet' | 'salvager' | 'neon' | 'hacker';
export type ClassId = 'guardian' | 'brawler' | 'gunner' | 'sniper' | 'saboteur' | 'mechanic';
export type TraitId = OriginId | ClassId;
export type AbilityKind = 'shield' | 'slam' | 'barrage' | 'snipe' | 'backstab' | 'repair';

export interface UnitDef {
  id: string;
  name: string;
  cost: 1 | 2 | 3 | 4 | 5;
  origin: OriginId;
  cls: ClassId;
}

export interface SetDef {
  id: SetId;
  name: string;
  /** One line for the menu: the season's twist. */
  blurb: string;
  origins: OriginId[];
}

/** Two seasons, each a roster of 30 robots: three origins are shared, two are the season's own. */
export const SETS: SetDef[] = [
  {
    id: 'scrap',
    name: 'Season 1: Scrap Rush',
    blurb: 'Every fight you win earns a scrap token; three tokens build a free part.',
    origins: ['heavy', 'drone', 'sparker', 'magnet', 'salvager'],
  },
  {
    id: 'neon',
    name: 'Season 2: Overcharge',
    blurb: 'Every robot starts its fights with 20 extra charge.',
    origins: ['heavy', 'drone', 'sparker', 'neon', 'hacker'],
  },
];

/** Scrap tokens a Scrap Rush win pays, and how many build a part. */
export const SCRAP_TOKENS_PER_PART = 3;
/** Extra starting charge every robot gets in the Overcharge season. */
export const OVERCHARGE_MANA = 20;

const u = (id: string, name: string, cost: UnitDef['cost'], origin: OriginId, cls: ClassId): UnitDef => ({ id, name, cost, origin, cls });

export const UNITS: UnitDef[] = [
  // Heavy: scrap iron and rivets.
  u('rustbucket', 'Rustbucket', 1, 'heavy', 'guardian'),
  u('piston-pete', 'Piston Pete', 2, 'heavy', 'brawler'),
  u('demo-drill', 'Demo Drill', 2, 'heavy', 'saboteur'),
  u('boomer-box', 'Boomer Box', 3, 'heavy', 'gunner'),
  u('long-tom', 'Long Tom', 4, 'heavy', 'sniper'),
  u('forge-mother', 'Forge Mother', 5, 'heavy', 'mechanic'),
  // Drone: rotors instead of legs.
  u('zip-drone', 'Zip Drone', 1, 'drone', 'saboteur'),
  u('buzz-hover', 'Buzz Hover', 1, 'drone', 'gunner'),
  u('kite-eye', 'Kite Eye', 2, 'drone', 'sniper'),
  u('swarm-mother', 'Swarm Mother', 3, 'drone', 'mechanic'),
  u('hover-bulwark', 'Hover Bulwark', 4, 'drone', 'guardian'),
  u('talon-prime', 'Talon Prime', 5, 'drone', 'brawler'),
  // Sparker: coils and lightning.
  u('coil-kid', 'Coil Kid', 1, 'sparker', 'mechanic'),
  u('static-fist', 'Static Fist', 1, 'sparker', 'brawler'),
  u('ohm-wall', 'Ohm Wall', 2, 'sparker', 'guardian'),
  u('arc-lancer', 'Arc Lancer', 3, 'sparker', 'sniper'),
  u('jolt-jackal', 'Jolt Jackal', 3, 'sparker', 'saboteur'),
  u('thunderhead', 'Thunderhead', 5, 'sparker', 'gunner'),
  // Magnet (Scrap Rush): horseshoe heads that bend armour.
  u('clamp-jaw', 'Clamp Jaw', 1, 'magnet', 'brawler'),
  u('crane-claw', 'Crane Claw', 2, 'magnet', 'mechanic'),
  u('polar-pair', 'Polar Pair', 2, 'magnet', 'gunner'),
  u('lodestone', 'Lodestone', 3, 'magnet', 'guardian'),
  u('snap-trap', 'Snap Trap', 4, 'magnet', 'saboteur'),
  u('field-marshal', 'Field Marshal', 5, 'magnet', 'sniper'),
  // Salvager (Scrap Rush): patched together from the fallen.
  u('tin-scrounger', 'Tin Scrounger', 1, 'salvager', 'saboteur'),
  u('heap-hulk', 'Heap Hulk', 2, 'salvager', 'guardian'),
  u('rust-eye', 'Rust Eye', 3, 'salvager', 'sniper'),
  u('patchwork', 'Patchwork', 4, 'salvager', 'mechanic'),
  u('rivet-gunner', 'Rivet Gunner', 4, 'salvager', 'gunner'),
  u('wreck-king', 'Wreck King', 5, 'salvager', 'brawler'),
  // Neon (Overcharge): glowing tubes, bigger abilities.
  u('glow-grunt', 'Glow Grunt', 1, 'neon', 'guardian'),
  u('laser-lily', 'Laser Lily', 1, 'neon', 'gunner'),
  u('neon-knuckles', 'Neon Knuckles', 2, 'neon', 'brawler'),
  u('flicker', 'Flicker', 3, 'neon', 'saboteur'),
  u('prism-eye', 'Prism Eye', 4, 'neon', 'sniper'),
  u('lumen-fixer', 'Lumen Fixer', 5, 'neon', 'mechanic'),
  // Hacker (Overcharge): screens for faces, drain enemy charge.
  u('glitch-fist', 'Glitch Fist', 1, 'hacker', 'brawler'),
  u('packet', 'Packet', 2, 'hacker', 'gunner'),
  u('patch-bot', 'Patch Bot', 2, 'hacker', 'mechanic'),
  u('firewall', 'Firewall', 3, 'hacker', 'guardian'),
  u('trojan', 'Trojan', 4, 'hacker', 'saboteur'),
  u('kernel', 'Kernel', 5, 'hacker', 'sniper'),
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(UNITS.map((d) => [d.id, d]));

export function rosterOf(set: SetId): UnitDef[] {
  const origins = SETS.find((s) => s.id === set)!.origins;
  return UNITS.filter((d) => origins.includes(d.origin));
}

export interface ClassStats {
  hp: number;
  atk: number;
  /** Attacks per second. */
  as: number;
  /** In tiles; 1 is melee (the eight tiles around). */
  range: number;
  armor: number;
  mana: number;
  startMana: number;
  ability: AbilityKind;
  /** The ability's strength at cost 1 and 1 star: shield, damage or heal. */
  power: number;
  abilityName: string;
}

export const CLASS_STATS: Record<ClassId, ClassStats> = {
  guardian: { hp: 760, atk: 45, as: 0.6, range: 1, armor: 40, mana: 80, startMana: 30, ability: 'shield', power: 380, abilityName: 'Plate Up: shields itself' },
  brawler: { hp: 720, atk: 55, as: 0.65, range: 1, armor: 25, mana: 70, startMana: 20, ability: 'slam', power: 170, abilityName: 'Ground Pound: hits and stuns the tiles around it' },
  gunner: { hp: 520, atk: 48, as: 0.75, range: 3, armor: 15, mana: 60, startMana: 0, ability: 'barrage', power: 75, abilityName: 'Barrage: fires 4 shells at random enemies' },
  sniper: { hp: 460, atk: 62, as: 0.6, range: 4, armor: 10, mana: 70, startMana: 10, ability: 'snipe', power: 330, abilityName: 'Long Shot: a heavy round at the farthest enemy' },
  saboteur: { hp: 560, atk: 60, as: 0.8, range: 1, armor: 15, mana: 60, startMana: 0, ability: 'backstab', power: 260, abilityName: 'Backstab: blinks to the weakest enemy and strikes' },
  mechanic: { hp: 560, atk: 40, as: 0.6, range: 2, armor: 20, mana: 70, startMana: 20, ability: 'repair', power: 250, abilityName: 'Patch Job: repairs and shields the most hurt ally' },
};

/** Health and attack multiply by this for each star above one. */
export const STAR_STAT = 1.8;
/** Ability power by star. */
export const STAR_POWER = [1, 1.6, 2.6];
/** Each cost step above 1 raises health, attack and ability power by these fractions. */
export const COST_SCALE = { hp: 0.22, atk: 0.2, power: 0.35 };
/** Five-cost robots hit a wider area or fire more shells. */
export const BIG_ABILITY_COST = 5;

export interface TraitDef {
  id: TraitId;
  name: string;
  /** Units needed for each tier. */
  tiers: number[];
  /** The bonus at each tier, used by the sim as the trait reads it. */
  values: number[];
  /** What the bonus does, with {v} for the tier's value. */
  text: string;
  kind: 'origin' | 'class';
}

export const TRAITS: Record<TraitId, TraitDef> = {
  heavy: { id: 'heavy', name: 'Heavy', kind: 'origin', tiers: [2, 4, 6], values: [25, 50, 90], text: 'Heavy robots gain {v} armour.' },
  drone: { id: 'drone', name: 'Drone', kind: 'origin', tiers: [2, 4, 6], values: [20, 35, 55], text: 'Drones dodge {v}% of attacks.' },
  sparker: { id: 'sparker', name: 'Sparker', kind: 'origin', tiers: [2, 4, 6], values: [80, 170, 300], text: 'When a Sparker casts, lightning hits 3 enemies for {v}.' },
  magnet: { id: 'magnet', name: 'Magnet', kind: 'origin', tiers: [2, 4, 6], values: [15, 30, 50], text: 'Enemies lose {v} armour.' },
  salvager: { id: 'salvager', name: 'Salvager', kind: 'origin', tiers: [2, 4, 6], values: [8, 16, 28], text: 'Each time an ally falls, Salvagers gain {v}% attack speed.' },
  neon: { id: 'neon', name: 'Neon', kind: 'origin', tiers: [2, 4, 6], values: [30, 65, 115], text: 'Neon abilities are {v}% stronger.' },
  hacker: { id: 'hacker', name: 'Hacker', kind: 'origin', tiers: [2, 4, 6], values: [20, 35, 55], text: 'Enemies gain {v}% less charge.' },
  guardian: { id: 'guardian', name: 'Guardian', kind: 'class', tiers: [2, 4], values: [25, 55], text: 'All your robots gain {v} armour.' },
  brawler: { id: 'brawler', name: 'Brawler', kind: 'class', tiers: [2, 4], values: [250, 550], text: 'Brawlers gain {v} health.' },
  gunner: { id: 'gunner', name: 'Gunner', kind: 'class', tiers: [2, 4], values: [20, 50], text: 'Gunners attack {v}% faster.' },
  sniper: { id: 'sniper', name: 'Sniper', kind: 'class', tiers: [2, 4], values: [20, 50], text: 'Snipers deal {v}% more damage.' },
  saboteur: { id: 'saboteur', name: 'Saboteur', kind: 'class', tiers: [2, 4], values: [15, 30], text: 'Saboteurs gain {v}% critical chance.' },
  mechanic: { id: 'mechanic', name: 'Mechanic', kind: 'class', tiers: [2, 4], values: [15, 40], text: 'All your robots repair {v} health a second.' },
};

export const ORIGIN_COLOR: Record<OriginId, number> = {
  heavy: 0xd9822b,
  drone: 0x4fc3f7,
  sparker: 0xffd34d,
  magnet: 0xe0566a,
  salvager: 0x8bbf5a,
  neon: 0xff5cf0,
  hacker: 0x39e58c,
};

/** Cost colours on cards and pips: grey, green, blue, purple, gold. */
export const COST_COLOR = [0, 0xa8b2c8, 0x4ccf6a, 0x5aa9ff, 0xc78bff, 0xffd166];

// ---------------------------------------------------------------- parts and items

export type PartId = 'saw' | 'servo' | 'plate' | 'cell' | 'cap' | 'scope';
export const PARTS: PartId[] = ['saw', 'servo', 'plate', 'cell', 'cap', 'scope'];

export interface Stats {
  atk?: number;
  /** Attack speed, as a fraction (0.15 = 15% faster). */
  as?: number;
  armor?: number;
  hp?: number;
  mana?: number;
  crit?: number;
}

export type Special =
  | 'dmgPct' | 'cleave' | 'thorns' | 'lifesteal' | 'manaOnHit' | 'critDmg' | 'rampAS' | 'dodge' | 'regen'
  | 'manaRegen' | 'range' | 'shieldStart' | 'hpPct' | 'abilityResist' | 'ccImmune' | 'revive' | 'healOnCast'
  | 'goldOnKill' | 'spellPower' | 'spellCrit' | 'execute';

export interface ItemDef {
  id: string;
  name: string;
  /** The two parts it is built from; empty for a part. */
  from: PartId[];
  stats: Stats;
  special?: { kind: Special; value: number };
  text: string;
}

const PART_DEFS: Record<PartId, ItemDef> = {
  saw: { id: 'saw', name: 'Buzzsaw', from: [], stats: { atk: 15 }, text: '+15 attack' },
  servo: { id: 'servo', name: 'Servo', from: [], stats: { as: 0.15 }, text: '+15% attack speed' },
  plate: { id: 'plate', name: 'Plating', from: [], stats: { armor: 25 }, text: '+25 armour' },
  cell: { id: 'cell', name: 'Fuel Cell', from: [], stats: { hp: 180 }, text: '+180 health' },
  cap: { id: 'cap', name: 'Capacitor', from: [], stats: { mana: 15 }, text: '+15 starting charge' },
  scope: { id: 'scope', name: 'Scope', from: [], stats: { crit: 0.12 }, text: '+12% critical chance' },
};

const combo = (a: PartId, b: PartId, id: string, name: string, special: Special, value: number, text: string): ItemDef => {
  const stats: Stats = {};
  for (const p of [a, b]) for (const [k, v] of Object.entries(PART_DEFS[p].stats)) stats[k as keyof Stats] = (stats[k as keyof Stats] ?? 0) + v;
  return { id, name, from: [a, b], stats, special: { kind: special, value }, text };
};

const COMBOS: ItemDef[] = [
  combo('saw', 'saw', 'twin-saw', 'Twin Buzzsaw', 'dmgPct', 0.25, 'Deals 25% more damage.'),
  combo('saw', 'servo', 'chain-saw', 'Chain Saw', 'cleave', 0.4, 'Attacks also hit enemies next to the target for 40%.'),
  combo('saw', 'plate', 'spiked-hull', 'Spiked Hull', 'thorns', 0.3, 'Returns 30% of attack damage taken.'),
  combo('saw', 'cell', 'blood-pump', 'Oil Pump', 'lifesteal', 0.25, 'Heals for 25% of attack damage dealt.'),
  combo('saw', 'cap', 'arc-blade', 'Arc Blade', 'manaOnHit', 6, 'Each attack gives 6 more charge.'),
  combo('saw', 'scope', 'laser-edge', 'Laser Edge', 'critDmg', 0.4, 'Critical hits deal 40% more.'),
  combo('servo', 'servo', 'overclocker', 'Overclocker', 'rampAS', 0.05, 'Each attack adds 5% attack speed, up to 50%.'),
  combo('servo', 'plate', 'shock-absorber', 'Shock Absorber', 'dodge', 0.2, 'Dodges 20% of attacks.'),
  combo('servo', 'cell', 'turbo-tank', 'Turbo Tank', 'regen', 0.02, 'Repairs 2% of its health a second.'),
  combo('servo', 'cap', 'rapid-charger', 'Rapid Charger', 'manaRegen', 5, 'Gains 5 charge a second.'),
  combo('servo', 'scope', 'range-finder', 'Range Finder', 'range', 1, '+1 attack range.'),
  combo('plate', 'plate', 'fortress-plate', 'Fortress Plate', 'shieldStart', 300, 'Starts each fight with a 300 shield.'),
  combo('plate', 'cell', 'bulkhead', 'Bulkhead', 'hpPct', 0.2, '+20% health.'),
  combo('plate', 'cap', 'ion-shield', 'Ion Shield', 'abilityResist', 0.35, 'Takes 35% less damage from abilities.'),
  combo('plate', 'scope', 'mirror-plating', 'Mirror Plating', 'ccImmune', 1, 'Cannot be stunned.'),
  combo('cell', 'cell', 'reactor-core', 'Reactor Core', 'revive', 0.3, 'Restarts once with 30% health.'),
  combo('cell', 'cap', 'spare-battery', 'Spare Battery', 'healOnCast', 160, 'Repairs itself 160 when it casts.'),
  combo('cell', 'scope', 'salvage-scanner', 'Salvage Scanner', 'goldOnKill', 1, 'Each kill it lands pays 1 gold.'),
  combo('cap', 'cap', 'power-cell', 'Power Cell', 'spellPower', 0.4, 'Abilities are 40% stronger.'),
  combo('cap', 'scope', 'targeting-chip', 'Targeting Chip', 'spellCrit', 1, 'Abilities can critically hit.'),
  combo('scope', 'scope', 'eagle-optics', 'Eagle Optics', 'execute', 0.15, 'Finishes enemies below 15% health.'),
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries([...Object.values(PART_DEFS), ...COMBOS].map((i) => [i.id, i]));

/** The finished item two parts build, whichever order they come in. */
export function comboOf(a: PartId, b: PartId): ItemDef {
  return COMBOS.find((c) => (c.from[0] === a && c.from[1] === b) || (c.from[0] === b && c.from[1] === a))!;
}

export function isPart(id: string): id is PartId {
  return (PARTS as string[]).includes(id);
}

/** Items a robot can carry. */
export const MAX_ITEMS = 3;
/** Parts and items waiting to be bolted on. */
export const ITEM_BENCH = 10;

// ---------------------------------------------------------------- power cards

export type AugmentId =
  | 'spare-parts' | 'front-plates' | 'overtime' | 'hot-wiring' | 'level-up' | 'recycler' | 'thick-hull'
  | 'rapid-fire' | 'last-stand' | 'lucky-bolt' | 'gold-rush' | 'duplicator' | 'scrap-dividend' | 'big-battery' | 'war-chest';

export interface AugmentDef {
  id: AugmentId;
  name: string;
  text: string;
}

export const AUGMENTS: AugmentDef[] = [
  { id: 'spare-parts', name: 'Spare Parts', text: 'Gain 2 random parts now.' },
  { id: 'front-plates', name: 'Front Plates', text: 'Robots in your front row start fights with a 200 shield.' },
  { id: 'overtime', name: 'Overtime', text: 'Gain 14 gold now.' },
  { id: 'hot-wiring', name: 'Hot Wiring', text: 'Your robots start fights with 25 more charge.' },
  { id: 'level-up', name: 'Level Up!', text: 'Gain 10 XP now.' },
  { id: 'recycler', name: 'Recycler', text: 'Rerolls cost 1 gold instead of 2.' },
  { id: 'thick-hull', name: 'Thick Hull', text: 'Your robots have 150 more health.' },
  { id: 'rapid-fire', name: 'Rapid Fire', text: 'Your robots attack 15% faster.' },
  { id: 'last-stand', name: 'Last Stand', text: 'Your commander takes 30% less damage.' },
  { id: 'lucky-bolt', name: 'Lucky Bolt', text: 'Your robots gain 10% critical chance.' },
  { id: 'gold-rush', name: 'Gold Rush', text: 'Savings pay up to 3 more interest a round.' },
  { id: 'duplicator', name: 'Duplicator', text: 'Get a copy of your strongest 1 or 2 gold robot.' },
  { id: 'scrap-dividend', name: 'Scrap Dividend', text: 'Gain 2 gold after every fight, won or lost.' },
  { id: 'big-battery', name: 'Big Battery', text: 'Abilities are 20% stronger.' },
  { id: 'war-chest', name: 'War Chest', text: 'Gain a finished item now.' },
];

export const AUGMENT_BY_ID: Record<string, AugmentDef> = Object.fromEntries(AUGMENTS.map((a) => [a.id, a]));

// ---------------------------------------------------------------- commanders

export type SkillId = 'overclock' | 'zap' | 'bulwark';

export interface SkillDef {
  id: SkillId;
  name: string;
  text: string;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  overclock: { id: 'overclock', name: 'Overclock', text: 'Your robots attack 40% faster for 5 seconds.' },
  zap: { id: 'zap', name: 'Big Zap', text: 'Zaps the toughest enemy for 260 and stuns it for 1.5 seconds.' },
  bulwark: { id: 'bulwark', name: 'Scrap Wall', text: 'Shields all your robots for 180 for 5 seconds.' },
};

export interface CommanderDef {
  name: string;
  skill: SkillId;
  /** Body and trim colours of the avatar. */
  color: number;
  trim: number;
  /** Lines it calls out at the start and end of a fight (rivals only). */
  taunts: string[];
}

/** The three commanders the player picks from. */
export const PLAYER_COMMANDERS: CommanderDef[] = [
  { name: 'Foreman Grit', skill: 'overclock', color: 0xffb703, trim: 0x2b2d42, taunts: [] },
  { name: 'Sparks Malone', skill: 'zap', color: 0x7cf3ff, trim: 0x3a2a8a, taunts: [] },
  { name: 'Madame Magna', skill: 'bulwark', color: 0xe0566a, trim: 0xf2f2f2, taunts: [] },
];

/** The seven rivals, in seat order. */
export const RIVALS: CommanderDef[] = [
  { name: 'Baron Bolt', skill: 'zap', color: 0x9b7be0, trim: 0xffd166, taunts: ['Nuts to you!', 'My bolts are tighter.', 'Scrap metal, all of it.'] },
  { name: 'Ma Rivet', skill: 'bulwark', color: 0x8bbf5a, trim: 0x5a3a1a, taunts: ['Mind your manners, dear.', 'I have spare parts older than you.', 'Back to the heap!'] },
  { name: 'Captain Cog', skill: 'overclock', color: 0x4fc3f7, trim: 0xffffff, taunts: ['Full steam ahead!', 'All gears turning!', 'Ha! Outgeared!'] },
  { name: 'Duchess Dynamo', skill: 'zap', color: 0xff5cf0, trim: 0x1a1030, taunts: ['Feel the current, darling.', 'Shocking, isn’t it?', 'Positively electric.'] },
  { name: 'Sir Sprocket', skill: 'overclock', color: 0xd9822b, trim: 0x2b2d42, taunts: ['Have at thee, tin can!', 'Chain and sprocket!', 'A duel of honour!'] },
  { name: 'Widow Wrench', skill: 'bulwark', color: 0x6b7a99, trim: 0xd0d8e8, taunts: ['I will tighten you down.', 'Every bolt has its turn.', 'Another for the pile.'] },
  { name: 'Tinpot Tess', skill: 'zap', color: 0x39e58c, trim: 0x123a2a, taunts: ['Rattle rattle!', 'Kaboom, maybe!', 'Oops, did I win?'] },
];

// ---------------------------------------------------------------- neutral monsters

export type MonsterId = 'mite' | 'hound' | 'crab' | 'golem' | 'crusher' | 'rat';

export interface MonsterDef {
  id: MonsterId;
  name: string;
  hp: number;
  atk: number;
  as: number;
  range: number;
  armor: number;
  color: number;
}

export const MONSTERS: Record<MonsterId, MonsterDef> = {
  mite: { id: 'mite', name: 'Scrap Mite', hp: 170, atk: 18, as: 0.6, range: 1, armor: 0, color: 0x8a8a9a },
  hound: { id: 'hound', name: 'Junk Hound', hp: 520, atk: 38, as: 0.7, range: 1, armor: 10, color: 0xb07a4a },
  crab: { id: 'crab', name: 'Rust Crab', hp: 780, atk: 40, as: 0.5, range: 1, armor: 45, color: 0xc0603a },
  golem: { id: 'golem', name: 'Junk Golem', hp: 1700, atk: 80, as: 0.55, range: 1, armor: 40, color: 0x7a8a6a },
  crusher: { id: 'crusher', name: 'The Crusher', hp: 5200, atk: 140, as: 0.5, range: 1, armor: 60, color: 0x5a5a6a },
  rat: { id: 'rat', name: 'Scrap Rat', hp: 1400, atk: 0, as: 0, range: 0, armor: 20, color: 0xd0b060 },
};

/** How long the Scrap Rat runs before it escapes, in seconds, and the gold each hit on it shakes loose. */
export const RAT = { escapeS: 18, goldPerHit: 1, maxGold: 12, zapDamage: 60, zapCooldownS: 0.8 };

// ---------------------------------------------------------------- the match

export const BOARD = { cols: 8, rows: 8, ownRows: [4, 5, 6, 7] as const };
export const BENCH_SLOTS = 9;
export const SHOP_SLOTS = 5;
export const PLAYERS = 8;

export const ECONOMY = {
  startGold: 3,
  baseIncome: 5,
  /** Income in stage 1, where the rounds are short. */
  stageOneIncome: 3,
  interestPer: 10,
  interestCap: 5,
  rerollCost: 2,
  xpCost: 4,
  xpBuy: 4,
  xpPerRound: 2,
  /** Win or loss streak bonus by streak length (index), capped at the last. */
  streakBonus: [0, 0, 1, 1, 2, 3],
};

/** XP to go from level n to n + 1 (index n - 1). */
export const LEVEL_XP = [2, 6, 10, 20, 36, 56, 80, 100];
export const MAX_LEVEL = 9;

/** Shop odds in percent for costs 1 to 5, by level (index level - 1). */
export const SHOP_ODDS = [
  [100, 0, 0, 0, 0],
  [100, 0, 0, 0, 0],
  [75, 25, 0, 0, 0],
  [55, 30, 15, 0, 0],
  [45, 33, 20, 2, 0],
  [30, 40, 25, 5, 0],
  [19, 30, 35, 15, 1],
  [16, 20, 35, 25, 4],
  [9, 15, 30, 30, 16],
];

/** The chance each shop slot holds a gilded robot (two origins), from this level on. */
export const GILDED = { chance: 0.03, fromLevel: 5, extraCost: 2 };

/** Plan time per round in seconds, and how long the fight may last before both sides lose. */
export const PLAN_S = 30;
export const FIGHT_LIMIT_S = 40;
/** Seconds each seat gets to pick in a draft round. */
export const DRAFT_PICK_S = 8;

export type RoundKind = 'pvp' | 'neutral' | 'draft' | 'rat';

export interface RoundDef {
  stage: number;
  index: number;
  kind: RoundKind;
  monsters?: MonsterId[];
  /** A power card pick opens this round's plan phase. */
  augment?: boolean;
}

/** The rounds of stage `stage`; stage 1 is neutral, later stages repeat with tougher monsters. */
export function stageRounds(stage: number): RoundDef[] {
  if (stage === 1) {
    return [
      { stage, index: 1, kind: 'neutral', monsters: ['mite', 'mite'] },
      { stage, index: 2, kind: 'neutral', monsters: ['mite', 'mite', 'mite'] },
      { stage, index: 3, kind: 'neutral', monsters: ['hound', 'hound', 'crab'] },
      { stage, index: 4, kind: 'draft' },
    ];
  }
  const augmentAt = stage === 2 ? 1 : stage === 3 || stage === 4 ? 2 : 0;
  const last: RoundDef =
    stage === 2
      ? { stage, index: 7, kind: 'rat', monsters: ['rat'] }
      : { stage, index: 7, kind: 'neutral', monsters: stage === 3 ? ['golem', 'golem', 'crab', 'crab'] : stage === 4 ? ['crusher', 'golem', 'golem'] : ['crusher', 'crusher', 'golem', 'golem'] };
  return [1, 2, 3, 4, 5, 6].map((index): RoundDef => (index === 4 ? { stage, index, kind: 'draft' } : { stage, index, kind: 'pvp', augment: index === augmentAt })).concat(last);
}

/** Base damage a lost fight costs a commander by stage, plus this much per surviving robot by its cost. */
export function stageDamage(stage: number) {
  return Math.min(3 + Math.max(0, stage - 2) * 3, 15);
}
export const SURVIVOR_DAMAGE = [0, 1, 1, 2, 2, 3];

// ---------------------------------------------------------------- terrain

export type TerrainId = 'oil' | 'charger' | 'plate' | 'furnace';

export const TERRAIN: Record<TerrainId, { name: string; text: string; color: number }> = {
  oil: { name: 'Oil Slick', text: 'Robots on it move and attack 30% slower.', color: 0x2a2a3a },
  charger: { name: 'Charge Pad', text: 'Robots on it gain 6 charge a second.', color: 0x39e58c },
  plate: { name: 'Steel Plate', text: 'Robots on it gain 25 armour.', color: 0xa8b2c8 },
  furnace: { name: 'Furnace Grate', text: 'Robots on it take 40 damage a second.', color: 0xff8a2a },
};
/** Terrain tiles laid on each half of the board in terrain mode. */
export const TERRAIN_TILES = 4;
