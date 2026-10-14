import Phaser from 'phaser';

// The illuminated-manuscript look: flat painted colours on vellum, every shape outlined in brown-black
// ink, with thin white highlights along lit edges and burnished gold leaf for coins, the moon and
// trims. Art is painted on 2D canvases and added as textures. Most pieces are drawn in "page units"
// at twice screen size (the mockup's scale) and scaled down by `ctx.scale(0.5)`, so ink lines thin
// out to a pen's width.

export type Ctx = CanvasRenderingContext2D;
export type Pt = [number, number];

/** The pigments, as CSS colours for the canvases. */
export const C = {
  ink: '#2b1b12',
  vellum: '#f1e4c4',
  vellumLight: '#f7ead0',
  vellumDark: '#e6d2a8',
  lapis: '#2b4a9c',
  lapisDeep: '#1f3576',
  madder: '#8c2d4e',
  verm: '#d4452e',
  leaf: '#3f7a3a',
  turf: '#5e9a46',
  heal: '#4fb56a',
  goldPale: '#fbe9b0',
  gold: '#d9a83a',
  goldLight: '#f4d06a',
  goldDot: '#e8c25a',
  silver: '#c9ced8',
  steel: '#b8bfcc',
  iron: '#8a8fa0',
  wood: '#9a6a3e',
  woodDark: '#7a4a2a',
  rose: '#e7b7a8',
  pink: '#e2aa98',
  frost: '#c9d2ee',
};

/** The same pigments as numbers, for Phaser Graphics and text tints. */
export const N = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, parseInt(v.slice(1), 16)])) as Record<keyof typeof C, number>;

/** A serif book hand from the system's fonts (no web fonts). */
export const SERIF = 'Georgia, "Times New Roman", "DejaVu Serif", serif';

/** A repeatable random sequence, so the art comes out the same on every load. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Paints a `w` x `h` texture with a 2D canvas. */
export function paint(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  const ctx = canvas.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/** A closed path through the points, filled and inked. */
export function poly(ctx: Ctx, pts: Pt[], fill: string | CanvasGradient | null, lw = 3, stroke: string | null = C.ink) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && lw > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** A circle, filled and inked. */
export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient | null, lw = 3) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (lw > 0) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** An ellipse, filled and inked. */
export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, lw = 2.5, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** A white highlight stroke along a lit edge. */
export function hl(ctx: Ctx, pts: Pt[], lw = 2) {
  ctx.strokeStyle = 'rgba(255,250,235,0.85)';
  ctx.lineWidth = lw;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

/** Burnished gold leaf: a diagonal sweep from pale to deep gold. */
export function gold(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#fbe38a');
  g.addColorStop(0.45, '#d9a83a');
  g.addColorStop(0.7, '#f4d06a');
  g.addColorStop(1, '#a8761e');
  return g;
}

/** A gold six-pointed star, inked. */
export function star6(ctx: Ctx, x: number, y: number, r: number, lw = 1.5) {
  const pts: Pt[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const q = i % 2 ? r * 0.45 : r;
    pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]);
  }
  poly(ctx, pts, gold(ctx, x - r, y - r, x + r, y + r), lw);
}

/** A heart's path centred on (x, y), about `s` wide. */
export function heartPath(ctx: Ctx, x: number, y: number, s: number) {
  const k = s / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + k * 0.9);
  ctx.bezierCurveTo(x - k * 1.25, y + k * 0.05, x - k * 1.05, y - k * 0.95, x - k * 0.5, y - k * 0.92);
  ctx.bezierCurveTo(x - k * 0.2, y - k * 0.9, x, y - k * 0.65, x, y - k * 0.45);
  ctx.bezierCurveTo(x, y - k * 0.65, x + k * 0.2, y - k * 0.9, x + k * 0.5, y - k * 0.92);
  ctx.bezierCurveTo(x + k * 1.05, y - k * 0.95, x + k * 1.25, y + k * 0.05, x, y + k * 0.9);
  ctx.closePath();
}

/** A gold-leaf bezant: an inked rim, a ring and a rosette of dots, squashed sideways by `sq` as it spins. */
export function bezant(ctx: Ctx, x: number, y: number, r: number, sq = 1, lw = 2.5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sq, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = gold(ctx, -r, -r, r, r);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = lw / sq;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(120,70,10,0.8)';
  ctx.lineWidth = (lw * 0.6) / sq;
  ctx.stroke();
  ctx.fillStyle = '#9a6a14';
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.4, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,240,0.8)';
  ctx.fill();
  ctx.restore();
}

/** Mixes two CSS hex colours by `t` (0 to 1); `t` above 1 is not used. */
export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const to = f >= 1 ? 255 : 0;
  const t = f >= 1 ? f - 1 : 1 - f;
  const ch = (s: number) => Math.round(((n >> s) & 255) + (to - ((n >> s) & 255)) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
