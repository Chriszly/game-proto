import { GRID, maxSupplies, type GameState } from './state';

// The whole game is saved whenever it reaches the port or the harbor, and on every survey, so a
// reload carries on where it left off.
const KEY = 'mapmaker-save';

export function loadGame(): GameState | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as GameState | null;
    // A save from a different grid size or a broken one starts over.
    if (!s || !Array.isArray(s.tiles) || s.tiles.length !== GRID.w * GRID.h || !s.port || !s.phase) return null;
    // Supplies saved on an easier difficulty can exceed this one's maximum.
    s.supplies = Math.min(s.supplies, maxSupplies(s));
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
