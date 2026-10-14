// The best final score and the crowns won from decrees are saved; every game starts on a fresh island.
const BEST_KEY = 'tiny-kingdom-best';
const CROWNS_KEY = 'tiny-kingdom-crowns';

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

export const loadBest = () => load(BEST_KEY);
export const saveBest = (best: number) => save(BEST_KEY, best);
export const loadCrowns = () => load(CROWNS_KEY);
export const saveCrowns = (crowns: number) => save(CROWNS_KEY, crowns);
