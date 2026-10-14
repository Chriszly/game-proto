import { seeded, type Building } from './tiles';

// Royal gifts: reaching a round's goal offers a choice of two, shown in the panel all round long.

export const GIFTS = ['towers', 'houses', 'farms', 'windmill', 'windmills'] as const;
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
};

/**
 * The two gifts offered for reaching round `round`'s goal on island `island`. Round 1 always offers
 * +2 Towers or the Windmill; later rounds offer the Windmill until it is won, then two others.
 * Seeded by island and round, so a kingdom's gifts never touch Math.random.
 */
export function giftsFor(island: number, round: number, hasWindmill: boolean): [Gift, Gift] {
  if (round === 1 && !hasWindmill) return ['towers', 'windmill'];
  const rand = seeded(island * 7919 + round * 104729);
  const pick = <T>(list: T[]) => list.splice(Math.floor(rand() * list.length), 1)[0];
  const plain: Gift[] = ['towers', 'houses', 'farms'];
  if (!hasWindmill) return [pick(plain), 'windmill'];
  const pool: Gift[] = [...plain, 'windmills'];
  return [pick(pool), pick(pool)];
}
