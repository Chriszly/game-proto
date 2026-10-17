import { DIFFICULTIES, type Difficulty } from '../../../../shared/settings';
import { MEDALS, type Medal } from './state';

// The best festival medal won on each difficulty (WR14), kept in the browser between games.

export const MEDALS_KEY = 'wyrmrail-medals';

/** The best medal won on each difficulty so far. */
export function loadMedals(): Partial<Record<Difficulty, Medal>> {
  try {
    const saved = JSON.parse(localStorage.getItem(MEDALS_KEY) ?? '{}') as Record<string, unknown>;
    const medals: Partial<Record<Difficulty, Medal>> = {};
    for (const d of DIFFICULTIES) {
      const m = MEDALS.find((m) => m === saved[d]);
      if (m) medals[d] = m;
    }
    return medals;
  } catch {
    return {};
  }
}

/** Keeps `medal` as the best on `difficulty` if it beats the one there; returns the best. */
export function saveMedal(difficulty: Difficulty, medal: Medal): Medal {
  const medals = loadMedals();
  const best = medals[difficulty];
  if (best && MEDALS.indexOf(best) >= MEDALS.indexOf(medal)) return best;
  medals[difficulty] = medal;
  try {
    localStorage.setItem(MEDALS_KEY, JSON.stringify(medals));
  } catch {
    // Storage may be off; the medal still shows for this game.
  }
  return medal;
}
