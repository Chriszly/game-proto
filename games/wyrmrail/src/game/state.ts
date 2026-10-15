import type { Cargo, Tile, Valley } from './map';

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
/** How many orders the wyrm can carry at once: one in each wagon. */
export const WAGONS = 2;
/** How long the wyrm stops to throw a switch, when the switches leave it no way to its stop. */
export const SWITCH_MS = 1_000;
/** The wyrm's belly: full is 1, and each tile it crosses costs this much. */
export const FOOD_PER_TILE = 1 / 36;
/** At or below this, the wyrm flies to the Roost to eat before its next stop. */
export const HUNGRY = 0.3;
/** How long it eats at the Roost, and how much slower it flies on an empty belly. */
export const EAT_MS = 1_200;
export const STARVING_SLOWDOWN = 0.5;
/** A wyrm waits this long at most for the other to clear a junction ahead, then goes on anyway. */
export const JUNCTION_WAIT_MS = 3_000;
/** A workshop's goods pay this many times an ordinary order over the same distance. */
export const WORKSHOP_PAY = 1.6;
/** How often an order whose cargo a workshop takes goes to that workshop. */
export const WORKSHOP_CHANCE = 0.5;
/** The round the second wyrm can be bought in. */
export const SECOND_WYRM_ROUND = 5;
/** The last round: the festival at the last village, after every village has joined. */
export const FESTIVAL_ROUND = 9;
export const FESTIVAL_GOAL = 10;
/** The wyrm's speed in tiles per second, and what each Swift wings level adds. */
export const BASE_SPEED = 2;
export const WINGS_SPEED = 0.6;
/** What each Golden hoard level adds to every order's pay. */
export const HOARD_BONUS = 0.25;
/** The price of each upgrade level; the length is the top level. */
export const UPGRADE_COSTS = { wings: [30, 60, 100], hoard: [40, 80, 140], second: [150] } as const;
export type Upgrade = keyof typeof UPGRADE_COSTS;
/** How long a banner and a floating number stay on screen. */
export const BANNER_MS = 2_800;
export const POP_MS = 1_200;

/** Deliveries needed to finish a round. */
export const roundGoal = (round: number) => (round === 1 ? 1 : round === FESTIVAL_ROUND ? FESTIVAL_GOAL : round + 1);

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
  /** The wyrm (index into `wyrms`) fetching or carrying it, once one has set off for it. */
  wyrm: number | null;
  /** Made by a workshop from goods the wyrm brought it. */
  made: boolean;
}

/** A stop the wyrm is heading for: an order to fetch or deliver, or the Roost to eat. */
export type Job = { order: number; leg: 'pickup' | 'drop' } | { leg: 'feed' };

export interface Wyrm {
  /** The tile it last stood on. */
  at: Tile;
  /** The tiles still to cross, next one first. */
  path: Tile[];
  /** How far it is from `at` towards `path[0]`, 0 to 1. */
  progress: number;
  /** The tile it stood on before `at`, so a switch knows which arm it came in by. */
  from: Tile | null;
  /** The stop it is heading for. */
  job: Job | null;
  loadMs: number;
  /** Time left throwing a switch before it can go on. */
  switchMs: number;
  /** Its belly, 0 (starving) to 1 (full). */
  food: number;
  /** Time left eating at the Roost. */
  eatMs: number;
  /** How long it has been waiting for the other wyrm to clear the junction ahead. */
  waitMs: number;
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
  /** `won` once the festival's goal is met. */
  phase: 'play' | 'over' | 'won';
  /** This game's valley. */
  valley: Valley;
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
  /** Order ids sent to the wyrms that no wyrm has set off to fetch yet, first first. */
  queue: number[];
  /** The switch on each junction (track with three or four arms): its key, and the arm it is set against. */
  switches: Record<string, string>;
  /** The wyrms on the line: one, then two once the second is bought. */
  wyrms: Wyrm[];
  upgrades: Record<Upgrade, number>;
  /** Time until the next order comes in. */
  orderTimerMs: number;
  banner: { text: string; ms: number } | null;
  pops: Pop[];
  nextId: number;
}
