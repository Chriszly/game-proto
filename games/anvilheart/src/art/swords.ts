import Phaser from 'phaser';
import { isBattered, isGem, isGemmed, isMaster, isShield, tierOf } from '../game/items';
import { SHIELD_TOP } from '../game/shields';
import { MAX_TIER } from '../game/swords';
import { PI, bake, ctx, diamond, glass, glow, lit, mix, paint, rect, reseed, ring, type Pt } from './glass';

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
  { blade: [142, 28, 0], guard: [46, 12], grip: 34, pommel: 11 },
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
  { b: '#fff0c8', g: '#e8b040', h: '#5a1a2a', p: '#ff7a4a' },
];

/** The glass of a gem: loose on an anvil, or set in a sword's guard. */
export const GEM_GLASS = '#2ac08e';

/** The size of a sword texture, in view pixels: one anvil cell. */
export const SWORD_SIZE = 100;
/** The scale the swords are painted at; a sword image at scale 1 is this big on its anvil. */
const PAINT_SCALE = 1.15;

/** A sword's texture; a Masterwork is never battered (a hero's battered sword comes back plain). */
export const swordTexture = (tier: number, gemmed = false, battered = false, master = false) =>
  `sword-${tier}${gemmed ? '-gem' : ''}${master ? '-master' : battered ? '-worn' : ''}`;
export const shieldTexture = (tier: number) => `shield-${tier}`;
/** The texture of anything that can lie on an anvil (see `items.ts`). */
export const itemTexture = (item: number) =>
  isGem(item) ? 'gem' : isShield(item) ? shieldTexture(tierOf(item)) : swordTexture(tierOf(item), isGemmed(item), isBattered(item), isMaster(item));

export function bakeSwords(scene: Phaser.Scene) {
  for (let tier = 1; tier <= MAX_TIER; tier++) {
    for (const gemmed of [false, true]) {
      for (const [battered, master] of [[false, false], [true, false], [false, true]]) {
        bake(scene, swordTexture(tier, gemmed, battered, master), SWORD_SIZE, SWORD_SIZE, () =>
          drawSword(tier, SWORD_SIZE, SWORD_SIZE, PAINT_SCALE, 0.6, gemmed, battered, master),
        );
      }
    }
  }
  for (let tier = 1; tier <= SHIELD_TOP; tier++) bake(scene, shieldTexture(tier), SWORD_SIZE, SWORD_SIZE, () => drawShield(tier, SWORD_SIZE, SWORD_SIZE + 4));
  bake(scene, 'gem', SWORD_SIZE, SWORD_SIZE, () => drawGem(SWORD_SIZE, SWORD_SIZE + 6, 34));
}

/** Rim, face and boss glass for each buckler tier: wood, iron, steel, silver and gold. */
const SHIELD_COLOURS = [
  { rim: '#5a6278', face: '#9a6a34', boss: '#7a8298' },
  { rim: '#4a5266', face: '#8a92a8', boss: '#c4ccdc' },
  { rim: '#7a8298', face: '#cdd8e8', boss: '#3a7ae0' },
  { rim: '#90c0f0', face: '#eef4fc', boss: '#8fe0ff' },
  { rim: '#d08a2a', face: '#f6d470', boss: '#ff7a4a' },
];

/**
 * Paints a round buckler of `tier` centred on (x, y) in art units: a leaded rim round a face of
 * wedge panes, rivets round the rim from the iron one up, and a jewel boss in the middle. Better
 * bucklers are bigger and finer.
 */
export function drawShield(tier: number, x: number, y: number) {
  const c = SHIELD_COLOURS[tier - 1];
  reseed(tier * 53);
  const r = 52 + tier * 6;
  glow(x, y, r * 1.5, mix(c.face, '#ffffff', 0.3), 0.18);
  glass(ring(x, y, r, 20), c.rim, { lw: 4, hi: 0.3 });
  const face = ring(x, y, r * 0.8, 20);
  const wedges = 6 + 2 * Math.floor(tier / 2);
  for (let k = 0; k < wedges; k++) {
    const t0 = (k / wedges) * PI * 2;
    const t1 = ((k + 1) / wedges) * PI * 2;
    const arc: Pt[] = [];
    for (let j = 0; j <= 4; j++) {
      const t = t0 + ((t1 - t0) * j) / 4;
      arc.push([x + Math.cos(t) * r * 0.8, y + Math.sin(t) * r * 0.8]);
    }
    glass([[x, y], ...arc], lit(c.face, k % 2 ? 0.12 : -0.08), { lw: 3, flat: true, hi: 0.2 });
  }
  glass(face, '#000000', { empty: true, lw: 4 });
  if (tier > 1) for (let k = 0; k < 8; k++) {
    const t = (k / 8) * PI * 2 + PI / 8;
    glass(ring(x + Math.cos(t) * r * 0.9, y + Math.sin(t) * r * 0.9, 4.5, 6), '#e8e0d0', { lw: 2, flat: true, hi: 0.5 });
  }
  glow(x, y, r * 0.5, mix(c.boss, '#ffffff', 0.4), 0.4);
  glass(ring(x, y, r * 0.26, 10), c.boss, { lw: 3, hi: 0.6 });
}

/** A cut gem of green glass centred on (x, y), `r` across from the centre: a crown of facets round a table. */
export function drawGem(x: number, y: number, r: number) {
  reseed(77);
  glow(x, y, r * 2.2, '#b8ffe0', 0.35);
  const rim = ring(x, y, r, 8, PI / 8);
  const table = ring(x, y - r * 0.08, r * 0.5, 8, PI / 8);
  for (let k = 0; k < 8; k++) {
    const n = (k + 1) % 8;
    glass([rim[k], rim[n], table[n], table[k]], lit(GEM_GLASS, k < 4 ? -0.15 + k * 0.08 : 0.1 + (k - 4) * 0.07), { lw: 3, flat: true });
  }
  glass(table, lit(GEM_GLASS, 0.35), { lw: 3, flat: true, hi: 0.5 });
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
 * `s`, with a halo of light behind it of strength `light`. A battered one, brought back from a
 * quest, is in dulled glass with a notched edge and cracks across the blade.
 */
export function drawSword(tier: number, x: number, y: number, s: number, light = 1, gemmed = false, battered = false, master = false) {
  const sh = SHAPES[tier - 1];
  const fresh = COLOURS[tier - 1];
  const c = battered ? { b: mix(fresh.b, '#6a5a4a', 0.45), g: mix(fresh.g, '#5a4a3a', 0.4), h: fresh.h, p: mix(fresh.p, '#5a4a3a', 0.4) } : fresh;
  // A Masterwork sits in a warm gold light.
  if (master) glow(x, y, 80 * s, '#ffd36a', 0.55);
  if (light && !battered) glow(x, y, 70 * s, mix(c.b, '#ffffff', 0.3), 0.18 * light);
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
  // The Anvilheart's gold fuller and the glowing heart above its guard.
  if (tier === 9) {
    glass([[30, -2.5], [sh.blade[0] * 0.8, -1.5], [sh.blade[0] * 0.8, 1.5], [30, 2.5]], '#ffd36a', { lw: 1.5 / s, flat: true });
    glow(16, 0, 22, '#ffb080', 0.7);
    glass([[26, 0], [14, -9], [7, -9], [4, -5], [6, 0], [4, 5], [7, 9], [14, 9]], '#ff4a3a', { lw: 2 / s, flat: true, hi: 0.5 });
  }
  // Battered: two notches bitten from the edge and a crack across the blade.
  if (battered) {
    const len = sh.blade[0];
    const hw = sh.blade[1] / 2;
    for (const u of [0.35, 0.62]) {
      const bend = -sh.blade[2] * len * u * u;
      glass([[len * u - 5, bend - hw - 1], [len * u + 5, bend - hw - 1], [len * u + 1, bend - hw + 5]], '#2a2430', { lw: 1.5 / s, flat: true });
    }
    paint(() => {
      ctx.moveTo(len * 0.48, -hw);
      ctx.lineTo(len * 0.5, -1);
      ctx.lineTo(len * 0.46, 2);
      ctx.lineTo(len * 0.5, hw);
    }, 2 / s);
  }
  // A Masterwork: a gold line down the ridge and a four-pointed glint at the tip.
  if (master) {
    const len = sh.blade[0];
    glass([[6, -1.2], [len * 0.85, -0.8], [len * 0.85, 0.8], [6, 1.2]], '#ffe58a', { lw: 1.2 / s, flat: true });
    const tx = len * 0.92;
    const ty = -sh.blade[2] * len;
    const g = 14 / s;
    glow(tx, ty, g * 1.6, '#fff4c0', 0.8);
    glass([[tx, ty - g], [tx + g * 0.22, ty - g * 0.22], [tx + g, ty], [tx + g * 0.22, ty + g * 0.22], [tx, ty + g], [tx - g * 0.22, ty + g * 0.22], [tx - g, ty], [tx - g * 0.22, ty - g * 0.22]], '#fff1b0', {
      lw: 1.5 / s,
      flat: true,
      hi: 0.6,
    });
  }
  const [gs, gt] = sh.guard;
  glass([[-gt, -gs], [0, -gs], [0, gs], [-gt, gs]], c.g, { lw, flat: true });
  // A set gem: a green jewel on the guard, a little proud of it.
  if (gemmed) {
    const r = Math.max(9, gs * 0.42);
    glow(-gt / 2, 0, r * 2.4, '#b8ffe0', 0.7);
    glass(diamond(-gt / 2, 0, r), GEM_GLASS, { lw, flat: true, hi: 0.6 });
  }
  glass([[-gt - sh.grip, -5], [-gt, -5], [-gt, 5], [-gt - sh.grip, 5]], c.h, { lw, flat: true });
  glass(ring(-gt - sh.grip - sh.pommel * 0.6, 0, sh.pommel, 8), c.p, { lw, flat: true, hi: 0.5 });
  ctx.restore();
}

/** Scales a sword image from its size on an anvil to `paintScale` in the mockup's terms. */
export const swordScale = (paintScale: number) => paintScale / PAINT_SCALE;
