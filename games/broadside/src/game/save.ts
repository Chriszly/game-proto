// Only the best wave reached is kept; every run starts afresh at wave 1.
const KEY = 'broadside-best-wave';

export function loadBestWave() {
  try {
    const wave = Number(localStorage.getItem(KEY));
    // A hand-edited or broken value starts over at 0 rather than showing nonsense.
    return Number.isFinite(wave) && wave > 0 ? Math.floor(wave) : 0;
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
