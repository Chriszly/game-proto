import Phaser from 'phaser';

export type Palette = Record<string, number>;

/**
 * Bakes a character grid ('.' = transparent) into a texture. Each character becomes a
 * `scale` x `scale` block of texture pixels.
 */
export function bakePixelArt(scene: Phaser.Scene, key: string, rows: string[], palette: Palette, scale = 1, outline?: number) {
  rows = padRows(rows);
  const pad = outline === undefined ? 0 : 1;
  const canvas = new PixelCanvas(rows[0].length + 2 * pad, rows.length + 2 * pad);
  canvas.grid(pad, pad, rows, palette);
  if (outline !== undefined) canvas.outline(outline);
  canvas.bake(scene, key, scale);
}

/** Pads every row of a character grid with '.' to the width of the widest. */
export function padRows(rows: string[]) {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, '.'));
}

/**
 * A small grid of art pixels to paint on with simple shapes, then bake into a texture. Used for
 * the larger pieces (stations, tiles) where a character grid would be unwieldy.
 */
export class PixelCanvas {
  private color: (number | null)[];
  private alpha: number[];

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.color = new Array(w * h).fill(null);
    this.alpha = new Array(w * h).fill(1);
  }

  px(x: number, y: number, color: number, alpha = 1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.color[y * this.w + x] = color;
    this.alpha[y * this.w + x] = alpha;
    return this;
  }

  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.color[y * this.w + x];
  }

  clear(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.color[y * this.w + x] = null;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, color, alpha);
    return this;
  }

  /** A one-pixel rectangle outline. */
  frame(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
    this.rect(x, y, w, 1, color, alpha).rect(x, y + h - 1, w, 1, color, alpha);
    this.rect(x, y, 1, h, color, alpha).rect(x + w - 1, y, 1, h, color, alpha);
    return this;
  }

  /** A filled ellipse inside the box (x, y, w, h). */
  ellipse(x: number, y: number, w: number, h: number, color: number, alpha = 1) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        const dx = (i + 0.5 - cx) / (w / 2);
        const dy = (j + 0.5 - cy) / (h / 2);
        if (dx * dx + dy * dy <= 1) this.px(i, j, color, alpha);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, color: number, alpha = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      this.px(Math.round(x0 + ((x1 - x0) * s) / steps), Math.round(y0 + ((y1 - y0) * s) / steps), color, alpha);
    }
    return this;
  }

  /** Paints a character grid at (x, y); characters missing from the palette are left alone. */
  grid(x: number, y: number, rows: string[], palette: Palette) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = palette[row[i]];
        if (c !== undefined) this.px(x + i, y + j, c);
      }
    });
    return this;
  }

  /** Draws a one-pixel outline in `color` around everything painted so far. */
  outline(color: number) {
    const edge: [number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== null) continue;
        if ([this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)].some((c) => c !== null)) {
          edge.push([x, y]);
        }
      }
    }
    for (const [x, y] of edge) this.px(x, y, color);
    return this;
  }

  /** Bakes into a texture of (w * scale) x (h * scale) pixels, merging runs of equal pixels. */
  bake(scene: Phaser.Scene, key: string, scale = 1) {
    const g = scene.add.graphics();
    for (let y = 0; y < this.h; y++) {
      let x = 0;
      while (x < this.w) {
        const c = this.color[y * this.w + x];
        const a = this.alpha[y * this.w + x];
        let run = 1;
        while (x + run < this.w && this.color[y * this.w + x + run] === c && this.alpha[y * this.w + x + run] === a) run++;
        if (c !== null) g.fillStyle(c, a).fillRect(x * scale, y * scale, run * scale, scale);
        x += run;
      }
    }
    if (scene.textures.exists(key)) scene.textures.remove(key);
    g.generateTexture(key, this.w * scale, this.h * scale);
    g.destroy();
  }
}

/** A small seeded random generator, so textured art comes out the same on every load. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
