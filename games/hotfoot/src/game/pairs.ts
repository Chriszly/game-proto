import type { BoonId } from './boons';

// Boon pairs: two boons held together unlock a hidden bonus, hinted at on the cards. Their effects
// are read from `stats` in state.ts (`glide`, `hoard`, `bulwark`) and applied in sim.ts.

export type PairId = 'glide' | 'hoard' | 'bulwark';

export interface Pair {
  id: PairId;
  name: string;
  boons: [BoonId, BoonId];
  text: string;
}

export const PAIRS: Pair[] = [
  { id: 'glide', name: "Falcon's Glide", boons: ['boots', 'double'], text: 'fall half as fast after a leap' },
  { id: 'hoard', name: "Goblin's Hoard", boons: ['greed', 'magnet'], text: 'a stomped foe bursts into three coins' },
  { id: 'bulwark', name: 'Bulwark', boons: ['aegis', 'cloak'], text: 'a blocked hit knocks the foes ahead away' },
];

/** The pairs completed by these ranks. */
export const pairsOf = (ranks: Partial<Record<BoonId, number>>): PairId[] => PAIRS.filter((p) => p.boons.every((b) => (ranks[b] ?? 0) > 0)).map((p) => p.id);

/** The pair this boon is half of, and the other half, or null. */
export function pairFor(id: BoonId) {
  const pair = PAIRS.find((p) => p.boons.includes(id));
  if (!pair) return null;
  return { pair, partner: pair.boons.find((b) => b !== id)! };
}
