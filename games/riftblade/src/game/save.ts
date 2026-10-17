/** Lasting progress, in local storage under a key prefixed with the game's name. */
import type { HeroId } from './heroes';

export const SAVE_KEY = 'riftblade-progress';

export interface Progress {
  /** The longest run survived, ms (a win counts its full time). */
  bestMs: number;
  /** Runs won (the Grinder Crawler beaten), by hero. */
  wins: Partial<Record<HeroId, number>>;
}

export function loadProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') ?? {};
    return {
      bestMs: typeof saved.bestMs === 'number' ? saved.bestMs : 0,
      wins: typeof saved.wins === 'object' && saved.wins ? saved.wins : {},
    };
  } catch {
    return { bestMs: 0, wins: {} };
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be blocked (private mode); progress then lasts until the page closes.
  }
}

/** Records a finished run and returns the updated progress. */
export function recordRun(hero: HeroId, ms: number, won: boolean): Progress {
  const progress = loadProgress();
  progress.bestMs = Math.max(progress.bestMs, ms);
  if (won) progress.wins[hero] = (progress.wins[hero] ?? 0) + 1;
  saveProgress(progress);
  return progress;
}
