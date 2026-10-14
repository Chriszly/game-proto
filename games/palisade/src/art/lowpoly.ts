import Phaser from 'phaser';

// The low-poly toolkit every texture is painted with: flat polygons on a 2D canvas, faceted parts
// shaded by a light from the top left, and soft blurred shadows falling to the lower right. Each
// texture is painted once at boot onto its own canvas and added with `textures.addCanvas`.

export type Pt = [number, number];
type Ctx = CanvasRenderingContext2D;

/** Where the light comes from: the top left. */
const LX = -0.6;
const LY = -0.8;

/** Mixes two '#rrggbb' colours, `t` of the way from a to b. */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
}
export const dark = (c: string, f: number) => mix(c, '#000000', f);
export const light = (c: string, f: number) => mix(c, '#ffffff', f);
/** A colour lit by `l` from 0 (in shadow) through 0.5 (as is) to 1 (in full light). */
export const shade = (c: string, l: number) => (l < 0.5 ? mix(dark(c, 0.42), c, l * 2) : mix(c, light(c, 0.32), (l - 0.5) * 2));
/** A '#rrggbb' colour as a number, for Phaser. */
export const hex = (c: string) => parseInt(c.slice(1), 16);

/** A seeded random generator, so the art comes out the same on every load (and never touches Math.random). */
export function seeded(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export const ngon = (x: number, y: number, rx: number, ry: number, n: number, rot = 0): Pt[] =>
  [...Array(n).keys()].map((i) => [x + Math.cos(rot + (i / n) * Math.PI * 2) * rx, y + Math.sin(rot + (i / n) * Math.PI * 2) * ry]);
export const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
/** A rectangle with its corners cut off by `c`. */
export const chamfer = (x: number, y: number, w: number, h: number, c: number): Pt[] => [
  [x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c],
];
/** A point on the quadratic curve from a over c to b. */
export const quad = (a: Pt, c: Pt, b: Pt, t: number): Pt => [
  (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];

function path(ctx: Ctx, pts: Pt[], close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
}

/** A filled polygon, optionally outlined. */
export function poly(ctx: Ctx, pts: Pt[], fill: string | null, stroke?: string, lw = 1) {
  path(ctx, pts);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function line(ctx: Ctx, pts: Pt[], stroke: string, lw = 1, cap: CanvasLineCap = 'round') {
  path(ctx, pts, false);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/**
 * A flat-shaded part: a low pyramid raised over the outline, each side lit by how much it faces
 * the light. `k` sharpens the contrast, `off` moves the apex towards the light.
 */
export function facet(ctx: Ctx, pts: Pt[], base: string, o: { k?: number; off?: number; edge?: boolean } = {}) {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  cx /= pts.length;
  cy /= pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  const ax = cx - bw * (o.off ?? 0.12);
  const ay = cy - bh * (o.off ?? 0.12);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    let nx = q[1] - p[1];
    let ny = -(q[0] - p[0]);
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const mx = (p[0] + q[0]) / 2 - cx;
    const my = (p[1] + q[1]) / 2 - cy;
    if (nx * mx + ny * my < 0) {
      nx = -nx;
      ny = -ny;
    }
    const l = Math.max(0, Math.min(1, 0.5 + 0.5 * (nx * LX + ny * LY) * (o.k ?? 1)));
    const col = shade(base, l);
    poly(ctx, [[ax, ay], p, q], col, col, 0.5);
  }
  if (o.edge !== false) poly(ctx, pts, null, 'rgba(20,14,10,0.45)', 0.8);
}

/** A faceted gem or button face: a ring of wedges round the centre, lit from the top left. */
export function gem(ctx: Ctx, x: number, y: number, r: number, n: number, rot: number, dim: string, bright: string) {
  const ring = ngon(x, y, r, r, n, rot);
  for (let i = 0; i < n; i++) {
    const m = ((i + 0.5) / n) * Math.PI * 2 + rot;
    const l = 0.5 + 0.5 * (Math.cos(m) * LX + Math.sin(m) * LY);
    poly(ctx, [[x, y], ring[i], ring[(i + 1) % n]], mix(dim, bright, l));
  }
}

/** Draws `fn` blurred and faded: a soft shadow. */
export function softShadow(ctx: Ctx, fn: () => void, blur = 4, alpha = 0.35) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.globalAlpha = alpha;
  fn();
  ctx.restore();
}

/** Paints a w x h canvas with `draw` and adds it as the texture `key`. */
export function paint(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}
