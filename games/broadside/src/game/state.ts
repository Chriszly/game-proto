import { BOONS, type BoonId } from './admiralty';
import type { BountyId } from './bounties';
import { FIRST_HULL, HULLS, type HullId } from './hulls';
import { ORDERS, type OrderId } from './orders';
import { SWIVEL_ARC, type PerkId } from './perks';
import type { EnemyKind } from './ships';
import { SHOTS, type ShotKind } from './shot';
import type { UpgradeId } from './upgrades';
import { waveShips } from './waves';

/**
 * The sea the battle is fought on; the camera follows the player across it. It has no edges: like
 * a globe, sailing off one side brings a ship back in on the opposite side.
 */
export const WORLD = { w: 1920, h: 1200 };

/**
 * The islands on the sea: their name on the chart, centre, and the half-widths of the sandy beach
 * that ships run aground on (the shallows drawn round it are safe). `bakeSea` in
 * src/art/art.ts draws each coast from these numbers.
 */
export const ISLANDS = [
  { name: 'Isla de las Palmas', x: 330, y: 260, rx: 58, ry: 36 },
  { name: 'Gull Key', x: 1540, y: 330, rx: 39, ry: 29 },
  { name: 'Cay Morgan', x: 1180, y: 940, rx: 27, ry: 19 },
  { name: 'Turtle Isle', x: 420, y: 960, rx: 39, ry: 29 },
  { name: 'Bones Cay', x: 1700, y: 1020, rx: 27, ry: 19 },
];
/** Hull damage a ship takes each time it runs onto an island's beach. */
export const AGROUND_DAMAGE = 8;
/** After running aground, how long before the same ship can be damaged by an island again. */
export const AGROUND_MS = 800;

/** A coordinate brought back onto the sea, in [0, size). */
export const wrapCoord = (v: number, size: number) => ((v % size) + size) % size;

/** Moves a point that has sailed off one side of the sea back in on the other. */
export function wrapPoint(p: { x: number; y: number }) {
  p.x = wrapCoord(p.x, WORLD.w);
  p.y = wrapCoord(p.y, WORLD.h);
}

/** The shortest way from `from` to `to` across the wrapping sea, which may cross an edge. */
export function offset(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = wrapCoord(to.x - from.x + WORLD.w / 2, WORLD.w) - WORLD.w / 2;
  const dy = wrapCoord(to.y - from.y + WORLD.h / 2, WORLD.h) - WORLD.h / 2;
  return { dx, dy };
}
/** How long the banner shows before a wave. */
export const BREAK_MS = 2000;
/** How long a floating barrel of loot lasts before it sinks. */
export const LOOT_MS = 25_000;
/** Loot this close drifts toward the player's ship, and is picked up when it touches. */
export const LOOT_PULL = 110;
/** A broadside's guns train up to this angle either side of straight out from the side. */
export const ARC = (32 * Math.PI) / 180;
export const BALL_SPEED = 380;
/** How long a broadside takes to charge fully while its fire control is held. */
export const CHARGE_MS = 1000;
/**
 * What the charge does: an uncharged broadside reaches `REACH_MIN` of the full range and hits
 * for the base damage; a full one reaches the whole range and hits `1 + CHARGE_DAMAGE` as hard.
 */
export const REACH_MIN = 0.65;
export const CHARGE_DAMAGE = 0.5;

/**
 * The wind: sailing straight downwind is `WIND_SPEED` faster and straight into it as much slower
 * (in between, by how square to it the ship sails), and shot fired downwind reaches up to
 * `WIND_REACH` further. Every ship feels it the same.
 */
export const WIND_SPEED = 0.18;
export const WIND_REACH = 0.25;
/** The first wave's wind, so the first round plays the same every time: blowing toward the east. */
export const FIRST_WIND = 0;
/** How much faster (or slower) a ship sails on `heading` in the wind blowing toward `wind`. */
export const windSpeed = (wind: number, heading: number) => 1 + WIND_SPEED * Math.cos(heading - wind);
/** How much further shot fired toward `dir` reaches: further downwind, never shorter. */
export const windReach = (wind: number, dir: number) => 1 + WIND_REACH * Math.max(0, Math.cos(dir - wind));
/** Where the wind blows from, as a compass point (wind blowing toward the east comes from the W). */
export function windFrom(wind: number) {
  const points = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const k = Math.round((wind + Math.PI) / (Math.PI / 4));
  return points[((k % 8) + 8) % 8];
}

/** An enemy at or under this share of its hull can be boarded and taken as a prize. */
export const BOARD_HP = 0.2;
/** How close alongside, hull to hull, the player must sail to board. */
export const BOARD_REACH = 28;
/** How long the player must stay alongside to take her. */
export const BOARD_MS = 1200;
/** The sailors a prize crew must number, as a share of the prize's full crew. */
export const PRIZE_CREW = 0.5;
/** The fewest sailors the player must keep aboard to send a prize crew across. */
export const CREW_TO_BOARD = 4;
/** The slowest a crew reloads, as a share of the full pace, however few are left. */
export const CREW_PACE_MIN = 1 / 3;
/** Sailors a grapeshot pellet kills on a hit, and a blast (shell or fireship) kills on every ship it hurts. */
export const GRAPE_KILLS = 1;
export const BLAST_KILLS = 3;

/**
 * Shore forts, on islands from `FIRST_FORT_WAVE`: each lobs shells like a mortar ketch at the
 * player in range and pays a bounty when razed. Shot and shells hit it within `radius`.
 */
export const FORT = { hp: 110, radius: 30, range: 340, reloadMs: 5000, damage: 16, bounty: 50, bountyStep: 5 };
/** Medals the Admiralty adds for razing the pirate haven, on top of one per wave. */
export const WIN_MEDALS = 5;

export type Side = 'port' | 'starboard';

export interface Ship {
  id: number;
  kind: 'player' | EnemyKind;
  x: number;
  y: number;
  /** Radians, 0 is east and it grows clockwise on screen. */
  heading: number;
  hp: number;
  maxHp: number;
  /** Time left to reload each broadside. */
  reload: Record<Side, number>;
  /** Time left to flash after a hit. */
  hitMs: number;
  /** Time left before an island can damage this ship again. */
  agroundMs: number;
  /** Time left sailing slowed by a chain shot hit. */
  slowMs: number;
  /** Time left reloading slowly after a grapeshot hit. */
  jamMs: number;
  /** How long the player has been alongside this crippled enemy, boarding her. */
  boardMs: number;
  /** Collision radius. */
  radius: number;
  /** Sailors aboard, and with a full crew: fewer reload slower (`crewPace`). */
  crew: number;
  maxCrew: number;
  /**
   * An enemy sailing round an island that lies between it and the player: which island (an index
   * into `ISLANDS`) and which way round (1 or -1). Null when the way is clear.
   */
  detour: { island: number; side: 1 | -1 } | null;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ms: number;
  damage: number;
  /** Fired by the player or one of the player's prizes, so it hits enemies. */
  fromPlayer: boolean;
  /** The shot: what it does (chain slows, grape slows reloads) and how it looks; powder is round shot with a flash. */
  shot: ShotKind | 'powder';
  /** Bouncing shot: flight left after skipping off the water once, or 0 when it has skipped or never will. */
  skip: number;
}

/** A shore fort on an island. */
export interface Fort {
  id: number;
  /** An index into `ISLANDS`. */
  island: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  reload: number;
  hitMs: number;
}

/** A mortar shell in the air, coming down on the spot marked on the sea when `ms` runs out. */
export interface Shell {
  id: number;
  x: number;
  y: number;
  ms: number;
  total: number;
  damage: number;
}

export interface Loot {
  id: number;
  x: number;
  y: number;
  gold: number;
  ms: number;
}

export interface Effect {
  id: number;
  kind: 'splash' | 'smoke' | 'hit' | 'sink' | 'coins' | 'blast' | 'prize';
  x: number;
  y: number;
  ms: number;
  total: number;
  heading?: number;
  ship?: EnemyKind;
  gold?: number;
  /** A blast's radius. */
  size?: number;
}

export interface GameState {
  /** `break` shows the wave's banner, `harbor` is the shop between waves, `won` the campaign's end card. */
  phase: 'break' | 'fighting' | 'harbor' | 'over' | 'won';
  /** The ship the player sails. */
  hull: HullId;
  wave: number;
  breakMs: number;
  toSpawn: EnemyKind[];
  spawnMs: number;
  player: Ship;
  /** Which way the helm is held: -1 to port (left), 1 to starboard (right), 0 straight on. */
  helm: -1 | 0 | 1;
  /** Which fire controls are held down this frame; written by the scene like `helm`. */
  aim: Record<Side, boolean>;
  /**
   * How charged each broadside is while its fire control is held, 0 to 1; null when it is not
   * being aimed. Letting go fires it.
   */
  charge: Record<Side, number | null>;
  /** The captain's order for this wave: one bonus that lasts the wave. */
  order: OrderId;
  /** The way this wave's wind blows toward, in radians like a heading. */
  wind: number;
  /** The shot each side is loaded with, chosen at the harbor. */
  loadout: Record<Side, ShotKind>;
  enemies: Ship[];
  /** Enemy ships the player boarded and took: they sail with the player until the wave is beaten. */
  escorts: Ship[];
  /** Mortar shells in the air. */
  shells: Shell[];
  /** The wave's shore forts, still standing. */
  forts: Fort[];
  balls: Ball[];
  loot: Loot[];
  effects: Effect[];
  gold: number;
  /** All the gold picked up this run. */
  plundered: number;
  sunk: number;
  /** Ships boarded and taken this run. */
  taken: number;
  ranks: Partial<Record<UpgradeId, number>>;
  /** The perks taken from the prize drafts this run, and the draft now on offer at the harbor (empty once picked). */
  perks: PerkId[];
  draft: PerkId[];
  /** Time left before the player's own mortar (a perk) fires again. */
  mortarMs: number;
  /** The Admiralty's bounty for this wave (none on wave 1), and what the last one paid at the harbor (null before any). */
  bounty: BountyId | null;
  bountyPaid: number | null;
  /** This wave so far: loot hauled in, hull lost, groundings, prizes taken, fighting time and the kinds sunk in order. */
  waveLoot: number;
  waveDamage: number;
  waveAground: number;
  wavePrizes: number;
  waveMs: number;
  waveSunk: EnemyKind[];
  /** Whether the pirate haven has been razed this run; the waves go on after. */
  won: boolean;
  /** Medals already banked this run (at the haven), so sinking later awards only the rest. */
  medalsBanked: number;
  bestWave: number;
  /** The best wave before this run, which a run must beat for the Admiralty's bonus medals. */
  bestBefore: number;
  /** Medals the Admiralty awards this run, set when it ends. */
  medals: number;
  nextId: number;
}

export const rank = (s: GameState, id: UpgradeId) => s.ranks[id] ?? 0;
export const hasPerk = (s: GameState, id: PerkId) => s.perks.includes(id);

/** The player's ship as its hull, the upgrades bought, the perks drafted and the wave's order have made it. */
export function stats(s: GameState) {
  const hull = HULLS[s.hull];
  const order = ORDERS[s.order];
  const sails = (1 + 0.12 * rank(s, 'sails')) * (order.sails ?? 1);
  return {
    maxHp: hull.hp + 30 * rank(s, 'hull'),
    speed: hull.speed * sails,
    turn: hull.turn * sails,
    guns: hull.guns + rank(s, 'guns'),
    damage: hull.damage * (1 + 0.25 * rank(s, 'shot')) * (order.damage ?? 1),
    reloadMs: hull.reloadMs * Math.pow(0.85, rank(s, 'crew')) * (order.reload ?? 1),
    range: hull.range * (order.range ?? 1),
    /** How far either side of straight out the broadsides train. */
    arc: ARC * (hasPerk(s, 'swivels') ? SWIVEL_ARC : 1),
  };
}

/** How fast a ship's crew reloads, as a share of the full pace: all of it with a full crew, down to `CREW_PACE_MIN`. */
export const crewPace = (ship: Ship) => Math.max(CREW_PACE_MIN, ship.crew / ship.maxCrew);

/** How far a broadside charged to `charge` (0 to 1) reaches, given the full `range`. */
export const reachOf = (range: number, charge: number) => range * (REACH_MIN + (1 - REACH_MIN) * charge);

export function newShip(id: number, kind: Ship['kind'], x: number, y: number, heading: number, hp: number, radius: number, crew: number): Ship {
  return { id, kind, x, y, heading, hp, maxHp: hp, reload: { port: 0, starboard: 0 }, hitMs: 0, agroundMs: 0, slowMs: 0, jamMs: 0, boardMs: 0, radius, crew, maxCrew: crew, detour: null };
}

/** The shot one side fires this wave: what the captain's order loads, or else what was loaded at the harbor. */
export const loadedShot = (s: GameState, side: Side): ShotKind => ORDERS[s.order].load ?? s.loadout[side];

/** The full reach of one side's guns this wave, before the wind: shorter for grapeshot (a mortar side lobs at the full range). */
export const sideRange = (s: GameState, side: Side) => stats(s).range * (HULLS[s.hull].mortarSide === side ? 1 : (SHOTS[loadedShot(s, side)].range ?? 1));

export const FIRST_ORDER: OrderId = 'chain';

/**
 * A new run; `boons` are the Admiralty's starting upgrades, bought with medals between runs, and
 * `hull` the ship chosen (the Frigate on a first run).
 */
export function newRun(bestWave = 0, boons: BoonId[] = [], hull: HullId = FIRST_HULL): GameState {
  const ship = HULLS[hull];
  const s: GameState = {
    phase: 'break',
    hull,
    wave: 1,
    breakMs: BREAK_MS,
    toSpawn: waveShips(1),
    spawnMs: 0,
    player: newShip(1, 'player', WORLD.w / 2, WORLD.h / 2, -Math.PI / 2, ship.hp, ship.radius, ship.crew),
    helm: 0,
    aim: { port: false, starboard: false },
    charge: { port: null, starboard: null },
    // The first wave's order is always chain shot, so the first round plays the same every time.
    order: FIRST_ORDER,
    wind: FIRST_WIND,
    loadout: { port: 'round', starboard: 'round' },
    enemies: [],
    escorts: [],
    shells: [],
    forts: [],
    balls: [],
    loot: [],
    effects: [],
    gold: 0,
    plundered: 0,
    sunk: 0,
    taken: 0,
    ranks: {},
    perks: [],
    draft: [],
    mortarMs: 0,
    bounty: null,
    bountyPaid: null,
    waveLoot: 0,
    waveDamage: 0,
    waveAground: 0,
    wavePrizes: 0,
    waveMs: 0,
    waveSunk: [],
    won: false,
    medalsBanked: 0,
    bestWave,
    bestBefore: bestWave,
    medals: 0,
    nextId: 2,
  };
  for (const id of boons) {
    const boon = BOONS[id];
    s.gold += boon.gold ?? 0;
    if (boon.rank) s.ranks[boon.rank] = 1;
  }
  s.player.maxHp = s.player.hp = stats(s).maxHp;
  return s;
}

export const radiusOf = (ship: Ship) => ship.radius;
