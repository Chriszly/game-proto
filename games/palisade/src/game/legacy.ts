// Retiring for a legacy: a hero who knows every skill (or lifted the siege) can retire. The next
// hero starts from scratch at level 1 but keeps one legacy perk, picked from three, on top of the
// ones earlier heroes left. A first relic can be kept again and again; the others once each.

import type { TextKey } from '../i18n';
import type { RelicId } from './relics';

export type LegacyId = 'relic' | 'slot' | 'rain';

export interface LegacyType {
  /** Name and text, keys of `i18n/en.ts`. */
  name: TextKey;
  text: TextKey;
}

export const LEGACIES: Record<LegacyId, LegacyType> = {
  relic: { name: 'legacyRelicName', text: 'legacyRelicText' },
  slot: { name: 'legacySlotName', text: 'legacySlotText' },
  rain: { name: 'legacyRainName', text: 'legacyRainText' },
};

export const LEGACY_IDS = Object.keys(LEGACIES) as LegacyId[];

/** What retired heroes left to every new one. */
export interface Legacy {
  /** First relics: each new hero starts with these. */
  relics: RelicId[];
  slot: boolean;
  rain: boolean;
  /** How many heroes have retired. */
  retired: number;
}

export const freshLegacy = (): Legacy => ({ relics: [], slot: false, rain: false, retired: 0 });

/** Arrow Rain's charge with Quick Arrow Rain kept: this share of the kills. */
export const QUICK_RAIN = 0.75;

/** Whether this legacy can still be kept: the slot and the quick rain only once. */
export const canKeep = (legacy: Legacy, id: LegacyId) => (id === 'slot' ? !legacy.slot : id === 'rain' ? !legacy.rain : true);
