// Mystery rooms: a scene with two choices. What each choice does is in `chooseEvent` in sim.ts.

export type EventId = 'altar' | 'shrine' | 'chest' | 'pool';

export interface GameEvent {
  title: string;
  text: string;
  /** The two choices' captions, in order. */
  choices: [string, string];
}

/** What blood the altar asks for a rare card. */
export const ALTAR_COST = 8;
/** What the shrine's offering bowl holds, and what taking it costs in health. */
export const SHRINE_GOLD = 45;
export const SHRINE_COST = 6;
/** The cursed chest's cost in maximum health. */
export const CHEST_COST = 6;
/** What drinking from the pool heals, and what bathing in it costs. */
export const POOL_HEAL = 15;
export const POOL_COST = 4;

export const EVENTS: Record<EventId, GameEvent> = {
  altar: {
    title: 'A bloodstained altar',
    text: 'Old runes promise a gift to whoever feeds the stone.',
    choices: [`Bleed (-${ALTAR_COST} health, a rare card)`, 'Walk on'],
  },
  shrine: {
    title: 'A forgotten shrine',
    text: 'A cracked idol watches over a bowl of coins.',
    choices: ['Pray (temper 2 random cards)', `Loot (+${SHRINE_GOLD} gold, -${SHRINE_COST} health)`],
  },
  chest: {
    title: 'A chained chest',
    text: 'Cold seeps from the lock. Something valuable rattles inside.',
    choices: [`Open (-${CHEST_COST} max health, a relic)`, 'Leave it'],
  },
  pool: {
    title: 'A still black pool',
    text: 'The water is cold and strangely clear.',
    choices: [`Drink (heal ${POOL_HEAL})`, `Bathe (-${POOL_COST} health, temper a random card)`],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];
