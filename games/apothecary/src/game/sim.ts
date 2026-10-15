import { byDifficulty } from '../../../../shared/settings';
import {
  FINE,
  GROW_MS,
  ITEMS,
  POTIONS,
  RECIPES,
  REFINE,
  isPlant,
  isRefined,
  isSellable,
  PLANTS,
  plainOf,
  type ItemId,
  type PlantId,
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
  stockedPay,
  unlocked,
  GUILD_COST,
  REFINERS,
  GARDEN_LINE,
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
  contractFor,
  maxTip,
  tipNow,
  tipLeft,
  DAY_MS,
  FINE_BONUS,
  MAX_REGULARS,
  REGULAR_BONUS,
  REGULAR_CHANCE,
  REGULAR_TIP_LEFT,
  REPUTATION_SERVED,
  REPUTATION_WALKED_OFF,
  RUSH_BONUS,
  RUSH_EXTRA,
  RUSH_SIZE,
  SHADE_COST,
  inFineWindow,
  isMarketDay,
  nudgeReputation,
  orderable,
  researched,
  RESEARCH_ORDER,
  type BeltId,
  type CraftingId,
  type BeltItem,
  type Build,
  type Brew,
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

/** Whether a refining table or cauldron has its second pipe open: a second craftsman works it. */
const secondPipe = (state: GameState, id: StationId) => state.craftsmen[id].level >= 2;

/**
 * Advances the world by `dt` ms. Stations only work while someone works them: the doctor standing
 * at their work spot, given as `workingAt`, or their craftsmen. The refining table and cauldron make
 * progress, a second craftsman working a second pipe alongside the first, and customers are
 * served. A counter's second craftsman also takes the coins from the till. Customers are served,
 * and lose patience, only once they stand at the counter, as `atCounter` says; without anyone
 * showing them walk in, they are there at once.
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
    const speed = dt * speedAt(state.upgrades[id].level);
    const next = refining(refiner, state.priority[id]);
    // Each pair of hands works its own pipe at the same speed: the first the front of the queue, a
    // second craftsman's a plant of its own (see `refineSecond`).
    if (crew(state, id, workingAt) > 0 && next >= 0) {
      // The plant being worked on moves to the front of the queue, so its progress stays its own even
      // when a plant ahead of it gets room on its pallet again.
      if (next > 0) refiner.queue.unshift(...refiner.queue.splice(next, 1));
      refiner.progress += speed;
      const recipe = REFINE[refiner.queue[0]];
      if (refiner.progress >= recipe.ms) {
        refiner.queue.shift();
        refiner.output.push(recipe.out);
        // Work past the end of this plant goes on the next, so a slow frame rate makes no less. The
        // next is picked now, so the priority applies to it as well.
        refiner.progress = refiner.queue.length > 0 ? refiner.progress - recipe.ms : 0;
        const after = firstToRefine(refiner, state.priority[id]);
        if (after > 0) refiner.queue.unshift(...refiner.queue.splice(after, 1));
      }
    }
    if (secondPipe(state, id)) refineSecond(refiner, speed, state.priority[id]);
  }

  for (const id of CAULDRONS) {
    const cauldron = state[id];
    if (crew(state, id, workingAt) === 0) continue;
    const speed = dt * speedAt(state.upgrades[id].level);
    // The first pipe, then a second craftsman's: each brews on its own at the same speed.
    cauldron.brewing = brew(state, cauldron, cauldron.brewing, speed, state.priority[id]);
    if (secondPipe(state, id)) cauldron.brewing2 = brew(state, cauldron, cauldron.brewing2 ?? null, speed, state.priority[id]);
  }

  for (const id of BELTS) runBelt(state, id, dt);

  serveCustomers(state, dt, workingAt, atCounter);
  if (state.craftsmen.counter.level >= 2) collectTill(state);
  for (const order of state.orders) if (atCounter(order)) order.patience -= dt;
  // A customer who runs out of patience walks off, and the street thinks less of the shop. One of a
  // market day's crowd walking off loses the rush bonus.
  for (const order of state.orders) {
    if (order.patience > 0) continue;
    nudgeReputation(state, -REPUTATION_WALKED_OFF);
    if (order.rush && state.rush) state.rush.lost = true;
  }
  state.orders = state.orders.filter((o) => o.patience > 0);

  // At dusk a contract still open is missed and the next day's comes in.
  state.contract.dayLeft -= dt;
  if (state.contract.dayLeft <= 0) state.contract = contractFor(state, state.contract.day + 1, state.contract.kept);

  // On a market day, a crowd comes in at midday.
  const day = state.contract.day;
  if (isMarketDay(day) && state.contract.dayLeft <= DAY_MS / 2 && state.rush?.day !== day) startRush(state, rand);

  state.nextOrderIn -= dt;
  if (state.nextOrderIn <= 0) {
    state.nextOrderIn = orderInterval(state, rand());
    if (state.orders.length < maxOrders(state)) state.orders.push(newOrder(state, rand));
  }
}

/**
 * Which waiting plant the refining table works on, or -1 when there is none: the one at the front
 * while work on it has started, otherwise the first one to start on.
 */
export function refining(refiner: Refiner, first: PlantId | null = null) {
  const front = refiner.queue[0];
  if (refiner.progress > 0 && front && palletHasRoom(refiner.output, REFINE[front].out)) return 0;
  return firstToRefine(refiner, first);
}

/**
 * Which waiting plant to start on: the first of the priority plant `first` whose output pallet has
 * room, or else the first of any, or -1 when no output pallet has room.
 */
function firstToRefine(refiner: Refiner, first: PlantId | null) {
  const fits = (plant: PlantId) => palletHasRoom(refiner.output, REFINE[plant].out);
  const preferred = first ? refiner.queue.findIndex((plant) => plant === first && fits(plant)) : -1;
  return preferred >= 0 ? preferred : refiner.queue.findIndex(fits);
}

/**
 * Works a refining table's second pipe for `ms`: takes a plant off the queue when it has none (behind
 * the front one, which is the first pipe's), refines it and puts it out, then starts on the next with
 * the work left over. A finished plant waits there while its pallet is full.
 */
function refineSecond(refiner: Refiner, ms: number, first: PlantId | null) {
  if (!refiner.second) {
    const rest: Refiner = { ...refiner, queue: refiner.queue.slice(1) };
    const i = firstToRefine(rest, first);
    if (i < 0) return;
    refiner.second = { plant: refiner.queue.splice(i + 1, 1)[0], progress: 0 };
  }
  const second = refiner.second;
  const recipe = REFINE[second.plant];
  const over = second.progress + ms - recipe.ms;
  second.progress = Math.min(second.progress + ms, recipe.ms);
  if (over < 0 || !palletHasRoom(refiner.output, recipe.out)) return;
  refiner.output.push(recipe.out);
  refiner.second = null;
  // Work past the end of this plant goes on the next, so a slow frame rate makes no less.
  if (over > 0) refineSecond(refiner, over, first);
}

/**
 * Where each belt takes goods from: a ripe plant from either garden of its line, or a station's
 * finished goods; only goods whose lane has room at the start.
 */
function takeForBelt(state: GameState, belt: BeltId, fits: (id: ItemId) => boolean): ItemId | null {
  if (belt === 'garden' || belt === 'garden2') {
    const line = belt === 'garden2' ? 2 : 1;
    const i = state.plots.findIndex((p, i) => GARDEN_LINE[gardenOf(i)] === line && isRipe(state, i) && fits(p.plant));
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
  // Each lane runs at half the belt's speed, as when belts had two lanes, so the nightshade's lane
  // didn't slow the others down.
  const step = (dt * beltSpeed(state)) / LANE_SHARE;
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

/** What share of a belt's speed each of its lanes runs at. */
const LANE_SHARE = 2;

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
  const brewing = CAULDRONS.flatMap((id) => [state[id].brewing, state[id].brewing2].flatMap((brew) => brew?.out ?? []));
  // Fine potions count as the potion they are.
  const ready = [state.counter.shelf, state.carrying, riding, brewing, ...CAULDRONS.map((id) => state[id].output)].reduce(
    (n, items) => n + items.filter((p) => isSellable(p) && plainOf(p) === potion).length,
    0,
  );
  return wanted - ready;
}

/**
 * Works one of a cauldron's pipes for `ms` and returns its brew afterwards: starts one when it has
 * none, and puts a finished one out, going straight on to the next with the work left over.
 */
function brew(state: GameState, cauldron: Cauldron, brewing: Brew | null, ms: number, first: PotionId | null) {
  // The recipe is picked when work starts, from everything in the cauldron by then.
  const current = brewing ?? startBrew(state, cauldron, first);
  if (!current) return null;
  current.progress += ms;
  if (current.progress < current.ms) return current;
  cauldron.output.push(current.out);
  // Work past the end of this brew goes on the next, if there is one.
  const next = startBrew(state, cauldron, first);
  if (next) next.progress = current.progress - current.ms;
  return next;
}

/**
 * Starts the recipe the shop is shortest of among those the apothecary has learned and the cauldron
 * has the ingredients and room for, so the potion customers are waiting for gets brewed first. Ties go in recipe order. Takes the
 * ingredients out of the cauldron and returns the brew started, if any, for a pipe to work.
 */
function startBrew(state: GameState, cauldron: Cauldron, first: PotionId | null = null): Brew | null {
  const need = new Map(RECIPES.map((r) => [r.out, shortfall(state, r.out)]));
  // The priority potion goes first whenever its ingredients are in; the rest by need.
  const byNeed = [...RECIPES].sort((a, b) => Number(b.out === first) - Number(a.out === first) || need.get(b.out)! - need.get(a.out)!);
  for (const recipe of byNeed) {
    if (!researched(state, recipe.out) || !palletHasRoom(cauldron.output, recipe.out)) continue;
    const left = without(cauldron.contents, recipe.inputs);
    if (left) {
      cauldron.contents = left;
      return { out: recipe.out, ms: recipe.ms, progress: 0 };
    }
  }
  return null;
}

function newOrder(state: GameState, rand: () => number, regulars = true): Order {
  // A busier town, with more customers, sends more two-potion orders and less patient customers.
  const busy = state.upgrades.customers.level;
  const potions = orderable(state);
  // Now and then a regular comes back, for the same potions as last time.
  const regular = regulars && state.regulars.length > 0 && rand() < REGULAR_CHANCE ? state.regulars.shift()! : null;
  const theirs = regular?.wants.filter((p) => potions.includes(p)) ?? [];
  let wants: PotionId[];
  if (theirs.length > 0) wants = theirs;
  else {
    const count = rand() < 0.35 + 0.2 * busy ? 2 : 1;
    wants = Array.from({ length: count }, () => potions[Math.floor(rand() * potions.length)]);
  }
  const back = theirs.length > 0;
  // Customers pay for each potion as they get it, with a counter bonus that is more generous, and
  // patience that lasts longer, at a better counter and on an easier difficulty. Regulars pay a
  // little more. The decaying tip comes on top, once the order is filled.
  const level = state.upgrades.counter.level;
  const pay = Object.fromEntries(wants.map((p) => [p, potionPrice(state, p) + 2 * (level + 1) + (back ? REGULAR_BONUS : 0)]));
  const maxPatience =
    ((60_000 + rand() * 30_000) * (1 + 0.25 * level) * byDifficulty(1.5, 1, 0.7)) / (1 + 0.5 * busy);
  const id = state.nextOrderId++;
  return {
    id,
    wants,
    asked: [...wants],
    pay,
    patience: maxPatience,
    maxPatience,
    tip: maxTip(wants.length),
    face: back ? regular!.face : id,
    ...(back ? { regular: true } : {}),
  };
}

/**
 * A market day's crowd: up to `RUSH_SIZE` customers come in at once, filling every free place at the
 * counter and `RUSH_EXTRA` more. Regulars stay home that day.
 */
function startRush(state: GameState, rand: () => number) {
  const room = Math.max(0, maxOrders(state) + RUSH_EXTRA - state.orders.length);
  const size = Math.min(RUSH_SIZE, room);
  state.rush = { day: state.contract.day, size, served: 0, lost: size === 0, paid: false };
  for (let i = 0; i < size; i++) state.orders.push({ ...newOrder(state, rand, false), rush: true });
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
 * the till, less for each potion of the kind still stocked after theirs (`stockedPay`). A fine
 * potion of the kind goes first and pays `FINE_BONUS` times as much. Orders the shelf can fill
 * completely go first (oldest first); leftover matching potions go towards the rest.
 */
function serveFromShelf(state: GameState, atCounter: (order: Order) => boolean, limit = Infinity) {
  const { counter } = state;
  if (counter.shelf.length === 0) return;
  const give = (order: Order) => {
    order.wants = order.wants.filter((want) => {
      if (limit <= 0) return true;
      let i = counter.shelf.indexOf(FINE[want]);
      const fine = i >= 0;
      if (!fine) i = counter.shelf.indexOf(want);
      if (i < 0) return true;
      counter.shelf.splice(i, 1);
      const others = counter.shelf.filter((p) => plainOf(p) === want).length;
      const pay = order.pay[want] ?? 0;
      counter.till += stockedPay(fine ? Math.round(pay * FINE_BONUS) : pay, others);
      state.sold++;
      if (want === state.contract.potion) deliverForContract(state);
      limit--;
      return false;
    });
    // A filled order tips what is left of its tip, which shrank while the customer waited.
    if (order.wants.length === 0) {
      const tip = tipNow(order);
      counter.till += tip;
      state.tips += tip;
      orderFilled(state, order);
    }
  };
  // Only customers standing at the counter get served.
  const waiting = state.orders.filter(atCounter);
  for (const order of waiting) if (canFill(counter.shelf, order)) give(order);
  for (const order of waiting) if (order.wants.length > 0) give(order);
  state.orders = state.orders.filter((o) => o.wants.length > 0);
}

/**
 * A customer leaves served: the street thinks better of the shop, one who was served quickly comes
 * back as a regular, and one of a market day's crowd counts towards the rush bonus.
 */
function orderFilled(state: GameState, order: Order) {
  nudgeReputation(state, REPUTATION_SERVED);
  if (tipLeft(order) >= REGULAR_TIP_LEFT) {
    const asked = order.asked ?? (Object.keys(order.pay) as PotionId[]);
    if (state.regulars.length >= MAX_REGULARS) state.regulars.shift();
    state.regulars.push({ face: order.face ?? order.id, wants: asked });
  }
  const rush = state.rush;
  if (!order.rush || !rush) return;
  rush.served++;
  if (rush.served >= rush.size && !rush.lost && !rush.paid) {
    rush.paid = true;
    state.coins += RUSH_BONUS * rush.size;
  }
}

/**
 * Counts a potion of today's contract as delivered. Once enough are, the reward goes straight into
 * the purse and the next day's contract comes in at once.
 */
function deliverForContract(state: GameState) {
  const contract = state.contract;
  contract.made++;
  if (contract.made < contract.need) return;
  state.coins += contract.reward;
  state.contract = contractFor(state, contract.day + 1, contract.kept + 1);
}

function canFill(shelf: readonly ItemId[], order: Order) {
  return without(shelf.map((p) => (isSellable(p) ? plainOf(p) : p)), order.wants) !== null;
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

/**
 * Picks up a potion at the cauldron: the brew in it while it is in its fine window, taken out early
 * as a Fine potion, or else a finished one from its pallet.
 */
export function pickUpFromCauldron(state: GameState, id: CauldronId = 'cauldron'): Feedback | null {
  const cauldron = state[id];
  // Either pipe's brew can be taken out fine.
  const pipe = inFineWindow(cauldron.brewing) ? 'brewing' : inFineWindow(cauldron.brewing2 ?? null) ? 'brewing2' : null;
  if (pipe && freeHands(state) > 0) {
    const fine = FINE[cauldron[pipe]!.out];
    cauldron[pipe] = null;
    state.carrying.push(fine);
    return [`+ ${ITEMS[fine].name}!`];
  }
  return pickUpOne(state, cauldron.output);
}

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
  if (!unlocked(state, `level-${id}`)) return null;
  const upgrade = state.upgrades[id];
  // A study level teaches a recipe; levels count from 0, so the one just learned is at level - 1.
  const done = () =>
    id === 'research' ? `Learned ${ITEMS[RESEARCH_ORDER[upgrade.level - 1]].name}!` : `${UPGRADES[id].name} level ${upgrade.level + 1}!`;
  return payLevel(state, upgrade, UPGRADES[id].max, upgradeCost(id, upgrade.level), done);
}

/**
 * Moves a crafting station's priority on to the next choice: from none (the station's own order) to
 * each plant or potion it makes in turn, and back to none.
 */
export function cyclePriority(state: GameState, id: CraftingId): Feedback {
  // A cauldron can put first only the potions the apothecary has learned.
  const potions = POTIONS.filter((p) => researched(state, p));
  const choices: (PlantId | PotionId | null)[] = [null, ...(id === 'refiner' || id === 'refiner2' ? PLANTS : potions)];
  const next = choices[(choices.indexOf(state.priority[id]) + 1) % choices.length];
  (state.priority as Record<CraftingId, PlantId | PotionId | null>)[id] = next;
  return [next ? `${ITEMS[next].name} first` : 'Any order'];
}

/** Pays a handful of coins towards hiring a station's next craftsman, who starts work once fully paid. */
export function payCraftsman(state: GameState, id: StationId): Feedback | null {
  if (!unlocked(state, `hire-${id}`)) return null;
  const hired = state.craftsmen[id];
  return payLevel(state, hired, MAX_CRAFTSMEN, craftsmanCost(hired.level), () => 'Craftsman hired!');
}

/** Pays towards entry to the guild, which puts its upgrades up for sale. */
export function joinGuild(state: GameState): Feedback | null {
  if (!unlocked(state, 'guild')) return null;
  return payToward(state, state.guild, GUILD_COST, 'Welcome to the guild!');
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
  garden: 'Garden pixies',
  refiner: 'Table pixies',
  cauldron: 'Cauldron pixies',
  garden2: 'Garden pixies',
  refiner2: 'Table pixies',
  cauldron2: 'Cauldron pixies',
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
  if (!beltBuildable(state, id) || !unlocked(state, `belt-${id}`)) return null;
  const belt = state.belts[id];
  const feedback = payToward(state, belt, BELT_COST[id], `${BELT_NAMES[id]} hired!`);
  if (!feedback || !belt.built) return feedback;
  if (doneByHand(state, OTHER_LINE[id])) return feedback;
  const carried = (item: ItemId) => BELT_LANES[id].includes(item);
  const loaded = state.carrying.filter(carried);
  state.carrying = state.carrying.filter((item) => !carried(item));
  loaded.forEach((item, i) => {
    const ahead = loaded.slice(0, i).filter((other) => other === item).length;
    belt.items.push({ id: item, at: beltStart(id, item) - ahead * BELT_GAP_MS });
  });
  return loaded.length > 0 ? [...feedback, `${loaded.length} to the pixies`] : feedback;
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
  if (part === 'land') return unlocked(state, 'land') ? payToward(state, expansion.land, EXPANSION_COST.land, 'New land bought!') : null;
  if (!expansion.land.built) return null;
  if (part === 'refiner') return payToward(state, expansion.refiner, EXPANSION_COST.refiner, 'Refining table built!');
  if (part === 'cauldron') return payToward(state, expansion.cauldron, EXPANSION_COST.cauldron, 'Cauldron built!');
  const field = expansion.fields[part === 'field1' ? 0 : 1];
  return payToward(state, field, EXPANSION_COST.field, 'Field planted!');
}

/** Pays a handful of coins towards planting a shade garden: the first line's (`line` 0), or the second's once its land is bought. */
export function payShade(state: GameState, line: 0 | 1): Feedback | null {
  if (line === 0 ? !unlocked(state, 'shade') : !state.expansion.land.built) return null;
  return payToward(state, state.shade[line], SHADE_COST[line], 'Shade garden planted!');
}

export function stockShelf(state: GameState): Feedback | null {
  const potion = takeTopFromBack(state, isSellable, state.counter.shelf);
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
