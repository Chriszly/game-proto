// The blessings a balanced tier offers. Three different ones are offered each time; the player
// keeps one. Their effects are applied in `chooseBlessing` in state.ts.

export const BLESSINGS = ['broad', 'calm', 'steady', 'golden', 'grace'] as const;
export type BlessingId = (typeof BLESSINGS)[number];

export const BLESSING_INFO: Record<BlessingId, { name: string; text: string; color: number }> = {
  broad: { name: 'Broad Stones', text: 'The top stone grows 40 wider, up to the plinth.', color: 0xd9a066 },
  calm: { name: 'Calm Winds', text: 'Stones swing 15% slower from now on.', color: 0x7fc8e8 },
  steady: { name: 'Steady Hands', text: 'Perfect drops are easier: 6 more pixels of leeway.', color: 0x9ad46a },
  golden: { name: 'Golden Offering', text: 'Every stone you place earns 1 more favor.', color: 0xf3c64e },
  grace: { name: "Mason's Grace", text: 'The next stone that misses is caught, not lost.', color: 0xc9a0e8 },
};
