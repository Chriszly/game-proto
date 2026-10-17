// A tiny software renderer for low-poly models: meshes are lists of flat polygons in 3D, built from
// a few primitives (boxes, prisms, gems, slabs) under a transform stack. `render` turns them, lights
// them from the top left in three toon steps, sorts them back to front, fills them on a 2D canvas
// and rings the whole model in a dark ink outline.
// Everything is baked once at boot into sprite frames; nothing here runs per game frame.

export type V3 = [number, number, number];
export type RGB = [number, number, number];
/** A 3x4 affine matrix, row-major: [m00 m01 m02 tx, m10 m11 m12 ty, m20 m21 m22 tz]. */
export type M = number[];

export const I: M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

export function mul(a: M, b: M): M {
  const r = new Array<number>(12);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + (j === 3 ? a[i * 4 + 3] : 0);
    }
  }
  return r;
}
/** Multiplies left to right: chain(A, B, C) applies C first. */
export function chain(...ms: M[]): M {
  return ms.reduce((a, b) => mul(a, b), I);
}
export const T = (x: number, y: number, z: number): M => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
export const S = (x: number, y = x, z = x): M => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0];
export function Rx(a: number): M {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0];
}
export function Ry(a: number): M {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0];
}
export function Rz(a: number): M {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0];
}
/** A limb that hangs down (-y) swung forward (+z) by `a` radians about its top. */
export const swing = (a: number): M => Rx(-a);

export function apply(m: M, v: V3): V3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3],
    m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7],
    m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11],
  ];
}

export function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface Poly {
  pts: V3[];
  color: RGB;
  /** 0..1: how much the face glows regardless of the light (crystals, flames). */
  glow: number;
}

/**
 * A model under construction. `at` runs a builder under an extra transform; the primitives push
 * polygons already in model space. Each primitive passes its own centre, so every face's normal can
 * be turned outward without caring about winding.
 */
export class Model {
  polys: Poly[] = [];
  normals: V3[] = [];
  private m: M = I;

  at(m: M, build: () => void) {
    const prev = this.m;
    this.m = mul(prev, m);
    build();
    this.m = prev;
  }

  /** Adds a face given in local space; `centre` (local) is a point inside the solid it bounds. */
  face(local: V3[], centre: V3, color: RGB, glow = 0) {
    const pts = local.map((p) => apply(this.m, p));
    const c = apply(this.m, centre);
    let n = normal(pts);
    const mid = centroid(pts);
    if (dot(n, sub(mid, c)) < 0) n = [-n[0], -n[1], -n[2]];
    this.polys.push({ pts, color, glow });
    this.normals.push(n);
  }
}

function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a: V3, b: V3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function centroid(pts: V3[]): V3 {
  const c: V3 = [0, 0, 0];
  for (const p of pts) {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  }
  return [c[0] / pts.length, c[1] / pts.length, c[2] / pts.length];
}
function normal(pts: V3[]): V3 {
  // Newell's method: robust for any planar polygon.
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

// ---------------------------------------------------------------------------------------------
// Primitives. y is up, +z faces the viewer when the model is not turned.

/**
 * A box from (x0, y0, z0) to (x1, y1, z1). `top` scales the top face around its centre (a taper),
 * so a box can also be a frustum.
 */
export function box(md: Model, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: RGB, top = 1, glow = 0) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const tx = (v: number) => cx + (v - cx) * top;
  const tz = (v: number) => cz + (v - cz) * top;
  const b: V3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
  const t: V3[] = [[tx(x0), y1, tz(z0)], [tx(x1), y1, tz(z0)], [tx(x1), y1, tz(z1)], [tx(x0), y1, tz(z1)]];
  const c: V3 = [cx, (y0 + y1) / 2, cz];
  md.face(b, c, color, glow);
  md.face(t, c, color, glow);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    md.face([b[i], b[j], t[j], t[i]], c, color, glow);
  }
}

/** A prism around the y axis with `n` sides, from radius rb at y0 to rt at y1 (rt 0 is a cone). */
export function prism(md: Model, rb: number, rt: number, y0: number, y1: number, n: number, color: RGB, turn = 0, glow = 0) {
  const ring = (r: number, y: number): V3[] =>
    Array.from({ length: n }, (_, i) => {
      const a = turn + (i * 2 * Math.PI) / n;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    });
  const b = ring(rb, y0);
  const c: V3 = [0, (y0 + y1) / 2, 0];
  if (rb > 0) md.face(b, c, color, glow);
  if (rt <= 0) {
    for (let i = 0; i < n; i++) md.face([b[i], b[(i + 1) % n], [0, y1, 0]], c, color, glow);
    return;
  }
  const t = ring(rt, y1);
  md.face(t, c, color, glow);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    md.face([b[i], b[j], t[j], t[i]], c, color, glow);
  }
}

/** A double cone (a cut gem or crystal): `n` sides of radius r at y=mid, points at y0 and y1. */
export function gem(md: Model, r: number, y0: number, mid: number, y1: number, n: number, color: RGB, glow = 0, turn = 0) {
  const ring: V3[] = Array.from({ length: n }, (_, i) => {
    const a = turn + (i * 2 * Math.PI) / n;
    return [Math.cos(a) * r, mid, Math.sin(a) * r];
  });
  const c: V3 = [0, mid, 0];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    md.face([ring[i], ring[j], [0, y1, 0]], c, color, glow);
    md.face([ring[i], ring[j], [0, y0, 0]], c, color, glow);
  }
}

const PHI = (1 + Math.sqrt(5)) / 2;
const ICO_V: V3[] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
];
const ICO_F = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];
/** An icosahedron of radius r, the faceted ball used for heads, rocks and leaves. */
export function ico(md: Model, r: number, color: RGB | ((i: number) => RGB), glow = 0) {
  const k = r / Math.hypot(1, PHI);
  ICO_F.forEach((f, i) => {
    md.face(f.map((v) => [ICO_V[v][0] * k, ICO_V[v][1] * k, ICO_V[v][2] * k] as V3), [0, 0, 0], typeof color === 'function' ? color(i) : color, glow);
  });
}

/** A flat shape (x, y points, convex) extruded along z from z0 to z1. */
export function slab(md: Model, shape: [number, number][], z0: number, z1: number, color: RGB, glow = 0, rim?: RGB) {
  const n = shape.length;
  let cx = 0, cy = 0;
  for (const [x, y] of shape) {
    cx += x / n;
    cy += y / n;
  }
  const c: V3 = [cx, cy, (z0 + z1) / 2];
  const f: V3[] = shape.map(([x, y]) => [x, y, z1]);
  const b: V3[] = shape.map(([x, y]) => [x, y, z0]);
  md.face(f, c, color, glow);
  md.face(b, c, color, glow);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    md.face([f[i], f[j], b[j], b[i]], c, rim ?? color, glow);
  }
}

// ---------------------------------------------------------------------------------------------
// The camera and the light.

/** The camera looks down at the map from the south, this many radians above the horizon. */
export const ELEVATION = 0.62;
const SIN_E = Math.sin(ELEVATION);
const COS_E = Math.cos(ELEVATION);
/** Towards the camera, and towards the light (top left, a little in front). */
const VIEW: V3 = [0, SIN_E, COS_E];
const LIGHT: V3 = (() => {
  const l: V3 = [-0.55, 0.8, 0.45];
  const n = Math.hypot(...l);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

/** Where a model point lands on screen, relative to the model's origin, in model units. */
export function project(p: V3): [number, number] {
  return [p[0], -p[1] * COS_E + p[2] * SIN_E];
}

export interface RenderOpts {
  /** Turns the model about y first (radians); 0 faces the viewer. */
  yaw?: number;
  /** Extra light; 1 is normal. */
  bright?: number;
  /** Plain Lambert shading with no outline, instead of the toon look. */
  flat?: boolean;
  /** Leaves out the ink outline of the toon look (a sprite sheet adds it afterwards, see `inkOutline`). */
  noInk?: boolean;
}

/** The toon look: light falls into these steps (from dark to lit), colours are this much richer. */
const CEL = [
  { above: 0.95, b: 1.08 },
  { above: 0.7, b: 0.88 },
  { above: -Infinity, b: 0.66 },
];
const SATURATE = 1.25;
/** The ink outline: its colour, and its width in model units. */
export const INK = '#1a1220';
export const INK_WIDTH = 1.1;

/**
 * Draws a model on `ctx` with its origin (the feet) at (ox, oy), `scale` canvas pixels per model
 * unit. Faces turned away from the camera are skipped; the rest are drawn far to near.
 */
export function render(ctx: CanvasRenderingContext2D, md: Model, ox: number, oy: number, scale: number, opts: RenderOpts = {}) {
  const yaw = opts.yaw ?? 0;
  const bright = opts.bright ?? 1;
  const toon = !opts.flat;
  const rot = Ry(yaw);
  const items: { pts: [number, number][]; depth: number; fill: string }[] = [];
  md.polys.forEach((poly, i) => {
    const n = apply(rot, md.normals[i]);
    if (dot(n, VIEW) <= 0.01) return;
    const pts3 = poly.pts.map((p) => apply(rot, p));
    let depth = 0;
    const pts = pts3.map((p) => {
      depth += p[1] * SIN_E + p[2] * COS_E;
      const [x, y] = project(p);
      return [ox + x * scale, oy + y * scale] as [number, number];
    });
    const lambert = Math.max(0, dot(n, LIGHT));
    const facing = Math.max(0, dot(n, VIEW));
    let b = 0.42 + 0.62 * lambert + 0.1 * facing;
    let [r, g, bl] = poly.color;
    if (toon) {
      // Light in three flat steps, and a little more colour.
      b = CEL.find((c) => b > c.above)!.b;
      const m = (r + g + bl) / 3;
      [r, g, bl] = [m + (r - m) * SATURATE, m + (g - m) * SATURATE, m + (bl - m) * SATURATE];
    }
    b *= bright;
    b = b * (1 - poly.glow) + Math.max(b, 1.05) * poly.glow;
    const lift = Math.max(0, b - 1) * 60;
    const fill = `rgb(${clamp(r * b + lift)},${clamp(g * b + lift)},${clamp(bl * b + lift)})`;
    items.push({ pts, depth: depth / pts.length, fill });
  });
  items.sort((a, b) => a.depth - b.depth);
  ctx.lineJoin = 'round';
  const path = (pts: [number, number][]) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };
  if (toon && !opts.noInk) {
    // The ink outline: every face stroked fat in dark ink first, so the faces drawn over it leave
    // only a rim round the silhouette.
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, scale * INK_WIDTH);
    for (const it of items) {
      path(it.pts);
      ctx.stroke();
    }
  }
  ctx.lineWidth = Math.max(0.6, scale * 0.35);
  for (const it of items) {
    path(it.pts);
    ctx.fillStyle = ctx.strokeStyle = it.fill;
    ctx.fill();
    ctx.stroke();
  }
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** A small seeded random generator for the art, so every boot paints the same map. */
export function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
