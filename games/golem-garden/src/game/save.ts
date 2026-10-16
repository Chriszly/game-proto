// What outlives a garden: the most waves ever cleared, the Heartwood's bloom (kept from garden to
// garden), each garden's harvest stars and the garden last picked. The garden's golems and pests
// are never saved.
import { GARDENS } from './board';

const BEST = 'golem-garden-best';
const BLOOM = 'golem-garden-bloom';
const GARDEN = 'golem-garden-garden';
const STARS = 'golem-garden-stars';

function load(key: string) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function save(key: string, value: string | number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}

export const loadBest = () => load(BEST);
export const saveBest = (best: number) => save(BEST, best);
export const loadBloom = () => load(BLOOM);
export const saveBloom = (bloom: number) => save(BLOOM, bloom);
export const loadGarden = () => load(GARDEN);
export const saveGarden = (garden: number) => save(GARDEN, garden);

/** Each garden's harvest stars (0 to 3), one per garden in GARDENS order, stored comma-separated. */
export function loadStars(): number[] {
  let raw = '';
  try {
    raw = localStorage.getItem(STARS) ?? '';
  } catch {
    // Unsaved: every garden starts without stars.
  }
  const parts = raw.split(',').map((n) => Math.max(0, Math.min(3, Number(n) || 0)));
  return GARDENS.map((_, i) => parts[i] ?? 0);
}
export const saveStars = (stars: number[]) => save(STARS, stars.join(','));
