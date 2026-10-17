// Relics: passive bonuses that last the rest of the run. The merchant sells them, the first boss
// leaves one behind, and a mystery room can hold one. Each is owned at most once; `sim.ts` applies
// them where their text says.

export type RelicId = 'oakWard' | 'whetstone' | 'emberLantern' | 'mendingMoss' | 'goldenIdol' | 'boneCharm' | 'venomGland';

import type { TextKey } from '../i18n';

export interface Relic {
  /** Its name and text, keys of `i18n/en.ts`. */
  name: TextKey;
  text: TextKey;
}

export const RELICS: Record<RelicId, Relic> = {
  oakWard: { name: 'oakWardName', text: 'oakWardText' },
  whetstone: { name: 'whetstoneName', text: 'whetstoneText' },
  emberLantern: { name: 'emberLanternName', text: 'emberLanternText' },
  mendingMoss: { name: 'mendingMossName', text: 'mendingMossText' },
  goldenIdol: { name: 'goldenIdolName', text: 'goldenIdolText' },
  boneCharm: { name: 'boneCharmName', text: 'boneCharmText' },
  venomGland: { name: 'venomGlandName', text: 'venomGlandText' },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];
