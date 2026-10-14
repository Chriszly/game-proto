import type { Cargo, Tile } from './map';

// Tuning numbers and the shape of a game. The rules that move it on are in sim.ts.

export const START_COINS = 40;
export const START_HEARTS = 3;
/** Most orders on the board at once. */
export const MAX_ORDERS = 3;
/** How often a new order comes in while the board has room. */
export const ORDER_EVERY_MS = 7_000;
/** An order's pay: a base plus so much per tile between the two villages (as the crow flies). */
export const PAY_BASE = 10;
export const PAY_PER_TILE = 3;
/** An order's time on Normal: a base plus so much per tile. Scaled by difficulty. */
export const DEADLINE_BASE_MS = 20_000;
export const DEADLINE_PER_TILE_MS = 5_000;
/** How long the wyrm takes to load cargo at a village. */
export const LOAD_MS = 800;
/** The wyrm's speed in tiles per second, and what each Swift wings level adds. */
export const BASE_SPEED = 2;
export const WINGS_SPEED = 0.6;
/** What each Golden hoard level adds to every order's pay. */
export const HOARD_BONUS = 0.25;
/** The price of each upgrade level; the length is the top level. */
export const UPGRADE_COSTS = { wings: [30, 60, 100], hoard: [40, 80, 140] } as const;
export type Upgrade = keyof typeof UPGRADE_COSTS;
/** How long a banner and a floating number stay on screen. */
export const BANNER_MS = 2_800;
export const POP_MS = 1_200;

/** Deliveries needed to finish a round. */
export const roundGoal = (round: number) => (round === 1 ? 1 : round + 1);

export type OrderStatus = 'waiting' | 'queued' | 'loading' | 'carrying';

export interface Order {
  id: number;
  cargo: Cargo;
  /** Indexes into VILLAGES. */
  from: number;
  to: number;
  pay: number;
  timeLeftMs: number;
  totalMs: number;
  status: OrderStatus;
}

export interface Wyrm {
  /** The tile it last stood on. */
  at: Tile;
  /** The tiles still to cross, next one first. */
  path: Tile[];
  /** How far it is from `at` towards `path[0]`, 0 to 1. */
  progress: number;
  /** The order it is working on, and whether it is going to fetch or to deliver it. */
  job: { order: number; leg: 'pickup' | 'drop' } | null;
  loadMs: number;
}

export interface Pop {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  ms: number;
}

export interface GameState {
  phase: 'play' | 'over';
  coins: number;
  hearts: number;
  round: number;
  /** Deliveries made this round. */
  delivered: number;
  /** Deliveries made in the whole game. */
  totalDelivered: number;
  /** Tiles with track, as "c,r" keys. */
  track: string[];
  orders: Order[];
  /** Order ids sent to the wyrm and waiting their turn, first first. */
  queue: number[];
  wyrm: Wyrm;
  upgrades: Record<Upgrade, number>;
  /** Time until the next order comes in. */
  orderTimerMs: number;
  banner: { text: string; ms: number } | null;
  pops: Pop[];
  nextId: number;
}
