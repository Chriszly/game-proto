// Mead casks: a cask takes three jars of one kind and ages them into mead, which sells for well
// over the three jars' price (heather most). Cash now, or more later; and the bees never eat mead
// in winter.

import type { Kind } from './honey';

/** Jars a cask takes, how many casks the cellar holds, and how long a cask ages. */
export const CASK_JARS = 3;
export const MAX_CASKS = 3;
export const CASK_MS = 90_000;
/** What mead sells for, as a multiple of what its three jars would have sold for when they were casked. */
export const MEAD_MULT: Record<Kind, number> = { clover: 1.5, lavender: 1.6, heather: 1.8 };

export interface Cask {
  kind: Kind;
  /** Time left until the mead is ready; 0 once it is. */
  agingMs: number;
  /** What the mead sells for, fixed when the jars went in. */
  value: number;
}
