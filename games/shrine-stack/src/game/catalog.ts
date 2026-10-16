// What favor buys between tiers, the kinds of stone, the tier trials and the curses: their names,
// texts and colours. Their effects live in state.ts.

/** One-time buys between tiers, each at most once per break. */
export const SHOP = ['slow', 'wider', 'grace'] as const;
export type ShopId = (typeof SHOP)[number];

export const SHOP_INFO: Record<ShopId, { name: string; cost: number; color: number }> = {
  slow: { name: 'Slow drop', cost: 4, color: 0x7fc8e8 },
  wider: { name: 'Wider stone', cost: 6, color: 0xd9a066 },
  grace: { name: "Mason's Grace", cost: 8, color: 0xc9a0e8 },
};

/** The cheapest buy: a wobbly tier opens the shop only when the player can afford something. */
export const CHEAPEST = Math.min(...SHOP.map((id) => SHOP_INFO[id].cost));

export const KINDS = ['normal', 'heavy', 'light'] as const;
export type StoneKind = (typeof KINDS)[number];

export const KIND_INFO: Record<StoneKind, { name: string; text: string; color: string }> = {
  normal: { name: 'Ordinary stone', text: 'an ordinary stone', color: '#f3e9d2' },
  heavy: { name: 'Heavy stone', text: 'slow, cracks more off', color: '#b9c3cc' },
  light: { name: 'Light stone', text: 'fast, +1 favor', color: '#9ad46a' },
};

export const TRIALS = ['perfect', 'keep'] as const;
export type TrialId = (typeof TRIALS)[number];

export const TRIAL_INFO: Record<TrialId, { name: string; short: string }> = {
  perfect: { name: 'Three perfect drops', short: '3 perfect' },
  keep: { name: 'Every stone keeps 80%', short: 'keep 80%' },
};

export const CURSES = ['haste', 'brittle', 'dim'] as const;
export type CurseId = (typeof CURSES)[number];

export const CURSE_INFO: Record<CurseId, { name: string; text: string }> = {
  haste: { name: 'Haste', text: 'stones swing 30% faster' },
  brittle: { name: 'Brittle', text: 'every cut cracks 6 more off' },
  dim: { name: 'Dimness', text: 'no drop guide' },
};

/** What a tier's stones are cut from, picked between tiers from `MATERIAL_FROM_TIER`. Limestone is the plain stone. */
export const MATERIALS = ['limestone', 'marble', 'sandstone', 'basalt'] as const;
export type MaterialId = (typeof MATERIALS)[number];

export const MATERIAL_INFO: Record<MaterialId, { name: string; text: string; short: string; color: number }> = {
  limestone: { name: 'Limestone', text: 'plain stone', short: 'plain', color: 0xd8b58a },
  marble: { name: 'Marble', text: 'half the perfect window, x2 favor', short: 'tight, x2 favor', color: 0xf0ecf4 },
  sandstone: { name: 'Sandstone', text: 'double perfect window, half favor', short: 'easy, 1/2 favor', color: 0xe0a060 },
  basalt: { name: 'Basalt', text: 'heavy: slow and cracks more, x2 trial favor', short: 'heavy, x2 trial', color: 0x6a7080 },
};

/** The materials a break offers to pick from (limestone is the default, never on a button). */
export const MATERIAL_PICKS = ['marble', 'sandstone', 'basalt'] as const satisfies readonly MaterialId[];

/** The patrons a new temple picks one of; each sets a rule for the whole run, a boon and a bane. */
export const PATRONS = ['gilded', 'hands', 'patient', 'storm'] as const;
export type PatronId = (typeof PATRONS)[number];

export const PATRON_INFO: Record<PatronId, { name: string; boon: string; bane: string; color: number }> = {
  gilded: { name: 'The Gilded Hand', boon: 'Every stone earns 1 more favor.', bane: "No Mason's Grace: a miss always ends the run.", color: 0xf3c64e },
  hands: { name: 'The Many-Handed', boon: 'Balanced tiers offer four blessings.', bane: 'Stones swing 10% faster.', color: 0xc9a0e8 },
  patient: { name: 'The Patient Mason', boon: 'Stones swing 10% slower.', bane: 'Perfect drops earn no extra favor.', color: 0x7fc8e8 },
  storm: { name: 'The Storm Caller', boon: 'Perfect drops get 3 more pixels of leeway.', bane: 'Gusts blow from tier 6, not only past the crown.', color: 0x9ad46a },
};
