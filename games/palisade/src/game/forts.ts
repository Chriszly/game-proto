// Fortifications: during each break one can be bought for coins, so the coins compete with hiring
// guards. A stake line stands behind the barricade as a fallback, an oil pot burns the next group
// of foes to reach the barricade, and a lookout widens Arrow Rain for a few waves.

import type { TextKey } from '../i18n';

export type FortId = 'stakes' | 'oil' | 'lookout';

export interface FortType {
  /** Name and text, keys of `i18n/en.ts`. */
  name: TextKey;
  text: TextKey;
  cost: number;
}

export const FORTS: Record<FortId, FortType> = {
  stakes: { name: 'fortStakesName', text: 'fortStakesText', cost: 25 },
  oil: { name: 'fortOilName', text: 'fortOilText', cost: 15 },
  lookout: { name: 'fortLookoutName', text: 'fortLookoutText', cost: 20 },
};

export const FORT_IDS = Object.keys(FORTS) as FortId[];

/** The stake line's face towards the foes, between the barricade and the hero. */
export const STAKE_FRONT = 140;
/** How much hacking a stake line takes. */
export const STAKE_HP = 80;
/** The oil pot: foes within this far of the barricade's face catch fire, burning for this long. */
export const OIL_RADIUS = 110;
export const OIL_DPS = 8;
export const OIL_MS = 6_000;
export const OIL_HIT = 15;
/** The lookout lasts this many waves and makes Arrow Rain's ring this many times wider. */
export const LOOKOUT_WAVES = 3;
export const LOOKOUT_RING = 1.4;

/** Paid repairs: during a break coins mend this share of the barricade, at a price that rises with each repair of the run. */
export const REPAIR_SHARE = 0.15;
export const repairCost = (repairs: number) => 15 + 10 * repairs;
