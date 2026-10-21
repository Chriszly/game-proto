// The best wave reached, the Admiralty's medals and the ship last chosen are kept; every run
// starts afresh at wave 1.
import { FIRST_HULL, HULLS, type HullId } from './hulls';

const KEY = 'broadside-best-wave';
const MEDALS_KEY = 'broadside-medals';
const HULL_KEY = 'broadside-ship';

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

/** The ship chosen last, or the Frigate for anything missing or unknown. */
export function loadHull(): HullId {
  try {
    const id = localStorage.getItem(HULL_KEY);
    // Own keys only: `in` would also accept 'constructor' or 'toString' from Object.prototype.
    return id !== null && Object.hasOwn(HULLS, id) ? (id as HullId) : FIRST_HULL;
  } catch {
    return FIRST_HULL;
  }
}
export function saveHull(id: HullId) {
  try {
    localStorage.setItem(HULL_KEY, id);
  } catch {
    // Unsaved, as above.
  }
}
