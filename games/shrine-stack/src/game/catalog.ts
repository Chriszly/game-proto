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
