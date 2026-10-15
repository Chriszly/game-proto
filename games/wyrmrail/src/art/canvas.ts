import Phaser from 'phaser';
import { sharpRes } from '../../../../shared/scaling';

// Drawing helpers for the isometric art: shapes are painted on a 2D canvas, then the canvas is
// added as a texture.

export type Ctx = CanvasRenderingContext2D;
export type Pt = { x: number; y: number };

/** Canvas pixels per shown pixel of each baked texture, by key. */
const RES = new Map<string, number>();

/**
 * Paints a texture shown `w` x `h` pixels with `draw` and adds it as the texture `key`. The canvas
 * is `sharpRes` times that, so the art stays sharp on big screens; `draw` paints in shown pixels.
 * Show it with `fit`.
 */
export function bakeCanvas(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  const res = sharpRes(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * res);
  canvas.height = Math.ceil(h * res);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(res, res);
  ctx.lineJoin = 'round';
  draw(ctx);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  RES.set(key, res);
}

/** Sizes an image showing a baked texture to `sx` x `sy` times the texture's shown size. */
export function fit<T extends Phaser.GameObjects.Image>(img: T, sx = 1, sy = sx): T {
  const res = RES.get(img.texture.key) ?? 1;
  return img.setScale(sx / res, sy / res);
}

export function poly(ctx: Ctx, pts: Pt[], fill?: string | CanvasGradient, stroke?: string, lineWidth = 1) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function line(ctx: Ctx, a: Pt, b: Pt, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

/** A soft shadow on the ground. */
export function shadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.28) {
  ctx.fillStyle = `rgba(30,40,20,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A shaded ball, lit from the top left. */
export function sphere(ctx: Ctx, x: number, y: number, r: number, base: string, light: string, dark: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
  g.addColorStop(0, light);
  g.addColorStop(0.6, base);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, rotation = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
}

/** Mixes two '#rrggbb' colours: `t` 0 is `a`, 1 is `b`. */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** A '#rrggbb' string for a 0xrrggbb number. */
export const css = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
