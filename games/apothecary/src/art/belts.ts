import Phaser from 'phaser';
import { runLength } from '../scenes/layout';
import { GOLD, INK, IRON } from './palette';

// Steampunk conveyor belts: brass rails with rivets around dark leather slats, drawn as one network
// so every node gets the right piece: a curved corner, a T-junction, a + crossing or an end roller.

export type Pt = { x: number; y: number };

const LEATHER = 0x3a2a20;
const SLAT = 0x56402e;
/** Width of one lane, just wide enough for an item's art, of the brass strip between lanes, and of the rail along each edge. */
const LANE = 12;
const DIVIDER = 2;
const RAIL = 3;

/** How far from a belt's middle the centre of lane `lane` of `lanes` lies, across the belt. */
export const laneOffset = (lane: number, lanes: number) => (lane - (lanes - 1) / 2) * (LANE + DIVIDER);

/**
 * Draws belts along `runs`, each a list of points joined by straight horizontal or vertical
 * stretches, `lanes` lanes wide and no wider. Runs that meet at a point, or where one ends on
 * another's stretch, are joined there.
 */
export function drawBelts(scene: Phaser.Scene, runs: Pt[][], depth: number, lanes: number) {
  const W = 2 * RAIL + lanes * LANE + (lanes - 1) * DIVIDER, H = W / 2;
  // Offsets across the belt, from its middle, of the strips between lanes and of each lane's centre.
  const dividers = Array.from({ length: lanes - 1 }, (_, i) => (laneOffset(i, lanes) + laneOffset(i + 1, lanes)) / 2);
  const centres = Array.from({ length: lanes }, (_, i) => laneOffset(i, lanes));
  const g = scene.add.graphics().setDepth(depth);
  const segs: { a: Pt; b: Pt }[] = [];
  for (const run of runs) for (let i = 0; i < run.length - 1; i++) segs.push({ a: run[i], b: run[i + 1] });
  const key = (p: Pt) => `${p.x},${p.y}`;
  const nodes = new Map<string, Pt>();
  for (const { a, b } of segs) { nodes.set(key(a), a); nodes.set(key(b), b); }
  // Where a horizontal and a vertical run cross, the crossing is a node too.
  for (const h of segs) for (const v of segs) {
    if (h.a.y !== h.b.y || v.a.x !== v.b.x) continue;
    const x = v.a.x, y = h.a.y;
    if (x > Math.min(h.a.x, h.b.x) && x < Math.max(h.a.x, h.b.x) && y > Math.min(v.a.y, v.b.y) && y < Math.max(v.a.y, v.b.y)) nodes.set(key({ x, y }), { x, y });
  }
  const DIRS = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } } as const;
  type D = keyof typeof DIRS;
  const dirOf = (v: Pt): D => (v.x > 0 ? 'E' : v.x < 0 ? 'W' : v.y > 0 ? 'S' : 'N');
  const conn = new Map<string, Set<D>>();
  for (const [k, p] of nodes) {
    const set = new Set<D>();
    for (const { a, b } of segs) {
      const v = { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
      if (key(a) === k) set.add(dirOf(v));
      else if (key(b) === k) set.add(dirOf({ x: -v.x, y: -v.y }));
      else if (a.y === b.y && p.y === a.y && p.x > Math.min(a.x, b.x) && p.x < Math.max(a.x, b.x)) { set.add('E'); set.add('W'); }
      else if (a.x === b.x && p.x === a.x && p.y > Math.min(a.y, b.y) && p.y < Math.max(a.y, b.y)) { set.add('N'); set.add('S'); }
    }
    conn.set(k, set);
  }

  // Straight runs, trimmed so the node pieces sit on top.
  const piece = (p: Pt) => {
    const ds = [...(conn.get(key(p)) ?? [])];
    return !(ds.length === 2 && DIRS[ds[0]].x === -DIRS[ds[1]].x && DIRS[ds[0]].y === -DIRS[ds[1]].y);
  };
  for (const seg of segs) {
    const u = { x: Math.sign(seg.b.x - seg.a.x), y: Math.sign(seg.b.y - seg.a.y) };
    const a = piece(seg.a) ? { x: seg.a.x + u.x * H, y: seg.a.y + u.y * H } : seg.a;
    const b = piece(seg.b) ? { x: seg.b.x - u.x * H, y: seg.b.y - u.y * H } : seg.b;
    const horiz = a.y === b.y;
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    const rx = horiz ? x0 : x0 - H, ry = horiz ? y0 - H : y0, rw = horiz ? x1 - x0 : W, rh = horiz ? W : y1 - y0;
    g.fillStyle(INK).fillRect(rx - (horiz ? 0 : 1), ry - (horiz ? 1 : 0), rw + (horiz ? 0 : 2), rh + (horiz ? 2 : 0));
    g.fillStyle(LEATHER).fillRect(rx, ry, rw, rh);
    g.fillStyle(SLAT);
    if (horiz) for (let x = rx + 2; x < rx + rw - 1; x += 6) g.fillRect(x, ry + 3, 2, rh - 6);
    else for (let y = ry + 2; y < ry + rh - 1; y += 6) g.fillRect(rx + 3, y, rw - 6, 2);
    g.fillStyle(GOLD.dark);
    if (horiz) { g.fillRect(rx, ry, rw, 3); g.fillRect(rx, ry + rh - 3, rw, 3); } else { g.fillRect(rx, ry, 3, rh); g.fillRect(rx + rw - 3, ry, 3, rh); }
    g.fillStyle(GOLD.light);
    if (horiz) { g.fillRect(rx, ry, rw, 1); g.fillRect(rx, ry + rh - 3, rw, 1); for (let x = rx + 6; x < rx + rw - 2; x += 12) { g.fillRect(x, ry + 1, 1, 1); g.fillRect(x, ry + rh - 2, 1, 1); } }
    else { g.fillRect(rx, ry, 1, rh); g.fillRect(rx + rw - 3, ry, 1, rh); for (let y = ry + 6; y < ry + rh - 2; y += 12) { g.fillRect(rx + 1, y, 1, 1); g.fillRect(rx + rw - 2, y, 1, 1); } }
    // Brass strips between the lanes.
    g.fillStyle(GOLD.dark);
    for (const off of dividers) {
      if (horiz) g.fillRect(rx, a.y + off - DIVIDER / 2, rw, DIVIDER);
      else g.fillRect(a.x + off - DIVIDER / 2, ry, DIVIDER, rh);
    }
    // A small arrow down the middle of each lane.
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y), len = Math.hypot(b.x - a.x, b.y - a.y);
    g.fillStyle(GOLD.mid, 0.9);
    for (let d = 28; d < len - 18; d += 48) {
      for (const off of centres) {
        const cx = a.x + dx * d + (horiz ? 0 : off), cy = a.y + dy * d + (horiz ? off : 0);
        if (horiz) g.fillTriangle(cx + dx * 3, cy, cx - dx * 2, cy - 3, cx - dx * 2, cy + 3);
        else g.fillTriangle(cx, cy + dy * 3, cx - 3, cy - dy * 2, cx + 3, cy - dy * 2);
      }
    }
  }

  const rail = (side: D, c: Pt) => {
    // A brass rail along one edge of a node square, with an ink outline outside it.
    const x = c.x - H, y = c.y - H;
    const strip = (offset: number, thick: number, color: number) => {
      g.fillStyle(color);
      if (side === 'N') g.fillRect(x, y + offset, W, thick);
      if (side === 'S') g.fillRect(x, y + W - offset - thick, W, thick);
      if (side === 'W') g.fillRect(x + offset, y, thick, W);
      if (side === 'E') g.fillRect(x + W - offset - thick, y, thick, W);
    };
    strip(0, 3, GOLD.dark);
    strip(0, 1, GOLD.light);
    strip(-1, 1, INK);
  };
  const bracket = (x: number, y: number) => {
    // A riveted brass corner plate.
    g.fillStyle(INK).fillRect(x - 3, y - 3, 6, 6);
    g.fillStyle(GOLD.mid).fillRect(x - 2, y - 2, 4, 4);
    g.fillStyle(GOLD.shine).fillRect(x - 1, y - 1, 1, 1);
  };
  const ALL: D[] = ['N', 'E', 'S', 'W'];
  const ang = (v: Pt) => Math.atan2(v.y, v.x);

  for (const [k, c] of nodes) {
    const ds = [...conn.get(k)!];
    const x = c.x - H, y = c.y - H;
    if (ds.length === 2 && DIRS[ds[0]].x === -DIRS[ds[1]].x && DIRS[ds[0]].y === -DIRS[ds[1]].y) continue; // straight through
    if (ds.length === 2) {
      // Curved corner: a quarter ring around the inside corner of the bend.
      const v1 = DIRS[ds[0]], v2 = DIRS[ds[1]];
      const o = { x: c.x + (v1.x + v2.x) * H, y: c.y + (v1.y + v2.y) * H };
      let a1 = ang({ x: -v1.x, y: -v1.y }), a2 = ang({ x: -v2.x, y: -v2.y });
      if (Math.abs(a2 - a1) > Math.PI) { if (a1 < a2) a1 += Math.PI * 2; else a2 += Math.PI * 2; }
      const s = Math.min(a1, a2), e = Math.max(a1, a2);
      const wedge = (r: number, col: number) => { g.fillStyle(col); g.slice(o.x, o.y, r, s, e, false); g.fillPath(); };
      wedge(W + 1, INK); wedge(W, GOLD.dark); wedge(W - 1, GOLD.light); wedge(W - 3, GOLD.dark); wedge(W - 3, LEATHER);
      g.fillStyle(SLAT);
      for (let t = 1; t < 5; t++) {
        const a = s + ((e - s) * t) / 5;
        for (let r = 5; r < W - 4; r += 1) g.fillRect(Math.round(o.x + Math.cos(a) * r) - 1, Math.round(o.y + Math.sin(a) * r) - 1, 2, 2);
      }
      // The strips between lanes bend round with the belt.
      g.lineStyle(DIVIDER, GOLD.dark);
      for (const off of dividers) g.beginPath().arc(o.x, o.y, H + off, s, e, false).strokePath();
      wedge(4, GOLD.dark); wedge(2, GOLD.light);
      bracket(o.x, o.y);
      continue;
    }
    // Square plate for ends, T-junctions and crossings.
    g.fillStyle(INK).fillRect(x - 1, y - 1, W + 2, W + 2);
    g.fillStyle(LEATHER).fillRect(x, y, W, W);
    g.fillStyle(SLAT);
    for (let i = 3; i < W - 3; i += 4) for (let j = 3; j < W - 3; j += 4) g.fillRect(x + i, y + j, 2, 2);
    for (const side of ALL) if (!ds.includes(side)) rail(side, c);
    if (ds.length === 1) {
      // The strips between lanes run on to the end roller.
      const v = DIRS[ds[0]];
      g.fillStyle(GOLD.dark);
      for (const off of dividers) {
        if (v.x !== 0) g.fillRect(x, c.y + off - DIVIDER / 2, W, DIVIDER);
        else g.fillRect(c.x + off - DIVIDER / 2, y, DIVIDER, W);
      }
      // End roller across the open end.
      const back = { x: c.x - v.x * (H - 3), y: c.y - v.y * (H - 3) };
      g.fillStyle(IRON.dark);
      if (v.x !== 0) g.fillRect(back.x - 3, y + 2, 6, W - 4); else g.fillRect(x + 2, back.y - 3, W - 4, 6);
      g.fillStyle(IRON.shine);
      if (v.x !== 0) g.fillRect(back.x - 1, y + 2, 1, W - 4); else g.fillRect(x + 2, back.y - 1, W - 4, 1);
    } else {
      // Brass corner plates where belts meet; a crossing gets a turntable in the middle.
      for (const [cx, cy] of [[x, y], [x + W, y], [x, y + W], [x + W, y + W]]) bracket(cx, cy);
      if (ds.length === 4) {
        g.fillStyle(INK).fillCircle(c.x, c.y, 7);
        g.fillStyle(GOLD.mid).fillCircle(c.x, c.y, 6);
        g.fillStyle(LEATHER).fillCircle(c.x, c.y, 4);
        g.fillStyle(GOLD.light).fillRect(c.x - 4, c.y, 8, 1).fillRect(c.x, c.y - 4, 1, 8);
      } else {
        // A diverter flap on the T's open side.
        const miss = ALL.find((d) => !ds.includes(d))!;
        const v = DIRS[miss];
        g.fillStyle(GOLD.mid).fillTriangle(c.x - v.x * 6 + v.y * 5, c.y - v.y * 6 + v.x * 5, c.x - v.x * 6 - v.y * 5, c.y - v.y * 6 - v.x * 5, c.x + v.x * 2, c.y + v.y * 2);
      }
    }
  }
  return g;
}

/** The point `t` (0 to 1) of the way along a run of points, and the direction the run goes there. */
export function pointAlong(run: Pt[], t: number): Pt & { dx: number; dy: number } {
  const parts = run.slice(1).map((p, i) => ({ a: run[i], b: p, len: Math.hypot(p.x - run[i].x, p.y - run[i].y) }));
  let d = Math.max(0, Math.min(1, t)) * runLength(run);
  for (const { a, b, len } of parts) {
    const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    if (d <= len) return { x: a.x + dx * d, y: a.y + dy * d, dx, dy };
    d -= len;
  }
  const { a, b, len } = parts[parts.length - 1];
  return { ...b, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
}
