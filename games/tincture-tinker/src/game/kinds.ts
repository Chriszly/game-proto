// The ingredients on the board. Matching three or more of a kind gathers them for the order.

export const KINDS = ['wheat', 'mandrake', 'sage', 'ember', 'moonpetal'] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_NAMES: Record<Kind, string> = {
  wheat: 'Wheat',
  mandrake: 'Mandrake',
  sage: 'Sage',
  ember: 'Ember Salt',
  moonpetal: 'Moonpetal',
};

/** A random ingredient, from `rand` (Math.random unless a guild examination's fixed board is being laid). */
export const randomKind = (rand: () => number = Math.random): Kind => KINDS[Math.floor(rand() * KINDS.length)];
