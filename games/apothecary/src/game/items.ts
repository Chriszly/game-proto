export type PlantId = 'wheat' | 'mandrake' | 'nightshade';
export type RefinedId = 'flour' | 'mandrakeSeeds' | 'nightshadeExtract';
export type PotionId = 'healingDraught' | 'sleepingTonic' | 'shadowElixir';
/** A potion taken out of the cauldron in its fine window, worth more than the plain one. */
export type FineId = 'fineHealingDraught' | 'fineSleepingTonic' | 'fineShadowElixir';
export type ItemId = PlantId | RefinedId | PotionId | FineId;
/** What can stand on the counter's shelf for sale: a potion, plain or fine. */
export type SellableId = PotionId | FineId;

export interface ItemDef {
  name: string;
  kind: 'plant' | 'refined' | 'potion' | 'fine';
  color: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wheat: { name: 'Wheat', kind: 'plant', color: 0xd9b24a },
  mandrake: { name: 'Mandrake', kind: 'plant', color: 0xb07a4a },
  nightshade: { name: 'Nightshade', kind: 'plant', color: 0x4a3060 },
  flour: { name: 'Wheat Flour', kind: 'refined', color: 0xf1e8d0 },
  mandrakeSeeds: { name: 'Mandrake Seeds', kind: 'refined', color: 0x6b4426 },
  nightshadeExtract: { name: 'Nightshade Extract', kind: 'refined', color: 0x5a3a78 },
  healingDraught: { name: 'Healing Draught', kind: 'potion', color: 0xd9434b },
  sleepingTonic: { name: 'Sleeping Tonic', kind: 'potion', color: 0x6a5bd6 },
  shadowElixir: { name: 'Shadow Elixir', kind: 'potion', color: 0x2f8a72 },
  fineHealingDraught: { name: 'Fine Healing Draught', kind: 'fine', color: 0xd9434b },
  fineSleepingTonic: { name: 'Fine Sleeping Tonic', kind: 'fine', color: 0x6a5bd6 },
  fineShadowElixir: { name: 'Fine Shadow Elixir', kind: 'fine', color: 0x2f8a72 },
};

/** How long a plot takes to go from freshly harvested to ripe. */
export const GROW_MS: Record<PlantId, number> = {
  wheat: 24_000,
  mandrake: 42_000,
  nightshade: 54_000,
};

/** What the refining table turns each plant into, and how long one takes. */
export const REFINE: Record<PlantId, { out: RefinedId; ms: number }> = {
  wheat: { out: 'flour', ms: 2_500 },
  mandrake: { out: 'mandrakeSeeds', ms: 3_500 },
  nightshade: { out: 'nightshadeExtract', ms: 4_000 },
};

export interface Recipe {
  out: PotionId;
  inputs: RefinedId[];
  ms: number;
}

// A cauldron brews whichever of these the shop is shortest of; ties go in this order, rarer ingredient first.
export const RECIPES: Recipe[] = [
  { out: 'shadowElixir', inputs: ['nightshadeExtract', 'mandrakeSeeds'], ms: 6_000 },
  { out: 'sleepingTonic', inputs: ['flour', 'mandrakeSeeds'], ms: 5_000 },
  { out: 'healingDraught', inputs: ['flour', 'flour'], ms: 4_000 },
];

export const POTION_PRICE: Record<PotionId, number> = {
  healingDraught: 8,
  sleepingTonic: 15,
  shadowElixir: 24,
};

export const isPlant = (id: ItemId): id is PlantId => ITEMS[id].kind === 'plant';
export const isRefined = (id: ItemId): id is RefinedId => ITEMS[id].kind === 'refined';
export const isPotion = (id: ItemId): id is PotionId => ITEMS[id].kind === 'potion';
export const isFine = (id: ItemId): id is FineId => ITEMS[id].kind === 'fine';
/** Whether an item can be sold at the counter: a potion, plain or fine. */
export const isSellable = (id: ItemId): id is SellableId => isPotion(id) || isFine(id);

/** Each potion's fine version, and back. */
export const FINE: Record<PotionId, FineId> = {
  healingDraught: 'fineHealingDraught',
  sleepingTonic: 'fineSleepingTonic',
  shadowElixir: 'fineShadowElixir',
};
const PLAIN = Object.fromEntries(Object.entries(FINE).map(([plain, fine]) => [fine, plain])) as Record<FineId, PotionId>;
/** The potion an item on sale is: itself, or the plain potion of a fine one. */
export const plainOf = (id: SellableId): PotionId => (isFine(id) ? PLAIN[id] : id);

/** Every item of each kind, in the order their pallets stand. */
export const PLANTS = Object.keys(GROW_MS) as PlantId[];
export const REFINED = [...new Set(PLANTS.map((p) => REFINE[p].out))];
export const POTIONS = Object.keys(POTION_PRICE) as PotionId[];
