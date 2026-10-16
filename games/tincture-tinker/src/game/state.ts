import { addBlockers, freshBoard, stuck, type Board, type Cell, type Tile } from './board';
import { KINDS, randomKind, type Kind } from './kinds';
import { orderFor, type Needs, type Order, type PotionId } from './orders';
import { unlockedRecipes } from './ranks';
import { freshUpgrades, type Upgrades } from './upgrades';

/** What carries over between orders, and is saved. */
export interface Progress {
  /** The order to play, 1 for the first; it moves on as soon as one is sold. */
  order: number;
  coins: number;
  /** Potions sold so far. */
  sold: number;
  /** Stars earned over every order sold; they set the tinker's rank (see ranks.ts). */
  stars: number;
  /** Ingredients gathered over what an order needed, up to `PANTRY_MAX` a kind, kept for the next order that needs them. */
  pantry: Needs;
  /** The workbench upgrades bought so far (see upgrades.ts). */
  upgrades: Upgrades;
  /** True once the crown's last order is filled: the tinker is Royal Apothecary. */
  royal: boolean;
}

export interface GameState extends Progress {
  current: Order;
  /** Ingredients gathered for this order; only the kinds it needs count. */
  got: Record<Kind, number>;
  moves: number;
  /** `sold` once the order is filled, `failed` when the moves ran out first. */
  phase: 'play' | 'sold' | 'failed';
  /** Coins the last filled order paid, bonus included. */
  earned: number;
  /** Stars the order earned when it sold (1 to 3), 0 until then. */
  orderStars: number;
  /** Catalysts brewed by matches of four or more this order, and how many were matched (fired). */
  brewed: number;
  fired: number;
  /** Blooms brewed by L and T matches this order, and how many were matched. */
  bloomed: number;
  bloomsFired: number;
  /** Jars opened, resin melted and mould scrubbed off this order. */
  opened: number;
  melted: number;
  scrubbed: number;
  /** Extra moves spent matching the forbidden ingredient this order. */
  penalties: number;
  /** The stage of a royal commission being brewed, from 0. */
  stage: number;
  /** On a twin order, the customers served so far, first first. */
  served: PotionId[];
  /** The coins the customer served first paid on top, 0 until then. */
  speedBonus: number;
  /** What the pantry put towards this order (or stage) when it started, and what the last sale put in it. */
  fromPantry: Needs;
  toPantry: Needs;
  board: Board;
  nextId: number;
}

/** The most of one kind the pantry keeps. */
export const PANTRY_MAX = 5;

export const freshProgress = (): Progress => ({ order: 1, coins: 0, sold: 0, stars: 0, pantry: {}, upgrades: freshUpgrades(), royal: false });
export const progressOf = ({ order, coins, sold, stars, pantry, upgrades, royal }: GameState): Progress => ({
  order,
  coins,
  sold,
  stars,
  pantry: { ...pantry },
  upgrades: { ...upgrades },
  royal,
});

export const tileMaker = (s: GameState) => (): Tile => ({ id: s.nextId++, kind: randomKind() });

/** The orders' view of the progress: the recipes unlocked, the workbench's moves and the royal title. */
export const standingOf = (p: Progress) => ({ unlocked: unlockedRecipes(p.stars), extraMoves: p.upgrades.hands, royal: p.royal });

/** Starts the order `progress.order` on a new board with all its moves. */
export function startOrder(progress: Progress): GameState {
  const current = orderFor(progress.order, standingOf(progress));
  const s: GameState = {
    ...progress,
    pantry: { ...progress.pantry },
    upgrades: { ...progress.upgrades },
    current,
    got: Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>,
    moves: current.moves,
    phase: 'play',
    earned: 0,
    orderStars: 0,
    brewed: 0,
    fired: 0,
    bloomed: 0,
    bloomsFired: 0,
    opened: 0,
    melted: 0,
    scrubbed: 0,
    penalties: 0,
    stage: 0,
    served: [],
    speedBonus: 0,
    fromPantry: {},
    toPantry: {},
    board: [],
    nextId: 1,
  };
  s.board = addBlockers(freshBoard(tileMaker(s)), current.jars, current.resin, current.mould);
  if (s.upgrades.bloom > 0) s.board = withBloom(s.board);
  drawPantry(s);
  return s;
}

/** The Bloom starter's Bloom, on a random tile that is free to move (the board matches no more than before). */
function withBloom(board: Board): Board {
  const free: Cell[] = board.flatMap((row, r) => row.flatMap((t, c) => (stuck(t) ? [] : [{ row: r, col: c }])));
  if (free.length === 0) return board;
  const at = free[Math.floor(Math.random() * free.length)];
  const next = board.map((row) => [...row]);
  next[at.row][at.col] = { ...board[at.row][at.col], bloom: true };
  return next;
}

/** True if the order counts `kind`: only the ingredients it asks for are gathered towards it. */
export const wanted = (s: GameState, kind: Kind) => kind in s.current.needs;

/** True once every ingredient in `needs` (the order's, by default) has been gathered. */
export const filled = (s: GameState, needs: Needs = s.current.needs) =>
  Object.entries(needs).every(([kind, n]) => s.got[kind as Kind] >= n);

/** The first customer's needs on a twin order: the order's without the second customer's. */
export const firstNeeds = (o: Order): Needs =>
  o.second ? Object.fromEntries(Object.entries(o.needs).filter(([k]) => !(k in o.second!.needs))) : o.needs;

/** Puts what the pantry holds of the order's needs towards it, short of filling any by one, and notes what it gave. */
export function drawPantry(s: GameState) {
  s.fromPantry = {};
  for (const [kind, n] of Object.entries(s.current.needs) as [Kind, number][]) {
    const give = Math.min(s.pantry[kind] ?? 0, n - 1 - s.got[kind]);
    if (give <= 0) continue;
    s.got[kind] += give;
    s.pantry[kind] = (s.pantry[kind] ?? 0) - give;
    if (s.pantry[kind] === 0) delete s.pantry[kind];
    s.fromPantry[kind] = give;
  }
}

/** Keeps what was gathered over the order's needs, up to `PANTRY_MAX` a kind, and notes what went in. */
export function stockPantry(s: GameState) {
  s.toPantry = {};
  for (const [kind, n] of Object.entries(s.current.needs) as [Kind, number][]) {
    const spare = Math.min(s.got[kind] - n, PANTRY_MAX - (s.pantry[kind] ?? 0));
    if (spare <= 0) continue;
    s.pantry[kind] = (s.pantry[kind] ?? 0) + spare;
    s.toPantry[kind] = spare;
  }
}
