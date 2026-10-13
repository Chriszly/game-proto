// Only the most waves ever cleared is saved; every garden starts fresh.
const KEY = 'golem-garden-best';

export function loadBest() {
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
