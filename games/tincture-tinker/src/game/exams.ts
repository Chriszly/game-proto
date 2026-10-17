import { byDifficulty } from '../../../../shared/settings';
import type { Needs, Order, PotionId } from './orders';

// Guild examinations: once the tinker is Royal Apothecary, a ladder of fixed boards, each to be sold
// with a set number of stars. Every pass adds a seal to the ribbon. The boards are laid from a seed,
// so an examination starts the same every time it is tried; the tiles that drop in later don't.

export interface Exam {
  potion: PotionId;
  needs: Needs;
  moves: number;
  /** The stars the potion must be sold with to pass (see ranks.ts for the moves left each takes). */
  stars: number;
  jars: number;
  resin: number;
  mould: number;
  /** Coins paid on a pass, with the bonus for each move left. */
  price: number;
}

export const EXAMS: Exam[] = [
  { potion: 'healingDraught', needs: { ember: 14, sage: 14 }, moves: 14, stars: 2, jars: 0, resin: 0, mould: 0, price: 60 },
  { potion: 'sleepingTonic', needs: { moonpetal: 16, wheat: 14 }, moves: 16, stars: 2, jars: 3, resin: 0, mould: 0, price: 80 },
  { potion: 'mandrakeTincture', needs: { mandrake: 14, sage: 12, ember: 12 }, moves: 14, stars: 2, jars: 2, resin: 4, mould: 0, price: 100 },
  { potion: 'goldenElixir', needs: { wheat: 18, ember: 16, moonpetal: 16 }, moves: 21, stars: 3, jars: 4, resin: 4, mould: 0, price: 120 },
  { potion: 'moonlitPhilter', needs: { moonpetal: 20, mandrake: 18, sage: 16 }, moves: 17, stars: 2, jars: 3, resin: 3, mould: 2, price: 140 },
  { potion: 'amberCordial', needs: { wheat: 18, mandrake: 16, ember: 16 }, moves: 21, stars: 3, jars: 0, resin: 5, mould: 2, price: 160 },
  { potion: 'starlightElixir', needs: { moonpetal: 20, sage: 18, wheat: 16 }, moves: 18, stars: 3, jars: 5, resin: 5, mould: 3, price: 180 },
  { potion: 'philosophersDraught', needs: { ember: 22, moonpetal: 20, mandrake: 20 }, moves: 20, stars: 3, jars: 6, resin: 6, mould: 3, price: 200 },
];

/** A small seeded generator (mulberry32), so an examination's board is the same on every try. */
export function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seed examination `index`'s board is laid from. */
export const examSeed = (index: number) => 7919 * (index + 1);

/** Examination `index` as an order (numbered like the order it interrupts); Easy gives five more moves, Hard three fewer. */
export function examOrder(index: number, number: number): Order {
  const e = EXAMS[index];
  return {
    number,
    potion: e.potion,
    needs: { ...e.needs },
    moves: Math.max(5, e.moves + byDifficulty(5, 0, -3)),
    price: e.price,
    jars: e.jars,
    resin: e.resin,
    mould: e.mould,
    exam: { index, stars: e.stars },
  };
}
