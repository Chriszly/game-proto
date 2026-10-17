// The armoury: lasting upgrades bought with banked coins on the game-over panel. Each has a few
// levels, each dearer than the last, and every run after starts with them. Their effects are
// worked out in `stats` in state.ts (hearts, coin reach) and in `newRun` in sim.ts (the purse).
// Names and texts are keys of `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export type ArmouryId = 'heart' | 'magnet' | 'purse';
export type Armoury = Record<ArmouryId, number>;

export interface ArmouryItem {
  name: TextKey;
  text: TextKey;
  /** The price of each level, in banked coins; the item is full after the last. */
  prices: number[];
}

export const ARMOURY: Record<ArmouryId, ArmouryItem> = {
  heart: { name: 'ironHeartName', text: 'ironHeartText', prices: [60, 150] },
  magnet: { name: 'charmName', text: 'charmText', prices: [40, 100, 200] },
  purse: { name: 'purseName', text: 'purseText', prices: [30, 80] },
};

export const ARMOURY_IDS = Object.keys(ARMOURY) as ArmouryId[];

/** What each level adds: hearts, coin reach in pixels, and coins at the start of a run. */
export const ARMOURY_EACH = { heart: 1, magnet: 25, purse: 10 };

export const noArmoury = (): Armoury => ({ heart: 0, magnet: 0, purse: 0 });

/** The price of the next level, or null once the item is full. */
export const nextPrice = (armoury: Armoury, id: ArmouryId) => ARMOURY[id].prices[armoury[id]] ?? null;
