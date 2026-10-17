// Only the most nights kept and the best peril multiplier are saved; every game starts at the first dusk.
const KEY = 'lanternkeep-best';
const PERIL_KEY = 'lanternkeep-best-peril';

function load(key: string, floor: number) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > floor ? value : floor;
  } catch {
    return floor;
  }
}

function save(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}

export const loadBest = () => Math.floor(load(KEY, 0));
export const saveBest = (best: number) => save(KEY, best);
/** The best pay multiplier reached with curses taken after the Festival (1 when none). */
export const loadBestPeril = () => load(PERIL_KEY, 1);
export const saveBestPeril = (mult: number) => save(PERIL_KEY, mult);
