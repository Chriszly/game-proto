import Phaser from 'phaser';
import { sharpRes } from '../../../../shared/scaling';

// Cut-paper craft: every shape is a piece of card stock with a slightly wobbly hand-cut edge, a
// soft drop shadow under it, a multiplied paper grain and a faint light rim along its cut. Pieces
// are painted on 2D canvases and added as textures; nothing here runs per frame.

export type Pt = [number, number];
type Ctx = CanvasRenderingContext2D;

/** A small seeded RNG (mulberry32), so the hand-cut wobble and grain come out the same every load. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = seeded(29);
export const reseed = (seed: number) => (rand = seeded(seed));

let grain: HTMLCanvasElement | null = null;
/** A tile of paper fibres: light noise with a few short darker strands. */
function grainTile() {
  if (grain) return grain;
  const r = seeded(11);
  grain = document.createElement('canvas');
  grain.width = grain.height = 128;
  const g = grain.getContext('2d')!;
  const id = g.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 205 + r() * 50;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(150,140,120,${r() * 0.3})`;
    g.lineWidth = 0.7;
    g.beginPath();
    const x = r() * 128;
    const y = r() * 128;
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 16, y + (r() - 0.5) * 16);
    g.stroke();
  }
  return grain;
}

/** How many canvas pixels each sketch has per game pixel, by canvas. */
const resOf = new WeakMap<HTMLCanvasElement, number>();

/**
 * A new canvas of this size in game pixels and its context, which draws in game pixels. The canvas
 * itself has more pixels on a big screen (`sharpRes`), so the art stays as sharp as the screen.
 */
export function sketch(w: number, h: number) {
  const res = sharpRes(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * res);
  canvas.height = Math.ceil(h * res);
  resOf.set(canvas, res);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(res, res);
  return { canvas, ctx };
}

/**
 * Canvas pixels per game pixel of a sketch's context. Shadows ignore the context's scale, so their
 * blur and offset are multiplied by it.
 */
export const resOfCtx = (ctx: Ctx) => resOf.get(ctx.canvas) ?? 1;

/**
 * Adds a sketch's canvas as the texture `key`, replacing any texture of that name. The texture
 * shows at the sketch's size in game pixels however many pixels its canvas has: Phaser draws a
 * frame at its canvas size over the source's `resolution`, and the trim gives game objects the
 * game-pixel size for origins, hit areas and `realWidth`.
 */
export function addTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, canvas)!;
  const res = resOf.get(canvas) ?? 1;
  if (res === 1) return;
  const [w, h] = [canvas.width / res, canvas.height / res];
  texture.source[0].resolution = res;
  texture.get().setTrim(w, h, 0, 0, w, h);
}

// Shapes, as point lists.
export const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const circ = (x: number, y: number, rx: number, ry = rx, n = 28): Pt[] =>
  [...Array(n).keys()].map((i) => [x + Math.cos((i / n) * Math.PI * 2) * rx, y + Math.sin((i / n) * Math.PI * 2) * ry]);
/** A rounded rectangle. */
export function rr(x: number, y: number, w: number, h: number, r: number): Pt[] {
  r = Math.min(r, w / 2, h / 2);
  const p: Pt[] = [];
  const corners = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]];
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= 6; k++) {
    const a = ((a0 + k * 15) * Math.PI) / 180;
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return p;
}
/** A pointy-top hexagon of radius `r` around a centre. */
export const hex = (x: number, y: number, r: number): Pt[] =>
  [...Array(6).keys()].map((i) => {
    const a = ((60 * i - 90) * Math.PI) / 180;
    return [x + r * Math.cos(a), y + r * Math.sin(a)];
  });
/** A cosine-eased line through some points, for hill ridges. */
export function smooth(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    for (let k = 0; k < 10; k++) {
      const t = k / 10;
      const e = (1 - Math.cos(t * Math.PI)) / 2;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * e]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** The outline wobbled a little, like card cut by hand with scissors. */
function wobble(pts: Pt[], amt: number, step = 9): Pt[] {
  if (amt <= 0) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [a, b] = [pts[i], pts[(i + 1) % pts.length]];
    const k = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      out.push([a[0] + (b[0] - a[0]) * t + (rand() - 0.5) * amt, a[1] + (b[1] - a[1]) * t + (rand() - 0.5) * amt]);
    }
  }
  return out;
}

export function trace(ctx: Ctx, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

const hexToRgb = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** A colour mixed toward white (t > 0) or black (t < 0). */
export function shade(c: string, t: number) {
  if (!c.startsWith('#')) return c;
  const to = t > 0 ? 255 : 0;
  const k = Math.abs(t);
  return '#' + hexToRgb(c).map((v) => Math.round(v * (1 - k) + to * k).toString(16).padStart(2, '0')).join('');
}

export interface CutOptions {
  /** How high the card sits above what is under it, in pixels: the shadow's offset and softness. */
  depth?: number;
  /** Shadow strength, 0 to 1. */
  shadow?: number;
  /** Grain strength, 0 to 1. */
  grain?: number;
  /** How far the cut edge wobbles, in pixels. */
  wob?: number;
}

/** Cuts one piece of card: its shadow, its colour, the paper grain and a light rim. */
export function cut(ctx: Ctx, pts: Pt[], color: string, o: CutOptions = {}) {
  const p = wobble(pts, o.wob ?? 0.8);
  const d = o.depth ?? 3;
  const res = resOfCtx(ctx);
  ctx.save();
  if (d > 0) {
    ctx.shadowColor = `rgba(42,26,8,${o.shadow ?? 0.38})`;
    ctx.shadowBlur = d * 2.2 * res;
    ctx.shadowOffsetX = d * 0.5 * res;
    ctx.shadowOffsetY = d * 0.9 * res;
  }
  trace(ctx, p);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  ctx.save();
  trace(ctx, p);
  ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = o.grain ?? 0.35;
  ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat')!;
  // Reach back to the canvas's corner when the context is shifted right or down (the filling view's backgrounds).
  const m = ctx.getTransform();
  const [x0, y0] = [Math.min(0, -m.e / m.a), Math.min(0, -m.f / m.d)];
  ctx.fillRect(x0, y0, ctx.canvas.width / res - x0, ctx.canvas.height / res - y0);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.35;
  trace(ctx, p);
  ctx.strokeStyle = shade(color, 0.35);
  ctx.lineWidth = 0.8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  return p;
}

/** A dashed or plain outline with no card, for spots not built yet and the build preview. */
export function outline(ctx: Ctx, pts: Pt[], color: string, width: number, dash: number[] = []) {
  ctx.save();
  ctx.setLineDash(dash);
  trace(ctx, pts);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}
