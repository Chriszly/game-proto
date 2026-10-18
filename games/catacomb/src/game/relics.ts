// Relics: passive bonuses that last the rest of the run. The merchant sells them, the first boss
// leaves one behind, and a mystery room can hold one. Each is owned at most once; `sim.ts` applies
// them where their text says.

export type RelicId = 'oakWard' | 'whetstone' | 'emberLantern' | 'mendingMoss' | 'goldenIdol' | 'boneCharm' | 'venomGland';

import { t, type TextKey } from '../i18n';

export interface Relic {
  /** Its name and text, keys of `i18n/en.ts`; the text takes the relic's number as `{n}`. */
  name: TextKey;
  text: TextKey;
  n?: number;
}

/** Each relic's number: Oak Ward's block, the Whetstone's damage, the Ember Lantern's energy, the Mending Moss's healing, the Bone Charm's Vulnerable and the Venom Gland's poison. */
export const OAK_WARD_BLOCK = 3;
export const WHETSTONE_DAMAGE = 2;
export const EMBER_LANTERN_ENERGY = 1;
export const MENDING_MOSS_HEAL = 5;
export const GOLDEN_IDOL_GOLD = 1.5;
export const BONE_CHARM_VULNERABLE = 2;
export const VENOM_GLAND_POISON = 2;

export const RELICS: Record<RelicId, Relic> = {
  oakWard: { name: 'oakWardName', text: 'oakWardText', n: OAK_WARD_BLOCK },
  whetstone: { name: 'whetstoneName', text: 'whetstoneText', n: WHETSTONE_DAMAGE },
  emberLantern: { name: 'emberLanternName', text: 'emberLanternText', n: EMBER_LANTERN_ENERGY },
  mendingMoss: { name: 'mendingMossName', text: 'mendingMossText', n: MENDING_MOSS_HEAL },
  goldenIdol: { name: 'goldenIdolName', text: 'goldenIdolText' },
  boneCharm: { name: 'boneCharmName', text: 'boneCharmText', n: BONE_CHARM_VULNERABLE },
  venomGland: { name: 'venomGlandName', text: 'venomGlandText', n: VENOM_GLAND_POISON },
};

/** A relic's shown text, with its number filled in. */
export const relicText = (id: RelicId) => t(RELICS[id].text, { n: RELICS[id].n ?? 0 });

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];
