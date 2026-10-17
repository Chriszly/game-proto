// What the coins buy: forge upgrades with a few ranks each, and two one-off additions to the smithy.
// Names and blurbs are keys of `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export type UpgradeId = 'bellows' | 'ore' | 'auto' | 'row' | 'barrel';

export interface Upgrade {
  name: TextKey;
  /** What it does, for the button's second line. */
  blurb: TextKey;
  /** The price of each rank in turn; the upgrade is maxed once they run out. */
  prices: number[];
  /** Upgrades that must be maxed before this one can be bought. */
  after?: UpgradeId[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  // Each rank takes 20% off the forge's heat-up time.
  bellows: { name: 'bellowsName', blurb: 'bellowsBlurb', prices: [40, 110, 260, 600] },
  // Each rank gives a 20% chance that the forge makes an Iron Shortsword instead of a dagger, so at
  // the fifth rank it only makes Shortswords.
  ore: { name: 'oreName', blurb: 'oreBlurb', prices: [90, 250, 700, 1500, 3000] },
  // The last forge upgrade: the forge makes a sword by itself whenever it is hot and an anvil is free.
  auto: { name: 'autoName', blurb: 'autoBlurb', prices: [1200], after: ['bellows'] },
  // A fifth row of four anvils under the board.
  row: { name: 'rowName', blurb: 'rowBlurb', prices: [800] },
  // A barrel beside the board that holds one sword (or gem) off the anvils.
  barrel: { name: 'barrelName', blurb: 'barrelBlurb', prices: [300] },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
/** The upgrades on the buttons under the forge; the row and the barrel are bought where they go. */
export const FORGE_UPGRADES: UpgradeId[] = ['bellows', 'ore', 'auto'];

/** The price of the next rank, or null when the upgrade is maxed. */
export const nextPrice = (id: UpgradeId, rank: number) => UPGRADES[id].prices[rank] ?? null;

/** Whether an upgrade still waits for the ones before it to be maxed. */
export const locked = (id: UpgradeId, ranks: Record<UpgradeId, number>) =>
  (UPGRADES[id].after ?? []).some((other) => nextPrice(other, ranks[other]) !== null);
