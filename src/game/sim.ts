import {
  GROW_MS,
  ITEMS,
  POTION_PRICE,
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
  BELT_GAP_MS,
  BELT_MS,
  BELTS,
  CAULDRONS,
  CARRY_CAPACITY,
  EXPANSION_COST,
  MAX_LEVEL,
  MAX_ORDERS,
  REFINERS,
  LINE2_GARDEN,
  STATION_CAPACITY,
  beltBuildable,
  gardenBuilt,
  gardenOf,
  speedAt,
  upgradeCost,
  type BeltId,
  type Build,
  type Cauldron,
  type CauldronId,
  type GameState,
  type RefinerId,
  type Order,
  type StationId,
} from './state';

// Pure game rules, kept free of Phaser so later automation can drive the same functions.

/**
 * Advances the world by `dt` ms. Stations only work while the doctor stands at their work spot,
 * given as `workingAt`: the refining table and cauldron make progress, and customers are served.
 */
export function tick(state: GameState, dt: number, workingAt: StationId | null, rand: () => number = Math.random) {
  for (const plot of state.plots) {
    plot.grown = Math.min(plot.grown + dt, GROW_MS[plot.plant]);
  }

  for (const id of REFINERS) {
    const refiner = state[id];
    if (workingAt !== id || refiner.queue.length === 0 || refiner.output.length >= STATION_CAPACITY) continue;
    refiner.progress += dt * speedAt(state.upgrades[id].level);
    const recipe = REFINE[refiner.queue[0]];
    if (refiner.progress >= recipe.ms) {
      refiner.queue.shift();
      refiner.output.push(recipe.out);
      refiner.progress = 0;
    }
  }

  for (const id of CAULDRONS) {
    const cauldron = state[id];
    if (!cauldron.brewing && cauldron.output.length < STATION_CAPACITY) startBrew(cauldron);
    if (workingAt !== id || !cauldron.brewing) continue;
    cauldron.brewing.progress += dt * speedAt(state.upgrades[id].level);
    if (cauldron.brewing.progress >= cauldron.brewing.ms) {
      cauldron.output.push(cauldron.brewing.out);
      cauldron.brewing = null;
    }
  }

  for (const id of BELTS) runBelt(state, id, dt);

  if (workingAt === 'counter') serveFromShelf(state);
  for (const order of state.orders) order.patience -= dt;
  state.orders = state.orders.filter((o) => o.patience > 0);

  state.nextOrderIn -= dt;
  if (state.nextOrderIn <= 0) {
    state.nextOrderIn = 12_000 + rand() * 8_000;
    if (state.orders.length < MAX_ORDERS) state.orders.push(newOrder(state, rand));
  }
}

/**
 * Where each belt takes goods from: a ripe plant from either garden of its line, or a station's
 * finished goods.
 */
function takeForBelt(state: GameState, belt: BeltId): ItemId | null {
  if (belt === 'garden' || belt === 'garden2') {
    const line2 = belt === 'garden2';
    const i = state.plots.findIndex((_, i) => gardenOf(i) >= LINE2_GARDEN === line2 && isRipe(state, i));
    if (i < 0) return null;
    state.plots[i].grown = 0;
    return state.plots[i].plant;
  }
  return state[belt].output.shift() ?? null;
}

/** Where each belt hands its goods to. */
const beltTarget = (state: GameState, belt: BeltId): ItemId[] =>
  ({
    garden: state.refiner.queue,
    refiner: state.cauldron.contents,
    cauldron: state.counter.shelf,
    garden2: state.refiner2.queue,
    refiner2: state.cauldron2.contents,
    cauldron2: state.counter.shelf,
  })[belt];

/** Hands an item from the end of a belt to the next station, if it has room. */
function giveFromBelt(state: GameState, belt: BeltId, id: ItemId) {
  const to = beltTarget(state, belt);
  if (to.length >= STATION_CAPACITY) return false;
  (to as ItemId[]).push(id);
  return true;
}

/**
 * Moves a built belt's items along. The item at the end is handed over when the next station has
 * room; until then it waits and the items behind it queue up. A new item is taken on once the last
 * one has moved a gap away from the start.
 */
function runBelt(state: GameState, id: BeltId, dt: number) {
  const belt = state.belts[id];
  if (!belt.built) return;
  const length = BELT_MS[id];
  if (belt.items.length > 0 && belt.items[0].at >= length && giveFromBelt(state, id, belt.items[0].id)) belt.items.shift();
  belt.items.forEach((item, i) => {
    const room = i === 0 ? length : belt.items[i - 1].at - BELT_GAP_MS;
    item.at = Math.max(item.at, Math.min(item.at + dt, room));
  });
  const last = belt.items[belt.items.length - 1];
  if (!last || last.at >= BELT_GAP_MS) {
    const item = takeForBelt(state, id);
    if (item) belt.items.push({ id: item, at: 0 });
  }
}

function startBrew(cauldron: Cauldron) {
  for (const recipe of RECIPES) {
    const left = [...cauldron.contents];
    const ok = recipe.inputs.every((input) => {
      const i = left.indexOf(input);
      if (i < 0) return false;
      left.splice(i, 1);
      return true;
    });
    if (ok) {
      cauldron.contents = left;
      cauldron.brewing = { out: recipe.out, ms: recipe.ms, progress: 0 };
      return;
    }
  }
}

function newOrder(state: GameState, rand: () => number) {
  const potions = Object.keys(POTION_PRICE) as PotionId[];
  const count = rand() < 0.35 ? 2 : 1;
  const wants = Array.from({ length: count }, () => potions[Math.floor(rand() * potions.length)]);
  // Customers tip per potion, more generously and patiently at a better counter.
  const level = state.upgrades.counter.level;
  const reward = wants.reduce((sum, p) => sum + POTION_PRICE[p], 0) + count * 2 * (level + 1);
  const maxPatience = (60_000 + rand() * 30_000) * (1 + 0.25 * level);
  return { id: state.nextOrderId++, wants, reward, patience: maxPatience, maxPatience };
}

/** Whether a plot can be harvested: grown, in a garden that is there. */
export function isRipe(state: GameState, plotIndex: number) {
  const plot = state.plots[plotIndex];
  return plot.grown >= GROW_MS[plot.plant] && gardenBuilt(state, gardenOf(plotIndex));
}

/** Outcome of an interaction, as short lines for floating feedback text. */
export type Feedback = string[];

const freeHands = (state: GameState) => CARRY_CAPACITY - state.carrying.length;

export function harvest(state: GameState, plotIndex: number): Feedback {
  const plot = state.plots[plotIndex];
  if (!isRipe(state, plotIndex)) return ['Not ripe yet'];
  if (freeHands(state) === 0) return ['Hands full'];
  plot.grown = 0;
  state.carrying.push(plot.plant);
  return [`+ ${ITEMS[plot.plant].name}`];
}

/**
 * Customers take what they ordered from the counter shelf and pay into the till. Orders the shelf
 * can fill completely go first (oldest first); leftover matching potions go towards the rest.
 */
function serveFromShelf(state: GameState) {
  const { counter } = state;
  if (counter.shelf.length === 0) return;
  const give = (order: Order) => {
    order.wants = order.wants.filter((want) => {
      const i = counter.shelf.indexOf(want);
      if (i < 0) return true;
      counter.shelf.splice(i, 1);
      return false;
    });
    if (order.wants.length === 0) counter.till += order.reward;
  };
  for (const order of state.orders) if (canFill(counter.shelf, order)) give(order);
  for (const order of state.orders) if (order.wants.length > 0) give(order);
  state.orders = state.orders.filter((o) => o.wants.length > 0);
}

function canFill(carrying: readonly ItemId[], order: Order) {
  const left = [...carrying];
  return order.wants.every((want) => {
    const i = left.indexOf(want);
    if (i >= 0) left.splice(i, 1);
    return i >= 0;
  });
}

// Floor markers: while the doctor stands on one, the scene calls its action repeatedly, and each
// call moves at most one item (or one handful of coins). They return null when nothing moved.

/** Takes the topmost carried item matching `pick` off the doctor's back. */
function takeTopFromBack<T extends ItemId>(state: GameState, pick: (id: ItemId) => id is T): T | null {
  for (let i = state.carrying.length - 1; i >= 0; i--) {
    const id = state.carrying[i];
    if (pick(id)) {
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
  if (state[id].queue.length >= STATION_CAPACITY) return null;
  const plant = takeTopFromBack(state, isPlant);
  if (!plant) return null;
  state[id].queue.push(plant);
  return [`- ${ITEMS[plant].name}`];
}

export const pickUpFromRefiner = (state: GameState, id: RefinerId = 'refiner') => pickUpOne(state, state[id].output);

export function dropInCauldron(state: GameState, id: CauldronId = 'cauldron'): Feedback | null {
  if (state[id].contents.length >= STATION_CAPACITY) return null;
  const good = takeTopFromBack(state, isRefined);
  if (!good) return null;
  state[id].contents.push(good);
  return [`- ${ITEMS[good].name}`];
}

export const pickUpFromCauldron = (state: GameState, id: CauldronId = 'cauldron') => pickUpOne(state, state[id].output);

const UPGRADE_STEP = 5;
const STATION_NAMES: Record<StationId, string> = {
  refiner: 'Refining table',
  cauldron: 'Cauldron',
  refiner2: 'Refining table',
  cauldron2: 'Cauldron',
  counter: 'Counter',
};

/** Pays a handful of coins towards the station's next level, levelling it up once fully paid. */
export function payUpgrade(state: GameState, station: StationId): Feedback | null {
  const upgrade = state.upgrades[station];
  if (upgrade.level >= MAX_LEVEL || state.coins === 0) return null;
  const cost = upgradeCost(upgrade.level);
  const pay = Math.min(UPGRADE_STEP, state.coins, cost - upgrade.paid);
  state.coins -= pay;
  upgrade.paid += pay;
  if (upgrade.paid < cost) return [`-${pay} coins`];
  upgrade.level++;
  upgrade.paid = 0;
  return [`${STATION_NAMES[station]} level ${upgrade.level + 1}!`];
}

/** Pays a handful of coins towards a build, which is done once fully paid. */
function payToward(state: GameState, build: Build, cost: number, done: string): Feedback | null {
  if (build.built || state.coins === 0) return null;
  const pay = Math.min(UPGRADE_STEP, state.coins, cost - build.paid);
  state.coins -= pay;
  build.paid += pay;
  if (build.paid < cost) return [`-${pay} coins`];
  build.built = true;
  return [done];
}

const BELT_NAMES: Record<BeltId, string> = {
  garden: 'Garden belt',
  refiner: 'Table belt',
  cauldron: 'Cauldron belt',
  garden2: 'Garden belt',
  refiner2: 'Table belt',
  cauldron2: 'Cauldron belt',
};

/** Pays a handful of coins towards building a belt, which starts running once fully paid. */
export function payBelt(state: GameState, id: BeltId): Feedback | null {
  if (!beltBuildable(state, id)) return null;
  return payToward(state, state.belts[id], BELT_COST[id], `${BELT_NAMES[id]} built!`);
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
  if (state.counter.shelf.length >= STATION_CAPACITY) return null;
  const potion = takeTopFromBack(state, isPotion);
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
