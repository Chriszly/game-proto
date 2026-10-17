import type { TextKey } from '../i18n';
import type { PotionId } from './orders';

// Stars and the tinker's rank. Every sold order earns one to three stars by the moves left, and the
// stars add up to a rank; each rank after the first unlocks a new recipe for the round of orders.

/** Moves left for three stars, and for two; any sale earns at least one. */
export const STARS_3 = 8;
export const STARS_2 = 4;

export const starsFor = (movesLeft: number) => (movesLeft >= STARS_3 ? 3 : movesLeft >= STARS_2 ? 2 : 1);

export interface Rank {
  /** Its key in `i18n/en.ts`. */
  title: TextKey;
  /** Total stars needed. */
  stars: number;
  /** The recipe it unlocks. */
  recipe?: PotionId;
}

export const RANKS: Rank[] = [
  { title: 'apprentice', stars: 0 },
  { title: 'journeyman', stars: 5, recipe: 'amberCordial' },
  { title: 'master', stars: 12, recipe: 'starlightElixir' },
  { title: 'grandMaster', stars: 24, recipe: 'philosophersDraught' },
];

/** The index in `RANKS` of the rank `stars` earns. */
export const rankOf = (stars: number) => RANKS.reduce((at, r, i) => (stars >= r.stars ? i : at), 0);

/** The recipes unlocked with `stars`, in the order they were earned. */
export const unlockedRecipes = (stars: number): PotionId[] =>
  RANKS.slice(1, rankOf(stars) + 1).flatMap((r) => (r.recipe ? [r.recipe] : []));
