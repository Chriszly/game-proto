import { HUNTER_DECK, STARTER_DECK, type CardId } from './cards';
import type { FlaskId } from './flasks';
import type { TextKey } from '../i18n';

// The heroes to pick from before the first room. The Knight is the game as it was; the Hunter has
// less health and a deck built on poison and dodging.

export type HeroId = 'knight' | 'hunter';

export interface Hero {
  /** Its name and caption, keys of `i18n/en.ts`; the caption takes the hero's `{hp}`. */
  name: TextKey;
  hp: number;
  deck: CardId[];
  /** The flask the hero sets out with. */
  flask: FlaskId;
  text: TextKey;
}

export const HEROES: Record<HeroId, Hero> = {
  knight: { name: 'knightName', hp: 50, deck: STARTER_DECK, flask: 'block', text: 'knightText' },
  hunter: { name: 'hunterName', hp: 40, deck: HUNTER_DECK, flask: 'poison', text: 'hunterText' },
};

export const HERO_IDS = Object.keys(HEROES) as HeroId[];
