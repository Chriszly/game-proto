// What the coins buy: smithy upgrades, each with a few ranks.

export type UpgradeId = 'bellows' | 'ore';

export interface Upgrade {
  name: string;
  /** What it does, for the button's second line. */
  blurb: string;
  /** The price of each rank in turn; the upgrade is maxed once they run out. */
  prices: number[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  // Each rank takes 20% off the forge's heat-up time.
  bellows: { name: 'Bellows', blurb: 'forge faster', prices: [40, 110, 260, 600] },
  // Each rank gives a 20% chance that the forge makes an Iron Shortsword instead of a dagger.
  ore: { name: 'Fine Ore', blurb: 'better blades', prices: [90, 250, 700] },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** The price of the next rank, or null when the upgrade is maxed. */
export const nextPrice = (id: UpgradeId, rank: number) => UPGRADES[id].prices[rank] ?? null;
