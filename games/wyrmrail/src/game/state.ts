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
/** Village moods (WR6), from `MOOD_ROUND`: how far a mood runs, each way from 0. */
export const MOOD_ROUND = 2;
export const MOOD_MAX = 2;
/** A village with no visit for this long, plus so much for every village on the line, sours by one. */
export const MOOD_GAP_MS = 25_000;
export const MOOD_GAP_PER_VILLAGE_MS = 6_000;
/** What a cheerful (1) and a delighted (2) village's orders pay, times the usual. */
export const MOOD_PAY = [1, 1.25, 1.5];
/** How much time a sulking village's orders allow, times the usual. */
export const MOOD_RUSH = 0.7;
/** Washouts and rockfalls (WR7), from `HAZARD_ROUND`: how often one is warned, and how long the warning lasts. */
export const HAZARD_ROUND = 3;
export const HAZARD_EVERY_MS = 35_000;
export const HAZARD_WARN_MS = 9_000;
/** Round charters (WR9), from this round: one of two, picked at the round's start. */
export const CHARTER_ROUND = 3;
/** Passengers (WR10), from this round: how often an order is passengers, what they pay and how long they wait. */
export const PASSENGER_ROUND = 3;
export const PASSENGER_CHANCE = 0.15;
export const PASSENGER_PAY = 3;
export const PASSENGER_TIME = 0.6;
/** Depots (WR11), from `DEPOT_ROUND`: the first one's price and what each one after it adds. */
export const DEPOT_ROUND = 2;
export const DEPOT_COST = 60;
export const DEPOT_STEP = 30;
/** How fast goods waiting at a depot use up their time, times the usual. */
export const DEPOT_WAIT = 0.5;
/** Courier calls (WR13), once moods count: what the gifts cost. */
export const COURIER_COST = 5;
/** Festival medals (WR14): a gold medal wants every heart and the festival in this time, silver two hearts and this time. */
export const GOLD_MS = 150_000;
export const SILVER_MS = 240_000;
/** How many rounds earlier the second wyrm wakes with the gold medal's Early riser boon. */
export const EARLY_RISER_ROUNDS = 2;
/** The coins the bronze medal's Head start boon adds to the start. */
export const HEAD_START_COINS = 25;
/** How long a banner and a floating number stay on screen. */
export const BANNER_MS = 2_800;
export const POP_MS = 1_200;

/** Deliveries needed to finish a round. */
export const roundGoal = (round: number) => (round === 1 ? 1 : round === FESTIVAL_ROUND ? FESTIVAL_GOAL : round + 1);

/** A round's charter: its rule for every order, and the odd one for the track or the belly. */
export interface Charter {
  id: string;
  name: string;
  text: string;
  /** Pay, times the usual, for every order or only for `cargo`. */
  pay: number;
  cargo?: Cargo;
  /** Deadlines, times the usual. */
  time: number;
  /** Track prices, times the usual. */
  track?: number;
  /** New orders come in this many times as often. */
  orders?: number;
  /** The wyrms never grow hungry. */
  fed?: boolean;
}

/** The charters a round can offer; `cargo` ones are filled in with a cargo an open village sends. */
export const CHARTERS: Charter[] = [
  { id: 'fair', name: 'Fair', text: '%c pays double, every deadline a quarter shorter', pay: 2, cargo: 'grain', time: 0.75 },
  { id: 'rush', name: 'Rush orders', text: 'Every order pays half again, deadlines a third shorter', pay: 1.5, time: 0.67 },
  { id: 'patient', name: 'Patient villages', text: 'Deadlines half as long again, pay a quarter less', pay: 0.75, time: 1.5 },
  { id: 'rails', name: 'Cheap rails', text: 'Track costs half, every order pays a fifth less', pay: 0.8, time: 1, track: 0.5 },
  { id: 'busy', name: 'Busy season', text: 'Orders come in twice as often, pay a tenth less', pay: 0.9, time: 1, orders: 2 },
  { id: 'feast', name: 'Feast', text: 'The wyrms never go hungry, every order pays a tenth less', pay: 0.9, time: 1, fed: true },
];

/** A washout (a bridge) or a rockfall (track under a mountain) about to take a tile's track. */
export interface Hazard {
  tile: Tile;
  kind: 'washout' | 'rockfall';
  /** Time left before it hits. */
  ms: number;
}

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

/** Passengers fill both wagons: a wyrm carrying them loads nothing else. */
export const isPassengers = (o: Order) => o.cargo === 'passengers';

/** A festival medal, worst to best. */
export const MEDALS = ['bronze', 'silver', 'gold'] as const;
export type Medal = (typeof MEDALS)[number];
/** What each medal unlocks for the next game on its difficulty; a better medal keeps the boons below it too. */
export const BOONS: Record<Medal, { name: string; text: string }> = {
  bronze: { name: 'Head start', text: `${HEAD_START_COINS} more coins to start with` },
  silver: { name: 'Swift start', text: 'Swift wings 1 from the start' },
  gold: { name: 'Early riser', text: `the second wyrm wakes from round ${SECOND_WYRM_ROUND - EARLY_RISER_ROUNDS}` },
};

/** A stop the wyrm is heading for: an order to fetch or deliver, the Roost to eat, or a village to bring gifts to. */
export type Job = { order: number; leg: 'pickup' | 'drop' } | { leg: 'feed' } | { leg: 'visit'; village: number };

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
  /** What each track tile cost when it was laid, by its key; taking it up refunds half. */
  paid: Record<string, number>;
  orders: Order[];
  /** Order ids sent to the wyrms that no wyrm has set off to fetch yet, first first. */
  queue: number[];
  /** The switch on each junction (track with three or four arms): its key, and the arm it is set against. */
  switches: Record<string, string>;
  /** Pairs of tiles next to each other on the line whose track is not joined ("c,r|c,r", lower key first). */
  cuts: string[];
  /** Track tiles where two straights cross without joining. */
  crossings: string[];
  /** Each village's mood, by its index: `-MOOD_MAX` (bitter) to `MOOD_MAX` (delighted). */
  moods: number[];
  /** How long each village has gone without a visit. */
  idleMs: number[];
  /** The washout or rockfall under way, if any, and the time until the next is warned. */
  hazard: Hazard | null;
  hazardTimerMs: number;
  /** This round's charter, and the two on offer while the player has yet to pick (the game waits). */
  charter: Charter | null;
  charterOffer: Charter[] | null;
  /** The villages with a depot, by index. */
  depots: number[];
  /** The best medal on this difficulty when the game began: its boons and the ones below it apply. */
  boon: Medal | null;
  /** Game time spent in the festival so far, and the medal it earned once won. */
  festivalMs: number;
  medal: Medal | null;
  /** The wyrms on the line: one, then two once the second is bought. */
  wyrms: Wyrm[];
  upgrades: Record<Upgrade, number>;
  /** Time until the next order comes in. */
  orderTimerMs: number;
  banner: { text: string; ms: number } | null;
  pops: Pop[];
  nextId: number;
}
