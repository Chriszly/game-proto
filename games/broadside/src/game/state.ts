import { ORDERS, type OrderId } from './orders';
import { ENEMIES, type EnemyKind } from './ships';
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
  fromPlayer: boolean;
  /** How the shot looks: round shot, or what the captain's order loaded. */
  shot: 'round' | 'chain' | 'grape' | 'powder';
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
  kind: 'splash' | 'smoke' | 'hit' | 'sink' | 'coins';
  x: number;
  y: number;
  ms: number;
  total: number;
  heading?: number;
  ship?: EnemyKind;
  gold?: number;
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
  enemies: Ship[];
  balls: Ball[];
  loot: Loot[];
  effects: Effect[];
  gold: number;
  /** All the gold picked up this run. */
  plundered: number;
  sunk: number;
  ranks: Partial<Record<UpgradeId, number>>;
  bestWave: number;
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
  return { id, kind, x, y, heading, hp, maxHp: hp, reload: { port: 0, starboard: 0 }, hitMs: 0, agroundMs: 0, slowMs: 0, detour: null };
}

export const FIRST_ORDER: OrderId = 'chain';

export function newRun(bestWave = 0): GameState {
  return {
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
    enemies: [],
    balls: [],
    loot: [],
    effects: [],
    gold: 0,
    plundered: 0,
    sunk: 0,
    ranks: {},
    bestWave,
    nextId: 2,
  };
}

export const radiusOf = (ship: Ship) => (ship.kind === 'player' ? PLAYER.radius : ENEMIES[ship.kind].radius);
