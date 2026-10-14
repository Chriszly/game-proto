import Phaser from 'phaser';
import { JAR, LANTERN_SPOTS } from '../game/places';
import type { MothKind } from '../game/state';
import { DUSK_BAR as DUSK, GUST_TAG, ORDER } from '../scenes/layout';

export { DUSK };

// The shadow-puppet theatre look: the keep is black cut card held in front of a backlit paper
// screen that glows from saffron to indigo as dusk falls. Light comes through the cuts (arrow
// slits, stone joints, the gate), the lanterns have coloured gel panes, the moths are lace-winged
// puppets with a pale rim of light so they read against the black card, and the HUD and panels are
// black card plaques with punched lace borders.
//
// Everything is painted once at startup on 2D canvases and added with `textures.addCanvas`. The
// painters work in view pixels; small textures are painted at RES times that size and drawn by the
// scene at 1 / RES, so they stay sharp when the game is scaled up.

export const PI = Math.PI;
/** Canvas pixels per view pixel for sprites and plaques. */
export const RES = 2;
/** The black of the card. */
export const INK = '#0d0a10';
export const INK_HEX = 0x0d0a10;

let ctx: CanvasRenderingContext2D;

let seed = 7;
/** A seeded random number, so the paper and stars are the same on every visit (never Math.random). */
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const reseed = (s: number) => {
  seed = s;
};

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

type P = readonly [number, number];

function poly(pts: readonly P[], fill?: string) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function rrect(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dot(x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * PI);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A soft additive glow of colour `col`, as light through the paper. */
function glow(x: number, y: number, r: number, col: string, a = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, 0.55 * a));
  g.addColorStop(0.35, rgba(col, 0.25 * a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}

/**
 * Paints a `w` x `h` (view pixels) texture called `key` at `res` canvas pixels per view pixel,
 * with (0, 0) of the painter at view pixel (`ox`, `oy`) of the texture.
 */
function bake(scene: Phaser.Scene, key: string, w: number, h: number, paint: () => void, ox = 0, oy = 0, res = RES) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * res);
  canvas.height = Math.ceil(h * res);
  ctx = canvas.getContext('2d')!;
  ctx.scale(res, res);
  ctx.translate(ox, oy);
  paint();
  scene.textures.addCanvas(key, canvas);
}

const W = 960;
const H = 540;
const GROUND = 500;
const WALL = { x: 40, y: 320, w: 880 };
const TOWERS = [
  { x: 120, y: 200, w: 100 },
  { x: 740, y: 200, w: 100 },
];
const KEEP = { x: 400, y: 128, w: 160 };

/** Merlon x positions along a top edge, skipping those a lantern spot covers. */
function merlonXs(x0: number, x1: number, top: number) {
  const xs: number[] = [];
  for (let x = x0; x + 12 <= x1; x += 24) {
    if (LANTERN_SPOTS.some((s) => Math.abs(x + 6 - s.x) < 18 && Math.abs(top + 12 - (s.y + 16)) < 8)) continue;
    xs.push(x);
  }
  return xs;
}

/** The three paper screens dusk crossfades through: early dusk, deep dusk and night. */
export const SCREENS = ['screen-0', 'screen-1', 'screen-2'] as const;
const SCREEN_STOPS = [
  ['#4a3466', '#8c4c6a', '#d8705a', '#f5a066', '#ffd08a'],
  ['#1d1b3e', '#3b2c5c', '#8a4a62', '#e0825a', '#ffc27a'],
  ['#0c0b1e', '#17152f', '#2a2148', '#4a3058', '#80506a'],
];

function paintScreen(stops: string[], lamp: number) {
  const sky = ctx.createLinearGradient(0, 40, 0, 540);
  [0, 0.35, 0.62, 0.82, 1].forEach((t, i) => sky.addColorStop(t, stops[i]));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // The lamp behind the screen: a warm hot spot low and centre.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hs = ctx.createRadialGradient(480, 560, 10, 480, 560, 520);
  hs.addColorStop(0, `rgba(255,200,120,${lamp})`);
  hs.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = hs;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Paper fibres.
  reseed(9);
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 900; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const l = 2 + rnd() * 9;
    const a = rnd() * PI;
    ctx.strokeStyle = rnd() < 0.5 ? 'rgba(255,240,220,0.06)' : 'rgba(30,10,30,0.06)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

/** The castle as one black cut card, with light through its slits, joints and gate. */
function paintCastle() {
  // Far hills: a fainter, blurred card further from the screen.
  ctx.save();
  ctx.filter = 'blur(1.5px)';
  poly(
    [[0, 440], [60, 410], [140, 430], [230, 396], [330, 424], [460, 400], [560, 420], [700, 392], [820, 418], [900, 404], [960, 420], [960, 540], [0, 540]],
    'rgba(40,20,40,0.55)',
  );
  ctx.restore();
  const castlePath = () => {
    ctx.beginPath();
    const r = (x: number, y: number, w: number, h: number) => ctx.rect(x, y, w, h);
    r(WALL.x, WALL.y, WALL.w, GROUND - WALL.y + 2);
    for (const x of merlonXs(40, 920, 308)) r(x, 308, 12, 13);
    for (const t of TOWERS) {
      r(t.x, t.y, t.w, GROUND - t.y);
      for (const x of merlonXs(t.x, t.x + 112, 188)) if (x + 12 <= t.x + t.w + 4) r(x - 2, 186, 14, 15);
      r(t.x - 6, t.y + 2, t.w + 12, 6);
    }
    r(KEEP.x, KEEP.y, KEEP.w, GROUND - KEEP.y);
    for (const x of merlonXs(400, 572, 116)) if (x + 12 <= 564) r(x, 114, 12, 15);
    r(KEEP.x - 6, KEEP.y + 2, KEEP.w + 12, 6);
    r(0, GROUND, W, 40);
  };
  // The card sits a hair off the screen, so its edge blooms a soft shadow.
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  castlePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = INK;
  castlePath();
  ctx.fill();
  // Pennant pole and flag on the keep.
  poly([[548, 70], [550, 70], [550, 116], [548, 116]], INK);
  poly([[550, 71], [578, 78], [566, 81], [578, 86], [550, 90]], INK);
  // Grass tufts along the ground edge.
  reseed(4);
  for (let x = 0; x < W; x += 6) {
    const h = 3 + rnd() * 7;
    poly([[x, 501], [x + 2 + rnd() * 2, 500 - h], [x + 5, 501]], INK);
  }
  // Light through the cuts.
  const cut = (pts: P[]) => {
    ctx.save();
    ctx.globalAlpha = 0.8;
    poly(pts, '#f0a868');
    ctx.restore();
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    glow(cx, cy, 12, '#ff9a50', 0.35);
  };
  for (const t of TOWERS) {
    for (const oy of [250, 330]) {
      const x = t.x + 44;
      cut([[x, oy + 4], [x + 5, oy - 2], [x + 10, oy + 4], [x + 10, oy + 26], [x, oy + 26]]);
    }
  }
  for (const x of [432, 516]) cut([[x, 304], [x + 7, 296], [x + 14, 304], [x + 14, 330], [x, 330]]);
  // Brick lace: thin joints cut through, so the card reads as masonry.
  ctx.save();
  ctx.strokeStyle = 'rgba(240,150,90,0.22)';
  ctx.lineWidth = 0.7;
  const joints = (b: { x: number; y: number; w: number }, step: number) => {
    for (let y = b.y + 18, row = 0; y < 496; y += 18, row++) {
      ctx.beginPath();
      ctx.moveTo(b.x + 4, y);
      ctx.lineTo(b.x + b.w - 4, y);
      ctx.stroke();
      for (let x = b.x + 8 + ((row % 2) * step) / 2; x < b.x + b.w - 6; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };
  joints(KEEP, 40);
  TOWERS.forEach((t) => joints(t, 34));
  ctx.restore();
  // The gate: an arch cut out, with a lattice of thin card bars against warm light.
  poly([[440, 500], [440, 430], [452, 410], [468, 400], [492, 400], [508, 410], [520, 430], [520, 500]], '#f6b06a');
  glow(480, 455, 50, '#ffb060', 0.6);
  for (const x of [452, 464, 476, 488, 500, 512]) poly([[x - 1, 400], [x + 1, 400], [x + 1, 500], [x - 1, 500]], INK);
  for (const y of [420, 440, 460, 480]) poly([[440, y], [520, y], [520, y + 2], [440, y + 2]], INK);
  for (const x of [452, 464, 476, 488, 500, 512]) poly([[x - 2, 496], [x + 2, 496], [x, 502]], INK);
  // The moth jar in front of the gate: a card outline with pale blue gel glass.
  const jx = JAR.x;
  const jy = JAR.y - 20;
  ctx.save();
  ctx.globalAlpha = 0.85;
  poly([[jx - 16, jy - 10], [jx + 16, jy - 10], [jx + 16, jy + 18], [jx - 16, jy + 18]], '#a8d0dc');
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(jx - 16, jy - 10, 32, 28);
  poly([[jx - 9, jy - 15], [jx + 9, jy - 15], [jx + 9, jy - 10], [jx - 9, jy - 10]], INK);
  poly([[jx - 6, jy - 21], [jx + 6, jy - 21], [jx + 5, jy - 15], [jx - 5, jy - 15]], INK);
  poly([[jx - 18, jy + 18], [jx + 18, jy + 18], [jx + 18, jy + 22], [jx - 18, jy + 22]], INK);
  poly([[jx - 12, jy - 6], [jx - 10, jy - 6], [jx - 10, jy + 14], [jx - 12, jy + 14]], 'rgba(255,255,255,0.7)');
}

/** Stars punched through the screen, on their own layer so they can come out as night falls. */
function paintStars() {
  reseed(5);
  for (let i = 0; i < 55; i++) {
    const x = rnd() * W;
    const y = 48 + rnd() * 240;
    const r = 0.5 + rnd() * 1.1;
    glow(x, y, r * 5, '#fff0d0', 0.35);
    dot(x, y, r, 'rgba(255,248,230,0.9)');
  }
}

/** The moon: a pale gel disc with a crescent cut away, so the screen shows through. */
function paintMoon() {
  glow(0, 0, 50, '#ffe6c0', 0.4);
  dot(0, 0, 15, '#fff1d8');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  dot(7, -5, 13, '#000');
  ctx.restore();
}

/** A hanging lantern centred on (0, 0): a black card frame with two coloured gel panes. */
function paintLantern(lit: boolean) {
  const x = 0;
  const y = 0;
  poly([[x - 1.2, y - 30], [x + 1.2, y - 30], [x + 1.2, y - 18], [x - 1.2, y - 18]], INK);
  ctx.beginPath();
  ctx.arc(x, y - 31, 3, 0, 2 * PI);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  poly([[x, y - 24], [x + 12, y - 15], [x + 9, y - 12], [x - 9, y - 12], [x - 12, y - 15]], INK);
  poly([[x - 11, y - 13], [x + 11, y - 13], [x + 11, y + 10], [x - 11, y + 10]], INK);
  poly([[x - 12, y + 9], [x + 12, y + 9], [x + 8, y + 15], [x - 8, y + 15]], INK);
  poly([[x - 3, y + 15], [x + 3, y + 15], [x, y + 19]], INK);
  const pane = lit ? ['#ffd480', '#ffb04a'] : ['#6f7aa8', '#4a5480'];
  for (const [px, c] of [[-8, pane[0]], [1, pane[1]]] as const) {
    ctx.beginPath();
    ctx.moveTo(x + px, y + 7);
    ctx.lineTo(x + px, y - 6);
    ctx.arc(x + px + 3.5, y - 6, 3.5, PI, 0);
    ctx.lineTo(x + px + 7, y + 7);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  }
  if (lit) glow(x, y, 16, '#fff0b0', 0.9);
  else poly([[x - 7, y - 5], [x - 6, y - 5], [x - 6, y + 4], [x - 7, y + 4]], 'rgba(220,230,255,0.5)');
}

/** The flame inside a lit lantern, its own texture so it can flicker. */
function paintFlame() {
  poly([[0, -6], [3, 3], [0, 6], [-3, 3]], '#fff8e0');
}

/** How each moth kind's puppet looks: its size and the gel in its wings' eye-spots. */
export const MOTH_LOOK = {
  fast: { s: 1.15, gel: '#8cc8ff' },
  slow: { s: 1.4, gel: '#b8e690' },
  heavy: { s: 1.6, gel: '#f0c27a' },
} as const satisfies Record<MothKind, { s: number; gel: string }>;

/**
 * A moth puppet centred on (0, 0): black lace wings with a pale lit rim (so it reads against the
 * black card), a gel eye-spot per kind and a brass rod pin at the body.
 */
function paintMoth(kind: MothKind, up: boolean) {
  const k = MOTH_LOOK[kind];
  const s = k.s;
  const sp = up ? 1 : 0.55;
  const Pt = (px: number, py: number): [number, number] => [px * s, py * s];
  for (const side of [-1, 1]) {
    const Q = (px: number, py: number) => Pt(px * side, py);
    const wing = () => {
      ctx.beginPath();
      ctx.moveTo(...Q(1, -2));
      ctx.quadraticCurveTo(...Q(8, -13 * sp), ...Q(13, -9 * sp));
      ctx.quadraticCurveTo(...Q(11, -1), ...Q(7, 0));
      ctx.quadraticCurveTo(...Q(8, 6 * sp), ...Q(4, 6 * sp + 1));
      ctx.quadraticCurveTo(...Q(1, 3), ...Q(1, 0));
      ctx.closePath();
    };
    wing();
    ctx.save();
    ctx.shadowColor = 'rgba(255,214,150,0.95)';
    ctx.shadowBlur = 5 * RES;
    ctx.strokeStyle = 'rgba(255,224,176,0.95)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.fill();
    // Lace: a gel eye-spot and a little punched hole.
    const [ex, ey] = Q(7.5, -5 * sp - 1);
    dot(ex, ey, 2.4 * s, k.gel);
    const [cx, cy] = Q(4.5, 3 * sp + 0.5);
    dot(cx, cy, 1 * s, 'rgba(255,220,170,0.8)');
  }
  poly([Pt(0, -4), Pt(1.8, 0), Pt(0, 6), Pt(-1.8, 0)], INK);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(...Pt(0, -4));
  ctx.quadraticCurveTo(...Pt(-1, -8), ...Pt(-3.5, -9));
  ctx.moveTo(...Pt(0, -4));
  ctx.quadraticCurveTo(...Pt(1, -8), ...Pt(3.5, -9));
  ctx.stroke();
  dot(0, 0, 0.9, '#c9a86a');
}

/**
 * Plaques, cards and panels are baked with PAD view pixels of room around them for their soft
 * shadow; the scene places such a texture at (x - PAD, y - PAD) with origin 0.
 */
export const PAD = 8;

/** A black card plaque with a punched lace border, `w` x `h` at (0, 0). */
function paintPlaque(w: number, h: number, edge = 'rgba(255,190,120,0.55)', step = 6) {
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(2, 3, w, h);
  ctx.restore();
  rrect(0, 0, w, h, 4);
  ctx.fillStyle = INK;
  ctx.fill();
  for (let t = 6; t < w - 3; t += step) for (const yy of [4, h - 4]) dot(t, yy, 1, edge);
  for (let t = 10; t < h - 6; t += step) for (const xx of [4, w - 4]) dot(xx, t, 1, edge);
}

/** A carved panel: a plaque with a double lace border and corner rosettes. */
function paintPanel(w: number, h: number) {
  paintPlaque(w, h, 'rgba(255,190,120,0.6)', 8);
  ctx.strokeStyle = 'rgba(216,154,80,0.55)';
  ctx.lineWidth = 1.2;
  rrect(12, 12, w - 24, h - 24, 6);
  ctx.stroke();
  for (const [cx, cy] of [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]] as const) {
    dot(cx, cy, 7, INK);
    ctx.strokeStyle = 'rgba(255,190,120,0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 2 * PI);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 2 * PI;
      dot(cx + Math.cos(a) * 3.2, cy + Math.sin(a) * 3.2, 1.1, '#ffbe6a');
    }
  }
}

/** A carved card button `w` x `h`; `lit` gives it a glowing amber rim. */
function paintCard(w: number, h: number, lit: boolean, hover = false) {
  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(1, 2, w, h);
  ctx.restore();
  rrect(0, 0, w, h, 6);
  ctx.fillStyle = hover ? '#2a1d22' : lit ? '#1a1218' : '#121016';
  ctx.fill();
  ctx.save();
  if (lit) {
    ctx.shadowColor = 'rgba(255,170,80,0.9)';
    ctx.shadowBlur = 6 * RES;
  }
  ctx.strokeStyle = lit ? '#e8a656' : '#4a3e4a';
  ctx.lineWidth = 1.6;
  rrect(0, 0, w, h, 6);
  ctx.stroke();
  ctx.restore();
  const edge = lit ? 'rgba(255,190,120,0.55)' : 'rgba(160,140,150,0.3)';
  for (let t = 9; t < w - 6; t += 7) for (const yy of [5, h - 5]) dot(t, yy, 0.8, edge);
}

/** A hearth flame on the HUD, lit or gone out, centred on (0, 0). */
function paintHearth(lit: boolean) {
  const flame = () => {
    ctx.beginPath();
    ctx.moveTo(-6, 7);
    ctx.quadraticCurveTo(-7, -2, 0, -10);
    ctx.quadraticCurveTo(7, -2, 6, 7);
    ctx.closePath();
  };
  if (lit) {
    glow(0, 0, 14, '#ff9a40', 0.8);
    flame();
    ctx.fillStyle = '#ffa850';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2.5, 7);
    ctx.quadraticCurveTo(-3, 2, 0, -2);
    ctx.quadraticCurveTo(3, 2, 2.5, 7);
    ctx.closePath();
    ctx.fillStyle = '#fff2c8';
    ctx.fill();
  } else {
    flame();
    ctx.strokeStyle = 'rgba(200,160,130,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  poly([[-8, 7], [8, 7], [8, 10], [-8, 10]], '#8a5a34');
}

function paintCoin() {
  glow(0, 0, 14, '#ffb040', 0.6);
  dot(0, 0, 8, '#ffc860');
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, 2 * PI);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** The HUD: a black proscenium strip with a scalloped lower edge and the dusk bar's trough. */
function paintHud() {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, 38);
  for (let x = 0; x < W; x += 12) {
    ctx.beginPath();
    ctx.arc(x + 6, 38, 6, 0, PI);
    ctx.fill();
  }
  for (let x = 0; x < W; x += 12) dot(x + 6, 38, 1.2, 'rgba(255,180,110,0.6)');
  const D = DUSK;
  rrect(D.x, D.y, D.w, D.h, 8);
  ctx.fillStyle = '#2a2040';
  ctx.fill();
}
function paintDuskRim() {
  rrect(1, 1, DUSK.w, DUSK.h, 8);
  ctx.strokeStyle = '#8a5a34';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
function paintDuskFill() {
  ctx.save();
  rrect(0, 0, DUSK.w, DUSK.h, 8);
  ctx.clip();
  const dg = ctx.createLinearGradient(0, 0, DUSK.w, 0);
  dg.addColorStop(0, '#c45a3a');
  dg.addColorStop(1, '#ffbe6a');
  ctx.fillStyle = dg;
  ctx.fillRect(0, 0, DUSK.w, DUSK.h);
  ctx.restore();
}

/** The herald's order card: a plaque with a pennant on its left and a reward seal on its right. */
function paintOrderCard() {
  const { w, h } = ORDER;
  paintPlaque(w, h);
  poly([[13, 11], [15, 11], [15, 47], [13, 47]], '#d89a50');
  poly([[15, 12], [34, 17], [27, 20], [34, 24], [15, 27]], '#ffbe6a');
  glow(w - 24, 18, 20, '#ffb050', 0.6);
  dot(w - 24, 18, 14, '#ffc870');
}

/** A small arched window pip for the order card: lit amber or dark slate. */
function paintPip(lit: boolean) {
  if (lit) glow(0, 0, 10, '#ffb560', 0.7);
  ctx.beginPath();
  ctx.moveTo(-4, 5);
  ctx.lineTo(-4, -2);
  ctx.arc(0, -2, 4, PI, 0);
  ctx.lineTo(4, 5);
  ctx.closePath();
  ctx.fillStyle = lit ? '#ffcf6a' : '#4a5070';
  ctx.fill();
}

/** The gust warning plaque, with a puppet wind spirit's head puffing its cheeks. */
function paintGustTag() {
  paintPlaque(GUST_TAG.w, GUST_TAG.h);
  dot(18, 20, 10, '#9ec4ff');
  dot(22, 22, 4.5, INK);
  dot(15, 16, 1.4, INK);
  dot(27, 22, 1.6, '#9ec4ff');
}

/** The "Save it" tag over a nearly dry lantern, with its pointer. */
export const SAVE_TAG = { w: 84, h: 22 };
function paintSaveTag() {
  paintPlaque(SAVE_TAG.w, SAVE_TAG.h, 'rgba(255,160,90,0.6)', 6);
  poly([[SAVE_TAG.w / 2 - 5, SAVE_TAG.h - 0.5], [SAVE_TAG.w / 2 + 5, SAVE_TAG.h - 0.5], [SAVE_TAG.w / 2, SAVE_TAG.h + 6]], INK);
}

/** Bakes every texture the scene uses. */
export function bakeTextures(scene: Phaser.Scene) {
  SCREENS.forEach((key, i) => bake(scene, key, W, H, () => paintScreen(SCREEN_STOPS[i], [0.4, 0.35, 0.18][i]), 0, 0, 1));
  bake(scene, 'castle', W, H, paintCastle, 0, 0, 1);
  bake(scene, 'stars', W, 300, paintStars, 0, 0, 1);
  bake(scene, 'moon', 100, 100, paintMoon, 50, 50);
  bake(scene, 'glow', 128, 128, () => glow(64, 64, 64, '#ffbe6a', 1), 0, 0, 1);
  bake(scene, 'glow-pale', 128, 128, () => glow(64, 64, 64, '#ffe0a0', 1), 0, 0, 1);
  bake(scene, 'lantern-lit', 32, 56, () => paintLantern(true), 16, 36);
  bake(scene, 'lantern-dark', 32, 56, () => paintLantern(false), 16, 36);
  bake(scene, 'flame', 10, 16, paintFlame, 5, 8);
  for (const kind of Object.keys(MOTH_LOOK) as MothKind[]) {
    bake(scene, `moth-${kind}-up`, 56, 52, () => paintMoth(kind, true), 28, 26);
    bake(scene, `moth-${kind}-down`, 56, 52, () => paintMoth(kind, false), 28, 26);
  }
  bake(scene, 'hud', W, 48, paintHud, 0, 0);
  bake(scene, 'dusk-fill', DUSK.w, DUSK.h, paintDuskFill);
  bake(scene, 'dusk-rim', DUSK.w + 2, DUSK.h + 2, paintDuskRim);
  bake(scene, 'sun', 40, 40, () => {
    glow(20, 20, 18, '#ffc070', 0.9);
    dot(20, 20, 6, '#fff0c8');
  });
  bake(scene, 'hearth-lit', 30, 30, () => paintHearth(true), 15, 15);
  bake(scene, 'hearth-out', 30, 30, () => paintHearth(false), 15, 15);
  bake(scene, 'coin', 30, 30, paintCoin, 15, 15);
  const padded = (key: string, w: number, h: number, paint: () => void) => bake(scene, key, w + 2 * PAD, h + 2 * PAD, paint, PAD, PAD);
  padded('order-card', ORDER.w, ORDER.h, paintOrderCard);
  bake(scene, 'pip-lit', 20, 20, () => paintPip(true), 10, 10);
  bake(scene, 'pip-dark', 20, 20, () => paintPip(false), 10, 10);
  padded('gust-tag', GUST_TAG.w, GUST_TAG.h, paintGustTag);
  padded('save-tag', SAVE_TAG.w, SAVE_TAG.h, paintSaveTag);
  bake(scene, 'spark', 12, 12, () => {
    glow(6, 6, 6, '#ffe8b0', 0.9);
    dot(6, 6, 1.4, '#fff6dc');
  });
  padded('panel', 600, 400, () => paintPanel(600, 400));
  padded('panel-small', 520, 240, () => paintPanel(520, 240));
  padded('card-on', 250, 66, () => paintCard(250, 66, true));
  padded('card-off', 250, 66, () => paintCard(250, 66, false));
  padded('btn', 200, 40, () => paintCard(200, 40, true));
  padded('btn-hover', 200, 40, () => paintCard(200, 40, true, true));
}
