import Phaser from 'phaser';
import { COLS, ROWS, VILLAGES, terrainAt } from '../game/map';
import { BOARD, ISO, iso } from '../scenes/layout';
import { bakeCanvas, mix, poly, shadow, type Ctx, type Pt } from './canvas';
import { seeded } from './pixelArt';

// The valley in isometric low-poly: a floating block of land under a pale sky, baked once into the
// `valley` texture, and the things that stand on it, each baked as a texture drawn on its own tile
// so it can sit in front of or behind the wyrm: `forest` (a clump of pines), `peak` (a mountain),
// `roost` and `village-<name>`.

/** How much smaller than the mockups' 150-pixel tiles everything is drawn. */
const K = ISO.tw / 150;

/** How far a river tile's floor sits below the grass. */
export const RIVER_DROP = 6;

/** Each village's roof colours (light slope, dark side), by name. */
export const ROOFS: Record<string, [string, string]> = {
  Millbrook: ['#e9b949', '#c48f22'],
  Ashford: ['#8f95a8', '#6b7084'],
  Fernhollow: ['#5fae5a', '#3f8a3f'],
  Stonereach: ['#c0724a', '#9a5434'],
  Saltmere: ['#4f86d0', '#3566a8'],
  Brackenly: ['#b7894f', '#8f6634'],
  Dunmoor: ['#d0a066', '#a87a40'],
  Wyndle: ['#6ab8c8', '#4890a0'],
  Kettlecross: ['#b06a9a', '#8a4a78'],
};

export function bakeValley(scene: Phaser.Scene) {
  bakeCanvas(scene, 'valley', BOARD.w, BOARD.h, (ctx) => {
    ctx.translate(-BOARD.x, -BOARD.y);
    backdrop(ctx);
    for (let s = 0; s < COLS + ROWS - 1; s++) {
      for (let c = 0; c < COLS; c++) {
        const r = s - c;
        if (r >= 0 && r < ROWS) block(ctx, c, r);
      }
    }
  });
  prop(scene, 'forest', forest);
  prop(scene, 'peak', mountain);
  prop(scene, 'roost', roost);
  for (const v of VILLAGES) prop(scene, `village-${v.name}`, (ctx, L) => village(ctx, L, ROOFS[v.name] ?? ['#c0b090', '#a09070']));
}

/** The size of a prop's texture, and where the middle of its tile is in it. */
export const PROP = { w: ISO.tw + 40, h: ISO.th + 120, x: (ISO.tw + 40) / 2, y: 100 + ISO.th / 2 };

/** A point on a tile, in tile units from its top corner (0 to 1 each way), `z` pixels up, in a prop's texture. */
type Local = (u: number, v: number, z?: number) => Pt;

function prop(scene: Phaser.Scene, key: string, draw: (ctx: Ctx, L: Local) => void) {
  const L: Local = (u, v, z = 0) => ({ x: PROP.x + ((u - v) * ISO.tw) / 2, y: PROP.y + ((u + v - 1) * ISO.th) / 2 - z });
  bakeCanvas(scene, key, PROP.w, PROP.h, (ctx) => draw(ctx, L));
}

function backdrop(ctx: Ctx) {
  const rnd = seeded(7);
  const g = ctx.createLinearGradient(0, BOARD.y, 0, BOARD.y + BOARD.h);
  g.addColorStop(0, '#9fcfe0');
  g.addColorStop(1, '#d9ead0');
  ctx.fillStyle = g;
  ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 9; i++) {
    const x = BOARD.x + rnd() * BOARD.w;
    const y = BOARD.y + 20 + rnd() * 110;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.ellipse(x + j * 19 - 30, y + Math.sin(j) * 4, 30 + rnd() * 15, 11 + rnd() * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // The valley's shadow on the haze below it.
  const c = iso(COLS / 2 + 0.6, ROWS / 2 + 0.6);
  const sg = ctx.createRadialGradient(c.x, c.y + 35, 20, c.x, c.y + 35, 380);
  sg.addColorStop(0, 'rgba(40,60,40,0.18)');
  sg.addColorStop(1, 'rgba(40,60,40,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 35, 390, 190, 0, 0, Math.PI * 2);
  ctx.fill();
}

const GRASS = ['#82c45c', '#7bbd56', '#88c962'];
const FOREST = ['#6eae4f', '#68a84a', '#73b354'];

/** One tile: its top, and the earth under its front faces. */
function block(ctx: Ctx, c: number, r: number) {
  const t = terrainAt(c, r);
  const rnd = seeded(c * 31 + r * 7 + 1);
  const drop = t === 'river' ? RIVER_DROP : 0;
  const D = ISO.depth;
  const T = iso(c, r, -drop);
  const R = iso(c + 1, r, -drop);
  const B = iso(c + 1, r + 1, -drop);
  const L = iso(c, r + 1, -drop);
  const down = (p: Pt, d: number) => ({ x: p.x, y: p.y + d });
  const lip = t === 'river' ? '#c9b47c' : '#5f9c40';
  poly(ctx, [L, B, down(B, D - drop), down(L, D - drop)], '#9a6a43');
  poly(ctx, [B, R, down(R, D - drop), down(B, D - drop)], '#7b5133');
  poly(ctx, [L, B, down(B, 4), down(L, 4)], t === 'river' ? lip : mix(lip, '#ffffff', 0.05));
  poly(ctx, [B, R, down(R, 4), down(B, 4)], t === 'river' ? lip : mix(lip, '#000000', 0.15));
  ctx.strokeStyle = 'rgba(90,55,30,0.55)';
  ctx.lineWidth = 1;
  for (const f of [0.55, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(L.x, L.y + (D - drop) * f);
    ctx.lineTo(B.x, B.y + (D - drop) * f);
    ctx.lineTo(R.x, R.y + (D - drop) * f);
    ctx.stroke();
  }
  const pick = (arr: string[]) => arr[(c * 7 + r * 13) % arr.length];
  const top = t === 'forest' ? pick(FOREST) : t === 'mountain' ? '#9fa08e' : t === 'river' ? '#e2cd95' : pick(GRASS);
  poly(ctx, [T, R, B, L], top);
  if (t === 'river') {
    const z = -drop - 1;
    const a = iso(c + 0.12, r, z);
    const b = iso(c + 0.88, r, z);
    const wg = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    wg.addColorStop(0, '#3c8ad2');
    wg.addColorStop(0.5, '#4a98de');
    wg.addColorStop(1, '#2f74b8');
    poly(ctx, [a, b, iso(c + 0.88, r + 1, z), iso(c + 0.12, r + 1, z)], wg);
    ctx.strokeStyle = 'rgba(200,232,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const u = c + 0.3 + rnd() * 0.4;
      const v = r + 0.15 + i * 0.3;
      const p1 = iso(u, v, z);
      const p2 = iso(u, v + 0.14, z);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  } else if (t !== 'mountain') {
    ctx.strokeStyle = 'rgba(70,130,45,0.65)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const p = iso(c + 0.15 + rnd() * 0.7, r + 0.15 + rnd() * 0.7);
      ctx.beginPath();
      ctx.moveTo(p.x - 2, p.y);
      ctx.lineTo(p.x - 1, p.y - 3);
      ctx.moveTo(p.x + 0.5, p.y);
      ctx.lineTo(p.x + 1.5, p.y - 3.5);
      ctx.stroke();
    }
  }
}

function pine(ctx: Ctx, at: Pt, s: number) {
  const { x, y } = at;
  s *= K;
  shadow(ctx, x + 10 * s, y + 4 * s, 22 * s, 9 * s, 0.25);
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(x - 3 * s, y - 14 * s, 6 * s, 14 * s);
  for (const [dy, w, h] of [
    [0, 38, 30],
    [-22, 30, 26],
    [-40, 22, 22],
  ]) {
    const foot = y - 14 * s + dy * s;
    const top = foot - h * s;
    poly(ctx, [{ x, y: top }, { x, y: foot }, { x: x - (w * s) / 2 - 4 * s, y: foot }], '#3f8c46');
    poly(ctx, [{ x, y: top }, { x: x + (w * s) / 2 + 4 * s, y: foot }, { x, y: foot }], '#2d6d37');
  }
}

function forest(ctx: Ctx, L: Local) {
  for (const [u, v, s] of [
    [0.3, 0.35, 1],
    [0.68, 0.32, 0.9],
    [0.45, 0.7, 1.1],
    [0.78, 0.72, 0.85],
  ].sort((a, b) => a[0] + a[1] - (b[0] + b[1]))) {
    pine(ctx, L(u, v), s);
  }
}

function mountain(ctx: Ctx, L: Local) {
  const T = L(0.06, 0.06);
  const R = L(0.94, 0.06);
  const B = L(0.94, 0.94);
  const Lf = L(0.06, 0.94);
  const A = L(0.5, 0.5, 64);
  poly(ctx, [T, R, A], '#9a96a8');
  poly(ctx, [T, Lf, A], '#a9a5b6');
  poly(ctx, [Lf, B, A], '#b9b5c6');
  poly(ctx, [B, R, A], '#837e93');
  const at = (p: Pt, t: number) => ({ x: A.x + (p.x - A.x) * t, y: A.y + (p.y - A.y) * t });
  poly(ctx, [A, at(Lf, 0.34), at(B, 0.3)], '#ffffff');
  poly(ctx, [A, at(B, 0.3), at(R, 0.36)], '#d8dce8');
  poly(ctx, [A, at(T, 0.3), at(Lf, 0.34)], '#eef0f6');
}

/** A cottage on the tile's back half, from `du` along the columns. */
function house(ctx: Ctx, L: Local, du: number, dv: number, roof: [string, string]) {
  const u0 = du;
  const v0 = dv;
  const u1 = u0 + 0.34;
  const v1 = v0 + 0.3;
  const h = 30 * K;
  const rh = 28 * K;
  const vm = (v0 + v1) / 2;
  const c = L((u0 + u1) / 2, (v0 + v1) / 2);
  shadow(ctx, c.x + 7, c.y + 3, 20, 8, 0.3);
  const ink = '#5b4632';
  poly(ctx, [L(u0, v1, 0), L(u1, v1, 0), L(u1, v1, h), L(u0, v1, h)], '#f1e4c6', ink, 1);
  poly(ctx, [L(u1, v1, 0), L(u1, v0, 0), L(u1, v0, h), L(u1, vm, h + rh), L(u1, v1, h)], '#d3c19b', ink, 1);
  poly(ctx, [L(u0 + 0.13, v1, 0), L(u0 + 0.2, v1, 0), L(u0 + 0.2, v1, 18 * K), L(u0 + 0.13, v1, 18 * K)], '#6b4a2b');
  poly(ctx, [L(u1, v0 + 0.08, 12 * K), L(u1, v0 + 0.15, 12 * K), L(u1, v0 + 0.15, 22 * K), L(u1, v0 + 0.08, 22 * K)], '#5aa0d8');
  poly(ctx, [L(u0 + 0.25, v1, 12 * K), L(u0 + 0.31, v1, 12 * K), L(u0 + 0.31, v1, 22 * K), L(u0 + 0.25, v1, 22 * K)], '#5aa0d8');
  poly(ctx, [L(u0 - 0.03, v1 + 0.04, h - 2), L(u1 + 0.03, v1 + 0.04, h - 2), L(u1 + 0.03, vm, h + rh), L(u0 - 0.03, vm, h + rh)], roof[0], '#4a3a2a', 1);
  poly(ctx, [L(u1 + 0.03, vm, h + rh), L(u1 + 0.03, v1 + 0.04, h - 2), L(u1 + 0.05, v1 + 0.04, h - 3), L(u1 + 0.05, vm, h + rh - 1)], roof[1]);
  poly(ctx, [L(u0 + 0.06, vm - 0.02, h + rh - 3), L(u0 + 0.11, vm - 0.02, h + rh - 3), L(u0 + 0.11, vm - 0.02, h + rh + 6), L(u0 + 0.06, vm - 0.02, h + rh + 6)], '#9c6a4a');
}

/** Two cottages on the tile's back corners, clear of the track down its middle either way. */
function village(ctx: Ctx, L: Local, roof: [string, string]) {
  house(ctx, L, 0.02, 0.04, roof);
  house(ctx, L, 0.62, 0.04, roof);
}

/** A faceted boulder with its cave mouth facing east, and a glint of hoard inside. */
function roost(ctx: Ctx, L: Local) {
  const { x, y } = L(0.5, 0.5);
  const s = K;
  shadow(ctx, x + 5, y + 5, 32, 13, 0.3);
  const pts = [
    [-62, 6],
    [-50, -40],
    [-14, -70],
    [30, -62],
    [58, -30],
    [62, 8],
    [30, 26],
    [-30, 26],
  ].map(([px, py]) => ({ x: x + px * s, y: y + py * s }));
  const top = { x: x + 2 * s, y: y - 30 * s };
  const fills = ['#a7a3b0', '#b8b4c2', '#c4c0cd', '#9a96a5', '#86828f', '#77737f', '#8d8997', '#9c98a6'];
  pts.forEach((p, i) => poly(ctx, [top, p, pts[(i + 1) % pts.length]], fills[i]));
  poly(ctx, [
    { x: x + 18 * s, y: y + 18 * s },
    { x: x + 22 * s, y: y - 22 * s },
    { x: x + 44 * s, y: y - 26 * s },
    { x: x + 52 * s, y: y + 8 * s },
  ], '#1f1b24');
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.ellipse(x + 36 * s, y + 6 * s, 10 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe08a';
  ctx.fillRect(x + 32 * s, y + 1 * s, 4 * s, 3 * s);
}
