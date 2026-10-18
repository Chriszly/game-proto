import type { TextKey } from '../i18n';
import { createDistricts, type DistrictState } from './districts';
import type { PriceSign, Upgrade } from './state';

// The town past the apothecary: once the plague is first cured the town grants a charter, and the
// doctor can buy more shops on the town map, each with its own yard of gardens, stations and a
// counter, run like the apothecary. Each shop costs ten times the one before (a sink for the coins
// a grown apothecary makes), and its stations, workers and pixies cost `TIER_STEP` times as much
// as the shop before's, while its goods sell for about as much more. Phaser-free, like `state.ts`.

/** What a town shop grows, makes and sells. The apothecary's wheat and flour are painted the same. */
export type GoodId = 'wheat' | 'honeycomb' | 'flour' | 'bread' | 'honeyCake' | 'flax' | 'wax' | 'wick' | 'candle' | 'taper' | 'woad' | 'linen' | 'dye' | 'cloth' | 'cloak' | 'ore' | 'timber' | 'charcoal' | 'iron' | 'horseshoe' | 'pot' | 'barley' | 'hops' | 'malt' | 'driedHops' | 'ale' | 'stout';

export const GOODS: Record<GoodId, { color: number }> = {
  wheat: { color: 0xd9b24a },
  honeycomb: { color: 0xe0a83a },
  flour: { color: 0xf1e8d0 },
  bread: { color: 0xb8783a },
  honeyCake: { color: 0xd8944a },
  flax: { color: 0x7a8fc8 },
  wax: { color: 0xe8d070 },
  wick: { color: 0xe8e0c8 },
  candle: { color: 0xf0e2a8 },
  taper: { color: 0xf4e8c0 },
  woad: { color: 0x6a9a4a },
  linen: { color: 0xe6dcc0 },
  dye: { color: 0x3a5aa8 },
  cloth: { color: 0x4a6ab8 },
  cloak: { color: 0x34508e },
  ore: { color: 0x8a5a4a },
  timber: { color: 0x9a6a3a },
  charcoal: { color: 0x2e2a2a },
  iron: { color: 0x6a707a },
  horseshoe: { color: 0x7a808a },
  pot: { color: 0x3a3d48 },
  barley: { color: 0xd8c070 },
  hops: { color: 0x8ab84a },
  malt: { color: 0xb08a4a },
  driedHops: { color: 0x9aa05a },
  ale: { color: 0xd89a3a },
  stout: { color: 0x3a2618 },
};

/** The shops on the town map besides the apothecary, in the order they are bought. */
export type ShopId = 'bakery' | 'chandlery' | 'dyeHouse' | 'smithy' | 'tavern';

export interface Recipe {
  inputs: GoodId[];
  out: GoodId;
  ms: number;
}

export interface GardenDef {
  good: GoodId;
  /** Milliseconds a bed takes to ripen. */
  grow: number;
  name: TextKey;
}

export interface StationDef {
  id: string;
  name: TextKey;
  /** The painted station (see `art/town.ts`). */
  texture: string;
  recipes: Recipe[];
}

/** Where a pixie route carries goods from and to. */
export type RouteEnd = { garden: number } | { station: string } | 'shelf';

export interface RouteDef {
  id: string;
  from: Exclude<RouteEnd, 'shelf'>;
  to: Exclude<RouteEnd, { garden: number }>;
  /** Its cost in the apothecary's coins, before the shop's `tierCost`. */
  cost: number;
}

export interface ShopDef {
  id: ShopId;
  name: TextKey;
  /** One line on the town map: what it sells. */
  makes: TextKey;
  /** 1 for the first shop bought after the apothecary, 2 for the next, and so on. */
  tier: number;
  gardens: GardenDef[];
  /** In the order goods go through them, left to right. */
  stations: StationDef[];
  routes: RouteDef[];
  /** What customers buy, and its price. */
  sells: Partial<Record<GoodId, number>>;
  /** What a hired hand at a station is called on its marker. */
  worker: TextKey;
}

export const SHOPS: Record<ShopId, ShopDef> = {
  bakery: {
    id: 'bakery',
    name: 'bakery',
    makes: 'bakeryMakes',
    tier: 1,
    gardens: [
      { good: 'wheat', grow: 24_000, name: 'wheatField' },
      { good: 'honeycomb', grow: 30_000, name: 'beehives' },
    ],
    stations: [
      { id: 'mill', name: 'mill', texture: 'mill', recipes: [{ inputs: ['wheat'], out: 'flour', ms: 2_500 }] },
      {
        id: 'oven',
        name: 'oven',
        texture: 'oven',
        recipes: [
          { inputs: ['flour', 'flour'], out: 'bread', ms: 5_000 },
          { inputs: ['flour', 'honeycomb'], out: 'honeyCake', ms: 6_000 },
        ],
      },
    ],
    routes: [
      { id: 'field', from: { garden: 0 }, to: { station: 'mill' }, cost: 60 },
      { id: 'hives', from: { garden: 1 }, to: { station: 'oven' }, cost: 60 },
      { id: 'mill', from: { station: 'mill' }, to: { station: 'oven' }, cost: 100 },
      { id: 'oven', from: { station: 'oven' }, to: 'shelf', cost: 150 },
    ],
    sells: { bread: 24, honeyCake: 39 },
    worker: 'baker',
  },
  chandlery: {
    id: 'chandlery',
    name: 'chandlery',
    makes: 'chandleryMakes',
    tier: 2,
    gardens: [
      { good: 'honeycomb', grow: 30_000, name: 'beehives' },
      { good: 'flax', grow: 26_000, name: 'flaxField' },
    ],
    stations: [
      { id: 'press', name: 'press', texture: 'press', recipes: [{ inputs: ['honeycomb'], out: 'wax', ms: 3_000 }] },
      { id: 'wheel', name: 'wheel', texture: 'wheel', recipes: [{ inputs: ['flax'], out: 'wick', ms: 2_500 }] },
      {
        id: 'vat',
        name: 'vat',
        texture: 'vat',
        recipes: [
          { inputs: ['wax', 'wick'], out: 'candle', ms: 5_000 },
          { inputs: ['wax', 'wax', 'wick'], out: 'taper', ms: 7_000 },
        ],
      },
    ],
    routes: [
      { id: 'hives', from: { garden: 0 }, to: { station: 'press' }, cost: 60 },
      { id: 'flax', from: { garden: 1 }, to: { station: 'wheel' }, cost: 60 },
      { id: 'press', from: { station: 'press' }, to: { station: 'vat' }, cost: 100 },
      { id: 'wheel', from: { station: 'wheel' }, to: { station: 'vat' }, cost: 100 },
      { id: 'vat', from: { station: 'vat' }, to: 'shelf', cost: 150 },
    ],
    sells: { candle: 72, taper: 117 },
    worker: 'chandler',
  },
  dyeHouse: {
    id: 'dyeHouse',
    name: 'dyeHouse',
    makes: 'dyeHouseMakes',
    tier: 3,
    gardens: [
      { good: 'flax', grow: 26_000, name: 'flaxField' },
      { good: 'woad', grow: 32_000, name: 'woadField' },
    ],
    stations: [
      { id: 'loom', name: 'loom', texture: 'loom', recipes: [{ inputs: ['flax', 'flax'], out: 'linen', ms: 4_000 }] },
      { id: 'grinder', name: 'grinder', texture: 'grinder', recipes: [{ inputs: ['woad'], out: 'dye', ms: 3_000 }] },
      {
        id: 'dyeVat',
        name: 'dyeVat',
        texture: 'dyeVat',
        recipes: [
          { inputs: ['linen', 'dye'], out: 'cloth', ms: 6_000 },
          { inputs: ['linen', 'linen', 'dye'], out: 'cloak', ms: 8_000 },
        ],
      },
    ],
    routes: [
      { id: 'flax', from: { garden: 0 }, to: { station: 'loom' }, cost: 60 },
      { id: 'woad', from: { garden: 1 }, to: { station: 'grinder' }, cost: 60 },
      { id: 'loom', from: { station: 'loom' }, to: { station: 'dyeVat' }, cost: 100 },
      { id: 'grinder', from: { station: 'grinder' }, to: { station: 'dyeVat' }, cost: 100 },
      { id: 'dyeVat', from: { station: 'dyeVat' }, to: 'shelf', cost: 150 },
    ],
    sells: { cloth: 216, cloak: 351 },
    worker: 'dyer',
  },
  smithy: {
    id: 'smithy',
    name: 'smithy',
    makes: 'smithyMakes',
    tier: 4,
    gardens: [
      { good: 'timber', grow: 34_000, name: 'coppice' },
      { good: 'ore', grow: 36_000, name: 'orePit' },
    ],
    stations: [
      { id: 'kiln', name: 'kiln', texture: 'kiln', recipes: [{ inputs: ['timber'], out: 'charcoal', ms: 3_500 }] },
      { id: 'bloomery', name: 'bloomery', texture: 'bloomery', recipes: [{ inputs: ['ore', 'charcoal'], out: 'iron', ms: 5_000 }] },
      {
        id: 'anvil',
        name: 'anvil',
        texture: 'anvil',
        recipes: [
          { inputs: ['iron'], out: 'horseshoe', ms: 6_000 },
          { inputs: ['iron', 'iron'], out: 'pot', ms: 8_000 },
        ],
      },
    ],
    routes: [
      { id: 'timber', from: { garden: 0 }, to: { station: 'kiln' }, cost: 60 },
      { id: 'ore', from: { garden: 1 }, to: { station: 'bloomery' }, cost: 60 },
      { id: 'kiln', from: { station: 'kiln' }, to: { station: 'bloomery' }, cost: 100 },
      { id: 'bloomery', from: { station: 'bloomery' }, to: { station: 'anvil' }, cost: 100 },
      { id: 'anvil', from: { station: 'anvil' }, to: 'shelf', cost: 150 },
    ],
    sells: { horseshoe: 648, pot: 1_053 },
    worker: 'smith',
  },
  tavern: {
    id: 'tavern',
    name: 'tavern',
    makes: 'tavernMakes',
    tier: 5,
    gardens: [
      { good: 'barley', grow: 28_000, name: 'barleyField' },
      { good: 'hops', grow: 34_000, name: 'hopGarden' },
    ],
    stations: [
      { id: 'maltings', name: 'maltings', texture: 'maltings', recipes: [{ inputs: ['barley'], out: 'malt', ms: 3_500 }] },
      { id: 'oast', name: 'oast', texture: 'oast', recipes: [{ inputs: ['hops'], out: 'driedHops', ms: 3_000 }] },
      {
        id: 'kettle',
        name: 'kettle',
        texture: 'kettle',
        recipes: [
          { inputs: ['malt', 'driedHops'], out: 'ale', ms: 6_000 },
          { inputs: ['malt', 'malt', 'driedHops'], out: 'stout', ms: 8_000 },
        ],
      },
    ],
    routes: [
      { id: 'barley', from: { garden: 0 }, to: { station: 'maltings' }, cost: 60 },
      { id: 'hops', from: { garden: 1 }, to: { station: 'oast' }, cost: 60 },
      { id: 'maltings', from: { station: 'maltings' }, to: { station: 'kettle' }, cost: 100 },
      { id: 'oast', from: { station: 'oast' }, to: { station: 'kettle' }, cost: 100 },
      { id: 'kettle', from: { station: 'kettle' }, to: 'shelf', cost: 150 },
    ],
    sells: { ale: 1_944, stout: 3_159 },
    worker: 'brewer',
  },
};
export const SHOP_IDS = Object.keys(SHOPS) as ShopId[];

/** What the first shop after the apothecary costs; each next one costs `SHOP_COST_STEP` times as much. */
export const SHOP_BASE_COST = 1_000;
export const SHOP_COST_STEP = 10;
export const shopCost = (id: ShopId) => SHOP_BASE_COST * SHOP_COST_STEP ** (SHOPS[id].tier - 1);
/** How much more a shop's stations, workers and pixies cost than the shop before's. */
export const TIER_STEP = 3;
export const tierCost = (id: ShopId, base: number) => base * TIER_STEP ** SHOPS[id].tier;

/** A station's or the counter's level costs this, doubling each level, up to `MAX_LEVEL`. */
export const LEVEL_COST = 20;
export const MAX_LEVEL = 4;
export const levelCost = (id: ShopId, level: number) => tierCost(id, LEVEL_COST) * 2 ** level;
/** A worker costs this, doubling for the second; a station takes `MAX_WORKERS`, the counter one. */
export const WORKER_COST = 30;
export const MAX_WORKERS = 2;
export const MAX_SHOPKEEPERS = 1;
export const workerCost = (id: ShopId, hired: number) => tierCost(id, WORKER_COST) * 2 ** hired;
export const routeCost = (id: ShopId, route: RouteDef) => tierCost(id, route.cost);

/**
 * Each shop's outfitter sells one more level of the doctor's pack, boots and sickle, on top of the
 * apothecary's two; each counts everywhere. Its first cost, before the shop's `tierCost`.
 */
export const OUTFITTER_GEAR = ['pack', 'boots', 'sickle'] as const;
export type Gear = (typeof OUTFITTER_GEAR)[number];
export const GEAR_COST: Record<Gear, number> = { pack: 120, boots: 100, sickle: 100 };
export const gearCost = (id: ShopId, gear: Gear) => tierCost(id, GEAR_COST[gear]);
/**
 * Each shop's study teaches its own crafting order (a "First:" sign at each station with more than
 * one recipe) and price signs (Cheap, Fair or Dear on each shelf), like the apothecary's.
 */
export const LESSONS = ['craftOrder', 'priceSigns'] as const;
export type Lesson = (typeof LESSONS)[number];
export const LESSON_COST: Record<Lesson, number> = { craftOrder: 40, priceSigns: 60 };
export const lessonCost = (id: ShopId, lesson: Lesson) => tierCost(id, LESSON_COST[lesson]);

/** Beds in each garden, three by three like the apothecary's. */
export const BEDS = 9;
/** What each station's in and out pallets, and the shelf, hold of each good. */
export const SHOP_STORAGE = 12;
/** Customers at the counter at once. */
export const SHOP_PLACES = 3;
/** How long a customer takes to walk from the street to the counter. */
export const WALK_IN_MS = 3_000;
export const SHOP_PATIENCE = 40_000;
/** How many looks customers come in, as `CUSTOMER_LOOKS` in `art/townsfolk.ts`. */
export const CUSTOMER_FACES = 5;
/** How long a shopkeeper takes to hand over one good; the doctor hands everything over at once. */
export const SHOP_SERVE_MS = 1_500;
/** Each counter level adds this share to what customers pay. */
export const COUNTER_PAY = 0.15;
/** A pixie sets off at most this often on a route. */
export const ROUTE_GAP_MS = 700;
/** Pixies fly this many pixels a second. */
export const ROUTE_SPEED = 100;

export interface StationState {
  /** Goods dropped off, waiting to be worked. */
  queue: GoodId[];
  work: { out: GoodId; ms: number; progress: number } | null;
  output: GoodId[];
  level: Upgrade;
  /** Workers hired: `level` is how many. */
  hired: Upgrade;
}

export interface RouteState {
  built: boolean;
  paid: number;
  /** Goods on their way, each `at` milliseconds along the route. */
  items: { good: GoodId; at: number }[];
  /** Milliseconds until the next pixie may set off. */
  next: number;
}

export interface ShopOrder {
  id: number;
  wants: GoodId[];
  pay: Partial<Record<GoodId, number>>;
  /** Milliseconds until the customer reaches the counter; patience only runs once there. */
  walk: number;
  patience: number;
  maxPatience: number;
  face: number;
  /** Which place at the counter they stand at, from 0. */
  spot: number;
}

export interface ShopState {
  /** Milliseconds grown, per bed, `BEDS` per garden in garden order. */
  beds: number[];
  stations: Record<string, StationState>;
  routes: Record<string, RouteState>;
  shelf: GoodId[];
  till: number;
  /** How far a shopkeeper is with handing over the next good, towards `SHOP_SERVE_MS`. */
  serving: number;
  counter: { level: Upgrade; hired: Upgrade };
  orders: ShopOrder[];
  nextOrderIn: number;
  nextOrderId: number;
  /** Goods handed over, ever. */
  sold: number;
  /** The levels bought at this shop's outfitter, one at most of each. */
  outfitter: Record<Gear, Upgrade>;
  /** The lessons learned at this shop's study. */
  study: Record<Lesson, Upgrade>;
  /** What each station makes first once the crafting order is learned, or null for its own order. */
  priority: Record<string, GoodId | null>;
  /** Each shelf's price sign once the price signs are learned; Fair unless set. */
  signs: Partial<Record<GoodId, PriceSign>>;
}

export interface TownState {
  shops: Partial<Record<ShopId, ShopState>>;
  /** What the doctor carries in the town's shops, kept apart from the apothecary's hands. */
  hands: GoodId[];
  /** The households of each of `DISTRICTS`, in order. */
  districts: DistrictState[];
}

export const createTown = (): TownState => ({ shops: {}, hands: [], districts: createDistricts() });

const none = (): Upgrade => ({ level: 0, paid: 0 });

/** A shop as bought: every bed ripe, stations and counter at level 0, no workers or pixies. */
export function createShop(id: ShopId): ShopState {
  const def = SHOPS[id];
  return {
    beds: def.gardens.flatMap((g) => Array.from({ length: BEDS }, () => g.grow)),
    stations: Object.fromEntries(def.stations.map((s) => [s.id, { queue: [], work: null, output: [], level: none(), hired: none() }])),
    routes: Object.fromEntries(def.routes.map((r) => [r.id, { built: false, paid: 0, items: [], next: 0 }])),
    shelf: [],
    till: 0,
    serving: 0,
    counter: { level: none(), hired: none() },
    orders: [],
    nextOrderIn: WALK_IN_MS,
    nextOrderId: 1,
    sold: 0,
    outfitter: { pack: none(), boots: none(), sickle: none() },
    study: { craftOrder: none(), priceSigns: none() },
    priority: Object.fromEntries(def.stations.map((s) => [s.id, null])),
    signs: {},
  };
}

/**
 * A saved town with anything added since filled in: a shop's new beds, stations and routes take
 * their defaults, so saves keep working as shops grow.
 */
export function normalizeTown(saved: Partial<TownState> | undefined): TownState {
  const districts = createDistricts().map((d, i) => ({ ...d, ...saved?.districts?.[i] }));
  const town: TownState = { shops: {}, hands: saved?.hands ?? [], districts };
  for (const id of SHOP_IDS) {
    const shop = saved?.shops?.[id];
    if (!shop) continue;
    const fresh = createShop(id);
    town.shops[id] = {
      ...fresh,
      ...shop,
      beds: [...shop.beds, ...fresh.beds.slice(shop.beds.length)],
      stations: { ...fresh.stations, ...shop.stations },
      routes: { ...fresh.routes, ...shop.routes },
      counter: { ...fresh.counter, ...shop.counter },
      outfitter: { ...fresh.outfitter, ...shop.outfitter },
      study: { ...fresh.study, ...shop.study },
      priority: { ...fresh.priority, ...shop.priority },
    };
  }
  return town;
}

/** Whether the town map is open: the town grants its charter with the first seal, the plague's first cure. */
export const townOpen = (seals: number) => seals > 0;

/** The garden a bed is in. */
export const gardenOfBed = (bed: number) => Math.floor(bed / BEDS);

/** Whether a station takes a good: it is an input of one of its recipes. */
export const takes = (station: StationDef, good: GoodId) => station.recipes.some((r) => r.inputs.includes(good));

/** Whether a shop's study has taught a lesson. */
export const shopStudied = (shop: ShopState, lesson: Lesson) => shop.study[lesson].level > 0;
/** The goods a station can put first: its recipes' products, when it has more than one. */
export const priorityChoices = (station: StationDef): GoodId[] => (station.recipes.length > 1 ? station.recipes.map((r) => r.out) : []);
/** The sign on a good's shelf: Fair unless set, and always Fair before the price signs are learned. */
export const shopSignOf = (shop: ShopState, good: GoodId): PriceSign => (shopStudied(shop, 'priceSigns') && shop.signs[good]) || 'fair';

/** Whether customers buy a good at this shop. */
export const sellsGood = (def: ShopDef, good: GoodId) => def.sells[good] !== undefined;
