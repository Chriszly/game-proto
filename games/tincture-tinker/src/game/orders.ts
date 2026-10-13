import type { Kind } from './kinds';

// The potion orders, one after another. Each asks for so many of a few ingredients within a number
// of moves, and pays its price plus a bonus for every move left.

export type PotionId = 'healingDraught' | 'sleepingTonic' | 'mandrakeTincture' | 'goldenElixir' | 'moonlitPhilter';

export const POTION_NAMES: Record<PotionId, string> = {
  healingDraught: 'Healing Draught',
  sleepingTonic: 'Sleeping Tonic',
  mandrakeTincture: 'Mandrake Tincture',
  goldenElixir: 'Golden Elixir',
  moonlitPhilter: 'Moonlit Philter',
};

export interface Order {
  /** 1 for the first order. */
  number: number;
  potion: PotionId;
  needs: Partial<Record<Kind, number>>;
  moves: number;
  price: number;
}

/** Coins for each move left when an order is filled. */
export const MOVE_BONUS = 5;
/** How much each ingredient asked for and the price grow every time the list comes round again. */
const ROUND_NEEDS = 3;
const ROUND_PRICE = 15;

const ORDERS: Omit<Order, 'number'>[] = [
  { potion: 'healingDraught', needs: { ember: 12, sage: 12 }, moves: 15, price: 30 },
  { potion: 'sleepingTonic', needs: { moonpetal: 15, wheat: 12 }, moves: 16, price: 35 },
  { potion: 'mandrakeTincture', needs: { mandrake: 14, sage: 12, ember: 10 }, moves: 18, price: 45 },
  { potion: 'goldenElixir', needs: { wheat: 16, ember: 14, moonpetal: 12 }, moves: 20, price: 55 },
  { potion: 'moonlitPhilter', needs: { moonpetal: 20, mandrake: 16, sage: 14 }, moves: 20, price: 70 },
];

export function orderFor(number: number): Order {
  const base = ORDERS[(number - 1) % ORDERS.length];
  const round = Math.floor((number - 1) / ORDERS.length);
  const needs = Object.fromEntries(Object.entries(base.needs).map(([kind, n]) => [kind, n + round * ROUND_NEEDS]));
  return { ...base, number, needs, price: base.price + round * ROUND_PRICE };
}
