// The swords the smithy can make, from the forge's rusty dagger up. Two swords of a tier merge
// into one of the next, and every tier sells for more than the two it took.

export interface Sword {
  name: string;
  /** What an adventurer pays for it, in coins. */
  price: number;
}

/** Tier 1 is SWORDS[0]; a sword on the board is stored as its tier number. */
export const SWORDS: Sword[] = [
  { name: 'Rusty Dagger', price: 4 },
  { name: 'Iron Shortsword', price: 10 },
  { name: 'Steel Sword', price: 25 },
  { name: "Knight's Blade", price: 60 },
  { name: 'Silver Saber', price: 140 },
  { name: 'Golden Claymore', price: 320 },
  { name: 'Runeblade', price: 720 },
  { name: 'Dragonslayer', price: 1600 },
  // The legendary ninth tier, merged from two Dragonslayers. The crown's last commission asks for it.
  { name: 'Anvilheart', price: 4000 },
];

export const MAX_TIER = SWORDS.length;
/** The best sword an adventurer will ask for; only the crown asks for an Anvilheart. */
export const MAX_ORDER = MAX_TIER - 1;
/** A loose gem from the forge, stored on an anvil like a sword of tier 0. It never merges. */
export const GEM = 0;

export const swordOf = (tier: number) => SWORDS[tier - 1];
