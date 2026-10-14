import Phaser from 'phaser';
import type { Cargo } from '../game/map';
import { ISO } from '../scenes/layout';
import { GOLD, INK, WOOD } from './palette';
import { bakeCanvas, ellipse, poly, shadow, sphere, type Ctx, type Pt } from './canvas';
import { bakePixelArt } from './pixelArt';

// The wyrm and its wagons in the isometric style, and the pixel icons for cargo, coins and hearts.
// Each wyrm part is a texture whose origin (`PART_ORIGIN`) is the point on the ground under it, so
// the scene places it on the track and sorts it by that point; the part floats above it.

export function bakeSprites(scene: Phaser.Scene) {
  bakeWyrm(scene);
  for (const [cargo, rows] of Object.entries(CARGO_ICONS)) bakePixelArt(scene, `cargo-${cargo}`, rows, ICON_COLORS, 3, INK);
  bakePixelArt(scene, 'coin', COIN, ICON_COLORS, 3, INK);
  bakePixelArt(scene, 'heart', HEART, ICON_COLORS, 3, INK);
  bakePixelArt(scene, 'heart-empty', HEART.map((r) => r.replace(/[rp]/g, 'x')), ICON_COLORS, 3, INK);
}

/** Every wyrm texture is this size, with the ground point under the part at `x`, `y`. */
export const PART = { w: 120, h: 90, x: 60, y: 76 };
export const PART_ORIGIN = { x: PART.x / PART.w, y: PART.y / PART.h };

/** The mockups drew the wyrm for 150-pixel tiles; it is drawn a little larger than that scale here. */
const SCALE = (ISO.tw / 150) * 1.4;
const GREEN = { base: '#4fbf5a', light: '#9be883', dark: '#2b7c39' };

function bakeWyrm(scene: Phaser.Scene) {
  const part = (key: string, draw: (ctx: Ctx, x: number, y: number) => void) => bakeCanvas(scene, key, PART.w, PART.h, (ctx) => draw(ctx, PART.x, PART.y));
  part('wyrm-head', (ctx, x, y) => {
    shadow(ctx, x + 3, y + 3, 18, 7, 0.25);
    const hy = y - 42 * SCALE;
    sphere(ctx, x, hy, 31 * SCALE, '#55c560', '#a5ec8b', GREEN.dark);
    const k = SCALE * 2;
    ellipse(ctx, x + 1 * k, hy + 9 * k, 9 * k, 6 * k, '#5ccc66');
    ctx.fillStyle = GREEN.dark;
    ctx.fillRect(x - 3 * k, hy + 11 * k, 1.5 * k, 1.5 * k);
    ctx.fillRect(x + 4 * k, hy + 11 * k, 1.5 * k, 1.5 * k);
    poly(ctx, [{ x: x - 7 * k, y: hy - 9 * k }, { x: x - 13 * k, y: hy - 21 * k }, { x: x - 3 * k, y: hy - 11 * k }], '#f1e5c6', '#8a7a5a', 1);
    poly(ctx, [{ x: x + 6 * k, y: hy - 9 * k }, { x: x + 12 * k, y: hy - 21 * k }, { x: x + 2 * k, y: hy - 11 * k }], '#e2d4b2', '#8a7a5a', 1);
    for (const ex of [-4.5, 4.5]) {
      ellipse(ctx, x + ex * k, hy - 1 * k, 3 * k, 3.5 * k, '#fffbe6');
      ellipse(ctx, x + (ex + 0.5) * k, hy - 0.5 * k, 1.5 * k, 2.3 * k, '#1b1b1b');
    }
  });
  for (const [i, size] of [0.9, 0.8, 0.7].entries()) {
    part(`wyrm-coil-${i}`, (ctx, x, y) => {
      shadow(ctx, x + 3, y + 2, 13 * size, 5, 0.22);
      const r = 27 * SCALE * size;
      const cy = y - (20 + i * 3) * SCALE;
      sphere(ctx, x, cy, r, GREEN.base, GREEN.light, GREEN.dark);
      poly(ctx, [{ x: x - 2, y: cy - r + 1 }, { x: x + 1, y: cy - r - 6 * size }, { x: x + 3, y: cy - r + 2 }], '#e9dfb8');
    });
  }
  part('wyrm-wings', (ctx, x, y) => {
    const w = { x, y: y - 40 * SCALE };
    const k = SCALE;
    poly(ctx, [w, { x: w.x - 74 * k, y: w.y - 44 * k }, { x: w.x - 50 * k, y: w.y - 6 * k }, { x: w.x - 66 * k, y: w.y + 10 * k }], '#3fa04d', '#25623a', 1);
    poly(ctx, [w, { x: w.x + 66 * k, y: w.y - 52 * k }, { x: w.x + 50 * k, y: w.y - 10 * k }, { x: w.x + 68 * k, y: w.y + 4 * k }], '#2f8a3f', '#25623a', 1);
  });
  // The wagons, lengthwise along the columns (`wagon-u`) or along the rows (`wagon-v`).
  for (const along of ['u', 'v'] as const) part(`wagon-${along}`, (ctx, x, y) => wagon(ctx, x, y, along));
}

function wagon(ctx: Ctx, x: number, y: number, along: 'u' | 'v') {
  const P = (u: number, v: number, z = 0): Pt => ({ x: x + ((u - v) * ISO.tw) / 2, y: y + ((u + v) * ISO.th) / 2 - z });
  const [hu, hv] = along === 'v' ? [0.14, 0.19] : [0.19, 0.14];
  const h = 22 * SCALE;
  const z = 6 * SCALE;
  const [u0, u1, v0, v1] = [-hu, hu, -hv, hv];
  shadow(ctx, x + 3, y + 3, 22, 9, 0.3);
  const wheels = along === 'v' ? [[u0, v0 + 0.06], [u0, v1 - 0.06]] : [[u0 + 0.06, v1], [u1 - 0.06, v1]];
  for (const [wu, wv] of wheels) {
    const p = P(wu, wv, 8 * SCALE);
    ellipse(ctx, p.x, p.y, 4, 6, '#3b2a1c', along === 'v' ? 0.5 : -0.5);
  }
  poly(ctx, [P(u0, v1, z), P(u1, v1, z), P(u1, v1, z + h), P(u0, v1, z + h)], '#a8703f', '#4a3220', 1);
  poly(ctx, [P(u1, v1, z), P(u1, v0, z), P(u1, v0, z + h), P(u1, v1, z + h)], '#8a5a31', '#4a3220', 1);
  poly(ctx, [P(u0, v0, z + h), P(u1, v0, z + h), P(u1, v1, z + h), P(u0, v1, z + h)], '#5c3d22', '#4a3220', 1);
  const front = along === 'v' ? [[u1, v0 + 0.06], [u1, v1 - 0.06]] : [[u0 + 0.06, v1], [u1 - 0.06, v1]];
  for (const [wu, wv] of front) {
    const p = P(wu + (along === 'u' ? 0 : 0), wv, 8 * SCALE);
    ellipse(ctx, p.x, p.y, 4.5, 6.5, '#2a1d12', along === 'v' ? 0.5 : -0.5);
    ellipse(ctx, p.x, p.y, 1.6, 2.4, '#b08850', along === 'v' ? 0.5 : -0.5);
  }
}

/** How high above the ground point a wagon's load sits. */
export const LOAD_LIFT = 28 * SCALE + 6;

const ICON_COLORS = {
  y: 0xe8c45a, // grain
  t: 0xc9a46a, // sack
  b: 0x8a6a40,
  i: 0xb9b4c2, // iron
  w: WOOD.base,
  W: WOOD.light,
  D: WOOD.dark,
  o: 0x6e6878, // ore
  O: 0x9a94a6,
  c: 0x6ad0e8, // crystal glint
  f: 0x7aa8d0, // fish
  F: 0xc8e0f0,
  G: GOLD,
  L: 0xfff2b0,
  r: 0xd8483f, // heart
  p: 0xf08a8a,
  x: 0x4a3a3a,
};

const CARGO_ICONS: Record<Cargo, string[]> = {
  grain: ['..y.y..', '.yyyyy.', '..ttt..', '.ttttt.', 'tttbttt', 'ttttttt', '.ttttt.'],
  tools: ['.iiiii.', '.iiiii.', '...w...', '...w...', '...w...', '...w...', '...D...'],
  timber: ['.......', 'WbWbWb.', 'wwwwwwb', '.WbWbWb', 'wwwwwww', 'WbWbWb.', '.......'],
  ore: ['...O...', '..OOo..', '.OcOoo.', 'OOOoooo', 'OOocooo', '.Ooooo.', '.......'],
  fish: ['.......', 'f..fff.', 'ff.fFfF', '.fffffF', 'ff.ffff', 'f..fff.', '.......'],
};

const COIN = ['.GGG.', 'GLGGG', 'GLGGG', 'GGGGG', '.GGG.'];
const HEART = ['.rr.rr.', 'rpprrrr', 'rprrrrr', '.rrrrr.', '..rrr..', '...r...'];
