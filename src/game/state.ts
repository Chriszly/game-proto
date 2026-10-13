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

/** A station's upgrade level and the coins paid so far towards the next one. */
export interface Upgrade {
  level: number;
  paid: number;
}

export interface GameState {
  version: 3;
  coins: number;
  carrying: ItemId[];
  player: { x: number; y: number };
  plots: Plot[];
  refiner: Refiner;
  cauldron: Cauldron;
  counter: Counter;
  upgrades: Record<StationId, Upgrade>;
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

export const MAX_LEVEL = 3;
/** Coins needed to go from `level` to the next level: 20, 40, 80. */
export const upgradeCost = (level: number) => 20 * 2 ** level;
/** Work-speed multiplier for the refining table and cauldron. */
export const speedAt = (level: number) => 1 + 0.5 * level;

export function createInitialState(): GameState {
  const ripe = (plant: PlantId): Plot => ({ plant, grown: GROW_MS[plant] });
  return {
    version: 3,
    coins: 0,
    carrying: [],
    player: { x: 450, y: 290 },
    // Start ripe so the first harvest can happen right away.
    plots: GARDENS.flatMap((plant) => Array.from({ length: PLOTS_PER_GARDEN }, () => ripe(plant))),
    refiner: { queue: [], progress: 0, output: [] },
    cauldron: { contents: [], brewing: null, output: [] },
    counter: { shelf: [], till: 0 },
    upgrades: { refiner: { level: 0, paid: 0 }, cauldron: { level: 0, paid: 0 }, counter: { level: 0, paid: 0 } },
    orders: [],
    nextOrderIn: 3_000,
    nextOrderId: 1,
  };
}
