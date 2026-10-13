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

/** The refining tables and cauldrons: one of each on the first production line, and on the second. */
export type RefinerId = 'refiner' | 'refiner2';
export type CauldronId = 'cauldron' | 'cauldron2';
export const REFINERS: RefinerId[] = ['refiner', 'refiner2'];
export const CAULDRONS: CauldronId[] = ['cauldron', 'cauldron2'];
export type StationId = RefinerId | CauldronId | 'counter';

/**
 * Conveyor belts, named after where they start: the gardens to the refining table, the refining
 * table to the cauldron, and the cauldron to the counter. The second line's belts end with a 2; its
 * cauldron belt joins the first line's on the way to the counter.
 */
export type BeltId = 'garden' | 'refiner' | 'cauldron' | 'garden2' | 'refiner2' | 'cauldron2';
export const BELTS: BeltId[] = ['garden', 'refiner', 'cauldron', 'garden2', 'refiner2', 'cauldron2'];

/** An item riding a belt, `at` ms along it. */
export interface BeltItem {
  id: ItemId;
  at: number;
}

/** Something bought on its build marker in handfuls of coins, like an upgrade. */
export interface Build {
  built: boolean;
  paid: number;
}

/** A belt is bought like any build, and then carries goods. */
export interface Belt extends Build {
  /** Items on the belt, the one nearest the end first. */
  items: BeltItem[];
}

/**
 * The second production line on the right of the map. The land is bought first; then each of its two
 * fields, its refining table and its cauldron is built on its own.
 */
export interface Expansion {
  land: Build;
  fields: Build[];
  refiner: Build;
  cauldron: Build;
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
  refiner2: Refiner;
  cauldron2: Cauldron;
  counter: Counter;
  expansion: Expansion;
  upgrades: Record<StationId, Upgrade>;
  belts: Record<BeltId, Belt>;
  orders: Order[];
  nextOrderIn: number;
  nextOrderId: number;
}

/**
 * Each garden grows a single kind of plant; the wheat field comes first. The first two gardens are
 * the first line's; the last two are the second line's fields, which grow once built.
 */
export const GARDENS: PlantId[] = ['wheat', 'mandrake', 'wheat', 'mandrake'];
export const PLOTS_PER_GARDEN = 3;
/** Gardens before this one belong to the first line. */
export const LINE2_GARDEN = 2;
export const gardenOf = (plot: number) => Math.floor(plot / PLOTS_PER_GARDEN);
/** Whether a garden is there to grow and harvest: always on the first line, once built on the second. */
export const gardenBuilt = (state: GameState, garden: number) =>
  garden < LINE2_GARDEN || !!state.expansion.fields[garden - LINE2_GARDEN]?.built;
/** Whether a refining table or cauldron stands: always on the first line, once built on the second. */
export const stationBuilt = (state: GameState, id: StationId) =>
  id === 'refiner2' ? state.expansion.refiner.built : id === 'cauldron2' ? state.expansion.cauldron.built : true;

export const CARRY_CAPACITY = 4;
export const STATION_CAPACITY = 6;
export const MAX_ORDERS = 3;

/** Bumped whenever station positions move, so a loaded save doesn't put the doctor inside one. */
export const LAYOUT = 2;

export const MAX_LEVEL = 3;
/** Coins needed to go from `level` to the next level: 20, 40, 80. */
export const upgradeCost = (level: number) => 20 * 2 ** level;
/** Coins needed to build each belt. */
export const BELT_COST: Record<BeltId, number> = { garden: 60, refiner: 100, cauldron: 150, garden2: 60, refiner2: 100, cauldron2: 150 };
/** How long an item takes from one end of each belt to the other: about 100 pixels a second. */
export const BELT_MS: Record<BeltId, number> = { garden: 4_000, refiner: 2_500, cauldron: 5_500, garden2: 4_000, refiner2: 2_500, cauldron2: 5_500 };
/** The stations a belt joins, which must both stand before it can be built. */
export const BELT_ENDS: Record<BeltId, StationId[]> = {
  garden: ['refiner'],
  refiner: ['refiner', 'cauldron'],
  cauldron: ['cauldron', 'counter'],
  garden2: ['refiner2'],
  refiner2: ['refiner2', 'cauldron2'],
  cauldron2: ['cauldron2', 'counter'],
};
/** The second line's garden belt also needs one of its fields to pick from. */
export const beltBuildable = (state: GameState, id: BeltId) =>
  BELT_ENDS[id].every((station) => stationBuilt(state, station)) &&
  (id !== 'garden2' || state.expansion.fields.some((f) => f.built));
/** Coins needed for the expansion's land, each field, the refining table and the cauldron. */
export const EXPANSION_COST = { land: 100, field: 25, refiner: 50, cauldron: 75 };
/** Least time between two items on a belt, so they don't overlap. */
export const BELT_GAP_MS = 600;

/** Work-speed multiplier for the refining table and cauldron. */
export const speedAt = (level: number) => 1 + 0.5 * level;

const unbuilt = (): Build => ({ built: false, paid: 0 });

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
    refiner2: { queue: [], progress: 0, output: [] },
    cauldron2: { contents: [], brewing: null, output: [] },
    counter: { shelf: [], till: 0 },
    expansion: { land: unbuilt(), fields: [unbuilt(), unbuilt()], refiner: unbuilt(), cauldron: unbuilt() },
    upgrades: {
      refiner: { level: 0, paid: 0 },
      cauldron: { level: 0, paid: 0 },
      refiner2: { level: 0, paid: 0 },
      cauldron2: { level: 0, paid: 0 },
      counter: { level: 0, paid: 0 },
    },
    belts: Object.fromEntries(BELTS.map((id) => [id, { ...unbuilt(), items: [] }])) as unknown as Record<BeltId, Belt>,
    orders: [],
    nextOrderIn: 3_000,
    nextOrderId: 1,
  };
}
