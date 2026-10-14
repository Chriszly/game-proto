// Only the most nights kept is saved; every game starts at the first dusk.
const KEY = 'lanternkeep-best';

export function loadBest() {
  try {
    const best = Math.floor(Number(localStorage.getItem(KEY)));
    return Number.isFinite(best) && best > 0 ? best : 0;
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
