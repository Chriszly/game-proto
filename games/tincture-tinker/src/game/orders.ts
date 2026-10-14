import { byDifficulty } from '../../../../shared/settings';
import type { Kind } from './kinds';

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
  price: number;
}

type Recipe = Omit<Order, 'number'>;

/** Coins for each move left when an order is filled. */
export const MOVE_BONUS = 5;
/** How much each ingredient asked for and the price grow every time the list comes round again. */
const ROUND_NEEDS = 3;
const ROUND_PRICE = 15;

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
 * Order `number`, given the recipes unlocked so far: the five orders and then the unlocked recipes,
 * round and round. Needs and price grow every five orders, however many recipes are unlocked.
 */
export function orderFor(number: number, unlocked: PotionId[] = []): Order {
  const list = [...ORDERS, ...unlocked.flatMap((p) => (RANK_RECIPES[p] ? [RANK_RECIPES[p]] : []))];
  const base = list[(number - 1) % list.length];
  const round = Math.floor((number - 1) / ORDERS.length);
  const needs = Object.fromEntries(Object.entries(base.needs).map(([kind, n]) => [kind, n + round * ROUND_NEEDS]));
  // Easy gives five more moves, Hard three fewer.
  return { ...base, number, needs, moves: base.moves + byDifficulty(5, 0, -3), price: base.price + round * ROUND_PRICE };
}
