import { BOON_IDS, type BoonId } from './boons';

// Progress kept between runs, in the browser's local storage: the best distance, the coins banked
// and the boon bought for the next run. Every key is prefixed with the game's name, since every game
// shares the hub's origin. Storage can be blocked or full, so every access is wrapped.

const BEST = 'hotfoot-best';
const BANK = 'hotfoot-bank';
const PENDING = 'hotfoot-start';

export interface Progress {
  best: number;
  bank: number;
  pending: BoonId | null;
}

export function loadProgress(): Progress {
  const read = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const pending = read(PENDING);
  return {
    best: Number(read(BEST)) || 0,
    bank: Number(read(BANK)) || 0,
    pending: BOON_IDS.find((id) => id === pending) ?? null,
  };
}

export function saveProgress({ best, bank, pending }: Progress) {
  try {
    localStorage.setItem(BEST, String(best));
    localStorage.setItem(BANK, String(bank));
    if (pending) localStorage.setItem(PENDING, pending);
    else localStorage.removeItem(PENDING);
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}
