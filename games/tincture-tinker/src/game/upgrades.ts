import type { TextKey } from '../i18n';

// The workbench: lasting upgrades bought with coins between orders. They are saved with the progress.

export type UpgradeId = 'hands' | 'catalyst' | 'bloom';
/** The level of each upgrade, 0 for not bought. */
export type Upgrades = Record<UpgradeId, number>;

export interface Upgrade {
  /** Its name and what one level does, as keys of `i18n/en.ts`. */
  name: TextKey;
  what: TextKey;
  /** The price of each level, so `costs.length` is the top level. */
  costs: number[];
}

/** A move more on every order per level; Catalysts that clear their column too; a Bloom on every new board. */
export const UPGRADES: Record<UpgradeId, Upgrade> = {
  hands: { name: 'handsName', what: 'handsWhat', costs: [60, 100, 150] },
  catalyst: { name: 'catalystName', what: 'catalystWhat', costs: [120] },
  bloom: { name: 'bloomName', what: 'bloomWhat', costs: [90] },
};
export const UPGRADE_ORDER: UpgradeId[] = ['hands', 'catalyst', 'bloom'];

export const freshUpgrades = (): Upgrades => ({ hands: 0, catalyst: 0, bloom: 0 });

/** The price of the next level of `id`, or null when it is at the top. */
export const upgradeCost = (u: Upgrades, id: UpgradeId): number | null => UPGRADES[id].costs[u[id]] ?? null;

/** Buys the next level of `id` out of `coins`; false when it is at the top or can't be afforded. */
export function buyUpgrade(p: { coins: number; upgrades: Upgrades }, id: UpgradeId): boolean {
  const cost = upgradeCost(p.upgrades, id);
  if (cost === null || p.coins < cost) return false;
  p.coins -= cost;
  p.upgrades[id]++;
  return true;
}
