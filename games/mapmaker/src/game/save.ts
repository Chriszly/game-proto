import { GRID, WRECK_SUPPLIES, indexOf, maxSupplies, type GameState } from './state';

// The whole game is saved whenever it reaches the port or the harbor, and on every survey, so a
// reload carries on where it left off.
const KEY = 'mapmaker-save';

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
