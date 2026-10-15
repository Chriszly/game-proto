// The road choice: after each boss the hero picks the next road of ten waves from two, each with a
// twist that makes it harder in one way and pays better in another. The first road has none.

export type RoadId = 'hardened' | 'crowded' | 'golden';

export interface Road {
  name: string;
  /** The catch. */
  harder: string;
  /** The reward. */
  better: string;
}

export const ROADS: Record<RoadId, Road> = {
  hardened: { name: 'Hardened Road', harder: 'Foes have 30% more health', better: 'Its relic chest holds two relics' },
  crowded: { name: 'Crowded Road', harder: '40% more foes in every wave', better: 'Foes give 30% more experience' },
  golden: { name: 'Golden Road', harder: 'Foes walk 15% faster', better: 'Foes drop twice the coins' },
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
