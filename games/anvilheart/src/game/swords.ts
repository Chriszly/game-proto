// The swords the smithy can make, from the forge's rusty dagger up. Two swords of a tier merge
// into one of the next, and every tier sells for more than the two it took. Names are keys of
// `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export interface Sword {
  name: TextKey;
  /** The name of several, for the commission banner's counts. */
  plural: TextKey;
  /** What an adventurer pays for it, in coins. */
  price: number;
}

/** Tier 1 is SWORDS[0]; a sword on the board is stored as its tier number. */
export const SWORDS: Sword[] = [
  { name: 'rustyDagger', plural: 'rustyDaggers', price: 4 },
  { name: 'ironShortsword', plural: 'ironShortswords', price: 10 },
  { name: 'steelSword', plural: 'steelSwords', price: 25 },
  { name: 'knightsBlade', plural: 'knightsBlades', price: 60 },
  { name: 'silverSaber', plural: 'silverSabers', price: 140 },
  { name: 'goldenClaymore', plural: 'goldenClaymores', price: 320 },
  { name: 'runeblade', plural: 'runeblades', price: 720 },
  { name: 'dragonslayer', plural: 'dragonslayers', price: 1600 },
  // Two Dragonslayers merge into the legendary Anvilheart, made for the crown.
  { name: 'anvilheart', plural: 'anvilhearts', price: 4000 },
];

export const MAX_TIER = SWORDS.length;
/** Adventurers ask for swords up to the Dragonslayer; the Anvilheart is for the crown. */
export const ORDER_TOP = MAX_TIER - 1;

export const swordOf = (tier: number) => SWORDS[tier - 1];
