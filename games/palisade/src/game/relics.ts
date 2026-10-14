// Relics: the lasting rewards of the relic chest that waits at the end of every road, after each
// boss. A relic is kept from run to run like the hero's level, and a second copy of one stacks.
// Its effect is worked out in `stats` (state.ts).

export type RelicId = 'oakheart' | 'feather' | 'quiver' | 'crown' | 'drum' | 'banner';

export interface Relic {
  name: string;
  /** What one copy does. */
  text: string;
}

export const RELICS: Record<RelicId, Relic> = {
  oakheart: { name: 'Oakheart Charm', text: 'The barricade has 30% more health' },
  feather: { name: 'Hawk Feather', text: 'Arrows deal 15% more damage' },
  quiver: { name: 'Endless Quiver', text: 'Arrow Rain charges with 20% fewer kills' },
  crown: { name: "Troll King's Crown", text: 'Gain 15% more experience' },
  drum: { name: 'War Drum', text: 'Shoot 10% faster' },
  banner: { name: 'Streak Banner', text: 'A kill streak lasts 1s longer' },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];
