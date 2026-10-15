// The five factions: their unit and building designs (outlines in local units, y down, drawn with
// a neon outline in the faction's colours) and the stats each one tunes.

export type UnitId = 'harvester' | 'scout' | 'gunship' | 'heavy';
export type Role = 'hub' | 'depot' | 'barracks' | 'turret';
export type Poly = readonly (readonly [number, number])[];

export interface Weapon {
  damage: number;
  range: number;
  cooldownMs: number;
}

/**
 * A faction's signature ability, carried by one unit or building. The world applies it:
 * - `cloak`: the unit is hidden from enemies until it fires; `revealMs` is how long a shot shows it.
 * - `decoy`: every `everyMs` the unit drops a copy that lives `lifeMs` and draws fire.
 * - `hack`: a turret it hits goes dark for `disableMs`; `takeover` hits in a row while it is dark
 *   take it over for the hacker's faction.
 * - `shield`: friendly units within `range` take `share` of the damage (the rest is blocked).
 * - `brood`: every `everyMs` the unit spawns a scout, up to `cap` scouts of its faction.
 * - `splash`: its shots also hit enemies within `radius` of the target, for `share` of the damage.
 * - `salvage`: a building that pays `pay` crystal for each enemy unit destroyed within `range`.
 * - `mines`: a building that lays a hidden mine within `reach` every `everyMs`, up to `cap` at once;
 *   an enemy ship that comes within `trigger` sets it off for `damage` to enemies within `radius`.
 */
export type Ability =
  | { kind: 'cloak'; revealMs: number }
  | { kind: 'decoy'; everyMs: number; lifeMs: number }
  | { kind: 'hack'; disableMs: number; takeover: number }
  | { kind: 'shield'; range: number; share: number }
  | { kind: 'brood'; everyMs: number; cap: number }
  | { kind: 'splash'; radius: number; share: number }
  | { kind: 'salvage'; range: number; pay: number }
  | { kind: 'mines'; everyMs: number; cap: number; reach: number; trigger: number; radius: number; damage: number };

export interface UnitDef {
  name: string;
  cost: number;
  trainMs: number;
  hp: number;
  speed: number;
  sight: number;
  weapon?: Weapon;
  ability?: Ability;
  shape: Poly;
}

export interface BuildingDef {
  name: string;
  cost: number;
  buildMs: number;
  hp: number;
  radius: number;
  shape: Poly;
  /** A dome or core drawn in the accent colour at the centre. */
  dome?: number;
  weapon?: Weapon;
  ability?: Ability;
}

export interface Faction {
  name: string;
  color: number;
  accent: number;
  /** Multipliers on every unit and building of the faction; 1 is the base game. */
  tune: { hp: number; damage: number; speed: number; cost: number; carry: number };
  units: Record<UnitId, UnitDef>;
  buildings: Record<Role, BuildingDef>;
}

/** Units the barracks train, in the order the buttons show them. */
export const COMBAT_UNITS: readonly UnitId[] = ['scout', 'gunship', 'heavy'];

export const FACTIONS: readonly Faction[] = [
  {
    name: 'Solar Concord',
    color: 0xffd36a,
    accent: 0xfff6d0,
    tune: { hp: 1, damage: 1, speed: 1, cost: 1, carry: 10 },
    units: {
      harvester: { name: 'Prism Hauler', cost: 45, trainMs: 4000, hp: 40, speed: 55, sight: 0, shape: [[0, -7], [6, 0], [3, 6], [-3, 6], [-6, 0]] },
      scout: { name: 'Lancer', cost: 35, trainMs: 4000, hp: 60, speed: 95, sight: 150, weapon: { damage: 8, range: 90, cooldownMs: 800 }, shape: [[0, -9], [4, 4], [0, 2], [-4, 4]] },
      gunship: { name: 'Halo Cruiser', cost: 60, trainMs: 6000, hp: 110, speed: 60, sight: 170, weapon: { damage: 10, range: 120, cooldownMs: 900 }, ability: { kind: 'shield', range: 70, share: 0.5 }, shape: [[-8, -3], [0, -8], [8, -3], [8, 4], [0, 8], [-8, 4]] },
      heavy: { name: 'Aegis', cost: 100, trainMs: 9000, hp: 230, speed: 40, sight: 150, weapon: { damage: 16, range: 80, cooldownMs: 1200 }, shape: [[-6, -6], [0, -9], [6, -6], [9, 0], [6, 6], [0, 9], [-6, 6], [-9, 0]] },
    },
    buildings: {
      hub: { name: 'Sun Ring', cost: 0, buildMs: 0, hp: 800, radius: 22, dome: 12, shape: [[-16, -10], [-10, -16], [10, -16], [16, -10], [16, 10], [10, 16], [-10, 16], [-16, 10]] },
      depot: { name: 'Collector Ring', cost: 60, buildMs: 6000, hp: 300, radius: 14, dome: 6, shape: [[-10, -6], [0, -12], [10, -6], [10, 6], [0, 12], [-10, 6]] },
      barracks: { name: 'Orbital Dock', cost: 100, buildMs: 8000, hp: 400, radius: 18, shape: [[-16, -10], [16, -10], [16, 4], [8, 10], [-8, 10], [-16, 4]] },
      turret: { name: 'Mirror Pylon', cost: 90, buildMs: 6000, hp: 350, radius: 12, weapon: { damage: 14, range: 150, cooldownMs: 1000 }, shape: [[0, -16], [8, 0], [0, 16], [-8, 0]] },
    },
  },
  {
    name: 'Ferrox Hive',
    color: 0x3ef0b8,
    accent: 0xd6894a,
    tune: { hp: 0.85, damage: 1, speed: 1.1, cost: 0.85, carry: 10 },
    units: {
      harvester: { name: 'Tick', cost: 40, trainMs: 3500, hp: 35, speed: 60, sight: 0, shape: [[-6, -4], [0, -1], [6, -4], [4, 4], [0, 2], [-4, 4]] },
      scout: { name: 'Stinger', cost: 30, trainMs: 3500, hp: 55, speed: 100, sight: 150, weapon: { damage: 7, range: 85, cooldownMs: 650 }, shape: [[0, -9], [2, -2], [7, 0], [2, 2], [0, 9], [-2, 2], [-7, 0], [-2, -2]] },
      gunship: { name: 'Brood Carrier', cost: 55, trainMs: 5500, hp: 105, speed: 58, sight: 170, weapon: { damage: 9, range: 115, cooldownMs: 950 }, ability: { kind: 'brood', everyMs: 12000, cap: 6 }, shape: [[-7, -5], [0, -9], [7, -5], [6, 6], [-6, 6]] },
      heavy: { name: 'Carapace', cost: 90, trainMs: 8000, hp: 240, speed: 38, sight: 150, weapon: { damage: 15, range: 80, cooldownMs: 1200 }, shape: [[-10, 0], [-5, -6], [5, -6], [10, 0], [5, 6], [-5, 6]] },
    },
    buildings: {
      hub: { name: 'Hive Pod', cost: 0, buildMs: 0, hp: 800, radius: 22, dome: 7, shape: [[-14, -6], [-8, -14], [8, -14], [14, -6], [14, 8], [0, 16], [-14, 8]] },
      depot: { name: 'Spore Nest', cost: 55, buildMs: 5500, hp: 280, radius: 13, dome: 4, shape: [[0, -13], [12, -4], [8, 10], [-8, 10], [-12, -4]] },
      barracks: { name: 'Brood Pit', cost: 95, buildMs: 7500, hp: 380, radius: 17, shape: [[-16, -10], [16, -10], [10, 10], [-10, 10]] },
      turret: { name: 'Spine Spire', cost: 80, buildMs: 5500, hp: 330, radius: 12, weapon: { damage: 13, range: 150, cooldownMs: 950 }, shape: [[0, -18], [7, 8], [0, 4], [-7, 8]] },
    },
  },
  {
    name: 'Iron Dominion',
    color: 0x7fd4ff,
    accent: 0xffffff,
    tune: { hp: 1.3, damage: 1.1, speed: 0.85, cost: 1.2, carry: 10 },
    units: {
      harvester: { name: 'Crane Hauler', cost: 50, trainMs: 4500, hp: 50, speed: 50, sight: 0, shape: [[-7, -6], [7, -6], [7, 6], [-7, 6]] },
      scout: { name: 'Ram Skiff', cost: 40, trainMs: 4500, hp: 70, speed: 80, sight: 140, weapon: { damage: 9, range: 90, cooldownMs: 850 }, shape: [[-8, -4], [2, -8], [8, 0], [2, 8], [-8, 4]] },
      gunship: { name: 'Siege Barge', cost: 70, trainMs: 6500, hp: 130, speed: 45, sight: 180, weapon: { damage: 12, range: 135, cooldownMs: 1100 }, ability: { kind: 'splash', radius: 28, share: 0.5 }, shape: [[-10, -5], [10, -5], [10, 5], [2, 5], [0, 8], [-2, 5], [-10, 5]] },
      heavy: { name: 'Bulwark', cost: 115, trainMs: 9500, hp: 300, speed: 32, sight: 150, weapon: { damage: 18, range: 85, cooldownMs: 1400 }, shape: [[-9, -9], [-3, -9], [-3, -12], [3, -12], [3, -9], [9, -9], [9, 9], [-9, 9]] },
    },
    buildings: {
      hub: { name: 'Foundry Core', cost: 0, buildMs: 0, hp: 900, radius: 24, dome: 8, shape: [[-18, -18], [18, -18], [18, 18], [-18, 18]] },
      depot: { name: 'Gantry Yard', cost: 70, buildMs: 6500, hp: 340, radius: 15, shape: [[-14, -6], [14, -6], [14, 6], [-14, 6]] },
      barracks: { name: 'Forge Works', cost: 110, buildMs: 8500, hp: 450, radius: 18, shape: [[-16, -16], [-4, -16], [-4, 0], [16, 0], [16, 14], [-16, 14]] },
      turret: { name: 'Howitzer Fort', cost: 100, buildMs: 6500, hp: 420, radius: 13, weapon: { damage: 18, range: 170, cooldownMs: 1400 }, shape: [[-12, -8], [-4, -8], [-4, -14], [4, -14], [4, -8], [12, -8], [12, 8], [-12, 8]] },
    },
  },
  {
    name: 'Veil Syndicate',
    color: 0xb37cff,
    accent: 0x5ff0e6,
    tune: { hp: 0.9, damage: 1.15, speed: 1.2, cost: 1, carry: 10 },
    units: {
      harvester: { name: 'Shade Skimmer', cost: 40, trainMs: 3800, hp: 38, speed: 62, sight: 0, shape: [[0, -7], [6, 4], [0, 2], [-6, 4]] },
      scout: { name: 'Phantom Blade', cost: 35, trainMs: 4000, hp: 55, speed: 115, sight: 160, weapon: { damage: 9, range: 80, cooldownMs: 700 }, ability: { kind: 'cloak', revealMs: 2000 }, shape: [[0, -10], [3, 6], [0, 3], [-3, 6]] },
      gunship: { name: 'Hack Frigate', cost: 60, trainMs: 6000, hp: 100, speed: 66, sight: 170, weapon: { damage: 10, range: 120, cooldownMs: 950 }, ability: { kind: 'hack', disableMs: 6000, takeover: 6 }, shape: [[-8, 0], [-3, -6], [6, -6], [9, 0], [6, 6], [-3, 6]] },
      heavy: { name: 'Decoy Wraith', cost: 105, trainMs: 9000, hp: 210, speed: 44, sight: 150, weapon: { damage: 15, range: 85, cooldownMs: 1200 }, ability: { kind: 'decoy', everyMs: 15000, lifeMs: 12000 }, shape: [[0, -10], [8, -3], [8, 5], [0, 10], [-8, 5], [-8, -3]] },
    },
    buildings: {
      hub: { name: 'Shroud Node', cost: 0, buildMs: 0, hp: 760, radius: 20, dome: 6, shape: [[0, -18], [6, -6], [18, 0], [6, 6], [0, 18], [-6, 6], [-18, 0], [-6, -6]] },
      depot: { name: 'Relay Post', cost: 55, buildMs: 5000, hp: 260, radius: 12, shape: [[-10, -10], [10, -10], [0, 10]] },
      barracks: { name: 'Cloak Works', cost: 95, buildMs: 7000, hp: 360, radius: 16, shape: [[-16, 0], [-8, -12], [8, -12], [16, 0], [8, 12], [-8, 12]] },
      turret: { name: 'Mine Lattice', cost: 85, buildMs: 6000, hp: 300, radius: 14, dome: 4, weapon: { damage: 12, range: 140, cooldownMs: 800 }, ability: { kind: 'mines', everyMs: 8000, cap: 4, reach: 130, trigger: 16, radius: 40, damage: 45 }, shape: [[-12, -12], [12, -12], [12, 12], [-12, 12]] },
    },
  },
  {
    name: 'Nomad Freight',
    color: 0xffa94d,
    accent: 0xe8e0c8,
    tune: { hp: 1, damage: 0.9, speed: 1.15, cost: 0.9, carry: 14 },
    units: {
      harvester: { name: 'Cargo Tug', cost: 40, trainMs: 3800, hp: 42, speed: 55, sight: 0, shape: [[-7, -7], [7, -7], [3, 0], [7, 7], [-7, 7], [-3, 0]] },
      scout: { name: 'Courier Skiff', cost: 30, trainMs: 3500, hp: 58, speed: 105, sight: 150, weapon: { damage: 8, range: 90, cooldownMs: 800 }, shape: [[-7, -3], [0, -8], [7, -3], [3, 8], [-3, 8]] },
      gunship: { name: 'Escort Gunship', cost: 55, trainMs: 5800, hp: 115, speed: 62, sight: 170, weapon: { damage: 10, range: 120, cooldownMs: 950 }, shape: [[-9, -4], [-2, -9], [2, -9], [9, -4], [9, 4], [2, 9], [-2, 9], [-9, 4]] },
      heavy: { name: 'Siege Hauler', cost: 105, trainMs: 9000, hp: 260, speed: 36, sight: 180, weapon: { damage: 15, range: 150, cooldownMs: 1300 }, shape: [[-11, -7], [5, -7], [11, 0], [5, 7], [-11, 7]] },
    },
    buildings: {
      hub: { name: 'Trade Hub', cost: 0, buildMs: 0, hp: 820, radius: 21, dome: 7, shape: [[-14, -14], [14, -14], [20, 0], [14, 14], [-14, 14], [-20, 0]] },
      depot: { name: 'Cargo Pod', cost: 50, buildMs: 5000, hp: 260, radius: 13, shape: [[-12, -4], [-4, -12], [4, -12], [12, -4], [12, 4], [4, 12], [-4, 12], [-12, 4]] },
      barracks: { name: 'Salvage Yard', cost: 90, buildMs: 7000, hp: 360, radius: 16, ability: { kind: 'salvage', range: 200, pay: 8 }, shape: [[-16, -12], [16, -12], [16, 12], [-16, 12]] },
      turret: { name: 'Flak Tower', cost: 75, buildMs: 5500, hp: 280, radius: 12, weapon: { damage: 11, range: 140, cooldownMs: 900 }, shape: [[0, -15], [5, -5], [12, -4], [8, 4], [10, 12], [0, 8], [-10, 12], [-8, 4], [-12, -4], [-5, -5]] },
    },
  },
];
