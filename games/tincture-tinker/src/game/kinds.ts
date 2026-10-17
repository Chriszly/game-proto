import type { TextKey } from '../i18n';

// The ingredients on the board. Matching three or more of a kind gathers them for the order.

export const KINDS = ['wheat', 'mandrake', 'sage', 'ember', 'moonpetal'] as const;
export type Kind = (typeof KINDS)[number];

/** Each ingredient's name, and a count of it in a sentence, as keys of `i18n/en.ts`. */
export const KIND_NAMES: Record<Kind, TextKey> = {
  wheat: 'wheatName',
  mandrake: 'mandrakeName',
  sage: 'sageName',
  ember: 'emberName',
  moonpetal: 'moonpetalName',
};
export const KIND_COUNTS: Record<Kind, TextKey> = {
  wheat: 'wheatCount',
  mandrake: 'mandrakeCount',
  sage: 'sageCount',
  ember: 'emberCount',
  moonpetal: 'moonpetalCount',
};

/** A random ingredient, from `rand` (Math.random unless a guild examination's fixed board is being laid). */
export const randomKind = (rand: () => number = Math.random): Kind => KINDS[Math.floor(rand() * KINDS.length)];
