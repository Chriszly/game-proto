// What the coins buy besides comb cells and bees: hive upgrades, each with a few ranks.

import type { TextKey } from '../i18n';

export type UpgradeId = 'baskets' | 'clover' | 'dance' | 'guards';

export interface Upgrade {
  /** Its name's text (`i18n/en.ts`). */
  name: TextKey;
  /** What it does, for the button's second line. */
  blurb: TextKey;
  /** The price of each rank in turn; the upgrade is maxed once they run out. */
  prices: number[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  // Each rank lets every forager carry one more drop of nectar home.
  baskets: { name: 'baskets', blurb: 'plusNectar', prices: [40, 120, 320] },
  // Each rank plants clover closer to the hive: trips take 20% less time.
  clover: { name: 'cloverPatch', blurb: 'shorterTrips', prices: [60, 180, 480] },
  // The idle upgrade: bees fly out by themselves whenever the comb has room.
  dance: { name: 'dance', blurb: 'forageAlone', prices: [250] },
  // Guards wait at the entrance and drive off every wasp as it lands, before it steals a thing.
  guards: { name: 'guards', blurb: 'driveOffWasps', prices: [150] },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** The price of the next rank, or null when the upgrade is maxed. */
export const nextPrice = (id: UpgradeId, rank: number) => UPGRADES[id].prices[rank] ?? null;
