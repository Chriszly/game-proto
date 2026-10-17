// Relics: the lasting rewards of the relic chest that waits at the end of every road, after each
// boss. A relic is kept from run to run like the hero's level, and a second copy of one stacks.
// Each relic belongs to a set of two; holding both relics of a set adds the set's bonus once.
// Their effects are worked out in `stats` (state.ts). Names and texts are keys of `i18n/en.ts`.

import type { TextKey } from '../i18n';

export type RelicId = 'oakheart' | 'feather' | 'quiver' | 'crown' | 'drum' | 'banner';
export type SetId = 'hunter' | 'warlord' | 'warden';

export interface Relic {
  name: TextKey;
  /** What one copy does. */
  text: TextKey;
  /** The set it belongs to. */
  set: SetId;
}

export const RELICS: Record<RelicId, Relic> = {
  oakheart: { name: 'oakheartName', text: 'oakheartText', set: 'warden' },
  feather: { name: 'featherName', text: 'featherText', set: 'hunter' },
  quiver: { name: 'quiverName', text: 'quiverText', set: 'hunter' },
  crown: { name: 'crownName', text: 'crownText', set: 'warlord' },
  drum: { name: 'drumName', text: 'drumText', set: 'warlord' },
  banner: { name: 'bannerName', text: 'bannerText', set: 'warden' },
};

export const RELIC_IDS = Object.keys(RELICS) as RelicId[];

export interface RelicSet {
  name: TextKey;
  /** The bonus for holding every relic of the set. */
  text: TextKey;
}

export const SETS: Record<SetId, RelicSet> = {
  hunter: { name: 'hunterSetName', text: 'hunterSetText' },
  warlord: { name: 'warlordSetName', text: 'warlordSetText' },
  warden: { name: 'wardenSetName', text: 'wardenSetText' },
};

export const SET_IDS = Object.keys(SETS) as SetId[];

/** The relics that make up a set. */
export const setRelics = (set: SetId) => RELIC_IDS.filter((id) => RELICS[id].set === set);

/** Whether every relic of the set is held. */
export const setComplete = (relics: Partial<Record<RelicId, number>>, set: SetId) => setRelics(set).every((id) => (relics[id] ?? 0) > 0);
