import { SPECIALS, seeded, type Building, type Special } from './tiles';

// Royal gifts: reaching a round's goal offers a choice of two, shown in the panel all round long.
// The windmill, the market, the harbor and the lumber camp are won this way: each is a new tile.

export const GIFTS = ['towers', 'houses', 'farms', 'windmill', 'windmills', 'market', 'markets', 'harbor', 'harbors', 'lumber', 'lumbers'] as const;
export type Gift = (typeof GIFTS)[number];

export interface GiftInfo {
  /** The short label on the panel's chip and the choice button. */
  label: string;
  /** The building drawn on its chip. */
  icon: Building;
  /** One line on the choice button. */
  desc: string;
  /** Tiles it adds to the pouch. */
  tiles: Partial<Record<Building, number>>;
}

export const GIFT_INFO: Record<Gift, GiftInfo> = {
  towers: { label: '+2 Towers', icon: 'tower', desc: '2 more towers', tiles: { tower: 2 } },
  houses: { label: '+3 Houses', icon: 'house', desc: '3 more houses', tiles: { house: 3 } },
  farms: { label: '+3 Farms', icon: 'farm', desc: '3 more farms', tiles: { farm: 3 } },
  windmill: { label: 'Windmill', icon: 'windmill', desc: 'A new tile: 2 windmills', tiles: { windmill: 2 } },
  windmills: { label: '+2 Windmills', icon: 'windmill', desc: '2 more windmills', tiles: { windmill: 2 } },
  market: { label: 'Market', icon: 'market', desc: 'A new tile: 2 markets', tiles: { market: 2 } },
  markets: { label: '+2 Markets', icon: 'market', desc: '2 more markets', tiles: { market: 2 } },
  harbor: { label: 'Harbor', icon: 'harbor', desc: 'A new tile: 2 harbors', tiles: { harbor: 2 } },
  harbors: { label: '+2 Harbors', icon: 'harbor', desc: '2 more harbors', tiles: { harbor: 2 } },
  lumber: { label: 'Lumber camp', icon: 'lumber', desc: 'A new tile: 2 lumber camps', tiles: { lumber: 2 } },
  lumbers: { label: '+2 Camps', icon: 'lumber', desc: '2 more lumber camps', tiles: { lumber: 2 } },
};

/** The gift that first brings each special building, and the one that brings more of it. */
const NEW: Record<Special, Gift> = { windmill: 'windmill', market: 'market', harbor: 'harbor', lumber: 'lumber' };
const MORE: Record<Special, Gift> = { windmill: 'windmills', market: 'markets', harbor: 'harbors', lumber: 'lumbers' };

/**
 * The two gifts offered for reaching round `round`'s goal on island `island`, with `unlocked` the
 * special buildings already won. Round 1 always offers +2 Towers or the Windmill. Later rounds
 * offer one special not yet won (in the order of SPECIALS) beside a plain tile pack, until all
 * are won; then two of the tile packs and more of the specials. Seeded by island and round, so a
 * kingdom's gifts never touch Math.random.
 */
export function giftsFor(island: number, round: number, unlocked: readonly Special[]): [Gift, Gift] {
  if (round === 1 && unlocked.length === 0) return ['towers', 'windmill'];
  const rand = seeded(island * 7919 + round * 104729);
  const pick = <T>(list: T[]) => list.splice(Math.floor(rand() * list.length), 1)[0];
  const plain: Gift[] = ['towers', 'houses', 'farms'];
  const next = SPECIALS.find((b) => !unlocked.includes(b));
  if (next) return [pick(plain), NEW[next]];
  const pool: Gift[] = [...plain, ...SPECIALS.map((b) => MORE[b])];
  return [pick(pool), pick(pool)];
}

/** The special building a gift brings for the first time, if it is one of those. */
export const newSpecial = (gift: Gift) => SPECIALS.find((b) => NEW[b] === gift) ?? null;
