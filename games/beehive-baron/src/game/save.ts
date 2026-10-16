import { KINDS, type Kind } from './honey';
import { CASK_MS, MAX_CASKS, type Cask } from './mead';
import { MEADOWS } from './meadows';
import { YEAR_MS } from './seasons';
import { freshProgress, type Progress } from './state';
import { MAX_HIVES } from './swarm';
import { UPGRADES, UPGRADE_IDS } from './upgrades';

// The comb, the coins, the jars, the wax, the bees, the upgrades, the meadows unlocked, where the
// bees forage, the season and years, the casks, the hives, the fair entries and when the hive was
// last seen are saved; bees out foraging or lent come home on load, and wasps, the market, village
// orders, orchard contracts and a swarm start afresh.
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
      seasonMs: Math.min(YEAR_MS - 1, num(saved.seasonMs, fresh.seasonMs)),
      years: num(saved.years, fresh.years),
      casks: (Array.isArray(saved.casks) ? saved.casks : []).flatMap((c: Partial<Cask>) =>
        KINDS.includes(c?.kind as Kind) ? [{ kind: c.kind as Kind, agingMs: Math.min(CASK_MS, num(c.agingMs, 0)), value: num(c.value, 0) }] : [],
      ).slice(0, MAX_CASKS),
      hives: Math.max(1, Math.min(MAX_HIVES, num(saved.hives, fresh.hives))),
      fair: Object.fromEntries(KINDS.map((k) => [k, typeof saved.fair?.[k] === 'number' ? num(saved.fair[k], 0) : null])) as Progress['fair'],
      baron: saved.baron === true,
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
