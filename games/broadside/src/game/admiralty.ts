// The Admiralty's rewards between runs: medals earned by a run buy starting upgrades for the next.

import type { TextKey } from '../i18n';
import type { UpgradeId } from './upgrades';

export type BoonId = 'purse' | 'hull' | 'shot' | 'sails' | 'guns';

export interface Boon {
  /** Keys of `i18n/en.ts`. */
  name: TextKey;
  desc: TextKey;
  /** Medals it costs. */
  cost: number;
  /** Gold to start with. */
  gold?: number;
  /** An upgrade to start with, at rank 1. */
  rank?: UpgradeId;
}

export const BOONS: Record<BoonId, Boon> = {
  purse: { name: 'purseName', desc: 'purseDesc', cost: 2, gold: 40 },
  hull: { name: 'hullBoonName', desc: 'hullBoonDesc', cost: 3, rank: 'hull' },
  shot: { name: 'shotBoonName', desc: 'shotBoonDesc', cost: 3, rank: 'shot' },
  sails: { name: 'sailsBoonName', desc: 'sailsBoonDesc', cost: 3, rank: 'sails' },
  guns: { name: 'gunsBoonName', desc: 'gunsBoonDesc', cost: 5, rank: 'guns' },
};

export const BOON_IDS = Object.keys(BOONS) as BoonId[];

/** Medals a new best wave earns on top of one per wave beaten. */
export const BEST_BONUS = 2;

/** Medals a run earns: one per wave beaten, and `BEST_BONUS` more if it beat the best wave before it. */
export const medalsFor = (wavesBeaten: number, bestBefore: number) => wavesBeaten + (wavesBeaten > bestBefore ? BEST_BONUS : 0);

/** What a set of boons costs in medals. */
export const costOfBoons = (boons: BoonId[]) => boons.reduce((sum, id) => sum + BOONS[id].cost, 0);
