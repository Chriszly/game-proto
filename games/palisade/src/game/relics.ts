// Relics: the lasting rewards of the relic chest that waits at the end of every road, after each
// boss. A relic is kept from run to run like the hero's level, and a second copy of one stacks.
// Each relic belongs to a set of two; holding both relics of a set adds the set's bonus once.
// Their effects are worked out in `stats` (state.ts).

export type RelicId = 'oakheart' | 'feather' | 'quiver' | 'crown' | 'drum' | 'banner';
export type SetId = 'hunter' | 'warlord' | 'warden';

export interface Relic {
  name: string;
  /** What one copy does. */
  text: string;
  /** The set it belongs to. */
  set: SetId;
}

export const RELICS: Record<RelicId, Relic> = {
  oakheart: { name: 'Oakheart Charm', text: 'The barricade has 30% more health', set: 'warden' },
  feather: { name: 'Hawk Feather', text: 'Arrows deal 15% more damage', set: 'hunter' },
  quiver: { name: 'Endless Quiver', text: 'Arrow Rain charges with 20% fewer kills', set: 'hunter' },
  crown: { name: "Troll King's Crown", text: 'Gain 15% more experience', set: 'warlord' },
  drum: { name: 'War Drum', text: 'Shoot 10% faster', set: 'warlord' },
  banner: { name: 'Streak Banner', text: 'A kill streak lasts 1s longer', set: 'warden' },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

export interface RelicSet {
  name: string;
  /** The bonus for holding every relic of the set. */
  text: string;
}

export const SETS: Record<SetId, RelicSet> = {
  hunter: { name: "Hunter's set", text: 'Arrow Rain hits 50% harder' },
  warlord: { name: "Warlord's set", text: '10% more chance of a double-damage hit' },
  warden: { name: "Warden's set", text: 'The barricade mends 20% after each wave, not 10%' },
};

export const SET_IDS = Object.keys(SETS) as SetId[];

/** The relics that make up a set. */
export const setRelics = (set: SetId) => RELIC_IDS.filter((id) => RELICS[id].set === set);

/** Whether every relic of the set is held. */
export const setComplete = (relics: Partial<Record<RelicId, number>>, set: SetId) => setRelics(set).every((id) => (relics[id] ?? 0) > 0);
