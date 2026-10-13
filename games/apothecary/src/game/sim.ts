import {
  GROW_MS,
  ITEMS,
  POTIONS,
  RECIPES,
  REFINE,
  isPlant,
  isPotion,
  isRefined,
  type ItemId,
  type PotionId,
} from './items';
import {
  BELT_COST,
  BELT_ENDS,
  BELT_GAP_MS,
  BELT_LANES,
  BELT_MS,
  BELTS,
  SERVE_MS,
  CAULDRONS,
  EXPANSION_COST,
  MAX_CRAFTSMEN,
  beltSpeed,
  growthSpeed,
  maxOrders,
  orderInterval,
  potionPrice,
  REFINERS,
  LINE2_GARDEN,
  UPGRADES,
  anyFieldBuilt,
  beltBuildable,
  carryCapacity,
  stationBuilt,
  craftsmanCost,
  gardenBuilt,
  gardenOf,
  speedAt,
  palletHasRoom,
  upgradeCost,
  type BeltId,
  type BeltItem,
  type Build,
  type Cauldron,
  type CauldronId,
  type GameState,
  type RefinerId,
  type Order,
  type Refiner,
  type StationId,
  type Upgrade,
  type UpgradeId,
} from './state';
// Where belts meet comes from their paths; the layout is plain data, free of Phaser too.
import { BELT_JOIN_MS, beltSpan } from '../scenes/layout';

// Pure game rules, kept free of Phaser so later automation can drive the same functions.

/**
 * How many work a station: its craftsmen once any are hired, otherwise the doctor when standing on
 * its work spot. A station with craftsmen has no work spot left.
 */
const crew = (state: GameState, id: StationId, workingAt: StationId | null) =>
  state.craftsmen[id].level > 0 ? state.craftsmen[id].level : workingAt === id ? 1 : 0;

/**
 * Advances the world by `dt` ms. Stations only work while someone works them: the doctor standing
 * at their work spot, given as `workingAt`, or their craftsmen. The refining table and cauldron make
 * progress, faster with each extra pair of hands, and customers are served. A counter's second
 * craftsman also takes the coins from the till. Customers are served, and lose patience, only once
 * they stand at the counter, as `atCounter` says; without anyone showing them walk in, they are
 * there at once.
 */
export function tick(
  state: GameState,
  dt: number,
  workingAt: StationId | null,
  atCounter: (order: Order) => boolean = () => true,
  rand: () => number = Math.random,
) {
  for (const plot of state.plots) {
    plot.grown = Math.min(plot.grown + dt * growthSpeed(state), GROW_MS[plot.plant]);
  }

  for (const id of REFINERS) {
    const refiner = state[id];
    const next = refining(refiner);
    const hands = crew(state, id, workingAt);
    if (hands === 0 || next < 0) continue;
    // The plant being worked on moves to the front of the queue, so its progress stays its own even
    // when a plant ahead of it gets room on its pallet again.
    if (next > 0) refiner.queue.unshift(...refiner.queue.splice(next, 1));
    refiner.progress += dt * hands * speedAt(state.upgrades[id].level);
    const recipe = REFINE[refiner.queue[0]];
    if (refiner.progress >= recipe.ms) {
      refiner.queue.shift();
      refiner.output.push(recipe.out);
      // Work past the end of this plant goes on the next, so a slow frame rate makes no less.
      refiner.progress = refiner.queue.length > 0 ? refiner.progress - recipe.ms : 0;
    }
  }

  for (const id of CAULDRONS) {
    const cauldron = state[id];
    const hands = crew(state, id, workingAt);
    if (hands === 0) continue;
    // The recipe is picked when work starts, from everything in the cauldron by then.
    if (!cauldron.brewing) startBrew(state, cauldron);
    if (!cauldron.brewing) continue;
    cauldron.brewing.progress += dt * hands * speedAt(state.upgrades[id].level);
    if (cauldron.brewing.progress >= cauldron.brewing.ms) {
      const over = cauldron.brewing.progress - cauldron.brewing.ms;
      cauldron.output.push(cauldron.brewing.out);
      cauldron.brewing = null;
      // Work past the end of this brew goes on the next, if there is one.
      const next = startBrew(state, cauldron);
      if (next) next.progress = over;
    }
  }

  for (const id of BELTS) runBelt(state, id, dt);

  serveCustomers(state, dt, workingAt, atCounter);
  if (state.craftsmen.counter.level >= 2) collectTill(state);
  for (const order of state.orders) if (atCounter(order)) order.patience -= dt;
  state.orders = state.orders.filter((o) => o.patience > 0);

  state.nextOrderIn -= dt;
  if (state.nextOrderIn <= 0) {
    state.nextOrderIn = orderInterval(state, rand());
    if (state.orders.length < maxOrders(state)) state.orders.push(newOrder(state, rand));
  }
}

/**
 * Which waiting plant the refining table works on: the first whose output pallet has room, or -1
 * when there is none.
 */
export const refining = (refiner: Refiner) => refiner.queue.findIndex((plant) => palletHasRoom(refiner.output, REFINE[plant].out));

/**
 * Where each belt takes goods from: a ripe plant from either garden of its line, or a station's
 * finished goods; only goods whose lane has room at the start.
 */
function takeForBelt(state: GameState, belt: BeltId, fits: (id: ItemId) => boolean): ItemId | null {
  if (belt === 'garden' || belt === 'garden2') {
    const line2 = belt === 'garden2';
    const i = state.plots.findIndex((p, i) => gardenOf(i) >= LINE2_GARDEN === line2 && isRipe(state, i) && fits(p.plant));
    if (i < 0) return null;
    state.plots[i].grown = 0;
    return state.plots[i].plant;
  }
  const output = state[belt].output;
  const i = output.findIndex(fits);
  return i < 0 ? null : output.splice(i, 1)[0];
}

/** Where each belt hands its goods to: the station's tray they go in. */
function beltTarget(state: GameState, belt: BeltId): ItemId[] {
  const targets: Record<BeltId, ItemId[]> = {
    garden: state.refiner.queue,
    refiner: state.cauldron.contents,
    cauldron: state.counter.shelf,
    garden2: state.refiner2.queue,
    refiner2: state.cauldron2.contents,
    cauldron2: state.counter.shelf,
  };
  return targets[belt];
}

/** Hands an item from the end of a belt to the next station, if it has room. */
function giveFromBelt(state: GameState, belt: BeltId, id: ItemId) {
  const to = beltTarget(state, belt);
  if (!palletHasRoom(to, id)) return false;
  (to as ItemId[]).push(id);
  return true;
}

/**
 * The two cauldron belts share their run up to the counter, so in each lane an item from a gap
 * before the join on keeps a gap behind the other belt's items there as well. Returns the other
 * belt's items near or past the join, by lane, or null for a belt that joins none.
 */
function mergingItems(state: GameState, id: BeltId) {
  if (id !== 'cauldron' && id !== 'cauldron2') return null;
  const byLane = new Map<ItemId, BeltItem[]>();
  const other = state.belts[OTHER_LINE[id]];
  if (!other.built) return byLane;
  for (const item of other.items) {
    if (item.at < BELT_JOIN_MS - BELT_GAP_MS) continue;
    const lane = byLane.get(item.id);
    if (lane) lane.push(item);
    else byLane.set(item.id, [item]);
  }
  return byLane;
}

/**
 * Moves a built belt's items along, each in its own kind's lane. The item at the end of a lane is
 * handed over when the next station has room; until then it waits and the items behind it in that
 * lane queue up, while the other lanes keep moving. A new item is taken on once the last one in its
 * lane has moved a gap away from the start.
 */
function runBelt(state: GameState, id: BeltId, dt: number) {
  const belt = state.belts[id];
  if (!belt.built) return;
  const length = BELT_MS[id];
  // Each lane runs at a share of the belt's speed, so all lanes together carry as much as one did.
  const step = (dt * beltSpeed(state)) / BELT_LANES[id].length;
  // The item last seen in each lane: the one ahead of the next in that lane, and in the end the rearmost.
  const ahead = new Map<ItemId, BeltItem>();
  const merging = mergingItems(state, id);
  belt.items = belt.items.filter((item) => {
    const front = !ahead.has(item.id);
    if (front && item.at >= length && giveFromBelt(state, id, item.id)) return false;
    let room = front ? length : ahead.get(item.id)!.at - BELT_GAP_MS;
    if (merging && item.at + step >= BELT_JOIN_MS - BELT_GAP_MS) {
      for (const other of merging.get(item.id) ?? []) {
        // The first line's belt goes first when two items reach the join together.
        const first = other.at > item.at || (other.at === item.at && id === 'cauldron2');
        if (first) room = Math.min(room, other.at - BELT_GAP_MS);
      }
    }
    item.at = Math.max(item.at, Math.min(item.at + step, room));
    ahead.set(item.id, item);
    return true;
  });
  const item = takeForBelt(state, id, (kind) => BELT_LANES[id].includes(kind) && (ahead.get(kind)?.at ?? Infinity) >= beltStart(id, kind) + BELT_GAP_MS);
  if (item) belt.items.push({ id: item, at: beltStart(id, item) });
}

/** Where goods of a kind get on a belt, in ms along its main run: the start of their own run. */
const beltStart = (id: BeltId, kind: ItemId) => beltSpan(id, kind).start;

/**
 * How many more of a potion customers want than the apothecary has ready or on the way: on the
 * counter's shelf, brewing, on the cauldrons' pallets and belts, and in the doctor's hands.
 */
export function shortfall(state: GameState, potion: PotionId) {
  const wanted = state.orders.reduce((n, o) => n + o.wants.filter((p) => p === potion).length, 0);
  // Each cauldron's belt is named after it.
  const riding = CAULDRONS.flatMap((id) => state.belts[id].items.map((item) => item.id));
  const brewing = CAULDRONS.flatMap((id) => state[id].brewing?.out ?? []);
  const ready = [state.counter.shelf, state.carrying, riding, brewing, ...CAULDRONS.map((id) => state[id].output)].reduce(
    (n, items) => n + items.filter((p) => p === potion).length,
    0,
  );
  return wanted - ready;
}

/**
 * Starts the recipe the shop is shortest of among those the cauldron has the ingredients and room
 * for, so the potion customers are waiting for gets brewed first. Ties go in recipe order. Returns
 * the brew started, if any.
 */
function startBrew(state: GameState, cauldron: Cauldron) {
  const need = new Map(RECIPES.map((r) => [r.out, shortfall(state, r.out)]));
  const byNeed = [...RECIPES].sort((a, b) => need.get(b.out)! - need.get(a.out)!);
  for (const recipe of byNeed) {
    if (!palletHasRoom(cauldron.output, recipe.out)) continue;
    const left = without(cauldron.contents, recipe.inputs);
    if (left) {
      cauldron.contents = left;
      cauldron.brewing = { out: recipe.out, ms: recipe.ms, progress: 0 };
      return cauldron.brewing;
    }
  }
  return null;
}

function newOrder(state: GameState, rand: () => number) {
  const count = rand() < 0.35 ? 2 : 1;
  const wants = Array.from({ length: count }, () => POTIONS[Math.floor(rand() * POTIONS.length)]);
  // Customers pay for each potion as they get it, with a tip that is more generous, and patience
  // that lasts longer, at a better counter.
  const level = state.upgrades.counter.level;
  const pay = Object.fromEntries(wants.map((p) => [p, potionPrice(state, p) + 2 * (level + 1)]));
  const maxPatience = (60_000 + rand() * 30_000) * (1 + 0.25 * level);
  return { id: state.nextOrderId++, wants, pay, patience: maxPatience, maxPatience };
}

/** Whether a plot can be harvested: grown, in a garden that is there. */
export function isRipe(state: GameState, plotIndex: number) {
  const plot = state.plots[plotIndex];
  return plot.grown >= GROW_MS[plot.plant] && gardenBuilt(state, gardenOf(plotIndex));
}

/** Outcome of an interaction, as short lines for floating feedback text. */
export type Feedback = string[];

const freeHands = (state: GameState) => carryCapacity(state) - state.carrying.length;

export function harvest(state: GameState, plotIndex: number): Feedback {
  const plot = state.plots[plotIndex];
  if (!isRipe(state, plotIndex)) return ['Not ripe yet'];
  if (freeHands(state) === 0) return ['Hands full'];
  plot.grown = 0;
  state.carrying.push(plot.plant);
  return [`+ ${ITEMS[plot.plant].name}`];
}

/**
 * Serving at the counter. The doctor on the work spot hands customers everything on the shelf they
 * want at once. Craftsmen take SERVE_MS over each potion, sped up by each pair of hands.
 */
function serveCustomers(state: GameState, dt: number, workingAt: StationId | null, atCounter: (order: Order) => boolean) {
  const { counter } = state;
  const hired = state.craftsmen.counter.level;
  if (hired === 0) {
    if (workingAt === 'counter') serveFromShelf(state, atCounter);
    return;
  }
  if (!state.orders.some((o) => atCounter(o) && o.wants.some((want) => counter.shelf.includes(want)))) {
    counter.serving = 0;
    return;
  }
  counter.serving = (counter.serving ?? 0) + dt * hired;
  if (counter.serving < SERVE_MS) return;
  counter.serving -= SERVE_MS;
  serveFromShelf(state, atCounter, 1);
}

/**
 * Customers take what they ordered from the counter shelf, at most `limit` potions, and pay into
 * the till. Orders the shelf can fill completely go first (oldest first); leftover matching potions
 * go towards the rest.
 */
function serveFromShelf(state: GameState, atCounter: (order: Order) => boolean, limit = Infinity) {
  const { counter } = state;
  if (counter.shelf.length === 0) return;
  const give = (order: Order) => {
    order.wants = order.wants.filter((want) => {
      const i = counter.shelf.indexOf(want);
      if (i < 0 || limit <= 0) return true;
      counter.shelf.splice(i, 1);
      counter.till += order.pay[want] ?? 0;
      limit--;
      return false;
    });
  };
  // Only customers standing at the counter get served.
  const waiting = state.orders.filter(atCounter);
  for (const order of waiting) if (canFill(counter.shelf, order)) give(order);
  for (const order of waiting) if (order.wants.length > 0) give(order);
  state.orders = state.orders.filter((o) => o.wants.length > 0);
}

function canFill(carrying: readonly ItemId[], order: Order) {
  return without(carrying, order.wants) !== null;
}

/** What is left of `items` once one of each of `taken` is taken out, or null if any is missing. */
function without<T extends ItemId>(items: readonly T[], taken: readonly T[]): T[] | null {
  const left = [...items];
  for (const item of taken) {
    const i = left.indexOf(item);
    if (i < 0) return null;
    left.splice(i, 1);
  }
  return left;
}

// Floor markers: while the doctor stands on one, the scene calls its action repeatedly, and each
// call moves at most one item (or one handful of coins). They return null when nothing moved.

/** Takes the topmost carried item matching `pick` that has room on its pallet in `to` off the doctor's back. */
function takeTopFromBack<T extends ItemId>(state: GameState, pick: (id: ItemId) => id is T, to: readonly ItemId[]): T | null {
  for (let i = state.carrying.length - 1; i >= 0; i--) {
    const id = state.carrying[i];
    if (pick(id) && palletHasRoom(to, id)) {
      state.carrying.splice(i, 1);
      return id;
    }
  }
  return null;
}

function pickUpOne(state: GameState, from: ItemId[]): Feedback | null {
  if (from.length === 0 || freeHands(state) === 0) return null;
  const id = from.shift()!;
  state.carrying.push(id);
  return [`+ ${ITEMS[id].name}`];
}

export function dropAtRefiner(state: GameState, id: RefinerId = 'refiner'): Feedback | null {
  const plant = takeTopFromBack(state, isPlant, state[id].queue);
  if (!plant) return null;
  state[id].queue.push(plant);
  return [`- ${ITEMS[plant].name}`];
}

export const pickUpFromRefiner = (state: GameState, id: RefinerId = 'refiner') => pickUpOne(state, state[id].output);

export function dropInCauldron(state: GameState, id: CauldronId = 'cauldron'): Feedback | null {
  const good = takeTopFromBack(state, isRefined, state[id].contents);
  if (!good) return null;
  state[id].contents.push(good);
  return [`- ${ITEMS[good].name}`];
}

export const pickUpFromCauldron = (state: GameState, id: CauldronId = 'cauldron') => pickUpOne(state, state[id].output);

const UPGRADE_STEP = 5;
/** Pays a handful of coins towards `cost`; once it is fully paid, `complete` says what was bought. */
function pay(state: GameState, toward: { paid: number }, cost: number, complete: () => string): Feedback {
  const coins = Math.min(UPGRADE_STEP, state.coins, cost - toward.paid);
  state.coins -= coins;
  toward.paid += coins;
  return toward.paid < cost ? [`-${coins} coins`] : [complete()];
}

/** Pays towards the next of something bought in levels, going up once fully paid. */
function payLevel(state: GameState, upgrade: Upgrade, max: number, cost: number, done: () => string): Feedback | null {
  if (upgrade.level >= max || state.coins === 0) return null;
  return pay(state, upgrade, cost, () => {
    upgrade.level++;
    upgrade.paid = 0;
    return done();
  });
}

/** Pays a handful of coins towards an upgrade's next level, levelling it up once fully paid. */
export function payUpgrade(state: GameState, id: UpgradeId): Feedback | null {
  const upgrade = state.upgrades[id];
  return payLevel(state, upgrade, UPGRADES[id].max, upgradeCost(id, upgrade.level), () => `${UPGRADES[id].name} level ${upgrade.level + 1}!`);
}

/** Pays a handful of coins towards hiring a station's next craftsman, who starts work once fully paid. */
export function payCraftsman(state: GameState, id: StationId): Feedback | null {
  const hired = state.craftsmen[id];
  return payLevel(state, hired, MAX_CRAFTSMEN, craftsmanCost(hired.level), () => 'Craftsman hired!');
}

/** Pays towards a build, which is done once fully paid. */
function payToward(state: GameState, build: Build, cost: number, done: string): Feedback | null {
  if (build.built || state.coins === 0) return null;
  return pay(state, build, cost, () => {
    build.built = true;
    return done;
  });
}

const BELT_NAMES: Record<BeltId, string> = {
  garden: 'Garden belt',
  refiner: 'Table belt',
  cauldron: 'Cauldron belt',
  garden2: 'Garden belt',
  refiner2: 'Table belt',
  cauldron2: 'Cauldron belt',
};

/** Each belt's twin on the other line, which takes the same kind of goods by hand until it is built. */
const OTHER_LINE: Record<BeltId, BeltId> = {
  garden: 'garden2',
  refiner: 'refiner2',
  cauldron: 'cauldron2',
  garden2: 'garden',
  refiner2: 'refiner',
  cauldron2: 'cauldron',
};

/**
 * Whether a belt's step is still done by hand: it isn't built, while a station at its ends stands
 * (not counting the counter both lines share), or for the second line's garden belt, a field.
 */
export const doneByHand = (state: GameState, id: BeltId) =>
  !state.belts[id].built &&
  (BELT_ENDS[id].some((station) => station !== 'counter' && stationBuilt(state, station)) ||
    (id === 'garden2' && anyFieldBuilt(state)));

/**
 * Pays a handful of coins towards building a belt, which starts running once fully paid. The belt
 * takes over that step of the work, so the goods it carries go from the doctor's hands onto it,
 * unless the other line still takes them by hand. They get on one after another, a gap apart in each
 * lane, so those waiting their turn stand just before the start, out of sight.
 */
export function payBelt(state: GameState, id: BeltId): Feedback | null {
  if (!beltBuildable(state, id)) return null;
  const belt = state.belts[id];
  const feedback = payToward(state, belt, BELT_COST[id], `${BELT_NAMES[id]} built!`);
  if (!feedback || !belt.built) return feedback;
  if (doneByHand(state, OTHER_LINE[id])) return feedback;
  const carried = (item: ItemId) => BELT_LANES[id].includes(item);
  const loaded = state.carrying.filter(carried);
  state.carrying = state.carrying.filter((item) => !carried(item));
  loaded.forEach((item, i) => {
    const ahead = loaded.slice(0, i).filter((other) => other === item).length;
    belt.items.push({ id: item, at: beltStart(id, item) - ahead * BELT_GAP_MS });
  });
  return loaded.length > 0 ? [...feedback, `${loaded.length} onto the belt`] : feedback;
}

/** Drops everything the doctor carries; the goods are gone. */
export function dropAll(state: GameState): Feedback | null {
  if (state.carrying.length === 0) return null;
  const dropped = state.carrying.length;
  state.carrying = [];
  return [`Dropped ${dropped}`];
}

/** What can be built on the expansion: its land first, then a field, the table or the cauldron. */
export type ExpansionPart = 'land' | 'field1' | 'field2' | 'refiner' | 'cauldron';

/** Pays a handful of coins towards part of the expansion; everything but the land needs the land first. */
export function payExpansion(state: GameState, part: ExpansionPart): Feedback | null {
  const { expansion } = state;
  if (part === 'land') return payToward(state, expansion.land, EXPANSION_COST.land, 'New land bought!');
  if (!expansion.land.built) return null;
  if (part === 'refiner') return payToward(state, expansion.refiner, EXPANSION_COST.refiner, 'Refining table built!');
  if (part === 'cauldron') return payToward(state, expansion.cauldron, EXPANSION_COST.cauldron, 'Cauldron built!');
  const field = expansion.fields[part === 'field1' ? 0 : 1];
  return payToward(state, field, EXPANSION_COST.field, 'Field planted!');
}

export function stockShelf(state: GameState): Feedback | null {
  const potion = takeTopFromBack(state, isPotion, state.counter.shelf);
  if (!potion) return null;
  state.counter.shelf.push(potion);
  return [`- ${ITEMS[potion].name}`];
}

export function collectTill(state: GameState): Feedback | null {
  const { counter } = state;
  if (counter.till === 0) return null;
  state.coins += counter.till;
  const feedback = [`+${counter.till} coins`];
  counter.till = 0;
  return feedback;
}
