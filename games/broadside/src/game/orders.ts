// The captain's orders: one bonus for a whole wave, named on a card under the top bar.

export type OrderId = 'chain' | 'grape' | 'powder' | 'wind' | 'crew';

export interface Order {
  title: string;
  desc: string;
  /** Multipliers on the player's stats while the order stands. */
  damage?: number;
  range?: number;
  reload?: number;
  sails?: number;
  /** Chain shot: a hit slows the ship struck to this share of its speed for `SLOW_MS`. */
  slow?: number;
  /** Grapeshot: each gun fires this many smaller shots in a fan, each hitting for `pellet` of a ball. */
  pellets?: number;
  pellet?: number;
  /** How the player's shot looks while the order stands. */
  shot: 'round' | 'chain' | 'grape' | 'powder';
}

/** How long a chain shot hit slows a ship. */
export const SLOW_MS = 4000;
/** The angle between two pellets of a grapeshot fan, in radians. */
export const PELLET_FAN = 0.09;

export const ORDERS: Record<OrderId, Order> = {
  chain: { title: 'Chain shot this wave', desc: 'Hits slow ships by 40%', slow: 0.6, shot: 'chain' },
  grape: { title: 'Grapeshot this wave', desc: 'Three shots a gun, half as hard each', pellets: 3, pellet: 0.5, shot: 'grape' },
  powder: { title: 'Double powder this wave', desc: 'Shot flies 30% farther and hits 30% harder', range: 1.3, damage: 1.3, shot: 'powder' },
  wind: { title: 'Fair wind this wave', desc: 'Sail and turn 25% faster', sails: 1.25, shot: 'round' },
  crew: { title: 'Rum for the gun crews', desc: 'Reload 30% faster', reload: 0.7, shot: 'round' },
};

export const ORDER_IDS = Object.keys(ORDERS) as OrderId[];

/** A new order for the next wave, never the same as the last one. Uses Math.random once. */
export function drawOrder(last: OrderId): OrderId {
  const choices = ORDER_IDS.filter((id) => id !== last);
  return choices[Math.floor(Math.random() * choices.length)];
}
