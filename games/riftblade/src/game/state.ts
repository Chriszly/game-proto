/** The run's state and the numbers that shape it. The rules that change it are in `sim.ts`. */
import { byDifficulty } from '../../../../shared/settings';
import { HEROES, type HeroId } from './heroes';
import { at, capstonesOf, crossoversOf } from './upgrades';

/** The run lasts this long before the boss comes, ms. */
export const RUN_MS = 5 * 60_000;
/** The most droids on the field at once (the boss not counted). */
export const MAX_ENEMIES = 250;
/** The most lumen shards lying about; past it, new ones merge into old ones. */
export const MAX_SHARDS = 300;
/** The hero's body radius and base shard pickup radius, px. */
export const HERO_R = 13;
export const PICKUP_R = 60;
/** How far from the hero new droids appear: just past the corners of the view. */
export const SPAWN_RING = { min: 570, max: 640 };
/** Droids further than this from the hero are brought back around to the spawn ring. */
export const LEASH = 900;

/** Difficulty: droid health and how fast they come. Normal is the game as designed. */
export const DIFF = {
  hp: byDifficulty(0.75, 1, 1.35),
  spawn: byDifficulty(0.75, 1, 1.25),
};

export type EnemyKind = 'clanker' | 'rollerbomb' | 'boss';

export interface EnemySpec {
  r: number;
  hp: number;
  speed: number;
  dmg: number;
  xp: number;
}

export const ENEMY: Record<EnemyKind, EnemySpec> = {
  clanker: { r: 11, hp: 10, speed: 62, dmg: 6, xp: 1 },
  rollerbomb: { r: 12, hp: 16, speed: 48, dmg: 10, xp: 3 },
  boss: { r: 58, hp: 2600, speed: 42, dmg: 22, xp: 0 },
};
/** An elite has this many times the health and is this much bigger; it drops a chest. */
export const ELITE = { hp: 9, size: 1.6, speed: 0.85, xp: 10, every: 50_000, first: 50_000 };
/** A rollerbomb's rush: starts this close, arms for `armMs`, then rolls straight. */
export const ROLLER = { trigger: 190, armMs: 600, rushSpeed: 245, rushMs: 950, blastR: 58, hurtOthers: 30 };
/** The Grinder Crawler's attacks. */
export const BOSS = { shellMs: 3500, shells: 5, shellSpeed: 210, shellDmg: 12, spawnMs: 8000, adds: 5, enragedAt: 0.5 };

export interface Enemy {
  id: number;
  kind: EnemyKind;
  elite: boolean;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  /** Ms until it can hurt the hero again. */
  hitMs: number;
  slowMs: number;
  slowPct: number;
  stunMs: number;
  /** Ms of the hit flash (a quick swell), and the knockback velocity, px/s. */
  flashMs: number;
  kx: number;
  ky: number;
  /** A rollerbomb's rush: 'walk', 'arm', 'rush'; its rush heading and ms left. */
  mode: 'walk' | 'arm' | 'rush';
  modeMs: number;
  vx: number;
  vy: number;
  /** The boss's attack timers, ms. */
  shellMs: number;
  spawnMs: number;
  /** Ms before the Phalanx shields can bash it again. */
  bashMs: number;
}

/** A bolt's look: a hero's own bolt colour (from its scheme), a drone or turret bolt, a droid shell, a heavy round or a mini rocket. */
export type BoltColor = HeroId | 'drone' | 'shell' | 'heavy' | 'rocket';

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  /** Droids it can still pass through, and bounces left. */
  pierce: number;
  bounces: number;
  lifeMs: number;
  /** A droid's shell (hurts the hero) rather than a hero's bolt. */
  hostile: boolean;
  color: BoltColor;
  /** Ids already hit, so a piercing bolt hits each droid once. */
  hit: number[];
  /** Homing turn rate (rad/s) for mini rockets; 0 for a straight bolt. */
  homing: number;
  /** A bolt that has bounced: Ricochet's tier 3 makes it hit harder. */
  bounced: boolean;
  r: number;
}

export interface Shard {
  id: number;
  x: number;
  y: number;
  value: number;
  /** Pulled toward the hero once inside the pickup radius. */
  pulled: boolean;
}

/** A blast ring on screen (its damage was dealt when it went off). */
export interface Blast {
  id: number;
  x: number;
  y: number;
  r: number;
  ms: number;
  maxMs: number;
  color: string;
}

/** Something that goes off later: a timed charge, a thrown grenade, a falling crate. */
export interface Bomb {
  id: number;
  kind: 'charge' | 'grenade' | 'frag' | 'crate' | 'orbital' | 'bomblet' | 'carpet';
  x: number;
  y: number;
  /** Where a thrown bomb flies from (for drawing its arc). */
  fromX: number;
  fromY: number;
  ms: number;
  maxMs: number;
  r: number;
  dmg: number;
  /** Throws `cluster` bomblets when it goes off. */
  cluster: number;
  /** Leaves a medkit healing this much (crates). */
  heal: number;
  /** Drops a sentry turret where it lands (Orbital Drop). */
  turret: boolean;
}

/** A burning patch left by a jet dash. */
export interface Fire {
  id: number;
  x: number;
  y: number;
  r: number;
  ms: number;
  dps: number;
}

export type AllyKind = 'trooper' | 'brother' | 'sentry' | 'drone';

export interface Ally {
  id: number;
  kind: AllyKind;
  x: number;
  y: number;
  /** Ms until it fires again; a sentry's ms of life left; its place in formation. */
  cdMs: number;
  lifeMs: number;
  slot: number;
  /** Aim angle, for drawing. */
  aim: number;
}

export interface Pickup {
  id: number;
  kind: 'medkit' | 'chest';
  x: number;
  y: number;
  heal: number;
}

/** Floating text: damage numbers are left out, names of unlocks and level-ups are shown. */
export interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  ms: number;
}

export type Phase = 'select' | 'run' | 'levelup' | 'won' | 'lost';

export interface Hero {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** The way the hero last moved (radians); Bram fires this way, the Riot Shield faces it. */
  facing: number;
  /** The way the primary weapon last fired, for drawing. */
  aim: number;
  moving: boolean;
  /** Signature cooldown left and how long its effect still lasts, ms. */
  sigMs: number;
  sigActiveMs: number;
  /** Primary weapon cooldown, and which pistol fires next (Rook). */
  fireMs: number;
  side: number;
  /** Primary shots fired, for every 4th heavy round. */
  shots: number;
  /** A jet dash in progress: ms left and its heading. */
  dashMs: number;
  dashAngle: number;
  /** Ms of the hurt flash. */
  hurtMs: number;
  /** Health regenerated but not yet whole. */
  regen: number;
}

export interface GameState {
  phase: Phase;
  hero: HeroId | null;
  /** Run time in ms; the boss comes at RUN_MS. */
  time: number;
  player: Hero;
  level: number;
  xp: number;
  xpNext: number;
  /** Level-ups earned but not yet chosen. */
  pendingLevels: number;
  /** Tiers of each held upgrade, by id (paths, pool skills and gear). */
  ranks: Record<string, number>;
  /** Unlocked capstones and completed crossovers, by id. */
  capstones: string[];
  crossovers: string[];
  /** The cards on offer during a level-up (upgrade ids, or the filler). */
  choices: string[] | null;
  /** Cooldowns of the abilities, ms, by name. */
  cd: Record<string, number>;
  enemies: Enemy[];
  bullets: Bullet[];
  shards: Shard[];
  blasts: Blast[];
  bombs: Bomb[];
  fires: Fire[];
  allies: Ally[];
  pickups: Pickup[];
  pops: Pop[];
  /** Spawning: fractional droids owed, the next elite and ring wave times. */
  spawnDebt: number;
  nextElite: number;
  waves: number[];
  bossSpawned: boolean;
  /** Counts for the end screen and the test. */
  kills: number;
  elitesKilled: number;
  chests: number;
  damageTaken: number;
  /** Signature uses this run. */
  signatures: number;
  nextId: number;
}

export function freshHero(): Hero {
  return {
    x: 0, y: 0, hp: 100, maxHp: 100, facing: 0, aim: 0, moving: false,
    sigMs: 0, sigActiveMs: 0, fireMs: 400, side: 0, shots: 0, dashMs: 0, dashAngle: 0, hurtMs: 0, regen: 0,
  };
}

/** The hero select screen: no run yet. */
export function freshState(): GameState {
  return {
    phase: 'select',
    hero: null,
    time: 0,
    player: freshHero(),
    level: 1,
    xp: 0,
    xpNext: xpFor(1),
    pendingLevels: 0,
    ranks: {},
    capstones: [],
    crossovers: [],
    choices: null,
    cd: {},
    enemies: [],
    bullets: [],
    shards: [],
    blasts: [],
    bombs: [],
    fires: [],
    allies: [],
    pickups: [],
    pops: [],
    spawnDebt: 0,
    nextElite: ELITE.first,
    waves: [90_000, 180_000, 255_000],
    bossSpawned: false,
    kills: 0,
    elitesKilled: 0,
    chests: 0,
    damageTaken: 0,
    signatures: 0,
    nextId: 1,
  };
}

/** XP needed to go from `level` to the next. */
export function xpFor(level: number) {
  return 5 + 3 * level + Math.floor((level * level) / 6);
}

/** The hero's numbers from their base and the upgrades held. */
export interface Stats {
  speed: number;
  pickup: number;
  armour: number;
  maxHp: number;
  regen: number;
  cooldown: number;
  damage: number;
  xp: number;
  crit: number;
  fireRate: number;
  pierce: number;
  bounces: number;
  seek: boolean;
  slowPct: number;
  slowMs: number;
}

export function statsOf(s: GameState): Stats {
  const hero = HEROES[s.hero ?? 'rook'];
  const r = (id: string) => s.ranks[id] ?? 0;
  const cap = (id: string) => s.capstones.includes(id);
  const cross = (id: string) => s.crossovers.includes(id);
  let fireRate = 1 + at([0.1, 0.2, 0.3, 0.4, 0.55], r('reload'), 0) + (r('gunslinger') >= 1 ? 0.15 : 0);
  if (cap('twin-storm')) fireRate += 0.3;
  let pierce = at([1, 1, 2, 2, 3], r('overcharge'), 0) + at([1, 1, 3, 3, 5], r('marksman'), 0);
  if (cap('longshot')) pierce = 999;
  const bounces = at([1, 2, 2, 3, 4], r('ricochet'), 0) + (r('gunslinger') >= 2 ? 1 : 0) + (r('gunslinger') >= 5 ? 1 : 0);
  return {
    speed: hero.speed * (1 + 0.08 * r('boots')),
    pickup: PICKUP_R * (1 + 0.3 * r('magnet')),
    armour: 0.08 * r('armour'),
    maxHp: hero.maxHp + 10 * r('armour'),
    regen: 0.5 * r('medpack'),
    cooldown: 1 - 0.07 * r('overclock'),
    damage: (1 + 0.1 * r('cell')) * (1 + at([0, 0.1, 0.1, 0.2, 0.2], r('overcharge'), 0)) * (1 + at([0, 0.25, 0.25, 0.25, 0.75], r('marksman'), 0)),
    xp: 1 + 0.1 * r('lens'),
    crit: 0.06 * r('chip'),
    fireRate,
    pierce,
    bounces,
    seek: cross('seeking-ricochets'),
    slowPct: at([0.25, 0.3, 0.35, 0.4, 0.5], r('stun'), 0),
    slowMs: r('stun') >= 3 ? 2000 : 1500,
  };
}

/** Recomputes the capstones and crossovers after a pick; returns the ones just unlocked. */
export function refreshUnlocks(s: GameState) {
  const caps = capstonesOf(s.ranks).filter((c) => c.hero === s.hero).map((c) => c.id);
  const crosses = crossoversOf(s.ranks).map((c) => c.id);
  const fresh = [...caps.filter((id) => !s.capstones.includes(id)), ...crosses.filter((id) => !s.crossovers.includes(id))];
  s.capstones = caps;
  s.crossovers = crosses;
  return fresh;
}

/** "m:ss" for a time in ms. */
export function clock(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
