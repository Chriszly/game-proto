import { freshBoard, type Board, type Tile } from './board';
import { KINDS, randomKind, type Kind } from './kinds';
import { orderFor, type Order } from './orders';

/** What carries over between orders, and is saved. */
export interface Progress {
  /** The order to play, 1 for the first; it moves on as soon as one is sold. */
  order: number;
  coins: number;
  /** Potions sold so far. */
  sold: number;
}

export interface GameState extends Progress {
  current: Order;
  /** Ingredients gathered for this order, of every kind. */
  got: Record<Kind, number>;
  moves: number;
  /** `sold` once the order is filled, `failed` when the moves ran out first. */
  phase: 'play' | 'sold' | 'failed';
  /** Coins the last filled order paid, bonus included. */
  earned: number;
  board: Board;
  nextId: number;
}

export const freshProgress = (): Progress => ({ order: 1, coins: 0, sold: 0 });
export const progressOf = ({ order, coins, sold }: GameState): Progress => ({ order, coins, sold });

export const tileMaker = (s: GameState) => (): Tile => ({ id: s.nextId++, kind: randomKind() });

/** Starts the order `progress.order` on a new board with all its moves. */
export function startOrder(progress: Progress): GameState {
  const current = orderFor(progress.order);
  const s: GameState = {
    ...progress,
    current,
    got: Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>,
    moves: current.moves,
    phase: 'play',
    earned: 0,
    board: [],
    nextId: 1,
  };
  s.board = freshBoard(tileMaker(s));
  return s;
}

/** True once every ingredient the order asks for has been gathered. */
export const filled = (s: GameState) =>
  Object.entries(s.current.needs).every(([kind, n]) => s.got[kind as Kind] >= n);
