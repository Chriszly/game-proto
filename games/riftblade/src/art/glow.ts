/**
 * The "Glow Vector" toolkit: everything is painted in code onto canvases (at `sharpRes`, so it stays
 * crisp on big screens) and added as textures. Neon rims come from the canvas shadow blur.
 */
import Phaser from 'phaser';
import { sharpRes } from '../../../../shared/scaling';

export type Ctx = CanvasRenderingContext2D;

/** The palette of the field and the droids. Heroes take their colours from their schemes. */
export const C = {
  night: '#070b16',
  navy: '#0d1426',
  grid: 'rgba(80,140,255,0.07)',
  dune: '#ffb347',
  ink: '#0b0f1c',
  text: '#eef4ff',
  muted: '#8ea0c4',
  shard: '#7dffcf',
  clanker: '#ff5a6e',
  roller: '#ffb347',
  elite: '#ffe066',
  boss: '#ff8a3c',
  /** The wild beasts of the Swamp world. */
  beast: '#c6ff3d',
  toad: '#e8ff6a',
  /** The Iron Dominion of the Ice world. */
  iron: '#8c9cff',
  ironLight: '#d6ddff',
  /** The Hollow cult of the Lava world. */
  hollow: '#b65cff',
  ember: '#ffcf5a',
  credits: '#ffd36b',
  heal: '#7dffa0',
  xp: '#5fe0c0',
  hp: '#7dffa0',
  danger: '#ff6a4d',
  panel: '#101a30',
  line: 'rgba(160,190,255,0.22)',
};

/** A CSS colour as a Phaser number. */
export const hex = (css: string) => Phaser.Display.Color.HexStringToColor(css).color;

/** A colour lightened toward white (`k` > 0) or darkened toward black (`k` < 0). */
export function shade(css: string, k: number) {
  const c = Phaser.Display.Color.HexStringToColor(css);
  const to = k > 0 ? 255 : 0;
  const t = Math.abs(k);
  const mix = (v: number) => Math.round(v + (to - v) * t);
  return `rgb(${mix(c.red)},${mix(c.green)},${mix(c.blue)})`;
}

/** Shadow blur scales with the canvas, unlike shapes, so it is set through this. */
let blurScale = 1;

/**
 * Paints a `w` x `h` texture (in game pixels) under `key`: `draw` works in game pixels while the
 * canvas holds `sharpRes` times as many.
 */
export function paint(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void) {
  const res = sharpRes(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * res);
  canvas.height = Math.ceil(h * res);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(res, res);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  blurScale = res;
  draw(ctx);
  blurScale = 1;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, canvas)!;
  // Phaser draws a frame at its source's resolution, and sizes images by its source size.
  texture.source[0].resolution = res;
  const frame = texture.get() as unknown as { data: { sourceSize: { w: number; h: number } } };
  Object.assign(frame.data.sourceSize, { w: Math.ceil(w), h: Math.ceil(h) });
}

/** Sets the glow for what is drawn next, scaled with the canvas and any `ctx.scale` given as `zoom`. */
export function glow(ctx: Ctx, color: string, blur: number, zoom = 1) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * blurScale * zoom;
}

/** A filled body with a glowing rim in `rim`. */
export function shape(ctx: Ctx, path: () => void, fill: string, rim: string, blur = 10, zoom = 1) {
  ctx.save();
  glow(ctx, rim, blur, zoom);
  ctx.fillStyle = fill;
  ctx.beginPath();
  path();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** A glowing stroke with a white-hot core: bolts, beams and edges. */
export function beam(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, w = 4, blur = 14, zoom = 1) {
  ctx.save();
  ctx.lineCap = 'round';
  glow(ctx, color, blur, zoom);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = w * 0.35;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** A glowing outline of a path, no fill. */
export function outline(ctx: Ctx, path: () => void, color: string, w = 2, blur = 10, zoom = 1) {
  ctx.save();
  glow(ctx, color, blur, zoom);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  path();
  ctx.stroke();
  ctx.restore();
}
