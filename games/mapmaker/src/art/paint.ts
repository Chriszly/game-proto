import Phaser from 'phaser';

// The look of a modern topographic survey sheet: hypsometric tints, brown contours, hillshade and
// clean black map symbols, with the survey overprint (stations, values, the viewshed) in magenta.
// Everything is painted on 2D canvases in code and added as textures; no asset files. Textures are
// painted at HI times their size and shown at 1 / HI, so they stay smooth when the game is scaled.

export type Ctx = CanvasRenderingContext2D;

/** How much finer than the game's pixels textures are painted; show them at 1 / HI. */
export const HI = 2;

export const INK = '#1d2329';
export const MAGENTA = '#d6247f';
export const BROWN = '#a8693a';
export const BLUE = '#2f7fb8';
export const GREEN = '#2f6a24';
export const TREE = '#4c8a3a';
export const GOLD = '#e3a92a';
export const GOLD_DARK = '#8a5f10';
export const SHEET = '#fbfaf6';
export const VELLUM = '#f6f5ef';
export const GREY = '#6b7680';
export const SLATE = '#4d5862';
export const RULE = '#d5d9dc';
export const TRACK = '#e3e6e8';
export const SKIN = '#e37100';
export const MUZZLE = '#ffdcc7';

/** The same colours as numbers, for Phaser graphics. */
export const hex = (c: string) => parseInt(c.slice(1), 16);

/** A small seeded random, so the art is the same every time without touching Math.random. */
export function rng(seed: number) {
  let s = Math.abs(Math.floor(seed)) % 2147483646 + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Paints a texture at HI and adds it under `key` (replacing an old one). */
export function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * HI);
  canvas.height = Math.ceil(h * HI);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(HI, HI);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

export function poly(ctx: Ctx, pts: [number, number][], fill?: string | null, stroke?: string | null, lw = 1) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill?: string | null, stroke?: string | null, lw = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A star with `n` points, used for the compass rose. */
export function star(ctx: Ctx, x: number, y: number, r1: number, r2: number, n: number, fill: string, stroke: string, lw = 1) {
  const pts: [number, number][] = [];
  for (let k = 0; k < n * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / n;
    const r = k % 2 ? r2 : r1;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  poly(ctx, pts, fill, stroke, lw);
}
