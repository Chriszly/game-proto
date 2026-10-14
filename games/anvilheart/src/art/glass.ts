import Phaser from 'phaser';

// The stained-glass toolkit every texture is painted with: jewel-toned glass pieces with a light
// gradient and a little mottling, held in dark lead. Textures are painted on 2D canvases and added
// with `textures.addCanvas`. The painters work in "art units", twice the game's 960x540 view, and
// each canvas is scaled by a half, so its texture is drawn at the view's own size.

export const LEAD = '#17131c';
export const SERIF = 'Georgia, "Times New Roman", serif';
export const PI = Math.PI;
/** Art units per view pixel. */
export const ART = 2;

export type Pt = [number, number];

/** The canvas being painted; set by `bake` for the duration of one painter. */
export let ctx: CanvasRenderingContext2D;

let seed = 7;
/** A seeded random number, so the glass looks the same on every visit and never touches Math.random. */
export const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
export const reseed = (s: number) => {
  seed = Math.max(1, Math.floor(s));
};

/**
 * Paints a `w` x `h` (view pixels) texture called `key`: the painter draws in art units, so a
 * canvas of 2w x 2h art units. Does nothing if the texture is already there.
 */
export function bake(scene: Phaser.Scene, key: string, w: number, h: number, paint: () => void) {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  ctx = canvas.getContext('2d')!;
  ctx.scale(1 / ART, 1 / ART);
  paint();
  scene.textures.addCanvas(key, canvas);
}

export const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a: string, b: string, t: number) => {
  const pa = hex(a);
  const pb = hex(b);
  return '#' + [0, 1, 2].map((i) => Math.round(pa[i] * (1 - t) + pb[i] * t).toString(16).padStart(2, '0')).join('');
};
/** Lighter towards warm white for k > 0, darker for k < 0. */
export const lit = (col: string, k: number) => (k >= 0 ? mix(col, '#fffbe8', k) : mix(col, '#05040a', -k));
export const num = (col: string) => parseInt(col.slice(1), 16);

export const path = (pts: Pt[]) => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
};
const bbox = (pts: Pt[]) => {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [x, y] of pts) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  return [a, b, c, d];
};

interface GlassOptions {
  /** How far the light corner brightens and the dark corner darkens. */
  hi?: number;
  lo?: number;
  /** No mottling. */
  flat?: boolean;
  /** Lead width, in art units. */
  lw?: number;
  /** Leave the piece unfilled, only leading it. */
  empty?: boolean;
}

/** One glass piece: a diagonal light gradient, mottling, and a lead outline. */
export function glass(pts: Pt[], col: string, o: GlassOptions = {}) {
  const [x0, y0, x1, y1] = bbox(pts);
  if (!o.empty) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, lit(col, o.hi ?? 0.35));
    g.addColorStop(0.55, col);
    g.addColorStop(1, lit(col, -(o.lo ?? 0.3)));
    path(pts);
    ctx.fillStyle = g;
    ctx.fill();
    if (!o.flat) {
      ctx.save();
      path(pts);
      ctx.clip();
      const n = Math.min(14, 2 + ((x1 - x0) * (y1 - y0)) / 3000);
      for (let k = 0; k < n; k++) {
        const cx = x0 + rnd() * (x1 - x0);
        const cy = y0 + rnd() * (y1 - y0);
        const r = 8 + rnd() * Math.max(10, (x1 - x0) * 0.3);
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        rg.addColorStop(0, rnd() < 0.5 ? 'rgba(255,255,240,0.12)' : 'rgba(0,0,0,0.12)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      ctx.restore();
    }
  }
  path(pts);
  ctx.strokeStyle = LEAD;
  ctx.lineWidth = o.lw ?? 5;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const ring = (cx: number, cy: number, r: number, n = 16, a0 = 0): Pt[] =>
  [...Array(n).keys()].map((k) => [cx + Math.cos(a0 + (k / n) * PI * 2) * r, cy + Math.sin(a0 + (k / n) * PI * 2) * r]);
export const diamond = (x: number, y: number, r: number): Pt[] => [[x, y - r], [x + r, y], [x, y + r], [x - r, y]];

/** Light glowing through the glass: a soft radial wash. */
export function glow(x: number, y: number, r: number, col: string, a = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  const [cr, cg, cb] = hex(col);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Painted detail lines on a piece, like the grisaille on a face. */
export function paint(draw: () => void, lw = 3, col = 'rgba(23,19,28,0.85)') {
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  draw();
  ctx.stroke();
  ctx.restore();
}

/** Lettering with a lead outline. */
export function label(s: string, x: number, y: number, size: number, col: string, o: { weight?: number; align?: CanvasTextAlign; sw?: number } = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 700} ${size}px ${SERIF}`;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'middle';
  const sw = o.sw ?? 6;
  if (sw > 0) {
    ctx.lineWidth = sw;
    ctx.strokeStyle = LEAD;
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
  ctx.restore();
}

/** A paned panel: a frame of four bevelled glass strips round a centre pane. */
export function panel(x: number, y: number, w: number, h: number, frameCol: string, paneCol: string, b = 12, paneFlat = false) {
  glass([[x, y], [x + w, y], [x + w - b, y + b], [x + b, y + b]], lit(frameCol, 0.15), { flat: true });
  glass([[x + w, y], [x + w, y + h], [x + w - b, y + h - b], [x + w - b, y + b]], lit(frameCol, -0.1), { flat: true });
  glass([[x, y + h], [x + b, y + h - b], [x + w - b, y + h - b], [x + w, y + h]], lit(frameCol, -0.25), { flat: true });
  glass([[x, y], [x + b, y + b], [x + b, y + h - b], [x, y + h]], frameCol, { flat: true });
  glass(rect(x + b, y + b, w - 2 * b, h - 2 * b), paneCol, { hi: 0.3, lo: 0.2, flat: paneFlat });
}

/** A glowing frame of bevelled glass strips, for the merge and buyer outlines. */
export function glowFrame(x: number, y: number, w: number, h: number, col: string, b = 12) {
  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = 30;
  path(rect(x, y, w, h));
  ctx.strokeStyle = col;
  ctx.lineWidth = b;
  ctx.stroke();
  ctx.restore();
  const o = b / 2;
  glass([[x - o, y - o], [x + w + o, y - o], [x + w - o, y + o], [x + o, y + o]], col, { flat: true, lw: 3 });
  glass([[x + w + o, y - o], [x + w + o, y + h + o], [x + w - o, y + h - o], [x + w - o, y + o]], lit(col, -0.15), { flat: true, lw: 3 });
  glass([[x - o, y + h + o], [x + o, y + h - o], [x + w - o, y + h - o], [x + w + o, y + h + o]], lit(col, -0.25), { flat: true, lw: 3 });
  glass([[x - o, y - o], [x + o, y + o], [x + o, y + h - o], [x - o, y + h + o]], lit(col, 0.15), { flat: true, lw: 3 });
}
