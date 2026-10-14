// Only the most nights kept is saved; every game starts at the first dusk.
const KEY = 'lanternkeep-best';

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
