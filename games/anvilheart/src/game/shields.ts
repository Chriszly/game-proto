// The bucklers the forge makes in its second mode, once the smithy has made a Knight's Blade. Two
// of a tier merge into the next, like swords, but they only sell as half of a sword and shield set.
// Names are keys of `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export interface Shield {
  name: TextKey;
  /** What it adds to a set's price, before the set bonus. */
  price: number;
}

/** Tier 1 is SHIELDS[0]. */
export const SHIELDS: Shield[] = [
  { name: 'woodenBuckler', price: 6 },
  { name: 'ironBuckler', price: 15 },
  { name: 'steelBuckler', price: 40 },
  { name: 'silverBuckler', price: 100 },
  { name: 'goldenBuckler', price: 240 },
];

export const SHIELD_TOP = SHIELDS.length;

export const shieldOf = (tier: number) => SHIELDS[tier - 1];
