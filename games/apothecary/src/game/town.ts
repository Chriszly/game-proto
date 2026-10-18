import type { TextKey } from '../i18n';
import { createDistricts, type DistrictState } from './districts';
import type { Upgrade } from './state';

// The town past the apothecary: once the plague is first cured the town grants a charter, and the
// doctor can buy more shops on the town map, each with its own yard of gardens, stations and a
// counter, run like the apothecary. Each shop costs ten times the one before (a sink for the coins
// a grown apothecary makes), and its stations, workers and pixies cost `TIER_STEP` times as much
// as the shop before's, while its goods sell for about as much more. Phaser-free, like `state.ts`.

/** What a town shop grows, makes and sells. The apothecary's wheat and flour are painted the same. */
export type GoodId = 'wheat' | 'honeycomb' | 'flour' | 'bread' | 'honeyCake';

export const GOODS: Record<GoodId, { color: number }> = {
  wheat: { color: 0xd9b24a },
  honeycomb: { color: 0xe0a83a },
  flour: { color: 0xf1e8d0 },
  bread: { color: 0xb8783a },
  honeyCake: { color: 0xd8944a },
};

/** The shops on the town map besides the apothecary, in the order they are bought. */
export type ShopId = 'bakery';

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

/** Whether customers buy a good at this shop. */
export const sellsGood = (def: ShopDef, good: GoodId) => def.sells[good] !== undefined;
