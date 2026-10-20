import type { KindId } from './kinds';

/** The modes, in the order the menu deals them as cards. */
export const MODES = ['endless', 'daily', 'blitz', 'draft', 'duel', 'practice'] as const;
export type Mode = (typeof MODES)[number];

/** The relics a draft run offers after every few puzzles, three at a time; each can be taken again. */
export const RELICS = ['lantern', 'heartstone', 'hourglass', 'crystal'] as const;
export type RelicId = (typeof RELICS)[number];

/** Each kind's colour on its card and icon. */
export const KIND_COLOR: Record<KindId, number> = {
  nonogram: 0x9be7ff,
  bridges: 0xf2cf73,
  code: 0xff8fc7,
  calc: 0xb9a4ff,
  sums: 0x8fe3b0,
  unjam: 0xffb36b,
  flip: 0x7fb8ff,
  link: 0xe6a4ff,
  echo: 0xfff0a8,
};

export const RELIC_COLOR: Record<RelicId, number> = {
  lantern: 0xf2cf73,
  heartstone: 0xff8fc7,
  hourglass: 0x9be7ff,
  crystal: 0xb9a4ff,
};
