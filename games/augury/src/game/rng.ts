// Random numbers for making puzzles. A run's cards each carry a seed, so the daily five and a
// pass-and-play match make the same puzzles for every player; other runs seed them from
// `Math.random`. No Phaser.

/** A source of numbers from 0 (included) to 1. */
export type Rand = () => number;

/** A repeatable random source (mulberry32) from a whole number. */
export function seeded(seed: number): Rand {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed from `Math.random`. */
export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

/** The seed of the daily five for a date, from its year, month and day (local time). */
export function dailySeed(date: Date) {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** A whole number from `lo` to `hi`, both included. */
export function between(rand: Rand, lo: number, hi: number) {
  return lo + Math.floor(rand() * (hi - lo + 1));
}

export function pick<T>(rand: Rand, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

/** Shuffles `items` in place and returns it. */
export function shuffle<T>(rand: Rand, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** The four orthogonal neighbours of a cell on a `w` x `h` grid that lie on it. */
export function neighbours(cell: number, w: number, h: number) {
  const r = Math.floor(cell / w);
  const c = cell % w;
  const out: number[] = [];
  if (r > 0) out.push(cell - w);
  if (r < h - 1) out.push(cell + w);
  if (c > 0) out.push(cell - 1);
  if (c < w - 1) out.push(cell + 1);
  return out;
}
