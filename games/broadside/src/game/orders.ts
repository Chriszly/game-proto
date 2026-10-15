// The captain's orders: one bonus for a whole wave, named on a card under the top bar.

import type { ShotKind } from './shot';

export type OrderId = 'chain' | 'grape' | 'powder' | 'wind' | 'crew';

export interface Order {
  title: string;
  desc: string;
  /** Multipliers on the player's stats while the order stands. */
  damage?: number;
  range?: number;
  reload?: number;
  sails?: number;
  /** Loads both sides with this shot for the wave, whatever was loaded at the harbor. */
  load?: ShotKind;
  /** Double powder: round shot shows a powder flash. */
  powder?: boolean;
}

export const ORDERS: Record<OrderId, Order> = {
  chain: { title: 'Chain shot this wave', desc: 'Both sides fire chain: hits slow ships by 40%', load: 'chain' },
  grape: { title: 'Grapeshot this wave', desc: 'Both sides fire grape: hits slow reloads', load: 'grape' },
  powder: { title: 'Double powder this wave', desc: 'Shot flies 30% farther and hits 30% harder', range: 1.3, damage: 1.3, powder: true },
  wind: { title: 'Fair wind this wave', desc: 'Sail and turn 25% faster', sails: 1.25 },
  crew: { title: 'Rum for the gun crews', desc: 'Reload 30% faster', reload: 0.7 },
};

export const ORDER_IDS = Object.keys(ORDERS) as OrderId[];

/** A new order for the next wave, never the same as the last one. Uses Math.random once. */
export function drawOrder(last: OrderId): OrderId {
  const choices = ORDER_IDS.filter((id) => id !== last);
  return choices[Math.floor(Math.random() * choices.length)];
}
