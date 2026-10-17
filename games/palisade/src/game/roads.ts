// The road choice: after each boss the hero picks the next road of ten waves from two, each with a
// twist that makes it harder in one way and pays better in another. The first road has none.

import type { TextKey } from '../i18n';

export type RoadId = 'hardened' | 'crowded' | 'golden';

export interface Road {
  /** Name, catch and reward, keys of `i18n/en.ts`. */
  name: TextKey;
  /** The catch. */
  harder: TextKey;
  /** The reward. */
  better: TextKey;
}

export const ROADS: Record<RoadId, Road> = {
  hardened: { name: 'hardenedName', harder: 'hardenedHarder', better: 'hardenedBetter' },
  crowded: { name: 'crowdedName', harder: 'crowdedHarder', better: 'crowdedBetter' },
  golden: { name: 'goldenName', harder: 'goldenHarder', better: 'goldenBetter' },
};

export const ROAD_IDS = Object.keys(ROADS) as RoadId[];

/** What the road the hero is on changes; the first road (null) changes nothing. */
export function roadEffects(road: RoadId | null) {
  return {
    hp: road === 'hardened' ? 1.3 : 1,
    relics: road === 'hardened' ? 2 : 1,
    foes: road === 'crowded' ? 1.4 : 1,
    xp: road === 'crowded' ? 1.3 : 1,
    speed: road === 'golden' ? 1.15 : 1,
    coins: road === 'golden' ? 2 : 1,
  };
}
