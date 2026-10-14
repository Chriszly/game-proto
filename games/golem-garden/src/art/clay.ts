import Phaser from 'phaser';

// The claymation toolkit every texture is painted with: soft plasticine shapes shaded from the
// top left, with a rolled rim, a fingerprint smudge, a specular glint and a warm studio shadow.
// Textures are painted on 2D canvases and added with `textures.addCanvas`. The painters work in
// "art units", twice the game's 960x540 view, and each canvas is scaled by a half, so its texture
// is drawn at the view's own size.

export const PI = Math.PI;
/** Art units per view pixel. */
export const ART = 2;

/** The clay colours, as CSS colours for the painters. */
export const C = {
  table: '#4a3626',
  grass: '#6fae4a',
  path: '#d8b27a',
  soil: '#7a4c2c',
  stone: '#a7a39a',
  stoneDark: '#7d7a72',
  moss: '#64a844',
  mossDark: '#457a30',
  thorn: '#8a8a3c',
  thornDark: '#5e6228',
  thornSpike: '#efe2b8',
  gold: '#f2c44a',
  cream: '#fbefd6',
  sap: '#f09a32',
  eye: '#7fe8ff',
  hud: '#3f5a2c',
  tag: '#e6d2a8',
  card: '#ecdcb6',
};

/** The canvas being painted; set by `bake` for the duration of one painter. */
export let ctx: CanvasRenderingContext2D;

let seed = 7;
/** A seeded random number, so the clay looks the same on every visit and never touches Math.random. */
export const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
export const reseed = (s: number) => {
  seed = s * 7919 + 13;
  rnd();
  rnd();
};

/**
 * Paints a `w` x `h` (view pixels) texture called `key`. The painter draws in art units with
 * (0, 0) at view pixel (`ox`, `oy`) of the texture, so a shape can be painted around its anchor.
 */
export function bake(scene: Phaser.Scene, key: string, w: number, h: number, paint: () => void, ox = 0, oy = 0) {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  ctx = canvas.getContext('2d')!;
  ctx.translate(ox, oy);
  ctx.scale(1 / ART, 1 / ART);
  paint();
  scene.textures.addCanvas(key, canvas);
  return canvas;
}

/** A blur filter of `n` art units (canvas filters work in canvas pixels). */
export const blur = (n: number) => `blur(${n / ART}px)`;

export function rrect(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function ellipse(x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export interface ClayOptions {
  /** Bounding box [x, y, w, h] for the shading. */
  bb?: [number, number, number, number];
  shadow?: boolean;
  /** Shadow blur, alpha and offset. */
  sb?: number;
  sa?: number;
  sx?: number;
  sy?: number;
  /** Width of the darker rolled rim. */
  rim?: number;
  print?: boolean;
  spec?: boolean;
  rot?: number;
}

/** A clay form: the path built by `make` is filled, shaded from the top left and fingerprinted. */
export function clay(make: () => void, col: string, o: ClayOptions) {
  const [x, y, w, h] = o.bb!;
  if (o.shadow !== false) {
    ctx.save();
    ctx.filter = blur(o.sb ?? 8);
    ctx.globalAlpha = o.sa ?? 0.45;
    ctx.translate(o.sx ?? 8, o.sy ?? 10);
    make();
    ctx.fillStyle = '#1a0e06';
    ctx.fill();
    ctx.restore();
  }
  make();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.save();
  make();
  ctx.clip();
  const r = Math.max(w, h);
  let g = ctx.createRadialGradient(x + w * 0.3, y + h * 0.25, 2, x + w * 0.3, y + h * 0.25, r * 0.9);
  g.addColorStop(0, 'rgba(255,248,225,0.42)');
  g.addColorStop(0.45, 'rgba(255,248,225,0.08)');
  g.addColorStop(1, 'rgba(255,248,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  g = ctx.createRadialGradient(x + w * 0.75, y + h * 0.85, 2, x + w * 0.75, y + h * 0.85, r * 0.8);
  g.addColorStop(0, 'rgba(30,14,4,0.35)');
  g.addColorStop(1, 'rgba(30,14,4,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  make();
  ctx.lineWidth = o.rim ?? Math.max(4, Math.min(w, h) * 0.12);
  ctx.strokeStyle = 'rgba(40,20,6,0.28)';
  ctx.stroke();
  // A fingerprint smudge.
  if (o.print !== false && w > 30) {
    const fx = x + w * (0.35 + rnd() * 0.3);
    const fy = y + h * (0.35 + rnd() * 0.3);
    ctx.lineWidth = 1.2;
    for (let k = 1; k < 7; k++) {
      ctx.strokeStyle = k % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(40,20,6,0.12)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, k * Math.min(w, h) * 0.06, k * Math.min(w, h) * 0.045, 0.4, 0.3, PI * 1.6);
      ctx.stroke();
    }
  }
  ctx.restore();
  // The specular glint.
  if (o.spec !== false) {
    ctx.save();
    ctx.filter = blur(3);
    ellipse(x + w * 0.3, y + h * 0.22, Math.max(3, w * 0.12), Math.max(2, h * 0.07), 'rgba(255,255,255,0.45)', -0.5);
    ctx.restore();
  }
}

/** A clay ellipse. */
export const E = (cx: number, cy: number, rx: number, ry: number, col: string, o: ClayOptions = {}) =>
  clay(
    () => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, o.rot ?? 0, 0, PI * 2);
    },
    col,
    { ...o, bb: [cx - rx, cy - ry, rx * 2, ry * 2] },
  );

/** A clay rounded rectangle. */
export const R = (x: number, y: number, w: number, h: number, r: number, col: string, o: ClayOptions = {}) =>
  clay(() => rrect(x, y, w, h, r), col, { ...o, bb: [x, y, w, h] });

/** A clay blob through rounded corners at `pts`. */
export function Pp(pts: [number, number][], col: string, o: ClayOptions = {}) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const make = () => {
    ctx.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (i === 0) ctx.moveTo(m[0], m[1]);
      else ctx.quadraticCurveTo(a[0], a[1], m[0], m[1]);
    }
    const a = pts[0];
    const b = pts[1];
    ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    ctx.closePath();
  };
  clay(make, col, { ...o, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)] });
}

/** A drop of sap, its round bottom at (x, y + 6s). */
export const drop = (x: number, y: number, s: number, o: ClayOptions = {}) =>
  clay(
    () => {
      ctx.beginPath();
      ctx.moveTo(x, y - 22 * s);
      ctx.bezierCurveTo(x + 6 * s, y - 10 * s, x + 16 * s, y, x + 16 * s, y + 6 * s);
      ctx.arc(x, y + 6 * s, 16 * s, 0, PI);
      ctx.bezierCurveTo(x - 16 * s, y, x - 6 * s, y - 10 * s, x, y - 22 * s);
      ctx.closePath();
    },
    C.sap,
    { print: false, sb: 3, sx: 3, sy: 4, rim: 2.5, bb: [x - 16 * s, y - 22 * s, 32 * s, 44 * s], ...o },
  );

/** A Heartwood flower: open gold petals, or a closed green bud. */
export function flower(x: number, y: number, s: number, open: boolean) {
  if (open) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * PI * 2 - PI / 2;
      E(x + Math.cos(a) * 9 * s, y + Math.sin(a) * 9 * s, 7 * s, 7 * s, C.gold, { print: false, sb: 2, sx: 2, sy: 2, rim: 2 });
    }
    E(x, y, 5 * s, 5 * s, '#e0782a', { print: false, shadow: false, rim: 1.5 });
  } else E(x, y, 7 * s, 9 * s, '#a6d870', { print: false, sb: 2, sx: 2, sy: 2, rim: 2 });
}

export type GolemArt = 'pebble' | 'moss' | 'thorn';

/** A golem standing with its feet at (fx, fy). */
export function golem(fx: number, fy: number, kind: GolemArt) {
  const body = kind === 'pebble' ? C.stone : kind === 'moss' ? C.moss : C.thorn;
  const dark = kind === 'pebble' ? C.stoneDark : kind === 'moss' ? C.mossDark : C.thornDark;
  if (kind === 'thorn') {
    // Thorns stick out all round its bramble body.
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * PI * 2 + 0.2;
      const cx = fx + Math.cos(a) * 34;
      const cy = fy - 58 + Math.sin(a) * 32;
      const tx = fx + Math.cos(a) * 70;
      const ty = fy - 58 + Math.sin(a) * 64;
      const nx = -Math.sin(a) * 11;
      const ny = Math.cos(a) * 11;
      Pp([[cx + nx, cy + ny], [tx, ty], [cx - nx, cy - ny]], C.thornSpike, { print: false, sb: 3, sx: 3, sy: 4, rim: 3 });
    }
  }
  E(fx - 16, fy - 10, 14, 14, dark);
  E(fx + 16, fy - 10, 14, 14, dark);
  Pp([[fx - 50, fy - 84], [fx - 30, fy - 88], [fx - 28, fy - 34], [fx - 50, fy - 32]], dark);
  Pp([[fx + 30, fy - 88], [fx + 50, fy - 84], [fx + 50, fy - 32], [fx + 28, fy - 34]], dark);
  E(fx, fy - 56, 40, 38, body);
  E(fx - 42, fy - 30, 14, 13, body, { print: false });
  E(fx + 42, fy - 30, 14, 13, body, { print: false });
  E(fx, fy - 104, 24, 20, body, { sb: 4 });
  // Bead eyes with a faint glow.
  ctx.save();
  ctx.shadowColor = C.eye;
  ctx.shadowBlur = 6;
  E(fx - 9, fy - 104, 5, 5, C.eye, { shadow: false, print: false, rim: 1.5 });
  E(fx + 9, fy - 104, 5, 5, C.eye, { shadow: false, print: false, rim: 1.5 });
  ctx.restore();
  // Tool-cut cracks.
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(40,20,6,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fx - 20, fy - 70);
  ctx.quadraticCurveTo(fx - 12, fy - 60, fx - 16, fy - 46);
  ctx.moveTo(fx + 12, fy - 74);
  ctx.lineTo(fx + 20, fy - 64);
  ctx.stroke();
  if (kind === 'pebble') {
    E(fx - 4, fy - 122, 16, 6, C.moss, { print: false, sb: 2 });
    E(fx - 32, fy - 88, 11, 6, C.moss, { print: false, sb: 2 });
  } else if (kind === 'moss') {
    E(fx - 34, fy - 86, 14, 9, '#c8c3b6', { print: false });
    E(fx + 34, fy - 86, 14, 9, '#c8c3b6', { print: false });
    flower(fx, fy - 126, 0.75, true);
  } else {
    // A crown of three small thorns and a pink bramble flower.
    for (const dx of [-14, 0, 14]) Pp([[fx + dx - 6, fy - 118], [fx + dx, fy - 136], [fx + dx + 6, fy - 118]], C.thornSpike, { print: false, sb: 2, rim: 1.5 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * PI * 2 - PI / 2;
      E(fx + 24 + Math.cos(a) * 6, fy - 84 + Math.sin(a) * 6, 5, 5, '#f2a6c8', { print: false, sb: 2, sx: 2, sy: 2, rim: 1.5 });
    }
    E(fx + 24, fy - 84, 3.5, 3.5, C.gold, { print: false, shadow: false, rim: 1 });
  }
}

/** A sprout in a mound of soil, its mound's foot at (fx, fy). */
export function sprout(fx: number, fy: number) {
  E(fx, fy, 30, 13, C.soil);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3f7a2c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(fx, fy - 6);
  ctx.quadraticCurveTo(fx - 4, fy - 30, fx + 2, fy - 50);
  ctx.stroke();
  E(fx - 16, fy - 52, 16, 8, '#7cc050', { rot: 0.5, sb: 3 });
  E(fx + 18, fy - 60, 17, 8, '#8cd05a', { rot: -0.5, sb: 3 });
}

export type PestArt = 'beetle' | 'slug' | 'crow';

/** A pest facing right, standing at (0, 0). */
export function pest(kind: PestArt) {
  if (kind === 'beetle') {
    ctx.strokeStyle = '#1e1a2a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 12, 4);
      ctx.lineTo(k * 15 - 3, 18);
      ctx.stroke();
    }
    E(22, -4, 12, 11, '#2c2a56', { print: false, sb: 4 });
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, -10);
    ctx.quadraticCurveTo(34, -22, 40, -22);
    ctx.moveTo(30, -6);
    ctx.quadraticCurveTo(40, -12, 44, -8);
    ctx.stroke();
    E(-2, -6, 26, 18, '#5452a8', { sb: 5 });
    ctx.strokeStyle = 'rgba(20,16,50,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-2, -23);
    ctx.lineTo(-2, 11);
    ctx.stroke();
    ellipse(25, -7, 3, 3, '#fff');
  } else if (kind === 'slug') {
    Pp([[-44, 12], [-30, -4], [0, -10], [26, -20], [42, -6], [40, 12]], '#e2b24a', { sb: 5 });
    E(18, -18, 16, 13, '#f0cc70', { print: false, sb: 3 });
    ctx.strokeStyle = '#c0902e';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(28, -24);
    ctx.lineTo(34, -40);
    ctx.moveTo(36, -20);
    ctx.lineTo(46, -34);
    ctx.stroke();
    E(34, -42, 5, 5, '#1e1a1a', { shadow: false, print: false, rim: 1 });
    E(47, -36, 5, 5, '#1e1a1a', { shadow: false, print: false, rim: 1 });
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-44, 16);
    ctx.lineTo(-80, 16);
    ctx.stroke();
  } else {
    ctx.save();
    ctx.translate(0, -16);
    ctx.save();
    ctx.filter = blur(5);
    ellipse(0, 34, 24, 6, 'rgba(20,10,4,0.35)');
    ctx.restore();
    Pp([[-32, -4], [-46, -14], [-40, 8]], '#2a2632', { print: false, sb: 3 });
    E(-4, 0, 28, 15, '#34303e', { sb: 5 });
    E(22, -12, 13, 12, '#34303e', { print: false, sb: 3 });
    Pp([[32, -16], [48, -11], [32, -6]], '#ec9e36', { print: false, shadow: false, rim: 1.5 });
    ellipse(25, -15, 3, 3, '#fff');
    Pp([[-14, -6], [2, -40], [14, -30], [10, -6]], '#45404f', { print: false, sb: 3 });
    ctx.strokeStyle = '#ec9e36';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(-8, 24);
    ctx.moveTo(6, 14);
    ctx.lineTo(4, 24);
    ctx.stroke();
    ctx.restore();
  }
}
