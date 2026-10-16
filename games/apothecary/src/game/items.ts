export type PlantId = 'wheat' | 'mandrake' | 'nightshade';
export type RefinedId = 'flour' | 'mandrakeSeeds' | 'nightshadeExtract';
export type PotionId = 'healingDraught' | 'sleepingTonic' | 'vigourTonic' | 'shadowElixir' | 'moonlightSalve' | 'witchsBrew';
/** A potion taken out of the cauldron in its fine window, worth more than the plain one. */
export type FineId =
  | 'fineHealingDraught'
  | 'fineSleepingTonic'
  | 'fineVigourTonic'
  | 'fineShadowElixir'
  | 'fineMoonlightSalve'
  | 'fineWitchsBrew';
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
  vigourTonic: { name: 'Vigour Tonic', kind: 'potion', color: 0xe0862e },
  shadowElixir: { name: 'Shadow Elixir', kind: 'potion', color: 0x2f8a72 },
  moonlightSalve: { name: 'Moonlight Salve', kind: 'potion', color: 0x6fa8d6 },
  witchsBrew: { name: "Witch's Brew", kind: 'potion', color: 0x7a8f22 },
  fineHealingDraught: { name: 'Fine Healing Draught', kind: 'fine', color: 0xd9434b },
  fineSleepingTonic: { name: 'Fine Sleeping Tonic', kind: 'fine', color: 0x6a5bd6 },
  fineVigourTonic: { name: 'Fine Vigour Tonic', kind: 'fine', color: 0xe0862e },
  fineShadowElixir: { name: 'Fine Shadow Elixir', kind: 'fine', color: 0x2f8a72 },
  fineMoonlightSalve: { name: 'Fine Moonlight Salve', kind: 'fine', color: 0x6fa8d6 },
  fineWitchsBrew: { name: "Fine Witch's Brew", kind: 'fine', color: 0x7a8f22 },
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

/**
 * The town's cure, which ends the plague: brewed once from one of each refined good, when the plague's
 * last stage is over, and handed to the town as soon as it is done. It is never sold, so it is no item.
 */
export const PANACEA = 'panacea';
/** What a cauldron can brew: a potion, or the Panacea. */
export type BrewOut = PotionId | typeof PANACEA;
export const PANACEA_RECIPE: { out: typeof PANACEA; inputs: RefinedId[]; ms: number; name: string } = {
  out: PANACEA,
  inputs: ['flour', 'mandrakeSeeds', 'nightshadeExtract'],
  ms: 9_000,
  name: 'Panacea',
};

// A cauldron brews whichever of these the shop is shortest of; ties go in this order, rarer ingredient first.
export const RECIPES: Recipe[] = [
  { out: 'witchsBrew', inputs: ['nightshadeExtract', 'nightshadeExtract'], ms: 7_000 },
  { out: 'shadowElixir', inputs: ['nightshadeExtract', 'mandrakeSeeds'], ms: 6_000 },
  { out: 'moonlightSalve', inputs: ['nightshadeExtract', 'flour'], ms: 5_500 },
  { out: 'sleepingTonic', inputs: ['mandrakeSeeds', 'mandrakeSeeds'], ms: 5_000 },
  { out: 'vigourTonic', inputs: ['flour', 'mandrakeSeeds'], ms: 4_500 },
  { out: 'healingDraught', inputs: ['flour', 'flour'], ms: 4_000 },
];

/** What each potion sells for, before the counter's and the guild's price upgrades. In `POTIONS` order. */
export const POTION_PRICE: Record<PotionId, number> = {
  healingDraught: 8,
  sleepingTonic: 15,
  vigourTonic: 11,
  shadowElixir: 24,
  moonlightSalve: 20,
  witchsBrew: 34,
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
  vigourTonic: 'fineVigourTonic',
  shadowElixir: 'fineShadowElixir',
  moonlightSalve: 'fineMoonlightSalve',
  witchsBrew: 'fineWitchsBrew',
};
const PLAIN = Object.fromEntries(Object.entries(FINE).map(([plain, fine]) => [fine, plain])) as Record<FineId, PotionId>;
/** The potion an item on sale is: itself, or the plain potion of a fine one. */
export const plainOf = (id: SellableId): PotionId => (isFine(id) ? PLAIN[id] : id);

/** Every item of each kind, in the order their pallets stand. */
export const PLANTS = Object.keys(GROW_MS) as PlantId[];
export const REFINED = [...new Set(PLANTS.map((p) => REFINE[p].out))];
export const POTIONS = Object.keys(POTION_PRICE) as PotionId[];
