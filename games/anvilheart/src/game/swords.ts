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
];

export const MAX_TIER = SWORDS.length;

export const swordOf = (tier: number) => SWORDS[tier - 1];
