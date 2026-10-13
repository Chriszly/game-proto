import { freshProgress, type Progress } from './state';

// Only the progress between orders is saved: which order is next, the coins and potions sold.
const KEY = 'tincture-tinker-progress';

export function loadProgress(): Progress {
  const fresh = freshProgress();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fresh, ...(JSON.parse(raw) as Partial<Progress>) } : fresh;
  } catch {
    return fresh;
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}
