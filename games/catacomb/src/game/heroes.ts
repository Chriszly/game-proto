import { HUNTER_DECK, STARTER_DECK, type CardId } from './cards';
import type { FlaskId } from './flasks';

// The heroes to pick from before the first room. The Knight is the game as it was; the Hunter has
// less health and a deck built on poison and dodging.

export type HeroId = 'knight' | 'hunter';

export interface Hero {
  name: string;
  hp: number;
  deck: CardId[];
  /** The flask the hero sets out with. */
  flask: FlaskId;
  text: string;
}

export const HEROES: Record<HeroId, Hero> = {
  knight: { name: 'Knight', hp: 50, deck: STARTER_DECK, flask: 'block', text: 'sword and shield, 50 health' },
  hunter: { name: 'Hunter', hp: 40, deck: HUNTER_DECK, flask: 'poison', text: 'venom knives and dodges, 40 health' },
};

export const HERO_IDS = Object.keys(HEROES) as HeroId[];
