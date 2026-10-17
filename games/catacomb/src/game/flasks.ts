// Flasks: one-use potions in three slots, drunk on the hero's turn for no energy. Elites and bosses
// leave one behind, the merchant sells them, and each hero sets out with one.

export type FlaskId = 'heal' | 'energy' | 'poison' | 'block' | 'draw';

import type { TextKey } from '../i18n';

export interface Flask {
  /** Its name and rules, keys of `i18n/en.ts`; the rules take the flask's number as `{n}`. */
  name: TextKey;
  text: TextKey;
  n: number;
}

export const FLASK_SLOTS = 3;
export const FLASK_PRICE = 25;
export const FLASK_HEAL = 12;
export const FLASK_ENERGY = 2;
export const FLASK_POISON = 4;
export const FLASK_BLOCK = 10;
export const FLASK_DRAW = 3;

export const FLASKS: Record<FlaskId, Flask> = {
  heal: { name: 'healFlask', text: 'healFlaskText', n: FLASK_HEAL },
  energy: { name: 'energyFlask', text: 'energyFlaskText', n: FLASK_ENERGY },
  poison: { name: 'poisonFlask', text: 'poisonFlaskText', n: FLASK_POISON },
  block: { name: 'blockFlask', text: 'blockFlaskText', n: FLASK_BLOCK },
  draw: { name: 'drawFlask', text: 'drawFlaskText', n: FLASK_DRAW },
};

export const FLASK_IDS = Object.keys(FLASKS) as FlaskId[];
