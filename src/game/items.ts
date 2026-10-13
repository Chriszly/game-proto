export type PlantId = 'wheat' | 'mandrake';
export type RefinedId = 'flour' | 'mandrakeSeeds';
export type PotionId = 'healingDraught' | 'sleepingTonic';
export type ItemId = PlantId | RefinedId | PotionId;

export interface ItemDef {
  name: string;
  kind: 'plant' | 'refined' | 'potion';
  color: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wheat: { name: 'Wheat', kind: 'plant', color: 0xd9b24a },
  mandrake: { name: 'Mandrake', kind: 'plant', color: 0xb07a4a },
  flour: { name: 'Wheat Flour', kind: 'refined', color: 0xf1e8d0 },
  mandrakeSeeds: { name: 'Mandrake Seeds', kind: 'refined', color: 0x6b4426 },
  healingDraught: { name: 'Healing Draught', kind: 'potion', color: 0xd9434b },
  sleepingTonic: { name: 'Sleeping Tonic', kind: 'potion', color: 0x6a5bd6 },
};

/** How long a plot takes to go from freshly harvested to ripe. */
export const GROW_MS: Record<PlantId, number> = {
  wheat: 8_000,
  mandrake: 14_000,
};

/** What the refining table turns each plant into, and how long one takes. */
export const REFINE: Record<PlantId, { out: RefinedId; ms: number }> = {
  wheat: { out: 'flour', ms: 2_500 },
  mandrake: { out: 'mandrakeSeeds', ms: 3_500 },
};

export interface Recipe {
  out: PotionId;
  inputs: RefinedId[];
  ms: number;
}

// Checked in order, so the recipe with the rarer ingredient comes first.
export const RECIPES: Recipe[] = [
  { out: 'sleepingTonic', inputs: ['flour', 'mandrakeSeeds'], ms: 5_000 },
  { out: 'healingDraught', inputs: ['flour', 'flour'], ms: 4_000 },
];

export const POTION_PRICE: Record<PotionId, number> = {
  healingDraught: 8,
  sleepingTonic: 15,
};

export const isPlant = (id: ItemId): id is PlantId => ITEMS[id].kind === 'plant';
export const isRefined = (id: ItemId): id is RefinedId => ITEMS[id].kind === 'refined';
export const isPotion = (id: ItemId): id is PotionId => ITEMS[id].kind === 'potion';

/** Every item of each kind, in the order their pallets stand. */
export const PLANTS = Object.keys(GROW_MS) as PlantId[];
export const REFINED = [...new Set(PLANTS.map((p) => REFINE[p].out))];
export const POTIONS = Object.keys(POTION_PRICE) as PotionId[];
