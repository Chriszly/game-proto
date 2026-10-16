import type { At } from './decree';
import { SIDES, isBuilt, scores, type Cell } from './tiles';

// The castle: every island has one. Buildings joined to it by an unbroken chain of buildings and
// roads (sharing edges) score +1 each when the kingdom is finished. Roads join but score nothing.

/** The castle's cell, or null on a board without one. */
export function castleAt(grid: Cell[][]): At | null {
  for (let row = 0; row < grid.length; row++) {
    const col = grid[row].indexOf('castle');
    if (col >= 0) return [col, row];
  }
  return null;
}

/** The built cells (buildings, manors and roads) joined to the castle by a chain of built cells. */
export function joinedCells(grid: Cell[][]): At[] {
  const start = castleAt(grid);
  if (!start) return [];
  const seen = new Set<string>([`${start[0]},${start[1]}`]);
  const out: At[] = [];
  const todo: At[] = [start];
  while (todo.length) {
    const [c, r] = todo.pop()!;
    for (const [dc, dr] of SIDES) {
      const at: At = [c + dc, r + dr];
      const key = `${at[0]},${at[1]}`;
      if (seen.has(key) || !isBuilt(grid[at[1]]?.[at[0]])) continue;
      seen.add(key);
      out.push(at);
      todo.push(at);
    }
  }
  return out;
}

/** How many buildings the castle's chain reaches: the castle bonus the end of the kingdom pays. */
export const joinedCount = (grid: Cell[][]) => joinedCells(grid).filter(([c, r]) => scores(grid[r][c])).length;
