// The kinds of honey: each open meadow gives its own nectar, which fills its own cells and sells
// at its own price. The market board shifts which kind is in demand, so where the bees forage
// matters.

export type Kind = 'clover' | 'lavender' | 'heather';

export interface HoneyKind {
  name: string;
  /** How many meadows of `MEADOWS` must be open for the bees to forage it (clover grows by the hive). */
  meadows: number;
  /** What a jar sells for before the market, the Sunflower Ridge and the comb bonus. */
  price: number;
}

export const HONEY: Record<Kind, HoneyKind> = {
  clover: { name: 'Clover', meadows: 0, price: 15 },
  lavender: { name: 'Lavender', meadows: 1, price: 18 },
  heather: { name: 'Heather', meadows: 3, price: 22 },
};

export const KINDS = Object.keys(HONEY) as Kind[];

/** How long the market keeps one kind in demand before it moves on to the next open kind. */
export const MARKET_MS = 60_000;
/** A kind in demand sells for this much more (only once two or more kinds are open). */
export const DEMAND = 1.5;

/** No jars of any kind. */
export const noJars = (): Record<Kind, number> => ({ clover: 0, lavender: 0, heather: 0 });
