import type { PuzzleDef } from '../kinds';
import { between, pick, shuffle, type Rand } from '../rng';

// Bridges: join numbered islands with straight bridges, one or two between a pair, so each island
// has as many bridges as its number, no bridges cross and every island is reached. Made by
// growing a network of islands and bridges, so it always has an answer; any answer that keeps the
// rules counts.

const GRIDS = [5, 6, 7, 8] as const;
const ISLANDS = [5, 7, 9, 12] as const;

export interface Island {
  r: number;
  c: number;
  n: number;
}

export interface BridgesState {
  size: number;
  islands: Island[];
  /** The made answer: island pairs (lower index first) and their bridge counts. */
  answer: [number, number, number][];
  /** The player's bridges by pair key `a-b` (a < b): 1 or 2. */
  bridges: Record<string, number>;
  /** The island picked first, or -1. */
  picked: number;
}

export const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** The cells strictly between two islands in a line, or null if they are not in a line. */
function between2(s: { islands: Island[] }, a: number, b: number) {
  const A = s.islands[a];
  const B = s.islands[b];
  if (A.r !== B.r && A.c !== B.c) return null;
  const cells: [number, number][] = [];
  if (A.r === B.r) for (let c = Math.min(A.c, B.c) + 1; c < Math.max(A.c, B.c); c++) cells.push([A.r, c]);
  else for (let r = Math.min(A.r, B.r) + 1; r < Math.max(A.r, B.r); r++) cells.push([r, A.c]);
  return cells;
}

/** Whether a bridge may join islands `a` and `b`: in a line, nothing between, crossing no bridge. */
export function canJoin(s: BridgesState, a: number, b: number) {
  if (a === b) return false;
  const cells = between2(s, a, b);
  if (!cells) return false;
  const across = s.islands[a].r === s.islands[b].r;
  if (cells.some(([r, c]) => s.islands.some((i) => i.r === r && i.c === c))) return false;
  for (const key of Object.keys(s.bridges)) {
    const [x, y] = key.split('-').map(Number);
    if (pairKey(x, y) === pairKey(a, b)) continue;
    const other = between2(s, x, y)!;
    const otherAcross = s.islands[x].r === s.islands[y].r;
    if (otherAcross !== across && other.some(([r, c]) => cells.some(([r2, c2]) => r === r2 && c === c2))) return false;
  }
  return true;
}

/** The bridges an island has. */
export function bridgeCount(s: BridgesState, i: number) {
  let n = 0;
  for (const [key, v] of Object.entries(s.bridges)) if (key.split('-').map(Number).includes(i)) n += v;
  return n;
}

function make(rand: Rand, level: number): BridgesState {
  const size = GRIDS[level];
  const want = ISLANDS[level];
  const s: BridgesState = { size, islands: [{ r: between(rand, 0, size - 1), c: between(rand, 0, size - 1), n: 0 }], answer: [], bridges: {}, picked: -1 };
  const taken = (r: number, c: number) => s.islands.some((i) => Math.abs(i.r - r) + Math.abs(i.c - c) <= 1);
  for (let tries = 0; s.islands.length < want && tries < 400; tries++) {
    const from = between(rand, 0, s.islands.length - 1);
    const [dr, dc] = pick(rand, [[0, 1], [0, -1], [1, 0], [-1, 0]] as const);
    const len = between(rand, 2, Math.max(2, size - 2));
    const r = s.islands[from].r + dr * len;
    const c = s.islands[from].c + dc * len;
    if (r < 0 || c < 0 || r >= size || c >= size || taken(r, c)) continue;
    // Nor on a bridge already laid.
    if (s.answer.some(([a, b]) => between2(s, a, b)!.some(([r2, c2]) => r2 === r && c2 === c))) continue;
    s.islands.push({ r, c, n: 0 });
    const to = s.islands.length - 1;
    // Check the new bridge against the answer's bridges laid so far.
    s.bridges = Object.fromEntries(s.answer.map(([a, b, k]) => [pairKey(a, b), k]));
    if (!canJoin(s, from, to)) {
      s.islands.pop();
      continue;
    }
    s.answer.push([Math.min(from, to), Math.max(from, to), rand() < 0.35 ? 2 : 1]);
  }
  // A few extra bridges between islands already in a line make loops.
  for (let a = 0; a < s.islands.length; a++) {
    for (let b = a + 1; b < s.islands.length; b++) {
      if (s.answer.some(([x, y]) => x === a && y === b) || rand() > 0.3) continue;
      s.bridges = Object.fromEntries(s.answer.map(([x, y, k]) => [pairKey(x, y), k]));
      if (canJoin(s, a, b)) s.answer.push([a, b, 1]);
    }
  }
  for (const [a, b, k] of s.answer) {
    s.islands[a].n += k;
    s.islands[b].n += k;
  }
  // Number the islands row by row, so the test and the eye read them in order.
  const order = shuffle(rand, s.islands.map((_, i) => i)).sort((x, y) => s.islands[x].r - s.islands[y].r || s.islands[x].c - s.islands[y].c);
  const renumber = new Map(order.map((old, i) => [old, i]));
  s.islands = order.map((i) => s.islands[i]);
  s.answer = s.answer.map(([a, b, k]) => {
    const [x, y] = [renumber.get(a)!, renumber.get(b)!];
    return [Math.min(x, y), Math.max(x, y), k];
  });
  s.bridges = {};
  return s;
}

export const bridges: PuzzleDef<BridgesState> = {
  id: 'bridges',
  undo: true,
  limit: [75, 100, 130, 170],
  make,
  solved(s) {
    if (s.islands.some((_, i) => bridgeCount(s, i) !== s.islands[i].n)) return false;
    const seen = new Set([0]);
    const todo = [0];
    while (todo.length) {
      const i = todo.pop()!;
      for (const key of Object.keys(s.bridges)) {
        const [a, b] = key.split('-').map(Number);
        const j = a === i ? b : b === i ? a : -1;
        if (j >= 0 && !seen.has(j)) seen.add(j), todo.push(j);
      }
    }
    return seen.size === s.islands.length;
  },
  hint(s) {
    // A bridge of the answer the player lacks, after taking away any the answer doesn't have.
    for (const key of Object.keys(s.bridges)) {
      const [a, b] = key.split('-').map(Number);
      const k = s.answer.find(([x, y]) => x === a && y === b)?.[2] ?? 0;
      if (s.bridges[key] > k) {
        if (k) s.bridges[key] = k;
        else delete s.bridges[key];
        return true;
      }
    }
    for (const [a, b, k] of s.answer) {
      const key = pairKey(a, b);
      if ((s.bridges[key] ?? 0) < k && canJoin(s, a, b)) {
        s.bridges[key] = k;
        return true;
      }
    }
    return false;
  },
};

/**
 * A tap on an island: the first picks it, a second on another island in line adds a bridge
 * between them (a third bridge takes them all away), and a second on the same island lets go.
 */
export function bridgesTap(s: BridgesState, i: number) {
  if (s.picked < 0) {
    s.picked = i;
    return false;
  }
  const a = s.picked;
  s.picked = -1;
  if (a === i || !canJoin(s, a, i)) return false;
  const key = pairKey(a, i);
  const n = ((s.bridges[key] ?? 0) + 1) % 3;
  if (n) s.bridges[key] = n;
  else delete s.bridges[key];
  return true;
}
