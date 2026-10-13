import { ENEMIES, type EnemyKind } from './ships';
import type { UpgradeId } from './upgrades';
import { waveShips } from './waves';

/**
 * The sea the battle is fought on; the camera follows the player across it. It has no edges: like
 * a globe, sailing off one side brings a ship back in on the opposite side.
 */
export const WORLD = { w: 1920, h: 1200 };

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
/** A broadside fires when its target is within this angle of straight out from the side. */
export const ARC = (32 * Math.PI) / 180;
export const BALL_SPEED = 380;

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
  const sails = 1 + 0.12 * rank(s, 'sails');
  return {
    maxHp: PLAYER.hp + 30 * rank(s, 'hull'),
    speed: PLAYER.speed * sails,
    turn: PLAYER.turn * sails,
    guns: PLAYER.guns + rank(s, 'guns'),
    damage: PLAYER.damage * (1 + 0.25 * rank(s, 'shot')),
    reloadMs: PLAYER.reloadMs * Math.pow(0.85, rank(s, 'crew')),
    range: PLAYER.range,
  };
}

export function newShip(id: number, kind: Ship['kind'], x: number, y: number, heading: number, hp: number): Ship {
  return { id, kind, x, y, heading, hp, maxHp: hp, reload: { port: 0, starboard: 0 }, hitMs: 0 };
}

export function newRun(bestWave = 0): GameState {
  return {
    phase: 'break',
    wave: 1,
    breakMs: BREAK_MS,
    toSpawn: waveShips(1),
    spawnMs: 0,
    player: newShip(1, 'player', WORLD.w / 2, WORLD.h / 2, -Math.PI / 2, PLAYER.hp),
    helm: 0,
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
