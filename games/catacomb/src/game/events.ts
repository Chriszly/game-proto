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
    title: 'A bloodstained altar',
    text: 'Old runes promise a gift to whoever feeds the stone.',
    choices: [`Bleed (-${ALTAR_COST} health, a rare card)`, 'Walk on'],
  },
  shrine: {
    title: 'A forgotten shrine',
    text: 'A cracked idol watches over a bowl of coins.',
    choices: ['Pray (temper 2 random cards)', `Loot (+${SHRINE_GOLD} gold, a Doubt curse)`],
  },
  chest: {
    title: 'A chained chest',
    text: 'Cold seeps from the lock. Something valuable rattles inside.',
    choices: ['Open (a relic, a Rust curse)', 'Leave it'],
  },
  pool: {
    title: 'A still black pool',
    text: 'The water is cold and strangely clear.',
    choices: [`Drink (heal ${POOL_HEAL})`, `Bathe (-${POOL_COST} health, temper a random card)`],
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];
