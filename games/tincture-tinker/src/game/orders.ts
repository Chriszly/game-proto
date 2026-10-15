import { byDifficulty } from '../../../../shared/settings';
import { KINDS, type Kind } from './kinds';

// The potion orders, one after another. Each asks for so many of a few ingredients within a number
// of moves, and pays its price plus a bonus for every move left.

export type PotionId =
  | 'healingDraught'
  | 'sleepingTonic'
  | 'mandrakeTincture'
  | 'goldenElixir'
  | 'moonlitPhilter'
  | 'amberCordial'
  | 'starlightElixir'
  | 'philosophersDraught';

export const POTION_NAMES: Record<PotionId, string> = {
  healingDraught: 'Healing Draught',
  sleepingTonic: 'Sleeping Tonic',
  mandrakeTincture: 'Mandrake Tincture',
  goldenElixir: 'Golden Elixir',
  moonlitPhilter: 'Moonlit Philter',
  amberCordial: 'Amber Cordial',
  starlightElixir: 'Starlight Elixir',
  philosophersDraught: "Philosopher's Draught",
};

export interface Order {
  /** 1 for the first order. */
  number: number;
  potion: PotionId;
  needs: Partial<Record<Kind, number>>;
  moves: number;
  /** The price, a rush order's bonus included. */
  price: number;
  /** A rush order: fewer moves, more coins. */
  rush?: boolean;
  /** An ingredient the order forbids: a swap that matches it costs an extra move. */
  forbid?: Kind;
  /** Corked jars and resin-coated tiles on the order's board. */
  jars: number;
  resin: number;
}

type Recipe = Omit<Order, 'number' | 'jars' | 'resin'>;

/** Coins for each move left when an order is filled. */
export const MOVE_BONUS = 5;
/** How much each ingredient asked for and the price grow every time the list comes round again. */
const ROUND_NEEDS = 3;
const ROUND_PRICE = 15;
/** A rush order has this many fewer moves and pays this many more coins. */
export const RUSH_MOVES = 3;
export const RUSH_COINS = 20;
/** The fewest moves an order can give. */
const MIN_MOVES = 5;

const ORDERS: Recipe[] = [
  { potion: 'healingDraught', needs: { ember: 12, sage: 12 }, moves: 15, price: 30 },
  { potion: 'sleepingTonic', needs: { moonpetal: 15, wheat: 12 }, moves: 16, price: 35 },
  { potion: 'mandrakeTincture', needs: { mandrake: 14, sage: 12, ember: 10 }, moves: 18, price: 45 },
  { potion: 'goldenElixir', needs: { wheat: 16, ember: 14, moonpetal: 12 }, moves: 20, price: 55 },
  { potion: 'moonlitPhilter', needs: { moonpetal: 20, mandrake: 16, sage: 14 }, moves: 20, price: 70 },
];

/** The recipes the tinker ranks unlock (see ranks.ts); each joins the round of orders once earned. */
export const RANK_RECIPES: Partial<Record<PotionId, Recipe>> = {
  amberCordial: { potion: 'amberCordial', needs: { wheat: 14, mandrake: 12, ember: 12 }, moves: 18, price: 60 },
  starlightElixir: { potion: 'starlightElixir', needs: { moonpetal: 16, sage: 14, wheat: 12 }, moves: 19, price: 75 },
  philosophersDraught: { potion: 'philosophersDraught', needs: { ember: 18, moonpetal: 16, mandrake: 16 }, moves: 22, price: 100 },
};

/**
 * The twist on order `number`: none on the first two, then a rush order, one that forbids an
 * ingredient it doesn't need, and a plain one, round and round.
 */
export function twistFor(number: number, needs: Order['needs']): Pick<Order, 'rush' | 'forbid'> {
  if (number < 3) return {};
  if (number % 3 === 0) return { rush: true };
  if (number % 3 === 1) {
    const spare = KINDS.filter((k) => !(k in needs));
    return { forbid: spare[number % spare.length] };
  }
  return {};
}

/** The corked jars and resin on order `number`'s board: none on the first, then more as orders go by. */
export const blockersFor = (number: number) => ({
  jars: number < 2 ? 0 : Math.min(3 + Math.floor((number - 2) / 3), 8),
  resin: number < 3 ? 0 : Math.min(4 + Math.floor((number - 3) / 3), 10),
});

/**
 * Order `number`, given the recipes unlocked so far: the five orders and then the unlocked recipes,
 * round and round. Needs and price grow every five orders, however many recipes are unlocked.
 */
export function orderFor(number: number, unlocked: PotionId[] = []): Order {
  const list = [...ORDERS, ...unlocked.flatMap((p) => (RANK_RECIPES[p] ? [RANK_RECIPES[p]] : []))];
  const base = list[(number - 1) % list.length];
  const round = Math.floor((number - 1) / ORDERS.length);
  const needs = Object.fromEntries(Object.entries(base.needs).map(([kind, n]) => [kind, n + round * ROUND_NEEDS]));
  const twist = twistFor(number, needs);
  // Easy gives five more moves, Hard three fewer.
  const moves = Math.max(MIN_MOVES, base.moves + byDifficulty(5, 0, -3) - (twist.rush ? RUSH_MOVES : 0));
  const price = base.price + round * ROUND_PRICE + (twist.rush ? RUSH_COINS : 0);
  return { ...base, ...twist, ...blockersFor(number), number, needs, moves, price };
}
