// The bucklers the forge makes in its second mode, once the smithy has made a Knight's Blade. Two
// of a tier merge into the next, like swords, but they only sell as half of a sword and shield set.

export interface Shield {
  name: string;
  /** What it adds to a set's price, before the set bonus. */
  price: number;
}

/** Tier 1 is SHIELDS[0]. */
export const SHIELDS: Shield[] = [
  { name: 'Wooden Buckler', price: 6 },
  { name: 'Iron Buckler', price: 15 },
  { name: 'Steel Buckler', price: 40 },
  { name: 'Silver Buckler', price: 100 },
  { name: 'Golden Buckler', price: 240 },
];

export const SHIELD_TOP = SHIELDS.length;

export const shieldOf = (tier: number) => SHIELDS[tier - 1];
