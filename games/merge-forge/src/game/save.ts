import { freshProgress, type Progress } from './state';

// The board, the coins and the upgrades are saved; adventurers come afresh on every visit.
const KEY = 'merge-forge-progress';

export function loadProgress(): Progress {
  const fresh = freshProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<Progress>;
    return { ...fresh, ...saved, slots: Array.isArray(saved.slots) ? saved.slots : fresh.slots, ranks: { ...fresh.ranks, ...saved.ranks } };
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

export function clearProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
