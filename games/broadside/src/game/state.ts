import { BOONS, type BoonId } from './admiralty';
import { ORDERS, type OrderId } from './orders';
import { ENEMIES, type EnemyKind } from './ships';
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
  /** `break` shows the wave's banner, `harbor` is the shop between waves. */
  phase: 'break' | 'fighting' | 'harbor' | 'over';
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
  bestWave: number;
  /** The best wave before this run, which a run must beat for the Admiralty's bonus medals. */
  bestBefore: number;
  /** Medals the Admiralty awards this run, set when it ends. */
  medals: number;
  nextId: number;
}

export const PLAYER = { hp: 120, radius: 25, speed: 90, turn: 1.7, guns: 2, damage: 10, reloadMs: 2000, range: 260 };

export const rank = (s: GameState, id: UpgradeId) => s.ranks[id] ?? 0;

/** The player's ship as the upgrades bought have made it. */
export function stats(s: GameState) {
  const order = ORDERS[s.order];
  const sails = (1 + 0.12 * rank(s, 'sails')) * (order.sails ?? 1);
  return {
    maxHp: PLAYER.hp + 30 * rank(s, 'hull'),
    speed: PLAYER.speed * sails,
    turn: PLAYER.turn * sails,
    guns: PLAYER.guns + rank(s, 'guns'),
    damage: PLAYER.damage * (1 + 0.25 * rank(s, 'shot')) * (order.damage ?? 1),
    reloadMs: PLAYER.reloadMs * Math.pow(0.85, rank(s, 'crew')) * (order.reload ?? 1),
    range: PLAYER.range * (order.range ?? 1),
  };
}

/** How far a broadside charged to `charge` (0 to 1) reaches, given the full `range`. */
export const reachOf = (range: number, charge: number) => range * (REACH_MIN + (1 - REACH_MIN) * charge);

export function newShip(id: number, kind: Ship['kind'], x: number, y: number, heading: number, hp: number): Ship {
  return { id, kind, x, y, heading, hp, maxHp: hp, reload: { port: 0, starboard: 0 }, hitMs: 0, agroundMs: 0, slowMs: 0, jamMs: 0, boardMs: 0, detour: null };
}

/** The shot one side fires this wave: what the captain's order loads, or else what was loaded at the harbor. */
export const loadedShot = (s: GameState, side: Side): ShotKind => ORDERS[s.order].load ?? s.loadout[side];

/** The full reach of one side's guns this wave, before the wind: shorter for grapeshot. */
export const sideRange = (s: GameState, side: Side) => stats(s).range * (SHOTS[loadedShot(s, side)].range ?? 1);

export const FIRST_ORDER: OrderId = 'chain';

/** A new run; `boons` are the Admiralty's starting upgrades, bought with medals between runs. */
export function newRun(bestWave = 0, boons: BoonId[] = []): GameState {
  const s: GameState = {
    phase: 'break',
    wave: 1,
    breakMs: BREAK_MS,
    toSpawn: waveShips(1),
    spawnMs: 0,
    player: newShip(1, 'player', WORLD.w / 2, WORLD.h / 2, -Math.PI / 2, PLAYER.hp),
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
    balls: [],
    loot: [],
    effects: [],
    gold: 0,
    plundered: 0,
    sunk: 0,
    taken: 0,
    ranks: {},
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

export const radiusOf = (ship: Ship) => (ship.kind === 'player' ? PLAYER.radius : ENEMIES[ship.kind].radius);
