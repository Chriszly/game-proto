import { GROW_MS, type ItemId, type PlantId, type PotionId, type RefinedId } from './items';

export interface Plot {
  plant: PlantId;
  /** Milliseconds grown since the last harvest; ripe once it reaches the plant's grow time. */
  grown: number;
}

export interface Refiner {
  queue: PlantId[];
  /** Milliseconds spent on the front of the queue. */
  progress: number;
  output: RefinedId[];
}

export interface Cauldron {
  contents: RefinedId[];
  brewing: { out: PotionId; ms: number; progress: number } | null;
  output: PotionId[];
}

/** Potions put out for customers, and the coins they have paid that wait to be picked up. */
export interface Counter {
  shelf: PotionId[];
  till: number;
}

export interface Order {
  id: number;
  /** Potions still owed; the order pays out once this is empty. */
  wants: PotionId[];
  reward: number;
  patience: number;
  maxPatience: number;
}

export type StationId = 'refiner' | 'cauldron' | 'counter';

/**
 * Conveyor belts, named after where they start: the gardens to the refining table, the refining
 * table to the cauldron, and the cauldron to the counter.
 */
export type BeltId = 'garden' | 'refiner' | 'cauldron';
export const BELTS: BeltId[] = ['garden', 'refiner', 'cauldron'];

/** An item riding a belt, `at` ms along it. */
export interface BeltItem {
  id: ItemId;
  at: number;
}

/** A belt is bought on its build marker in handfuls of coins, like an upgrade, and then carries goods. */
export interface Belt {
  built: boolean;
  paid: number;
  /** Items on the belt, the one nearest the end first. */
  items: BeltItem[];
}

/** A station's upgrade level and the coins paid so far towards the next one. */
export interface Upgrade {
  level: number;
  paid: number;
}

export interface GameState {
  version: 3;
  /** Which world layout the save was made in; a save from another layout starts the doctor at the start spot. */
  layout: number;
  coins: number;
  carrying: ItemId[];
  player: { x: number; y: number };
  plots: Plot[];
  refiner: Refiner;
  cauldron: Cauldron;
  counter: Counter;
  upgrades: Record<StationId, Upgrade>;
  belts: Record<BeltId, Belt>;
  orders: Order[];
  nextOrderIn: number;
  nextOrderId: number;
}

/** Each garden grows a single kind of plant; the wheat field comes first. */
export const GARDENS: PlantId[] = ['wheat', 'mandrake'];
export const PLOTS_PER_GARDEN = 3;

export const CARRY_CAPACITY = 4;
export const STATION_CAPACITY = 6;
export const MAX_ORDERS = 3;

/** Bumped whenever station positions move, so a loaded save doesn't put the doctor inside one. */
export const LAYOUT = 2;

export const MAX_LEVEL = 3;
/** Coins needed to go from `level` to the next level: 20, 40, 80. */
export const upgradeCost = (level: number) => 20 * 2 ** level;
/** Coins needed to build each belt. */
export const BELT_COST: Record<BeltId, number> = { garden: 60, refiner: 100, cauldron: 150 };
/** How long an item takes from one end of each belt to the other: about 100 pixels a second. */
export const BELT_MS: Record<BeltId, number> = { garden: 4_000, refiner: 2_500, cauldron: 5_500 };
/** Least time between two items on a belt, so they don't overlap. */
export const BELT_GAP_MS = 600;

/** Work-speed multiplier for the refining table and cauldron. */
export const speedAt = (level: number) => 1 + 0.5 * level;

export function createInitialState(): GameState {
  const ripe = (plant: PlantId): Plot => ({ plant, grown: GROW_MS[plant] });
  return {
    version: 3,
    layout: LAYOUT,
    coins: 0,
    carrying: [],
    // The middle of the courtyard inside the U (see src/scenes/layout.ts).
    player: { x: 600, y: 540 },
    // Start ripe so the first harvest can happen right away.
    plots: GARDENS.flatMap((plant) => Array.from({ length: PLOTS_PER_GARDEN }, () => ripe(plant))),
    refiner: { queue: [], progress: 0, output: [] },
    cauldron: { contents: [], brewing: null, output: [] },
    counter: { shelf: [], till: 0 },
    upgrades: { refiner: { level: 0, paid: 0 }, cauldron: { level: 0, paid: 0 }, counter: { level: 0, paid: 0 } },
    belts: {
      garden: { built: false, paid: 0, items: [] },
      refiner: { built: false, paid: 0, items: [] },
      cauldron: { built: false, paid: 0, items: [] },
    },
    orders: [],
    nextOrderIn: 3_000,
    nextOrderId: 1,
  };
}
