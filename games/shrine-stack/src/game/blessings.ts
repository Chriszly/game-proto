// The blessings a balanced tier offers. Three different ones are offered each time; the player
// keeps one. Their effects are applied in `chooseBlessing` in state.ts. Names and texts are keys of
// `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export const BLESSINGS = ['broad', 'calm', 'steady', 'golden', 'grace'] as const;
export type BlessingId = (typeof BLESSINGS)[number];

export const BLESSING_INFO: Record<BlessingId, { name: TextKey; text: TextKey; color: number }> = {
  broad: { name: 'broadName', text: 'broadText', color: 0xd9a066 },
  calm: { name: 'calmName', text: 'calmText', color: 0x7fc8e8 },
  steady: { name: 'steadyName', text: 'steadyText', color: 0x9ad46a },
  golden: { name: 'goldenName', text: 'goldenText', color: 0xf3c64e },
  grace: { name: 'graceName', text: 'graceText', color: 0xc9a0e8 },
};
