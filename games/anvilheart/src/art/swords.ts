import Phaser from 'phaser';
import { MAX_TIER } from '../game/swords';
import { PI, bake, ctx, glass, glow, lit, mix, rect, reseed, ring, type Pt } from './glass';

// Every sword is a leaded window piece lying corner to corner, hilt at the bottom left: a blade of
// two panes split along its ridge, a guard, a grip and a jewel pommel. Better swords are longer and
// broader, in finer glass.

interface Shape {
  /** Blade length, width and curve (the Silver Saber's bend). */
  blade: [number, number, number];
  /** Guard half span and thickness. */
  guard: [number, number];
  grip: number;
  pommel: number;
}

const SHAPES: Shape[] = [
  { blade: [62, 13, 0], guard: [12, 6], grip: 22, pommel: 5 },
  { blade: [88, 13, 0], guard: [20, 7], grip: 24, pommel: 6 },
  { blade: [112, 14, 0], guard: [24, 7], grip: 26, pommel: 7 },
  { blade: [120, 16, 0], guard: [30, 8], grip: 28, pommel: 8 },
  { blade: [124, 14, 0.18], guard: [26, 7], grip: 28, pommel: 7 },
  { blade: [134, 20, 0], guard: [36, 9], grip: 34, pommel: 9 },
  { blade: [130, 17, 0], guard: [32, 8], grip: 30, pommel: 8 },
  { blade: [146, 24, 0], guard: [40, 10], grip: 36, pommel: 10 },
];

/** Blade, guard, grip and pommel glass for each tier. */
const COLOURS = [
  { b: '#c47a44', g: '#7a4a2a', h: '#5a3424', p: '#8a5a3a' },
  { b: '#a4aec4', g: '#5a6278', h: '#5a3a26', p: '#7a8298' },
  { b: '#dfe8f4', g: '#7a8298', h: '#8a2a3a', p: '#c03050' },
  { b: '#e4ecf6', g: '#e0aa3a', h: '#2a3a7a', p: '#3a7ae0' },
  { b: '#eef6ff', g: '#90c0f0', h: '#2a3a5a', p: '#8fe0ff' },
  { b: '#f6d470', g: '#d08a2a', h: '#6a2a1a', p: '#ffe58a' },
  { b: '#c4b0ff', g: '#5a3a9a', h: '#2a2048', p: '#d080ff' },
  { b: '#4a3a58', g: '#c0402a', h: '#2a1a1a', p: '#ff8a3a' },
];

/** The size of a sword texture, in view pixels: one anvil cell. */
export const SWORD_SIZE = 100;
/** The scale the swords are painted at; a sword image at scale 1 is this big on its anvil. */
const PAINT_SCALE = 1.15;

export const swordTexture = (tier: number) => `sword-${tier}`;

export function bakeSwords(scene: Phaser.Scene) {
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    bake(scene, swordTexture(tier), SWORD_SIZE, SWORD_SIZE, () => drawSword(tier, SWORD_SIZE, SWORD_SIZE, PAINT_SCALE, 0.6));
  }
}

/** The two halves of a blade, split along its ridge, in the sword's own frame (tip along +x). */
function bladeHalves(tier: number) {
  const [len, wd, curve] = SHAPES[tier - 1].blade;
  const hw = wd / 2;
  const n = 8;
  const up: Pt[] = [];
  const lo: Pt[] = [];
  const ridge: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const x = u * len;
    const bend = -curve * len * u * u;
    const taper = u < 0.82 ? 1 : Math.max(0, (1 - u) / 0.18);
    ridge.push([x, bend]);
    up.push([x, bend - hw * taper]);
    lo.push([x, bend + hw * taper]);
  }
  const tip: Pt = [len + wd * 0.5, -curve * len * 1.1];
  const back = ridge.slice().reverse();
  return { upper: [...up, tip, ...back], lower: [...lo, tip, ...back] };
}

/**
 * Paints a sword of `tier` centred on (x, y) in art units, pointing up and to the right, at scale
 * `s`, with a halo of light behind it of strength `light`.
 */
export function drawSword(tier: number, x: number, y: number, s: number, light = 1) {
  const sh = SHAPES[tier - 1];
  const c = COLOURS[tier - 1];
  if (light) glow(x, y, 70 * s, mix(c.b, '#ffffff', 0.3), 0.18 * light);
  reseed(tier * 31);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-PI / 4);
  ctx.scale(s, s);
  ctx.translate(-(sh.blade[0] - sh.grip) / 2, 0);
  const bh = bladeHalves(tier);
  const lw = 3.2 / Math.max(s, 0.8);
  glass(bh.upper, lit(c.b, 0.25), { lw, flat: true, hi: 0.3, lo: 0.1 });
  glass(bh.lower, lit(c.b, -0.18), { lw, flat: true, hi: 0.1, lo: 0.2 });
  // The Runeblade's runes: little panes of pale glass down the ridge.
  if (tier === 7) for (let k = 0; k < 4; k++) glass(rect(16 + k * 24, -3, 10, 6), '#f0e0ff', { lw: 1.5 / s, flat: true });
  // The Dragonslayer's ember vein.
  if (tier === 8) glass([[10, -2], [sh.blade[0] * 0.8, -1.5], [sh.blade[0] * 0.8, 1.5], [10, 2]], '#ff7a2a', { lw: 1.5 / s, flat: true });
  const [gs, gt] = sh.guard;
  glass([[-gt, -gs], [0, -gs], [0, gs], [-gt, gs]], c.g, { lw, flat: true });
  glass([[-gt - sh.grip, -5], [-gt, -5], [-gt, 5], [-gt - sh.grip, 5]], c.h, { lw, flat: true });
  glass(ring(-gt - sh.grip - sh.pommel * 0.6, 0, sh.pommel, 8), c.p, { lw, flat: true, hi: 0.5 });
  ctx.restore();
}

/** Scales a sword image from its size on an anvil to `paintScale` in the mockup's terms. */
export const swordScale = (paintScale: number) => paintScale / PAINT_SCALE;
