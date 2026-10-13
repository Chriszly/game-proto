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

export const randomKind = (): Kind => KINDS[Math.floor(Math.random() * KINDS.length)];
