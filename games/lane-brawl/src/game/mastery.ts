// Class mastery (#292): the player's wins with each class, kept in the browser. Each rank a class
// reaches (`masteryRank`) puts a third upgrade card in one more of its level-up offers.

import { MASTERY_WINS } from './data';

const KEY = 'lane-brawl-mastery';

/** Wins per class id, or an empty record when nothing is saved or storage is blocked. */
export function loadMastery(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [id, n] of Object.entries(raw)) if (typeof n === 'number' && n > 0) out[id] = Math.floor(n);
    return out;
  } catch {
    return {};
  }
}

/** Counts a win with a class. Returns the class's wins after it. */
export function recordWin(champId: string): number {
  const m = loadMastery();
  m[champId] = (m[champId] ?? 0) + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // Storage blocked: the win still shows on the end panel, it just isn't kept.
  }
  return m[champId];
}

/** A class's mastery rank for its wins: 0 to `MASTERY_WINS.length`. */
export const masteryRank = (wins: number) => MASTERY_WINS.filter((w) => wins >= w).length;
