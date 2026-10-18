import { byDifficulty } from '../../../../shared/settings';
import { t } from '../i18n';
import { routeMs } from '../scenes/shopLayout';
import { DISTRICTS, GROW_ROUNDS, HAPPY, HAPPY_PULL, HOME_TIERS, MAX_HOMES, START_HOMES, SUPPLY_MS, UNHAPPY, districtAsks, type DistrictState, type Need } from './districts';
import { FINE, type PotionId } from './items';
import type { Feedback } from './sim';
import { carryCapacity, payment, potionPrice, speedAt, type GameState, type Upgrade } from './state';
import {
  BEDS,
  COUNTER_PAY,
  CUSTOMER_FACES,
  GOODS,
  MAX_LEVEL,
  MAX_SHOPKEEPERS,
  MAX_WORKERS,
  ROUTE_GAP_MS,
  ROUTE_SPEED,
  SHOPS,
  SHOP_IDS,
  SHOP_PATIENCE,
  SHOP_PLACES,
  SHOP_SERVE_MS,
  SHOP_STORAGE,
  WALK_IN_MS,
  createShop,
  gardenOfBed,
  levelCost,
  routeCost,
  sellsGood,
  shopCost,
  takes,
  townOpen,
  workerCost,
  type GoodId,
  type RouteDef,
  type ShopDef,
  type ShopId,
  type ShopState,
  type StationDef,
  type StationState,
} from './town';

// The town shops' rules, free of Phaser like `sim.ts`. `tickTown` runs every shop bought, whichever
// scene is on screen, and the marker actions below change one shop and return `Feedback` lines.

/** Where the doctor is working in the town this frame: which shop, and the station or counter whose work spot holds the feet. */
export interface Working {
  shop: ShopId;
  at: string | 'counter' | null;
}

export const goodName = (good: GoodId) => t(good);

const count = (list: GoodId[], good: GoodId) => list.reduce((n, g) => n + (g === good ? 1 : 0), 0);

/** Goods of one kind on their way to a station's queue or the shelf, so a route doesn't overfill it. */
function inFlight(shop: ShopState, def: ShopDef, to: RouteDef['to'], good: GoodId) {
  let n = 0;
  for (const r of def.routes) {
    const same = r.to === 'shelf' ? to === 'shelf' : to !== 'shelf' && r.to.station === to.station;
    if (same) n += shop.routes[r.id].items.filter((i) => i.good === good).length;
  }
  return n;
}

const queueRoom = (shop: ShopState, station: string, good: GoodId) => count(shop.stations[station].queue, good) < SHOP_STORAGE;
export const shelfRoom = (shop: ShopState, good: GoodId) => count(shop.shelf, good) < SHOP_STORAGE;

/** The recipe a station starts next: one whose inputs are in, whose product has room, shortest of on its pallets and the shelf. */
function nextRecipe(shop: ShopState, def: StationDef, station: StationState) {
  const ready = def.recipes.filter((r) => {
    const queue = [...station.queue];
    for (const input of r.inputs) {
      const at = queue.indexOf(input);
      if (at < 0) return false;
      queue.splice(at, 1);
    }
    return count(station.output, r.out) < SHOP_STORAGE;
  });
  const stocked = (good: GoodId) => count(station.output, good) + count(shop.shelf, good);
  return ready.reduce<(typeof ready)[number] | null>((best, r) => (!best || stocked(r.out) < stocked(best.out) ? r : best), null);
}

function runStation(shop: ShopState, def: StationDef, dt: number, doctor: boolean) {
  const station = shop.stations[def.id];
  const crew = station.hired.level + (doctor ? 1 : 0);
  if (crew === 0) return;
  let left = dt * speedAt(station.level.level) * crew;
  while (left > 0) {
    if (!station.work) {
      const recipe = nextRecipe(shop, def, station);
      if (!recipe) return;
      for (const input of recipe.inputs) station.queue.splice(station.queue.indexOf(input), 1);
      station.work = { out: recipe.out, ms: recipe.ms, progress: 0 };
    }
    const work = station.work;
    const step = Math.min(left, work.ms - work.progress);
    work.progress += step;
    left -= step;
    if (work.progress < work.ms) return;
    // Done: it waits on the station while its pallet is full.
    if (count(station.output, work.out) >= SHOP_STORAGE) return;
    station.output.push(work.out);
    station.work = null;
  }
}

/** Takes one good for a route from its source, or null when there is nothing it can carry. */
function takeForRoute(shop: ShopState, def: ShopDef, route: RouteDef): GoodId | null {
  const accepts = (good: GoodId) => {
    if (route.to === 'shelf') return sellsGood(def, good) && count(shop.shelf, good) + inFlight(shop, def, 'shelf', good) < SHOP_STORAGE;
    const station = def.stations.find((s) => s.id === (route.to as { station: string }).station)!;
    return takes(station, good) && count(shop.stations[station.id].queue, good) + inFlight(shop, def, route.to, good) < SHOP_STORAGE;
  };
  if ('garden' in route.from) {
    const garden = def.gardens[route.from.garden];
    if (!accepts(garden.good)) return null;
    const from = route.from.garden * BEDS;
    for (let b = from; b < from + BEDS; b++) {
      if (shop.beds[b] >= garden.grow) {
        shop.beds[b] = 0;
        return garden.good;
      }
    }
    return null;
  }
  const output = shop.stations[route.from.station].output;
  // The kind it holds most of first, so a route carries a mix.
  const goods = [...new Set(output)].filter(accepts).sort((a, b) => count(output, b) - count(output, a));
  if (goods.length === 0) return null;
  output.splice(output.indexOf(goods[0]), 1);
  return goods[0];
}

function runRoute(id: ShopId, shop: ShopState, def: ShopDef, route: RouteDef, dt: number) {
  const state = shop.routes[route.id];
  if (!state.built) return;
  const ms = routeMs(id, route, ROUTE_SPEED);
  for (const item of state.items) item.at = Math.min(ms, item.at + dt);
  // Goods at the end land on their station's queue or the shelf, or wait there for room.
  state.items = state.items.filter((item) => {
    if (item.at < ms) return true;
    if (route.to === 'shelf') {
      shop.shelf.push(item.good);
      return false;
    }
    shop.stations[route.to.station].queue.push(item.good);
    return false;
  });
  state.next -= dt;
  if (state.next > 0) return;
  const good = takeForRoute(shop, def, route);
  if (!good) return;
  state.items.push({ good, at: 0 });
  state.next = ROUTE_GAP_MS;
}

/** The orders at the counter, walked in and waiting. */
export const arrived = (shop: ShopState) => shop.orders.filter((o) => o.walk <= 0);

/** Hands one good from the shelf to the first customer at the counter who wants one; returns whether it did. */
function serveOne(shop: ShopState) {
  for (const order of arrived(shop)) {
    const want = order.wants.find((w) => shop.shelf.includes(w));
    if (!want) continue;
    shop.shelf.splice(shop.shelf.indexOf(want), 1);
    order.wants.splice(order.wants.indexOf(want), 1);
    shop.till += order.pay[want] ?? 0;
    shop.sold++;
    if (order.wants.length === 0) shop.orders.splice(shop.orders.indexOf(order), 1);
    return true;
  }
  return false;
}

function runCounter(shop: ShopState, dt: number, doctor: boolean) {
  if (doctor) {
    while (serveOne(shop));
    shop.serving = 0;
    return;
  }
  const hired = shop.counter.hired.level;
  if (hired === 0) return;
  shop.serving += dt * hired;
  while (shop.serving >= SHOP_SERVE_MS) {
    if (!serveOne(shop)) {
      shop.serving = 0;
      return;
    }
    shop.serving -= SHOP_SERVE_MS;
  }
}

function runOrders(shop: ShopState, def: ShopDef, dt: number, rand: () => number) {
  for (const order of shop.orders) {
    if (order.walk > 0) order.walk = Math.max(0, order.walk - dt);
    else order.patience -= dt;
  }
  shop.orders = shop.orders.filter((o) => o.patience > 0);
  shop.nextOrderIn -= dt;
  if (shop.nextOrderIn > 0) return;
  const taken = new Set(shop.orders.map((o) => o.spot));
  const spot = [...Array(SHOP_PLACES).keys()].find((s) => !taken.has(s));
  if (spot === undefined) {
    shop.nextOrderIn = 1_000;
    return;
  }
  const goods = Object.keys(def.sells) as GoodId[];
  const size = rand() < 0.35 ? 2 : 1;
  const wants = Array.from({ length: size }, () => goods[Math.floor(rand() * goods.length)]);
  const markUp = 1 + COUNTER_PAY * shop.counter.level.level;
  const pay = Object.fromEntries(wants.map((w) => [w, Math.round((def.sells[w] ?? 0) * markUp)]));
  const patience = SHOP_PATIENCE * byDifficulty(1.5, 1, 0.7);
  shop.orders.push({ id: shop.nextOrderId++, wants, pay, walk: WALK_IN_MS, patience, maxPatience: patience, face: Math.floor(rand() * CUSTOMER_FACES), spot });
  shop.nextOrderIn = 7_000 + rand() * 5_000;
}

/**
 * Advances every shop bought by `dt` milliseconds: beds grow, stations with someone at them work,
 * pixies fly, the counter serves and customers come and go. `working` is where the doctor stands in
 * the town, or null outside it. Shops not bought yet do nothing, and roll no randomness.
 */
export function tickTown(state: GameState, dt: number, working: Working | null, rand: () => number = Math.random) {
  for (const id of SHOP_IDS) {
    const shop = state.town.shops[id];
    if (!shop) continue;
    const def = SHOPS[id];
    const here = working?.shop === id ? working.at : null;
    shop.beds.forEach((grown, b) => (shop.beds[b] = Math.min(grown + dt, def.gardens[gardenOfBed(b)].grow)));
    for (const station of def.stations) runStation(shop, station, dt, here === station.id);
    for (const route of def.routes) runRoute(id, shop, def, route, dt);
    runCounter(shop, dt, here === 'counter');
    runOrders(shop, def, dt, rand);
  }
  if (townOpen(state.seals)) state.town.districts.forEach((d, i) => runDistrict(state, d, i, dt));
}

const isGood = (need: Need): need is GoodId => need in GOODS;

/**
 * Hands one of a need to a household: a good off the shelf of a shop bought that sells it, or a
 * potion off the apothecary's shelf (a plain one first), paid into that shop's till. False when
 * nobody has one on the shelf.
 */
function supplyNeed(state: GameState, need: Need): boolean {
  if (isGood(need)) {
    for (const id of SHOP_IDS) {
      const shop = state.town.shops[id];
      const price = SHOPS[id].sells[need];
      if (!shop || price === undefined || !shop.shelf.includes(need)) continue;
      shop.shelf.splice(shop.shelf.indexOf(need), 1);
      shop.till += Math.round(price * (1 + COUNTER_PAY * shop.counter.level.level));
      return true;
    }
    return false;
  }
  const shelf = state.counter.shelf;
  const at = shelf.includes(need) ? shelf.indexOf(need) : shelf.indexOf(FINE[need as PotionId]);
  if (at < 0) return false;
  shelf.splice(at, 1);
  state.counter.till += potionPrice(state, need);
  return true;
}

/**
 * A district's supply round every `SUPPLY_MS`: each home asks for one need and pays for it from the
 * shelves; happiness moves towards the share supplied, and `GROW_ROUNDS` happy rounds in a row add
 * a home (or, once full, grow every home into the next tier) while as many unhappy ones take one
 * away. A closed district opens once the one before it has grown into its second tier.
 */
function runDistrict(state: GameState, d: DistrictState, i: number, dt: number) {
  if (!d.open) {
    const before = state.town.districts[i - 1];
    if (before && before.tier > 0) d.open = true;
    return;
  }
  d.next -= dt;
  while (d.next <= 0) {
    d.next += SUPPLY_MS;
    const asks = districtAsks(d);
    const short = asks.filter((need) => !supplyNeed(state, need));
    d.short = [...new Set(short)];
    d.rounds++;
    const share = asks.length ? 1 - short.length / asks.length : 1;
    d.happiness = Math.round(d.happiness + (share * 100 - d.happiness) * HAPPY_PULL);
    if (d.happiness >= HAPPY) d.growth = Math.max(0, d.growth) + 1;
    else if (d.happiness <= UNHAPPY) d.growth = Math.min(0, d.growth) - 1;
    else d.growth = 0;
    if (d.growth >= GROW_ROUNDS) {
      d.growth = 0;
      if (d.homes < MAX_HOMES) d.homes++;
      else if (d.tier < HOME_TIERS.length - 1) d.tier++;
    } else if (d.growth <= -GROW_ROUNDS) {
      d.growth = 0;
      d.homes = Math.max(START_HOMES, d.homes - 1);
    }
  }
}

/** The districts open so far, with their defs. */
export const openDistricts = (state: GameState) => DISTRICTS.map((def, i) => ({ def, d: state.town.districts[i] })).filter(({ d }) => d.open);

/** Whether anything in the town works without the doctor: a worker, a shopkeeper or a pixie route. */
export const townAutomated = (state: GameState) =>
  SHOP_IDS.some((id) => {
    const shop = state.town.shops[id];
    return !!shop && (Object.values(shop.stations).some((s) => s.hired.level > 0) || shop.counter.hired.level > 0 || Object.values(shop.routes).some((r) => r.built));
  });

const freeHands = (state: GameState) => carryCapacity(state) - state.town.hands.length;

/** Buys a shop on the town map, all at once. */
export function buyShop(state: GameState, id: ShopId): Feedback | null {
  if (!townOpen(state.seals) || state.town.shops[id]) return null;
  const cost = shopCost(id);
  if (state.coins < cost) return null;
  state.coins -= cost;
  state.town.shops[id] = createShop(id);
  return [t('shopBought', { shop: t(SHOPS[id].name) })];
}

export function isRipeBed(state: GameState, id: ShopId, bed: number) {
  const shop = state.town.shops[id];
  return !!shop && shop.beds[bed] >= SHOPS[id].gardens[gardenOfBed(bed)].grow;
}

export function harvestBed(state: GameState, id: ShopId, bed: number): Feedback | null {
  const shop = state.town.shops[id]!;
  if (!isRipeBed(state, id, bed) || freeHands(state) === 0) return null;
  shop.beds[bed] = 0;
  const good = SHOPS[id].gardens[gardenOfBed(bed)].good;
  state.town.hands.push(good);
  return [t('gained', { item: goodName(good) })];
}

/** Drops one good from the hands that the station takes, the top one first. */
export function dropAtStation(state: GameState, id: ShopId, station: string): Feedback | null {
  const shop = state.town.shops[id]!;
  const def = SHOPS[id].stations.find((s) => s.id === station)!;
  const hands = state.town.hands;
  for (let i = hands.length - 1; i >= 0; i--) {
    const good = hands[i];
    if (!takes(def, good) || !queueRoom(shop, station, good)) continue;
    hands.splice(i, 1);
    shop.stations[station].queue.push(good);
    return [t('handedOver', { item: goodName(good) })];
  }
  return null;
}

/** Picks one good off a station's out pallets: the kind the hands hold fewest of, then the one most waiting. */
export function pickUpFromStation(state: GameState, id: ShopId, station: string): Feedback | null {
  const output = state.town.shops[id]!.stations[station].output;
  if (output.length === 0 || freeHands(state) === 0) return null;
  const hands = state.town.hands;
  const kinds = [...new Set(output)].sort((a, b) => count(hands, a) - count(hands, b) || count(output, b) - count(output, a));
  output.splice(output.indexOf(kinds[0]), 1);
  hands.push(kinds[0]);
  return [t('gained', { item: goodName(kinds[0]) })];
}

/** Puts one good the shop sells from the hands onto its shelf. */
export function stockShopShelf(state: GameState, id: ShopId): Feedback | null {
  const shop = state.town.shops[id]!;
  const hands = state.town.hands;
  for (let i = hands.length - 1; i >= 0; i--) {
    const good = hands[i];
    if (!sellsGood(SHOPS[id], good) || !shelfRoom(shop, good)) continue;
    hands.splice(i, 1);
    shop.shelf.push(good);
    return [t('handedOver', { item: goodName(good) })];
  }
  return null;
}

export function collectShopTill(state: GameState, id: ShopId): Feedback | null {
  const shop = state.town.shops[id]!;
  if (shop.till === 0) return null;
  const n = shop.till;
  state.coins += n;
  shop.till = 0;
  return [t('coinsGained', { n })];
}

export function tossGood(state: GameState, slot: number): Feedback | null {
  const good = state.town.hands[slot];
  if (!good) return null;
  state.town.hands.splice(slot, 1);
  return [t('droppedItem', { item: goodName(good) })];
}

/**
 * Pays towards `cost`: about a twelfth of it at a time (at least 5 coins), so even the dearest
 * shop's upgrades fill in a couple of seconds on the marker, and more the longer the doctor stays
 * (see `payment`).
 */
function payTowards(state: GameState, toward: { paid: number }, cost: number): number {
  const coins = Math.min(Math.max(5, Math.ceil(cost / 12)) * payment.boost, state.coins, cost - toward.paid);
  if (coins <= 0) return 0;
  state.coins -= coins;
  toward.paid += coins;
  return coins;
}

function payLevel(state: GameState, upgrade: Upgrade, cost: number, max: number, done: () => string): Feedback | null {
  if (upgrade.level >= max) return null;
  const coins = payTowards(state, upgrade, cost);
  if (!coins) return null;
  if (upgrade.paid < cost) return [t('coinsPaid', { n: coins })];
  upgrade.level++;
  upgrade.paid = 0;
  return [done()];
}

export function payStationLevel(state: GameState, id: ShopId, station: string): Feedback | null {
  const s = state.town.shops[id]!.stations[station];
  const name = t(SHOPS[id].stations.find((d) => d.id === station)!.name);
  return payLevel(state, s.level, levelCost(id, s.level.level), MAX_LEVEL, () => t('levelUp', { name, level: s.level.level + 1 }));
}

export function payWorker(state: GameState, id: ShopId, station: string): Feedback | null {
  const s = state.town.shops[id]!.stations[station];
  return payLevel(state, s.hired, workerCost(id, s.hired.level), MAX_WORKERS, () => t('workerHired', { worker: t(SHOPS[id].worker) }));
}

export function payCounterLevel(state: GameState, id: ShopId): Feedback | null {
  const c = state.town.shops[id]!.counter;
  return payLevel(state, c.level, levelCost(id, c.level.level), MAX_LEVEL, () => t('levelUp', { name: t('counter'), level: c.level.level + 1 }));
}

export function payShopkeeper(state: GameState, id: ShopId): Feedback | null {
  const c = state.town.shops[id]!.counter;
  return payLevel(state, c.hired, workerCost(id, c.hired.level), MAX_SHOPKEEPERS, () => t('shopkeeperHired'));
}

export function payRoute(state: GameState, id: ShopId, route: string): Feedback | null {
  const r = state.town.shops[id]!.routes[route];
  if (r.built) return null;
  const cost = routeCost(id, SHOPS[id].routes.find((d) => d.id === route)!);
  const coins = payTowards(state, r, cost);
  if (!coins) return null;
  if (r.paid < cost) return [t('coinsPaid', { n: coins })];
  r.built = true;
  return [t('pixiesFly')];
}

/** A good's colour, for bars and crates. */
export const goodColor = (good: GoodId) => GOODS[good].color;
