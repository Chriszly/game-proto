import { freshProgress, type Progress } from './state';
import { UPGRADES, type UpgradeId } from './upgrades';

// Only the hero's progress is saved: level, experience and upgrades. A run always starts at wave 1.
const KEY = 'palisade-progress';

export function loadProgress(): Progress {
  const fresh = freshProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<Progress>;
    return { ...fresh, ...saved, ranks: { ...saved.ranks } };
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

// The battle speed (1 or 2) is a setting, kept apart from the hero so "New hero" keeps it.
const SPEED_KEY = 'palisade-speed';

export function loadSpeed(): number {
  try {
    return localStorage.getItem(SPEED_KEY) === '2' ? 2 : 1;
  } catch {
    return 1;
  }
}

export function saveSpeed(speed: number) {
  try {
    localStorage.setItem(SPEED_KEY, String(speed));
  } catch {
    // Storage can be blocked; the speed then only lasts until a reload.
  }
}

// The skill book: every upgrade a level-up has offered at least once. Like the speed, it is kept
// apart from the hero, so "New hero" starts a new hero with the book still filled in.
const FOUND_KEY = 'palisade-skill-book';

export function loadFound(): UpgradeId[] {
  try {
    const saved = JSON.parse(localStorage.getItem(FOUND_KEY) ?? '[]') as unknown;
    return Array.isArray(saved) ? saved.filter((id): id is UpgradeId => id in UPGRADES) : [];
  } catch {
    return [];
  }
}

export function saveFound(found: UpgradeId[]) {
  try {
    localStorage.setItem(FOUND_KEY, JSON.stringify(found));
  } catch {
    // Storage can be blocked; the book then only lasts until a reload.
  }
}
