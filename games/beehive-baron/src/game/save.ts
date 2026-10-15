import { KINDS, type Kind } from './honey';
import { freshProgress, type Progress } from './state';
import { MEADOWS } from './meadows';
import { UPGRADES, UPGRADE_IDS } from './upgrades';

// The comb, the coins, the jars, the wax, the bees, the upgrades, the meadows unlocked, where the
// bees forage and when the hive was last seen are saved; bees out foraging come home on load, and
// wasps, the market and village orders start afresh.
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
      // Saves from before honey kinds hold one number of jars, all clover.
      jars:
        typeof saved.jars === 'number'
          ? { ...fresh.jars, clover: num(saved.jars, 0) }
          : (Object.fromEntries(KINDS.map((k) => [k, num((saved.jars as Partial<Record<Kind, unknown>> | undefined)?.[k], 0)])) as Progress['jars']),
      wax: num(saved.wax, fresh.wax),
      sold: num(saved.sold, fresh.sold),
      ranks: Object.fromEntries(
        UPGRADE_IDS.map((id) => [id, Math.min(UPGRADES[id].prices.length, num(saved.ranks?.[id], 0))]),
      ) as Progress['ranks'],
      meadows: Math.min(MEADOWS.length, num(saved.meadows, fresh.meadows)),
      forage: KINDS.includes(saved.forage as Kind) ? (saved.forage as Kind) : fresh.forage,
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
