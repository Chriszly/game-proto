// What the gold buys at the harbor between waves. Each rank costs more than the last.

export type UpgradeId = 'hull' | 'shot' | 'guns' | 'crew' | 'sails';

export interface Upgrade {
  name: string;
  desc: string;
  maxRank: number;
  baseCost: number;
  costStep: number;
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  hull: { name: 'Oak Planking', desc: '+30 hull, and patched up', maxRank: 5, baseCost: 15, costStep: 15 },
  shot: { name: 'Heavy Shot', desc: 'Cannonballs hit 25% harder', maxRank: 5, baseCost: 15, costStep: 15 },
  guns: { name: 'More Guns', desc: 'One more cannon each side', maxRank: 3, baseCost: 30, costStep: 30 },
  crew: { name: 'Drilled Crew', desc: 'Reload 15% faster', maxRank: 4, baseCost: 20, costStep: 15 },
  sails: { name: 'Fast Sails', desc: 'Sail and turn 12% faster', maxRank: 3, baseCost: 20, costStep: 20 },
};

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/** The price of the next rank of an upgrade, or null once it is maxed. */
export function costOf(id: UpgradeId, rank: number) {
  const u = UPGRADES[id];
  return rank >= u.maxRank ? null : u.baseCost + u.costStep * rank;
}

/** Patching the hull back to full. */
export const REPAIR_COST = 10;

/** Hiring sailors at the harbor: how many come aboard for the price. */
export const HIRE = { crew: 8, cost: 12 };
