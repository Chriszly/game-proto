// Elite foes: from wave 4 some foes come on with a trait, more health and better rewards, so a
// build around one effect has to adapt. Bosses never carry one.

export type Trait = 'splitting' | 'enraged' | 'warded';

export interface TraitType {
  name: string;
  text: string;
  /** The colour of its badge over the foe, and for the text. */
  color: number;
  css: string;
}

export const TRAITS: Record<Trait, TraitType> = {
  splitting: { name: 'Splitting', text: 'Splits into two goblins when it falls', color: 0x7ccf5a, css: '#8fdc6a' },
  enraged: { name: 'Enraged', text: 'Walks and hits 60% faster below half health', color: 0xf06a3a, css: '#ff9b6a' },
  warded: { name: 'Warded', text: 'Immune to burning and chill', color: 0xb08af0, css: '#d0b8ff' },
};

export const TRAIT_IDS = Object.keys(TRAITS) as Trait[];

/** Elites come on from this wave. */
export const ELITE_FROM_WAVE = 4;
/** The share of a wave's foes (not the first orc, not bosses) that are elite: more every wave, up to a third. */
export const eliteChance = (wave: number) => (wave < ELITE_FROM_WAVE ? 0 : Math.min(0.34, 0.1 + 0.015 * (wave - ELITE_FROM_WAVE)));
/** An elite has this many times the health, experience and coins of its kind. */
export const ELITE_HP = 1.5;
export const ELITE_XP = 2;
export const ELITE_COINS = 2;
/** Enraged: how many times faster it walks and hits below half health. */
export const ENRAGE_PACE = 1.6;
/** Splitting: how many goblins it splits into, each with this share of a goblin's health. */
export const SPLIT_INTO = 2;
export const SPLIT_HP = 0.6;
