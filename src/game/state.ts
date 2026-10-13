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

/** An upgrade's level and the coins paid so far towards the next one. */
export interface Upgrade {
  level: number;
  paid: number;
}

/**
 * What can be upgraded: every station, and the doctor's pack (carry more), boots (walk faster) and
 * sickle (harvest from further away).
 */
export type UpgradeId = StationId | 'pack' | 'boots' | 'sickle';
export const DOCTOR_UPGRADES = ['pack', 'boots', 'sickle'] as const;

/** Each upgrade's highest level (levels count from 0), its first cost, which doubles per level, and name. */
export const UPGRADES: Record<UpgradeId, { max: number; cost: number; name: string }> = {
  refiner: { max: 4, cost: 20, name: 'Refining table' },
  cauldron: { max: 4, cost: 20, name: 'Cauldron' },
  refiner2: { max: 4, cost: 20, name: 'Refining table' },
  cauldron2: { max: 4, cost: 20, name: 'Cauldron' },
  counter: { max: 4, cost: 20, name: 'Counter' },
  pack: { max: 2, cost: 30, name: 'Pack' },
  boots: { max: 2, cost: 25, name: 'Boots' },
  sickle: { max: 2, cost: 25, name: 'Sickle' },
};
export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
/** Coins needed to take an upgrade from `level` to the next: stations 20, 40, 80, 160. */
export const upgradeCost = (id: UpgradeId, level: number) => UPGRADES[id].cost * 2 ** level;

/** Every station a craftsman can be hired for. */
export const STATIONS: StationId[] = ['refiner', 'cauldron', 'refiner2', 'cauldron2', 'counter'];
/** Up to two craftsmen work each station; the first costs 30 coins, the second 60. */
export const MAX_CRAFTSMEN = 2;
export const craftsmanCost = (hired: number) => 30 * 2 ** hired;

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
  upgrades: Record<UpgradeId, Upgrade>;
  /** Craftsmen hired at each station (`level`), and coins paid towards the next one. */
  craftsmen: Record<StationId, Upgrade>;
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

export const MAX_ORDERS = 3;

/** How many items the doctor carries: four, and one more per pack level. */
export const carryCapacity = (state: GameState) => 4 + state.upgrades.pack.level;
/** The most a pack can hold, for laying out the carry slots. */
export const MAX_CARRY = 4 + UPGRADES.pack.max;
/** Walking speed multiplier: a fifth faster per boots level. */
export const walkSpeed = (state: GameState) => 1 + 0.2 * state.upgrades.boots.level;
/** Harvest reach in character heights: one, and a quarter more per sickle level. */
export const harvestReach = (state: GameState) => 1 + 0.25 * state.upgrades.sickle.level;
/**
 * Every station keeps each kind of goods coming in or going out on its own pallet: two by two items
 * on the base, stacked up to ten layers high.
 */
export const PALLET_BASE = 4;
export const PALLET_LAYERS = 10;
export const PALLET_SIZE = PALLET_BASE * PALLET_LAYERS;
/** Whether the pallet for `item` in a station's tray has room for one more. */
export const palletHasRoom = (tray: readonly ItemId[], item: ItemId) => tray.filter((id) => id === item).length < PALLET_SIZE;

/** Bumped whenever station positions move, so a loaded save doesn't put the doctor inside one. */
export const LAYOUT = 2;

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
    upgrades: Object.fromEntries(UPGRADE_IDS.map((id) => [id, { level: 0, paid: 0 }])) as Record<UpgradeId, Upgrade>,
    craftsmen: Object.fromEntries(STATIONS.map((id) => [id, { level: 0, paid: 0 }])) as Record<StationId, Upgrade>,
    belts: Object.fromEntries(BELTS.map((id) => [id, { ...unbuilt(), items: [] }])) as unknown as Record<BeltId, Belt>,
    orders: [],
    nextOrderIn: 3_000,
    nextOrderId: 1,
  };
}
