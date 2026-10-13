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

export interface Order {
  id: number;
  /** Potions still owed; the order pays out once this is empty. */
  wants: PotionId[];
  reward: number;
  patience: number;
  maxPatience: number;
}

export interface GameState {
  version: 1;
  coins: number;
  carrying: ItemId[];
  player: { x: number; y: number };
  plots: Plot[];
  refiner: Refiner;
  cauldron: Cauldron;
  orders: Order[];
  nextOrderIn: number;
  nextOrderId: number;
}

export const CARRY_CAPACITY = 4;
export const STATION_CAPACITY = 6;
export const MAX_ORDERS = 3;

export function createInitialState(): GameState {
  const ripe = (plant: PlantId): Plot => ({ plant, grown: GROW_MS[plant] });
  return {
    version: 1,
    coins: 0,
    carrying: [],
    player: { x: 450, y: 290 },
    // Start ripe so the first harvest can happen right away.
    plots: [ripe('sage'), ripe('sage'), ripe('sage'), ripe('mandrake'), ripe('mandrake'), ripe('mandrake')],
    refiner: { queue: [], progress: 0, output: [] },
    cauldron: { contents: [], brewing: null, output: [] },
    orders: [],
    nextOrderIn: 3_000,
    nextOrderId: 1,
  };
}
