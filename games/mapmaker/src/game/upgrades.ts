// What the coins from charts buy at the harbor, between voyages. Their effects are applied in
// src/game/state.ts (`maxSupplies`, `inkBonus`) and src/game/sim.ts (`sightOf`, compass). Names
// and texts are keys of `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export type UpgradeId = 'provisions' | 'spyglass' | 'ink' | 'compass';

export interface Upgrade {
  name: TextKey;
  text: TextKey;
  /** The price of each rank, in order; its length is the most ranks. */
  costs: number[];
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  provisions: { name: 'provisionsName', text: 'provisionsText', costs: [40, 80, 140] },
  spyglass: { name: 'spyglassName', text: 'spyglassText', costs: [60, 120] },
  ink: { name: 'inkName', text: 'inkText', costs: [50, 100, 180] },
  compass: { name: 'compassName', text: 'compassText', costs: [90] },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** The price of the next rank, or null when it is maxed. */
export function nextCost(id: UpgradeId, rank: number): number | null {
  return UPGRADES[id].costs[rank] ?? null;
}
