// Only the best distance is kept between runs; every run starts fresh with no boons.
const KEY = 'rogue-runner-best';

export function loadBest(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(best: number) {
  try {
    localStorage.setItem(KEY, String(best));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}
