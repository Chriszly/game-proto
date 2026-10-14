import { freshProgress, type Progress } from './state';

// Only the progress between orders is saved: which order is next, the coins, potions sold and stars.
const KEY = 'tincture-tinker-progress';

export function loadProgress(): Progress {
  const fresh = freshProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const saved: Progress = { ...fresh, ...(JSON.parse(raw) as Partial<Progress>) };
    // A save edited by hand or from a broken build falls back to the defaults field by field.
    const ok = (n: unknown, min: number) => typeof n === 'number' && Number.isFinite(n) && n >= min;
    if (!ok(saved.order, 1) || !Number.isInteger(saved.order)) saved.order = fresh.order;
    if (!ok(saved.coins, 0)) saved.coins = fresh.coins;
    if (!ok(saved.sold, 0)) saved.sold = fresh.sold;
    if (!ok(saved.stars, 0) || !Number.isInteger(saved.stars)) saved.stars = fresh.stars;
    return saved;
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
