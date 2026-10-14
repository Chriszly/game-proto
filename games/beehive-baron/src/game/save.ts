import { freshProgress, type Progress } from './state';
import { MEADOWS } from './meadows';
import { UPGRADES, UPGRADE_IDS } from './upgrades';

// The comb, the coins, the bees, the upgrades, the meadows unlocked and when the hive was last seen
// are saved; bees out foraging come home on load.
const KEY = 'beehive-baron-progress';

export function loadProgress(): Progress {
  const fresh = freshProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<Progress>;
    const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback);
    return {
      coins: num(saved.coins, fresh.coins),
      cells: Array.isArray(saved.cells) ? saved.cells : fresh.cells,
      bees: num(saved.bees, fresh.bees),
      jars: num(saved.jars, fresh.jars),
      sold: num(saved.sold, fresh.sold),
      ranks: Object.fromEntries(
        UPGRADE_IDS.map((id) => [id, Math.min(UPGRADES[id].prices.length, num(saved.ranks?.[id], 0))]),
      ) as Progress['ranks'],
      meadows: Math.min(MEADOWS.length, num(saved.meadows, fresh.meadows)),
      seen: num(saved.seen, fresh.seen),
    };
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
