// The boons offered at each checkpoint: two at a time, one to keep for the rest of the run.
// Their effects are worked out in `stats` in state.ts. Cursed boons are a gift with a price, and
// from the second checkpoint one may take the place of the second card. Names and texts are keys
// of `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export type BoonId =
  | 'heart'
  | 'boots'
  | 'double'
  | 'aegis'
  | 'magnet'
  | 'greed'
  | 'greaves'
  | 'cloak'
  | 'mend'
  | 'gilt'
  | 'glass'
  | 'oath';

export interface Boon {
  name: TextKey;
  text: TextKey;
  /** How many times it can be taken in a run. */
  maxRank: number;
  /** Offered only to fill the pair once fewer than two other boons are left. */
  filler?: boolean;
  /** A cursed boon: it trades something away, and is never for sale in the shop. */
  cursed?: boolean;
}

export const BOONS: Record<BoonId, Boon> = {
  heart: { name: 'heartName', text: 'heartText', maxRank: 3 },
  boots: { name: 'bootsName', text: 'bootsText', maxRank: 3 },
  double: { name: 'doubleName', text: 'doubleText', maxRank: 1 },
  aegis: { name: 'aegisName', text: 'aegisText', maxRank: 2 },
  magnet: { name: 'magnetName', text: 'magnetText', maxRank: 3 },
  greed: { name: 'greedName', text: 'greedText', maxRank: 3 },
  greaves: { name: 'greavesName', text: 'greavesText', maxRank: 2 },
  cloak: { name: 'cloakName', text: 'cloakText', maxRank: 2 },
  mend: { name: 'mendName', text: 'mendText', maxRank: Infinity, filler: true },
  gilt: { name: 'giltName', text: 'giltText', maxRank: 1, cursed: true },
  glass: { name: 'glassName', text: 'glassText', maxRank: 1, cursed: true },
  oath: { name: 'oathName', text: 'oathText', maxRank: 1, cursed: true },
};

export const BOON_IDS = Object.keys(BOONS) as BoonId[];

/** Whether the coin shop can sell this boon: never Field Dressing or a cursed boon. */
export const forSale = (id: BoonId) => !BOONS[id].filler && !BOONS[id].cursed;

/** Cursed boons: from this stage's checkpoint on, one takes the second card this often. */
export const CURSE = { from: 2, chance: 0.5 };
