// What the coins buy: smithy upgrades, each with a few ranks.

export type UpgradeId = 'bellows' | 'ore' | 'auto' | 'barrel' | 'anvils';

export interface Upgrade {
  name: string;
  /** What it does, for the button's second line. */
  blurb: string;
  /** The price of each rank in turn; the upgrade is maxed once they run out. */
  prices: number[];
  /** Upgrades that must be maxed before this one can be bought. */
  after?: UpgradeId[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  // Each rank takes 20% off the forge's heat-up time.
  bellows: { name: 'Bellows', blurb: 'forge faster', prices: [40, 110, 260, 600] },
  // Each rank gives a 20% chance that the forge makes an Iron Shortsword instead of a dagger, so at
  // the fifth rank it only makes Shortswords.
  ore: { name: 'Fine Ore', blurb: 'better blades', prices: [90, 250, 700, 1500, 3000] },
  // The last forge upgrade: the forge makes a sword by itself whenever it is hot and an anvil is free.
  auto: { name: 'Auto Forge', blurb: 'forges by itself', prices: [1200], after: ['bellows'] },
  // A barrel under the board that holds one sword or gem off the anvils. Bought by tapping it.
  barrel: { name: 'Quench barrel', blurb: 'holds one sword', prices: [150] },
  // A fifth column of four anvils. Bought by tapping one of them.
  anvils: { name: 'Four more anvils', blurb: 'a fifth column', prices: [500] },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
/** The upgrades with a button in the left column; the barrel and anvils are bought where they stand. */
export const BUTTON_UPGRADES: UpgradeId[] = ['bellows', 'ore', 'auto'];

/** The price of the next rank, or null when the upgrade is maxed. */
export const nextPrice = (id: UpgradeId, rank: number) => UPGRADES[id].prices[rank] ?? null;

/** Whether an upgrade still waits for the ones before it to be maxed. */
export const locked = (id: UpgradeId, ranks: Record<UpgradeId, number>) =>
  (UPGRADES[id].after ?? []).some((other) => nextPrice(other, ranks[other]) !== null);
