// Finds a walking route over the tile grid for a tap: eight directions, never cutting a corner.

export interface Step { x: number; y: number }

/**
 * The tiles from `from` to `to` (both included), or null when `to` can't be reached. `solid` says
 * which tiles block; the start tile never does. Gives up past `limit` tiles searched.
 */
export function findPath(w: number, h: number, solid: (x: number, y: number) => boolean, from: Step, to: Step, limit = 4000): Step[] | null {
  if (to.x < 0 || to.y < 0 || to.x >= w || to.y >= h || solid(to.x, to.y)) return null;
  const key = (x: number, y: number) => y * w + x;
  const start = key(from.x, from.y);
  const goal = key(to.x, to.y);
  const g = new Map<number, number>([[start, 0]]);
  const came = new Map<number, number>();
  const open: { k: number; f: number }[] = [{ k: start, f: 0 }];
  const closed = new Set<number>();
  const guess = (x: number, y: number) => {
    const dx = Math.abs(x - to.x);
    const dy = Math.abs(y - to.y);
    return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
  };
  while (open.length && closed.size < limit) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const { k } = open.splice(best, 1)[0];
    if (k === goal) {
      const route: Step[] = [];
      for (let c: number | undefined = k; c !== undefined; c = came.get(c)) route.push({ x: c % w, y: Math.floor(c / w) });
      return route.reverse();
    }
    if (closed.has(k)) continue;
    closed.add(k);
    const x = k % w;
    const y = Math.floor(k / w);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || solid(nx, ny)) continue;
      if (dx && dy && (solid(x + dx, y) || solid(x, y + dy))) continue;
      const nk = key(nx, ny);
      const cost = (g.get(k) ?? 0) + (dx && dy ? 1.41 : 1);
      if (cost < (g.get(nk) ?? Infinity)) {
        g.set(nk, cost);
        came.set(nk, k);
        open.push({ k: nk, f: cost + guess(nx, ny) });
      }
    }
  }
  return null;
}
