/** Lasting progress, in local storage under a key prefixed with the game's name. */
import type { HeroId } from './heroes';

export const SAVE_KEY = 'riftblade-progress';

export interface Progress {
  /** The longest run survived, ms over every planet (a win counts its full time). */
  bestMs: number;
  /** Runs won (the Hollow Champion beaten on the Lava world), by hero. */
  wins: Partial<Record<HeroId, number>>;
  /** The furthest planet reached (1 to 4), by hero. Saves from before the star map have none. */
  furthest: Partial<Record<HeroId, number>>;
}

const object = (v: unknown) => (typeof v === 'object' && v ? v : {});

export function loadProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') ?? {};
    return {
      bestMs: typeof saved.bestMs === 'number' ? saved.bestMs : 0,
      wins: object(saved.wins),
      furthest: object(saved.furthest),
    };
  } catch {
    return { bestMs: 0, wins: {}, furthest: {} };
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be blocked (private mode); progress then lasts until the page closes.
  }
}

/** Records a finished run (`planet` is the one reached, 1 to 4) and returns the updated progress. */
export function recordRun(hero: HeroId, ms: number, won: boolean, planet: number): Progress {
  const progress = loadProgress();
  progress.bestMs = Math.max(progress.bestMs, ms);
  if (won) progress.wins[hero] = (progress.wins[hero] ?? 0) + 1;
  progress.furthest[hero] = Math.max(progress.furthest[hero] ?? 0, planet);
  saveProgress(progress);
  return progress;
}
