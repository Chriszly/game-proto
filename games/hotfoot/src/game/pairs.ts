import type { TextKey } from '../i18n';
import type { BoonId } from './boons';

// Boon pairs: two boons held together unlock a hidden bonus, hinted at on the cards. Their effects
// are read from `stats` in state.ts (`glide`, `hoard`, `bulwark`) and applied in sim.ts. Names and
// texts are keys of `i18n/en.ts`, shown with `t`.

export type PairId = 'glide' | 'hoard' | 'bulwark';

export interface Pair {
  id: PairId;
  name: TextKey;
  boons: [BoonId, BoonId];
  text: TextKey;
  /** The words that pop up when the pair is made. */
  pop: TextKey;
}

export const PAIRS: Pair[] = [
  { id: 'glide', name: 'glideName', boons: ['boots', 'double'], text: 'glideText', pop: 'glidePop' },
  { id: 'hoard', name: 'hoardName', boons: ['greed', 'magnet'], text: 'hoardText', pop: 'hoardPop' },
  { id: 'bulwark', name: 'bulwarkName', boons: ['aegis', 'cloak'], text: 'bulwarkText', pop: 'bulwarkPop' },
];

/** The pairs completed by these ranks. */
export const pairsOf = (ranks: Partial<Record<BoonId, number>>): PairId[] => PAIRS.filter((p) => p.boons.every((b) => (ranks[b] ?? 0) > 0)).map((p) => p.id);

/** The pair this boon is half of, and the other half, or null. */
export function pairFor(id: BoonId) {
  const pair = PAIRS.find((p) => p.boons.includes(id));
  if (!pair) return null;
  return { pair, partner: pair.boons.find((b) => b !== id)! };
}
