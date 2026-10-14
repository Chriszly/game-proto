// What outlives a garden: the most waves ever cleared, the Heartwood's bloom (kept from garden to
// garden) and the garden last picked. The garden's golems and pests are never saved.
const BEST = 'golem-garden-best';
const BLOOM = 'golem-garden-bloom';
const GARDEN = 'golem-garden-garden';

function load(key: string) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function save(key: string, value: number) {
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
