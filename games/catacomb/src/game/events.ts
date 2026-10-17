// Mystery rooms: a scene with two choices. What each choice does is in `chooseEvent` in sim.ts.

export type EventId = 'altar' | 'shrine' | 'chest' | 'pool';

import type { TextKey } from '../i18n';

export interface GameEvent {
  /** Its title, text and choices are keys of `i18n/en.ts`. */
  title: TextKey;
  text: TextKey;
  /** The two choices' captions, in order, with the number each one's `{n}` shows. */
  choices: [TextKey, TextKey];
  amounts: [number, number];
}

/** What blood the altar asks for a rare card. */
export const ALTAR_COST = 8;
/** What the shrine's offering bowl holds; taking it earns the idol's Doubt. */
export const SHRINE_GOLD = 45;
/** The curses the shrine's loot and the chained chest add to the deck. */
export const SHRINE_CURSE = 'doubt';
export const CHEST_CURSE = 'rust';
/** What drinking from the pool heals, and what bathing in it costs. */
export const POOL_HEAL = 15;
export const POOL_COST = 4;

export const EVENTS: Record<EventId, GameEvent> = {
  altar: {
    title: 'altarTitle',
    text: 'altarText',
    choices: ['altarBleed', 'altarWalk'],
    amounts: [ALTAR_COST, 0],
  },
  shrine: {
    title: 'shrineTitle',
    text: 'shrineText',
    choices: ['shrinePray', 'shrineLoot'],
    amounts: [0, SHRINE_GOLD],
  },
  chest: {
    title: 'chestTitle',
    text: 'chestText',
    choices: ['chestOpen', 'chestLeave'],
    amounts: [0, 0],
  },
  pool: {
    title: 'poolTitle',
    text: 'poolText',
    choices: ['poolDrink', 'poolBathe'],
    amounts: [POOL_HEAL, POOL_COST],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];
