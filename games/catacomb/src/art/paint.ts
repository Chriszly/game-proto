import Phaser from 'phaser';
import { PixelCanvas, padRows, seeded, type Palette } from './pixelArt';

// The painterly look: a picture is drawn plainly on a canvas, then repainted with brush strokes,
// biggest brush first, each later pass only where the picture still differs from what is painted
// (after Hertzmann's "painterly rendering with curved brush strokes", with oval dabs). Each dab
// lies across the light's gradient, so strokes follow the shapes' edges.

export interface PaintOptions {
  /** Brush radii in pixels, biggest first. */
  sizes: number[];
  /** Seed for the dabs, so the art comes out the same on every load. */
  seed: number;
  /** How far (summed over red, green and blue) the painting may differ before a smaller brush fixes it. */
  threshold?: number;
  /** Canvas grain strength, 0 for none. */
  grain?: number;
  /** Darkens the edges, 0 for none. */
  vignette?: number;
  /** For sprites: keep the picture's own outline, softened a little. */
  cutout?: boolean;
}

const blurredCopy = (src: HTMLCanvasElement, r: number) => {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext('2d')!;
  x.filter = `blur(${r}px)`;
  x.drawImage(src, 0, 0);
  x.filter = 'none';
  return c;
};

/** Repaints `src` with brush strokes and returns the painting, the same size. */
export function paint(src: HTMLCanvasElement, opts: PaintOptions) {
  const { width: W, height: H } = src;
  const rnd = seeded(opts.seed);
  const out = blurredCopy(src, opts.sizes[0] * 0.6);
  const ctx = out.getContext('2d')!;
  const threshold = opts.threshold ?? 22;
  for (const R of opts.sizes) {
    const ref = blurredCopy(src, Math.max(0.4, R * 0.35)).getContext('2d')!.getImageData(0, 0, W, H).data;
    const cur = ctx.getImageData(0, 0, W, H).data;
    const step = Math.max(1, Math.round(R * 0.85));
    const dabs: [number, number][] = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const i = (y * W + x) * 4;
        if (opts.cutout && ref[i + 3] < 110) continue;
        const err = Math.abs(cur[i] - ref[i]) + Math.abs(cur[i + 1] - ref[i + 1]) + Math.abs(cur[i + 2] - ref[i + 2]) + Math.abs(cur[i + 3] - ref[i + 3]);
        if (R === opts.sizes[0] || err > threshold) dabs.push([x + (rnd() - 0.5) * step, y + (rnd() - 0.5) * step]);
      }
    }
    for (let i = dabs.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [dabs[i], dabs[j]] = [dabs[j], dabs[i]];
    }
    const at = (x: number, y: number) => (Math.max(0, Math.min(H - 1, y | 0)) * W + Math.max(0, Math.min(W - 1, x | 0))) * 4;
    const lum = (x: number, y: number) => {
      const i = at(x, y);
      return ref[i] * 0.3 + ref[i + 1] * 0.59 + ref[i + 2] * 0.11;
    };
    const d = Math.max(1, R * 0.6);
    for (const [x, y] of dabs) {
      const i = at(x, y);
      if (opts.cutout && ref[i + 3] < 110) continue;
      const gx = lum(x + d, y) - lum(x - d, y);
      const gy = lum(x, y + d) - lum(x, y - d);
      const angle = Math.hypot(gx, gy) > 4 ? Math.atan2(gy, gx) + Math.PI / 2 : 0.35 * Math.sin(x * 0.004 + y * 0.003) + 0.2;
      const jit = (v: number) => Math.max(0, Math.min(255, Math.round(v + (rnd() - 0.5) * 14)));
      ctx.fillStyle = `rgb(${jit(ref[i])},${jit(ref[i + 1])},${jit(ref[i + 2])})`;
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.ellipse(x, y, R * (1.3 + rnd() * 1.3), R * (0.5 + rnd() * 0.3), angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (opts.grain) {
    const grain = document.createElement('canvas');
    grain.width = grain.height = 128;
    const g = grain.getContext('2d')!;
    const data = g.createImageData(128, 128);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 128 + (rnd() - 0.5) * 90 + Math.sin(i * 0.37) * 12;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = opts.grain;
    ctx.fillStyle = ctx.createPattern(grain, 'repeat')!;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (opts.vignette) {
    const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(10,5,12,${opts.vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  if (opts.cutout) {
    // Keep only what lies inside the picture's own outline, softened by half a pixel.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.filter = 'blur(0.6px)';
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  }
  return out;
}

/** A new canvas of this size, and its context, to draw a picture on before painting it. */
export function sketch(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  return { canvas, ctx: canvas.getContext('2d')! };
}

/** Adds a canvas as the texture `key`, replacing any texture of that name. */
export function addTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

let nextSeed = 101;

/**
 * Bakes a character grid like `bakePixelArt`, then repaints it with small brushes, so the pixel
 * shapes read as dabs of paint: `brush` is the biggest brush radius, in texture pixels. `smooth`
 * rounds the pixel steps off first, for big figures that should not look blocky.
 */
export function bakePainted(scene: Phaser.Scene, key: string, rows: string[], palette: Palette, scale: number, outline: number | undefined, brush: number, smooth = false) {
  rows = padRows(rows);
  const pad = outline === undefined ? 0 : 1;
  const pixels = new PixelCanvas(rows[0].length + 2 * pad, rows.length + 2 * pad);
  pixels.grid(pad, pad, rows, palette);
  if (outline !== undefined) pixels.outline(outline);
  const src = smooth ? rounded(pixels.toCanvas(scale), scale * 0.45) : pixels.toCanvas(scale);
  addTexture(scene, key, paint(src, { sizes: [brush, brush / 2, Math.max(0.8, brush / 3.5)], seed: nextSeed++, cutout: true, threshold: 30 }));
}

/** Softens a blocky picture: blurs it by `r`, then firms its outline up again, so steps become curves. */
function rounded(src: HTMLCanvasElement, r: number) {
  const soft = blurredCopy(src, r);
  const ctx = soft.getContext('2d')!;
  const img = ctx.getImageData(0, 0, soft.width, soft.height);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = Math.max(0, Math.min(255, (d[i] - 100) * 6));
  ctx.putImageData(img, 0, 0);
  return soft;
}
