// What the gold buys at the harbor between waves. Each rank costs more than the last.

import type { TextKey } from '../i18n';

export type UpgradeId = 'hull' | 'shot' | 'guns' | 'crew' | 'sails';

export interface Upgrade {
  /** Keys of `i18n/en.ts`. */
  name: TextKey;
  desc: TextKey;
  maxRank: number;
  baseCost: number;
  costStep: number;
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  hull: { name: 'hullUpName', desc: 'hullUpDesc', maxRank: 5, baseCost: 15, costStep: 15 },
  shot: { name: 'shotUpName', desc: 'shotUpDesc', maxRank: 5, baseCost: 15, costStep: 15 },
  guns: { name: 'gunsUpName', desc: 'gunsUpDesc', maxRank: 3, baseCost: 30, costStep: 30 },
  crew: { name: 'crewUpName', desc: 'crewUpDesc', maxRank: 4, baseCost: 20, costStep: 15 },
  sails: { name: 'sailsUpName', desc: 'sailsUpDesc', maxRank: 3, baseCost: 20, costStep: 20 },
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
