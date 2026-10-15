// The best wave reached and the Admiralty's medals are kept; every run starts afresh at wave 1.
const KEY = 'broadside-best-wave';
const MEDALS_KEY = 'broadside-medals';

/** A stored count, or 0 for anything missing, hand-edited or broken. */
function load(key: string) {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function save(key: string, n: number) {
  try {
    localStorage.setItem(key, String(n));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}

export const loadBestWave = () => load(KEY);
export const saveBestWave = (wave: number) => save(KEY, wave);
export const loadMedals = () => load(MEDALS_KEY);
export const saveMedals = (medals: number) => save(MEDALS_KEY, medals);
