/** Lasting progress, in local storage under a key prefixed with the game's name. */
import { HEROES, HERO_IDS, type HeroId } from './heroes';

export const SAVE_KEY = 'riftblade-progress';

export interface Progress {
  /** The longest run survived, ms over every planet (a win counts its full time). */
  bestMs: number;
  /** Runs won (the Hollow Champion beaten on the Lava world), by hero. */
  wins: Partial<Record<HeroId, number>>;
  /** The furthest planet reached (1 to 4), by hero. Saves from before the star map have none. */
  furthest: Partial<Record<HeroId, number>>;
  /** Heroes whose deed is done. Saves from before the knights have none. */
  unlocked: HeroId[];
}

/** A saved count per hero, keeping only known heroes with a finite number. */
const perHero = (v: unknown): Partial<Record<HeroId, number>> => {
  const out: Partial<Record<HeroId, number>> = {};
  if (typeof v !== 'object' || !v) return out;
  for (const [id, n] of Object.entries(v)) {
    if (HERO_IDS.includes(id as HeroId) && typeof n === 'number' && Number.isFinite(n)) out[id as HeroId] = n;
  }
  return out;
};

export function loadProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') ?? {};
    return {
      bestMs: typeof saved.bestMs === 'number' ? saved.bestMs : 0,
      wins: perHero(saved.wins),
      furthest: perHero(saved.furthest),
      unlocked: Array.isArray(saved.unlocked) ? saved.unlocked.filter((id: unknown) => HERO_IDS.includes(id as HeroId)) : [],
    };
  } catch {
    return { bestMs: 0, wins: {}, furthest: {}, unlocked: [] };
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

/** Records heroes unlocked by deeds done in a run and returns the updated progress. */
export function recordUnlocks(ids: readonly HeroId[]): Progress {
  const progress = loadProgress();
  for (const id of ids) if (!progress.unlocked.includes(id)) progress.unlocked.push(id);
  saveProgress(progress);
  return progress;
}

/**
 * Whether a hero can be picked: Legionary TR-9 always, every other hero once its deed is done. A
 * hero an older save shows as played (a world reached) stays open, and so do the deeds of reaching
 * a world, counted from the furthest world saved before the knights came.
 */
export function isUnlocked(progress: Progress, id: HeroId) {
  if (!HEROES[id].locked || progress.unlocked.includes(id) || (progress.furthest[id] ?? 0) > 0) return true;
  const furthest = Math.max(0, ...Object.values(progress.furthest).map((n) => n ?? 0));
  const reach: Partial<Record<HeroId, number>> = { kael: 2, veyl: 3, joren: 4 };
  return reach[id] !== undefined && furthest >= reach[id]!;
}

/** The heroes open to pick. */
export const unlockedHeroes = (progress: Progress) => HERO_IDS.filter((id) => isUnlocked(progress, id));
