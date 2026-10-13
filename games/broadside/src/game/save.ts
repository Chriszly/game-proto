// Only the best wave reached is kept; every run starts afresh at wave 1.
const KEY = 'broadside-best-wave';

export function loadBestWave() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBestWave(wave: number) {
  try {
    localStorage.setItem(KEY, String(wave));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}
