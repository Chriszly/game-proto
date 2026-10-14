// What the coins from charts buy at the harbor, between voyages. Their effects are applied in
// src/game/state.ts (`maxSupplies`, `inkBonus`) and src/game/sim.ts (`sightOf`, compass).

export type UpgradeId = 'provisions' | 'spyglass' | 'ink' | 'compass';

export interface Upgrade {
  name: string;
  text: string;
  /** The price of each rank, in order; its length is the most ranks. */
  costs: number[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  provisions: { name: 'Provisions', text: '+3 supplies every voyage', costs: [40, 80, 140] },
  spyglass: { name: 'Spyglass', text: 'Hills and peaks see one tile further', costs: [60, 120] },
  ink: { name: 'Fine Ink', text: 'Charts sell for 25% more', costs: [50, 100, 180] },
  compass: { name: 'Lodestone Compass', text: 'Shows villages and ruins through the fog', costs: [90] },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** The price of the next rank, or null when it is maxed. */
export function nextCost(id: UpgradeId, rank: number): number | null {
  return UPGRADES[id].costs[rank] ?? null;
}
