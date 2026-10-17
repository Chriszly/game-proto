// Tired meadows: once the bees have a second kind to go for, a meadow foraged without a break
// tires, and one foraged for `TIRE_MS` in a row wilts until the season turns, giving half the
// nectar a trip. A meadow no bee is out on rests twice as fast as it tires, so rotating pays.

import type { Kind } from './honey';

/** How long a meadow can be foraged without a break before it wilts, and how much faster it rests. */
export const TIRE_MS = 60_000;
export const REST_RATE = 2;

/** Where each kind's nectar grows, for the messages. */
export const MEADOW_OF: Record<Kind, string> = { clover: 'The clover', lavender: 'The Lavender Field', heather: 'The Heather Moor' };

/** No meadow tired or wilted. */
export const rested = (): Record<Kind, number> => ({ clover: 0, lavender: 0, heather: 0 });
export const unwilted = (): Record<Kind, boolean> => ({ clover: false, lavender: false, heather: false });
