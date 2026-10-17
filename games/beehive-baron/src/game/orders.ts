// Village orders: an order card asks for a few jars of one kind within a time limit and pays a
// premium on top of the jars' price when they are sold in time.

import type { Kind } from './honey';

/** Orders start once this many jars are sold, so the first round has none. */
export const ORDERS_FROM = 3;
/** Game time between one order ending and the next. */
export const ORDER_GAP_MS = 20_000;
/** How long the village waits for an order. */
export const ORDER_MS = 120_000;
/** An order only asks for a kind whose meadow stays open at least this long, and lapses when it shuts. */
export const ORDER_MIN_MS = 60_000;
/** The premium per jar ordered, paid once the whole order is sold. */
export const ORDER_COINS_PER_JAR = 8;

export interface Order {
  kind: Kind;
  /** Jars wanted, and jars of that kind sold since the order came in. */
  count: number;
  done: number;
  /** Time left to sell them. */
  leftMs: number;
  premium: number;
}
