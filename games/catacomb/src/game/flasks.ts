// Flasks: one-use potions in three slots, drunk on the hero's turn for no energy. Elites and bosses
// leave one behind, the merchant sells them, and each hero sets out with one.

export type FlaskId = 'heal' | 'energy' | 'poison' | 'block' | 'draw';

export interface Flask {
  name: string;
  text: string;
}

export const FLASK_SLOTS = 3;
export const FLASK_PRICE = 25;
export const FLASK_HEAL = 12;
export const FLASK_ENERGY = 2;
export const FLASK_POISON = 4;
export const FLASK_BLOCK = 10;
export const FLASK_DRAW = 3;

export const FLASKS: Record<FlaskId, Flask> = {
  heal: { name: 'Healing Flask', text: `Heal ${FLASK_HEAL}.` },
  energy: { name: 'Quicksilver Flask', text: `Gain ${FLASK_ENERGY} energy.` },
  poison: { name: 'Venom Flask', text: `Apply ${FLASK_POISON} Poison to every foe.` },
  block: { name: 'Stoneskin Flask', text: `Gain ${FLASK_BLOCK} block.` },
  draw: { name: 'Foresight Flask', text: `Draw ${FLASK_DRAW} cards.` },
};

export const FLASK_IDS = Object.keys(FLASKS) as FlaskId[];
