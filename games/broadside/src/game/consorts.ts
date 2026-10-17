// Consorts: a prize kept at the harbor instead of sold. She sails into the next waves with her
// prize crew and draws a wage at every harbor.

import { ENEMIES, type EnemyKind } from './ships';

/** The most consorts the player can keep at once. */
export const CONSORT_MAX = 2;
/** What a consort of `kind` draws at each harbor: half the loot she was worth on wave 1. */
export const consortWage = (kind: EnemyKind) => Math.ceil(ENEMIES[kind].loot / 2);
