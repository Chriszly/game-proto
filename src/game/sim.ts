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
  type RefinedId,
} from './items';
import { CARRY_CAPACITY, MAX_ORDERS, STATION_CAPACITY, type Cauldron, type GameState, type Order } from './state';

// Pure game rules, kept free of Phaser so later automation can drive the same functions.

export function tick(state: GameState, dt: number, rand: () => number = Math.random) {
  for (const plot of state.plots) {
    plot.grown = Math.min(plot.grown + dt, GROW_MS[plot.plant]);
  }

  const refiner = state.refiner;
  if (refiner.queue.length > 0 && refiner.output.length < STATION_CAPACITY) {
    refiner.progress += dt;
    const recipe = REFINE[refiner.queue[0]];
    if (refiner.progress >= recipe.ms) {
      refiner.queue.shift();
      refiner.output.push(recipe.out);
      refiner.progress = 0;
    }
  }

  const cauldron = state.cauldron;
  if (!cauldron.brewing && cauldron.output.length < STATION_CAPACITY) startBrew(cauldron);
  if (cauldron.brewing) {
    cauldron.brewing.progress += dt;
    if (cauldron.brewing.progress >= cauldron.brewing.ms) {
      cauldron.output.push(cauldron.brewing.out);
      cauldron.brewing = null;
    }
  }

  for (const order of state.orders) order.patience -= dt;
  state.orders = state.orders.filter((o) => o.patience > 0);

  state.nextOrderIn -= dt;
  if (state.nextOrderIn <= 0) {
    state.nextOrderIn = 12_000 + rand() * 8_000;
    if (state.orders.length < MAX_ORDERS) state.orders.push(newOrder(state, rand));
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
  // A small tip on top of list price rewards serving the order instead of just selling.
  const reward = wants.reduce((sum, p) => sum + POTION_PRICE[p], 0) + count * 2;
  const maxPatience = 60_000 + rand() * 30_000;
  return { id: state.nextOrderId++, wants, reward, patience: maxPatience, maxPatience };
}

export function isRipe(state: GameState, plotIndex: number) {
  const plot = state.plots[plotIndex];
  return plot.grown >= GROW_MS[plot.plant];
}

/** Outcome of an interaction, as short lines for floating feedback text. */
export type Feedback = string[];

const freeHands = (state: GameState) => CARRY_CAPACITY - state.carrying.length;

/** Moves items matching `pick` out of the player's hands, up to `limit`. */
function takeFromHands<T extends ItemId>(state: GameState, pick: (id: ItemId) => id is T, limit: number): T[] {
  const taken: T[] = [];
  state.carrying = state.carrying.filter((id) => {
    if (taken.length < limit && pick(id)) {
      taken.push(id);
      return false;
    }
    return true;
  });
  return taken;
}

function collect(state: GameState, from: ItemId[], feedback: Feedback) {
  const n = Math.min(freeHands(state), from.length);
  const picked = from.splice(0, n);
  state.carrying.push(...picked);
  for (const id of picked) feedback.push(`+ ${ITEMS[id].name}`);
}

export function harvest(state: GameState, plotIndex: number): Feedback {
  const plot = state.plots[plotIndex];
  if (!isRipe(state, plotIndex)) return ['Not ripe yet'];
  if (freeHands(state) === 0) return ['Hands full'];
  plot.grown = 0;
  state.carrying.push(plot.plant);
  return [`+ ${ITEMS[plot.plant].name}`];
}

/** Picks up finished goods first, then drops off any plants being carried. */
export function useRefiner(state: GameState): Feedback {
  const feedback: Feedback = [];
  collect(state, state.refiner.output, feedback);
  const room = STATION_CAPACITY - state.refiner.queue.length;
  const plants = takeFromHands(state, isPlant, room);
  state.refiner.queue.push(...plants);
  if (plants.length > 0) feedback.push(`Refining ${plants.length}`);
  return feedback.length > 0 ? feedback : ['Bring harvested plants'];
}

/** Picks up finished potions first, then drops refined goods into the pot. */
export function useCauldron(state: GameState): Feedback {
  const feedback: Feedback = [];
  collect(state, state.cauldron.output, feedback);
  const room = STATION_CAPACITY - state.cauldron.contents.length;
  const goods: RefinedId[] = takeFromHands(state, isRefined, room);
  state.cauldron.contents.push(...goods);
  if (goods.length > 0) feedback.push(`Added ${goods.length} to the pot`);
  return feedback.length > 0 ? feedback : ['Bring refined goods'];
}

/**
 * Hands over carried potions to waiting customers. Orders the doctor can fill completely go first
 * (oldest first); any matching potions left over go towards the remaining orders.
 */
export function serveOrders(state: GameState): Feedback {
  const feedback: Feedback = [];
  const give = (order: Order) => {
    order.wants = order.wants.filter((want) => {
      const i = state.carrying.indexOf(want);
      if (i < 0) return true;
      state.carrying.splice(i, 1);
      feedback.push(`Gave ${ITEMS[want].name}`);
      return false;
    });
    if (order.wants.length === 0) {
      state.coins += order.reward;
      feedback.push(`+${order.reward} coins`);
    }
  };
  for (const order of state.orders) if (canFill(state.carrying, order)) give(order);
  for (const order of state.orders) if (order.wants.length > 0) give(order);
  state.orders = state.orders.filter((o) => o.wants.length > 0);

  if (feedback.length > 0) return feedback;
  if (state.orders.length === 0) return ['No customers yet'];
  return state.carrying.some(isPotion) ? ['Nobody ordered that'] : ['Bring potions'];
}

function canFill(carrying: readonly ItemId[], order: Order) {
  const left = [...carrying];
  return order.wants.every((want) => {
    const i = left.indexOf(want);
    if (i >= 0) left.splice(i, 1);
    return i >= 0;
  });
}
