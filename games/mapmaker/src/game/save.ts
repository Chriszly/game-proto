import { findFeatures } from './island';
import { GRID, WRECK_SUPPLIES, indexOf, maxSupplies, type GameState } from './state';

// The whole game is saved whenever it reaches the port or the harbor, and on every survey, so a
// reload carries on where it left off. The best Royal Atlas (fewest voyages) is kept apart, so it
// outlives a new game.
const KEY = 'mapmaker-save';
const BEST_KEY = 'mapmaker-best';

export function loadGame(): GameState | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as GameState | null;
    // A save from a different grid size or a broken one starts over.
    if (!s || !Array.isArray(s.tiles) || s.tiles.length !== GRID.w * GRID.h || !s.port || !s.phase) return null;
    // Supplies saved on an easier difficulty can exceed this one's maximum (plus this voyage's wrecks).
    const wrecks = (s.surveyed ?? []).filter((p) => s.tiles[indexOf(p.x, p.y)]?.find === 'wreck').length;
    s.supplies = Math.min(s.supplies, maxSupplies(s) + wrecks * WRECK_SUPPLIES);
    // Saves from before the isle goal and the sell-back start with none of either.
    s.milestones ??= 0;
    s.isleStart ??= s.voyage;
    s.atlas ??= [];
    // Saves from before isle kinds, finds, camps and riddles: a green isle with none of them.
    s.kind ??= 'green';
    for (const page of s.atlas) page.kind ??= 'green';
    s.camps ??= [];
    s.storms ??= [];
    s.artifacts ??= 0;
    s.treasure ??= 0;
    s.riddle ??= null;
    s.dug ??= [];
    // Saves from before features, the board, hands, the rival and the Royal Atlas: the features
    // are read off the tiles, the rest starts empty (the first harbor lays the board out).
    s.features ??= findFeatures(s.tiles.map((t) => t.terrain), s.island);
    s.board ??= [];
    s.hands ??= [];
    s.hand ??= null;
    s.rival ??= null;
    s.royal ??= null;
    for (const c of [s.commission, ...s.board]) {
      if (!c) continue;
      c.voyages ??= 1;
      c.done ??= 0;
      c.left ??= 1;
    }
    if (s.chart) {
      const old: Partial<typeof s.chart> = s.chart;
      s.chart = {
        ...s.chart,
        unused: old.unused ?? 0,
        sellBack: old.sellBack ?? 0,
        milestones: old.milestones ?? 0,
        milestoneCoins: old.milestoneCoins ?? 0,
        atlas: old.atlas ?? false,
        artifacts: old.artifacts ?? 0,
        artifactCoins: old.artifactCoins ?? 0,
        treasure: old.treasure ?? 0,
        features: old.features ?? [],
        featureCoins: old.featureCoins ?? 0,
        rivalTiles: old.rivalTiles ?? 0,
        rivalLoss: old.rivalLoss ?? 0,
      };
    }
    return s;
  } catch {
    return null;
  }
}

export function saveGame(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage can be full or blocked (private mode); the game keeps running unsaved.
  }
}

/** The fewest voyages a Royal Atlas has been completed in, or null before the first. */
export function loadBest(): number | null {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Records a completed Royal Atlas's voyages when they beat the best so far. */
export function saveBest(voyages: number) {
  try {
    const best = loadBest();
    if (best === null || voyages < best) localStorage.setItem(BEST_KEY, String(voyages));
  } catch {
    // Storage can be full or blocked; the best is simply not kept.
  }
}
