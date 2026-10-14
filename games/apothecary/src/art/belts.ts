import Phaser from 'phaser';
import { INK, fit, paint, rgba, rr, wash, type Ctx, type Pt as Vec } from './paint';

// Steampunk conveyor belts in ink and watercolour: brass rails round a leather band with inked
// slats, painted as one network so every node gets the right piece: a curved corner, a T-junction,
// a + crossing or an end roller.

export type Pt = { x: number; y: number };

const LEATHER = '#7a5236';
const BRASS = '#d4a84a';
/** Width of one lane, just wide enough for an item's art, of the brass strip between lanes, and of the rail along each edge. */
const LANE = 12;
const DIVIDER = 2;
const RAIL = 3;

/** How far from a belt's middle the centre of lane `lane` of `lanes` lies, across the belt. */
export const laneOffset = (lane: number, lanes: number) => (lane - (lanes - 1) / 2) * (LANE + DIVIDER);

type D = 'N' | 'E' | 'S' | 'W';
const DIRS: Record<D, Pt> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };
const ALL: D[] = ['N', 'E', 'S', 'W'];
const nodeKey = (p: Pt) => `${p.x},${p.y}`;

let painted = 0;

/**
 * Paints belts along `runs`, each a list of points joined by straight horizontal or vertical
 * stretches, `lanes` lanes wide and no wider, and shows them as one image. Runs that meet at a
 * point, or where one ends on another's stretch, are joined there. Destroying the image frees its
 * painting.
 */
export function drawBelts(scene: Phaser.Scene, runs: Pt[][], depth: number, lanes: number) {
  const W = 2 * RAIL + lanes * LANE + (lanes - 1) * DIVIDER, H = W / 2;
  // Offsets across the belt, from its middle, of the strips between lanes and of each lane's centre.
  const dividers = Array.from({ length: lanes - 1 }, (_, i) => (laneOffset(i, lanes) + laneOffset(i + 1, lanes)) / 2);
  const centres = Array.from({ length: lanes }, (_, i) => laneOffset(i, lanes));
  const segs: { a: Pt; b: Pt }[] = [];
  for (const run of runs) for (let i = 0; i < run.length - 1; i++) segs.push({ a: run[i], b: run[i + 1] });
  const nodes = new Map<string, Pt>();
  for (const { a, b } of segs) {
    nodes.set(nodeKey(a), a);
    nodes.set(nodeKey(b), b);
  }
  // Where a horizontal and a vertical run cross, the crossing is a node too.
  for (const h of segs) for (const v of segs) {
    if (h.a.y !== h.b.y || v.a.x !== v.b.x) continue;
    const x = v.a.x, y = h.a.y;
    if (x > Math.min(h.a.x, h.b.x) && x < Math.max(h.a.x, h.b.x) && y > Math.min(v.a.y, v.b.y) && y < Math.max(v.a.y, v.b.y)) nodes.set(nodeKey({ x, y }), { x, y });
  }
  const dirOf = (v: Pt): D => (v.x > 0 ? 'E' : v.x < 0 ? 'W' : v.y > 0 ? 'S' : 'N');
  const conn = new Map<string, Set<D>>();
  for (const [k, p] of nodes) {
    const set = new Set<D>();
    for (const { a, b } of segs) {
      const v = { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
      if (nodeKey(a) === k) set.add(dirOf(v));
      else if (nodeKey(b) === k) set.add(dirOf({ x: -v.x, y: -v.y }));
      else if (a.y === b.y && p.y === a.y && p.x > Math.min(a.x, b.x) && p.x < Math.max(a.x, b.x)) { set.add('E'); set.add('W'); }
      else if (a.x === b.x && p.x === a.x && p.y > Math.min(a.y, b.y) && p.y < Math.max(a.y, b.y)) { set.add('N'); set.add('S'); }
    }
    conn.set(k, set);
  }

  const points = runs.flat();
  const left = Math.min(...points.map((p) => p.x)) - W, top = Math.min(...points.map((p) => p.y)) - W;
  const right = Math.max(...points.map((p) => p.x)) + W, bottom = Math.max(...points.map((p) => p.y)) + W;
  const key = `belts-${painted++}`;
  paint(
    scene,
    key,
    right - left,
    bottom - top,
    (c) => {
      c.translate(-left, -top);
      paintNetwork(c, segs, nodes, conn, W, H, dividers, centres);
    },
    2,
    909,
  );
  const img = fit(scene.add.image(left, top, key).setOrigin(0).setDepth(depth));
  img.once(Phaser.GameObjects.Events.DESTROY, () => scene.textures.remove(key));
  return img;
}

function line(c: Ctx, pts: Vec[], w = 0.8, alpha = 0.9, col = INK) {
  c.save();
  c.strokeStyle = col;
  c.globalAlpha = alpha;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x + rr(-0.25, 0.25), y + rr(-0.25, 0.25)) : c.moveTo(x, y)));
  c.stroke();
  c.restore();
}

function dot(c: Ctx, x: number, y: number) {
  c.fillStyle = INK;
  c.beginPath();
  c.arc(x, y, 0.6, 0, Math.PI * 2);
  c.fill();
}

function paintNetwork(
  c: Ctx,
  segs: { a: Pt; b: Pt }[],
  nodes: Map<string, Pt>,
  conn: Map<string, Set<D>>,
  W: number,
  H: number,
  dividers: number[],
  centres: number[],
) {
  const piece = (p: Pt) => {
    const ds = [...(conn.get(nodeKey(p)) ?? [])];
    return !(ds.length === 2 && DIRS[ds[0]].x === -DIRS[ds[1]].x && DIRS[ds[0]].y === -DIRS[ds[1]].y);
  };
  // Straight runs, trimmed so the node pieces sit on top.
  for (const seg of segs) {
    const u = { x: Math.sign(seg.b.x - seg.a.x), y: Math.sign(seg.b.y - seg.a.y) };
    const a = piece(seg.a) ? { x: seg.a.x + u.x * H, y: seg.a.y + u.y * H } : seg.a;
    const b = piece(seg.b) ? { x: seg.b.x - u.x * H, y: seg.b.y - u.y * H } : seg.b;
    const horiz = a.y === b.y;
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    const rx = horiz ? x0 : x0 - H, ry = horiz ? y0 - H : y0, rw = horiz ? x1 - x0 : W, rh = horiz ? W : y1 - y0;
    wash(c, [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]], LEATHER, { layers: 2, spread: 0.3, edge: 0, alpha: 1 });
    // Slats across the band.
    if (horiz) for (let x = rx + 3; x < rx + rw - 1; x += 6) line(c, [[x, ry + 3], [x, ry + rh - 3]], 0.6, 0.35);
    else for (let y = ry + 3; y < ry + rh - 1; y += 6) line(c, [[rx + 3, y], [rx + rw - 3, y]], 0.6, 0.35);
    // Brass rails along both edges, inked on their outer side and riveted.
    c.fillStyle = rgba(BRASS, 0.95);
    if (horiz) {
      c.fillRect(rx, ry, rw, RAIL);
      c.fillRect(rx, ry + rh - RAIL, rw, RAIL);
      line(c, [[rx, ry], [rx + rw, ry]], 1);
      line(c, [[rx, ry + rh], [rx + rw, ry + rh]], 1);
      for (let x = rx + 6; x < rx + rw - 2; x += 12) for (const yy of [ry + 1.5, ry + rh - 1.5]) dot(c, x, yy);
    } else {
      c.fillRect(rx, ry, RAIL, rh);
      c.fillRect(rx + rw - RAIL, ry, RAIL, rh);
      line(c, [[rx, ry], [rx, ry + rh]], 1);
      line(c, [[rx + rw, ry], [rx + rw, ry + rh]], 1);
      for (let y = ry + 6; y < ry + rh - 2; y += 12) for (const xx of [rx + 1.5, rx + rw - 1.5]) dot(c, xx, y);
    }
    // Brass strips between the lanes.
    for (const off of dividers) {
      if (horiz) line(c, [[rx, a.y + off], [rx + rw, a.y + off]], DIVIDER, 0.9, BRASS);
      else line(c, [[a.x + off, ry], [a.x + off, ry + rh]], DIVIDER, 0.9, BRASS);
    }
    // A pale chevron down the middle of each lane, pointing the way goods ride.
    const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y), len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 28; d < len - 18; d += 48) {
      for (const off of centres) {
        const cx = a.x + dx * d + (horiz ? 0 : off), cy = a.y + dy * d + (horiz ? off : 0);
        if (horiz) line(c, [[cx - dx * 2, cy - 3], [cx + dx * 2, cy], [cx - dx * 2, cy + 3]], 1, 0.75, '#f2dca0');
        else line(c, [[cx - 3, cy - dy * 2], [cx, cy + dy * 2], [cx + 3, cy - dy * 2]], 1, 0.75, '#f2dca0');
      }
    }
  }

  const rail = (side: D, p: Pt) => {
    const x = p.x - H, y = p.y - H;
    c.fillStyle = rgba(BRASS, 0.95);
    if (side === 'N') { c.fillRect(x, y, W, RAIL); line(c, [[x, y], [x + W, y]], 1); }
    if (side === 'S') { c.fillRect(x, y + W - RAIL, W, RAIL); line(c, [[x, y + W], [x + W, y + W]], 1); }
    if (side === 'W') { c.fillRect(x, y, RAIL, W); line(c, [[x, y], [x, y + W]], 1); }
    if (side === 'E') { c.fillRect(x + W - RAIL, y, RAIL, W); line(c, [[x + W, y], [x + W, y + W]], 1); }
  };
  const bracket = (x: number, y: number) => {
    // A riveted brass corner plate.
    c.fillStyle = BRASS;
    c.fillRect(x - 2.5, y - 2.5, 5, 5);
    c.strokeStyle = INK;
    c.lineWidth = 0.8;
    c.strokeRect(x - 2.5, y - 2.5, 5, 5);
    dot(c, x, y);
  };
  const ang = (v: Pt) => Math.atan2(v.y, v.x);

  for (const [k, p] of nodes) {
    const ds = [...conn.get(k)!];
    const x = p.x - H, y = p.y - H;
    if (ds.length === 2 && DIRS[ds[0]].x === -DIRS[ds[1]].x && DIRS[ds[0]].y === -DIRS[ds[1]].y) continue; // straight through
    if (ds.length === 2) {
      // Curved corner: a quarter ring round the inside corner of the bend.
      const v1 = DIRS[ds[0]], v2 = DIRS[ds[1]];
      const o = { x: p.x + (v1.x + v2.x) * H, y: p.y + (v1.y + v2.y) * H };
      let a1 = ang({ x: -v1.x, y: -v1.y }), a2 = ang({ x: -v2.x, y: -v2.y });
      if (Math.abs(a2 - a1) > Math.PI) {
        if (a1 < a2) a1 += Math.PI * 2;
        else a2 += Math.PI * 2;
      }
      const s = Math.min(a1, a2), e = Math.max(a1, a2);
      c.save();
      c.beginPath();
      c.moveTo(o.x, o.y);
      c.arc(o.x, o.y, W, s, e);
      c.closePath();
      c.fillStyle = LEATHER;
      c.fill();
      c.strokeStyle = BRASS;
      c.lineWidth = RAIL;
      c.beginPath();
      c.arc(o.x, o.y, W - RAIL / 2, s, e);
      c.stroke();
      c.lineWidth = DIVIDER;
      for (const off of dividers) {
        c.beginPath();
        c.arc(o.x, o.y, H + off, s, e);
        c.stroke();
      }
      c.strokeStyle = INK;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(o.x, o.y, W, s, e);
      c.stroke();
      c.restore();
      for (let t = 1; t < 5; t++) {
        const a = s + ((e - s) * t) / 5;
        line(c, [[o.x + Math.cos(a) * 5, o.y + Math.sin(a) * 5], [o.x + Math.cos(a) * (W - 4), o.y + Math.sin(a) * (W - 4)]], 0.6, 0.35);
      }
      bracket(o.x, o.y);
      continue;
    }
    // Square plate for ends, T-junctions and crossings.
    c.fillStyle = LEATHER;
    c.fillRect(x, y, W, W);
    for (let i = 3; i < W - 3; i += 5) line(c, [[x + i, y + 3], [x + i, y + W - 3]], 0.5, 0.25);
    for (const side of ALL) if (!ds.includes(side)) rail(side, p);
    if (ds.length === 1) {
      const v = DIRS[ds[0]];
      for (const off of dividers) {
        if (v.x !== 0) line(c, [[x, p.y + off], [x + W, p.y + off]], DIVIDER, 0.9, BRASS);
        else line(c, [[p.x + off, y], [p.x + off, y + W]], DIVIDER, 0.9, BRASS);
      }
      // An iron end roller across the open end.
      const back = { x: p.x - v.x * (H - 3), y: p.y - v.y * (H - 3) };
      c.fillStyle = '#4a4e58';
      c.strokeStyle = INK;
      c.lineWidth = 0.8;
      if (v.x !== 0) {
        c.fillRect(back.x - 3, y + 2, 6, W - 4);
        c.strokeRect(back.x - 3, y + 2, 6, W - 4);
      } else {
        c.fillRect(x + 2, back.y - 3, W - 4, 6);
        c.strokeRect(x + 2, back.y - 3, W - 4, 6);
      }
    } else {
      for (const [cx, cy] of [[x, y], [x + W, y], [x, y + W], [x + W, y + W]]) bracket(cx, cy);
      c.save();
      c.fillStyle = BRASS;
      c.strokeStyle = INK;
      c.lineWidth = 0.9;
      c.beginPath();
      if (ds.length === 4) {
        // A turntable at a crossing.
        c.arc(p.x, p.y, 6, 0, Math.PI * 2);
      } else {
        // A diverter flap on the T's open side.
        const v = DIRS[ALL.find((d) => !ds.includes(d))!];
        c.moveTo(p.x - v.x * 6 + v.y * 5, p.y - v.y * 6 + v.x * 5);
        c.lineTo(p.x - v.x * 6 - v.y * 5, p.y - v.y * 6 - v.x * 5);
        c.lineTo(p.x + v.x * 2, p.y + v.y * 2);
        c.closePath();
      }
      c.fill();
      c.stroke();
      c.restore();
    }
  }
}

/** The point `t` (0 to 1) of the way along a run of points, and the direction the run goes there. */
export function pointAlong(run: Pt[], t: number): Pt & { dx: number; dy: number } {
  const parts = run.slice(1).map((p, i) => ({ a: run[i], b: p, len: Math.hypot(p.x - run[i].x, p.y - run[i].y) }));
  let d = Math.max(0, Math.min(1, t)) * parts.reduce((sum, p) => sum + p.len, 0);
  for (const { a, b, len } of parts) {
    const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    if (d <= len) return { x: a.x + dx * d, y: a.y + dy * d, dx, dy };
    d -= len;
  }
  const { a, b, len } = parts[parts.length - 1];
  return { ...b, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
}
