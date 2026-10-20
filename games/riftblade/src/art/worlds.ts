/**
 * The textures of the four later planets the space map leads to, in the same Glow Vector style: the
 * Spore world's Mycelid Bloom (magenta and pink), the Scrap world's Scrap Horde (rust and copper), the
 * Crystal world's Shardborn (violet and aqua) and the Storm world's Stormcallers (electric yellow),
 * each with its boss, plus their hostile bolts. All face right; the scene flips them toward the hero.
 */
import Phaser from 'phaser';
import { C, beam, glow, outline, paint, shape, type Ctx } from './glow';

const SPORE = '#ff7ad9';
const SPORE_DARK = '#2a0a2a';
const RUST = '#e8b07a';
const RUST_HOT = '#ff8a4a';
const RUST_DARK = '#24170e';
const CRYSTAL = '#7ff5e6';
const PRISM = '#b48cff';
const CRYSTAL_DARK = '#140f30';
const STORM = '#ffe45c';
const STORM_LIGHT = '#fff8c8';
const STORM_DARK = '#141a2c';

function eliteRing(ctx: Ctx, cx: number, cy: number, r: number) {
  outline(ctx, () => ctx.arc(cx, cy, r, 0, Math.PI * 2), C.elite, 2.5, 14);
}

function dot(ctx: Ctx, x: number, y: number, r: number, color: string, blur = 6) {
  ctx.save();
  glow(ctx, color, blur);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A pointed shape from a list of points (relative to the centre, scaled by `k`). */
function poly(ctx: Ctx, cx: number, cy: number, k: number, pts: readonly (readonly [number, number])[]) {
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(cx + x * k, cy + y * k) : ctx.lineTo(cx + x * k, cy + y * k)));
  ctx.closePath();
}

// ---------------------------------------------------------------------------------------------
// The Spore world: the Mycelid Bloom

/** A sporeling: a little round puffball on stubby feet, with spots and one eye. */
function sporeling(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 14 * k);
  outline(ctx, () => {
    ctx.moveTo(cx - 4 * k, cy + 7 * k);
    ctx.lineTo(cx - 6 * k, cy + 11 * k);
    ctx.moveTo(cx + 4 * k, cy + 7 * k);
    ctx.lineTo(cx + 6 * k, cy + 11 * k);
  }, SPORE, 1.5 * k, 4);
  shape(ctx, () => ctx.arc(cx, cy, 9 * k, 0, Math.PI * 2), SPORE_DARK, SPORE, 9);
  dot(ctx, cx - 4 * k, cy - 4 * k, 1.5 * k, '#ffc6ef', 3);
  dot(ctx, cx - 1 * k, cy + 4 * k, 1.2 * k, '#ffc6ef', 3);
  dot(ctx, cx + 4 * k, cy - 1 * k, 2 * k, '#fff0fb', 6);
}

/** A puffcap: a broad mushroom cap on a thick stalk, its gills glowing. */
function puffcap(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 18 * k);
  shape(ctx, () => ctx.roundRect(cx - 4 * k, cy - 2 * k, 8 * k, 14 * k, 3 * k), '#1d0820', '#d36bff', 6);
  shape(ctx, () => {
    ctx.moveTo(cx - 16 * k, cy);
    ctx.quadraticCurveTo(cx - 14 * k, cy - 15 * k, cx, cy - 15 * k);
    ctx.quadraticCurveTo(cx + 14 * k, cy - 15 * k, cx + 16 * k, cy);
    ctx.closePath();
  }, SPORE_DARK, SPORE, 12);
  for (let i = -2; i <= 2; i++) dot(ctx, cx + i * 5 * k, cy - 8 * k + Math.abs(i) * 1.5 * k, 1.6 * k, '#ffc6ef', 4);
  outline(ctx, () => {
    ctx.moveTo(cx - 13 * k, cy + 1 * k);
    ctx.lineTo(cx + 13 * k, cy + 1 * k);
  }, '#ffc6ef', 1.2 * k, 6);
}

/** The Spore Queen: a towering cap over a ring of tendrils, a crown of glowing bulbs. */
function sporeQueen(ctx: Ctx, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2 + 8;
  for (let i = 0; i < 7; i++) {
    const x = cx - 42 + i * 14;
    outline(ctx, () => {
      ctx.moveTo(x, cy + 6);
      ctx.quadraticCurveTo(x + (i % 2 ? 8 : -8), cy + 28, x + (i % 2 ? -4 : 4), cy + 44);
    }, '#d36bff', 3, 10);
  }
  shape(ctx, () => ctx.ellipse(cx, cy + 6, 30, 18, 0, 0, Math.PI * 2), '#1d0820', '#d36bff', 12);
  shape(ctx, () => {
    ctx.moveTo(cx - 62, cy);
    ctx.quadraticCurveTo(cx - 58, cy - 54, cx, cy - 56);
    ctx.quadraticCurveTo(cx + 58, cy - 54, cx + 62, cy);
    ctx.quadraticCurveTo(cx, cy - 10, cx - 62, cy);
  }, SPORE_DARK, SPORE, 20);
  for (let i = 0; i < 5; i++) dot(ctx, cx - 36 + i * 18, cy - 30 - (i % 2) * 10, 4, '#ffc6ef', 12);
  dot(ctx, cx + 14, cy + 6, 3.4, '#fff0fb', 12);
  dot(ctx, cx - 4, cy + 6, 3.4, '#fff0fb', 12);
}

// ---------------------------------------------------------------------------------------------
// The Scrap world: the Scrap Horde

/** A scrapper: a low wedge of riveted plate on a single wheel, a hot visor slit. */
function scrapper(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 13 * k);
  outline(ctx, () => ctx.arc(cx - 2 * k, cy + 6 * k, 4 * k, 0, Math.PI * 2), RUST, 1.5 * k, 4);
  shape(ctx, () => poly(ctx, cx, cy, k, [[11, 2], [2, -7], [-9, -6], [-10, 4], [8, 5]]), RUST_DARK, RUST, 8);
  beam(ctx, cx + 1 * k, cy - 2 * k, cx + 7 * k, cy - 0.5 * k, RUST_HOT, 2 * k, 8);
  dot(ctx, cx - 6 * k, cy - 3 * k, 1 * k, RUST, 2);
}

/** A hauler: a boxy carrier stacked with scrap, two treads and a crane arm. */
function hauler(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 22 * k);
  shape(ctx, () => ctx.roundRect(cx - 16 * k, cy + 6 * k, 32 * k, 8 * k, 4 * k), '#1a1109', RUST, 6);
  shape(ctx, () => ctx.roundRect(cx - 14 * k, cy - 10 * k, 26 * k, 17 * k, 3 * k), RUST_DARK, RUST, 10);
  shape(ctx, () => poly(ctx, cx, cy, k, [[-12, -10], [-8, -17], [0, -14], [4, -18], [8, -10]]), '#2e1f12', '#c98a5a', 6);
  outline(ctx, () => {
    ctx.moveTo(cx + 12 * k, cy - 6 * k);
    ctx.lineTo(cx + 19 * k, cy - 12 * k);
    ctx.lineTo(cx + 21 * k, cy - 4 * k);
  }, RUST, 2 * k, 6);
  dot(ctx, cx + 7 * k, cy - 3 * k, 2 * k, RUST_HOT, 8);
}

/** The Scrap King: a hulking crawler of welded plates with a crown of bent girders and a furnace mouth. */
function scrapKing(ctx: Ctx, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  for (const dy of [-34, 34]) shape(ctx, () => ctx.roundRect(cx - 50, cy + dy - 10, 96, 20, 9), '#1a1109', RUST, 10);
  shape(ctx, () => poly(ctx, cx, cy, 1, [[56, 0], [34, -30], [-30, -32], [-52, -10], [-52, 12], [-30, 32], [34, 30]]), RUST_DARK, RUST, 18);
  for (const [x, y] of [[-30, -18], [-30, 18], [10, -22], [10, 22]] as const) dot(ctx, cx + x, cy + y, 2, RUST, 4);
  for (let i = 0; i < 4; i++) {
    outline(ctx, () => {
      ctx.moveTo(cx - 34 + i * 8, cy - 14 + i * 9);
      ctx.lineTo(cx - 46 + i * 8, cy - 22 + i * 13);
    }, '#c98a5a', 3, 6);
  }
  shape(ctx, () => ctx.roundRect(cx + 18, cy - 12, 26, 24, 6), '#3a1608', RUST_HOT, 16);
  beam(ctx, cx + 24, cy - 5, cx + 38, cy - 5, '#ffd36b', 3, 10);
  beam(ctx, cx + 24, cy + 5, cx + 38, cy + 5, '#ffd36b', 3, 10);
}

// ---------------------------------------------------------------------------------------------
// The Crystal world: the Shardborn

/** A shardling: a cluster of three crystal points with a glowing core. */
function shardling(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 14 * k);
  shape(ctx, () => poly(ctx, cx, cy, k, [[12, 0], [3, -5], [-2, -11], [-6, -3], [-11, 2], [-3, 6], [2, 10], [4, 4]]), CRYSTAL_DARK, CRYSTAL, 10);
  outline(ctx, () => {
    ctx.moveTo(cx - 2 * k, cy - 9 * k);
    ctx.lineTo(cx + 2 * k, cy);
    ctx.lineTo(cx + 2 * k, cy + 8 * k);
  }, PRISM, 1.2 * k, 5);
  dot(ctx, cx + 2 * k, cy, 2.2 * k, '#effffd', 8);
}

/** A prism: a tall faceted crystal that hovers, a beam lens on its face. */
function prism(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 18 * k);
  outline(ctx, () => ctx.ellipse(cx, cy + 15 * k, 9 * k, 3 * k, 0, 0, Math.PI * 2), PRISM, 1.5 * k, 6);
  shape(ctx, () => poly(ctx, cx, cy, k, [[0, -16], [9, -4], [6, 11], [-6, 11], [-9, -4]]), CRYSTAL_DARK, PRISM, 12);
  outline(ctx, () => {
    ctx.moveTo(cx, cy - 16 * k);
    ctx.lineTo(cx + 2 * k, cy + 11 * k);
    ctx.moveTo(cx - 9 * k, cy - 4 * k);
    ctx.lineTo(cx + 9 * k, cy - 4 * k);
  }, CRYSTAL, 1 * k, 4);
  dot(ctx, cx + 5 * k, cy, 2.6 * k, CRYSTAL, 10);
}

/** The Prism Colossus: a walking spire of crystal on four legs, a great lens at its brow. */
function colossus(ctx: Ctx, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  for (const [x, y] of [[-40, -40], [40, -40], [-40, 40], [40, 40]] as const) {
    beam(ctx, cx + x * 0.4, cy + y * 0.4, cx + x, cy + y, PRISM, 5, 10);
    shape(ctx, () => poly(ctx, cx + x, cy + y, 1, [[0, -8], [7, 0], [0, 8], [-7, 0]]), CRYSTAL_DARK, CRYSTAL, 8);
  }
  shape(ctx, () => poly(ctx, cx, cy, 1, [[54, 0], [24, -30], [-20, -34], [-44, -8], [-44, 8], [-20, 34], [24, 30]]), CRYSTAL_DARK, PRISM, 18);
  outline(ctx, () => {
    ctx.moveTo(cx - 20, cy - 34);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx - 20, cy + 34);
    ctx.moveTo(cx + 4, cy);
    ctx.lineTo(cx + 54, cy);
  }, CRYSTAL, 1.5, 6);
  shape(ctx, () => ctx.arc(cx + 30, cy, 10, 0, Math.PI * 2), '#0b2a2a', CRYSTAL, 16);
  dot(ctx, cx + 30, cy, 4, '#effffd', 14);
}

// ---------------------------------------------------------------------------------------------
// The Storm world: the Stormcallers

/** A wisp: a flickering spark with a forked tail. */
function wisp(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 12 * k);
  outline(ctx, () => {
    ctx.moveTo(cx - 2 * k, cy);
    ctx.lineTo(cx - 8 * k, cy - 4 * k);
    ctx.lineTo(cx - 6 * k, cy);
    ctx.lineTo(cx - 13 * k, cy + 3 * k);
  }, STORM, 1.6 * k, 8);
  shape(ctx, () => poly(ctx, cx, cy, k, [[8, 0], [2, -6], [-3, -2], [-1, 0], [-3, 3], [2, 6]]), STORM_DARK, STORM, 10);
  dot(ctx, cx + 2 * k, cy, 2 * k, STORM_LIGHT, 8);
}

/** A conductor: a robed figure holding up a forked rod that crackles. */
function conductor(ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) {
  if (elite) eliteRing(ctx, cx, cy, 17 * k);
  shape(ctx, () => {
    ctx.moveTo(cx, cy - 12 * k);
    ctx.quadraticCurveTo(cx + 9 * k, cy - 6 * k, cx + 9 * k, cy + 13 * k);
    ctx.lineTo(cx - 9 * k, cy + 13 * k);
    ctx.quadraticCurveTo(cx - 9 * k, cy - 6 * k, cx, cy - 12 * k);
  }, STORM_DARK, '#9fb8ff', 10);
  dot(ctx, cx + 3 * k, cy - 5 * k, 1.6 * k, STORM, 6);
  outline(ctx, () => {
    ctx.moveTo(cx + 6 * k, cy + 10 * k);
    ctx.lineTo(cx + 12 * k, cy - 12 * k);
    ctx.moveTo(cx + 12 * k, cy - 12 * k);
    ctx.lineTo(cx + 9 * k, cy - 17 * k);
    ctx.moveTo(cx + 12 * k, cy - 12 * k);
    ctx.lineTo(cx + 16 * k, cy - 16 * k);
  }, STORM, 1.8 * k, 10);
  dot(ctx, cx + 12 * k, cy - 13 * k, 2.2 * k, STORM_LIGHT, 10);
}

/** The Storm Herald: a lean armoured rider of the storm, a lance of lightning, a cloak of cloud. */
function stormHerald(ctx: Ctx, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2 + 4;
  for (let i = 0; i < 4; i++) {
    outline(ctx, () => {
      ctx.moveTo(cx - 10, cy - 10 + i * 10);
      ctx.quadraticCurveTo(cx - 34, cy - 4 + i * 12, cx - 46, cy + 4 + i * 10);
    }, '#9fb8ff', 2, 8);
  }
  shape(ctx, () => {
    ctx.moveTo(cx, cy - 38);
    ctx.quadraticCurveTo(cx + 20, cy - 22, cx + 22, cy + 30);
    ctx.lineTo(cx - 22, cy + 30);
    ctx.quadraticCurveTo(cx - 20, cy - 22, cx, cy - 38);
  }, STORM_DARK, '#9fb8ff', 18);
  beam(ctx, cx + 8, cy + 10, cx + 54, cy - 32, STORM, 4, 16);
  outline(ctx, () => {
    ctx.moveTo(cx + 54, cy - 32);
    ctx.lineTo(cx + 46, cy - 40);
    ctx.moveTo(cx + 54, cy - 32);
    ctx.lineTo(cx + 60, cy - 42);
  }, STORM_LIGHT, 2, 10);
  ctx.fillStyle = '#05060c';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy - 16, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  dot(ctx, cx + 1, cy - 16, 2.2, STORM, 10);
  dot(ctx, cx + 8, cy - 16, 2.2, STORM, 10);
}

/** Every texture of the four later planets: swarms and elites (with an `-elite` twin), bosses and bolts. */
export function bakeWorlds(scene: Phaser.Scene) {
  const both = (key: string, size: number, draw: (ctx: Ctx, cx: number, cy: number, k: number, elite: boolean) => void) => {
    paint(scene, key, size, size, (ctx) => draw(ctx, size / 2, size / 2, 1, false));
    const big = Math.ceil(size * 1.7);
    paint(scene, `${key}-elite`, big, big, (ctx) => draw(ctx, big / 2, big / 2, 1.6, true));
  };
  both('rb-sporeling', 36, sporeling);
  both('rb-puffcap', 46, puffcap);
  both('rb-scrapper', 34, scrapper);
  both('rb-hauler', 58, hauler);
  both('rb-shardling', 36, shardling);
  both('rb-prism', 46, prism);
  both('rb-wisp', 34, wisp);
  both('rb-conductor', 48, conductor);
  paint(scene, 'rb-boss-sporequeen', 160, 150, (ctx) => sporeQueen(ctx, 160, 150));
  paint(scene, 'rb-boss-scrapking', 150, 130, (ctx) => scrapKing(ctx, 150, 130));
  paint(scene, 'rb-boss-colossus', 150, 150, (ctx) => colossus(ctx, 150, 150));
  paint(scene, 'rb-boss-stormherald', 130, 110, (ctx) => stormHerald(ctx, 130, 110));
  // Hostile bolts: a pink spore puff and a crystal splinter.
  paint(scene, 'rb-bolt-spore', 24, 24, (ctx) => {
    shape(ctx, () => ctx.arc(12, 12, 6, 0, Math.PI * 2), SPORE_DARK, SPORE, 12);
    dot(ctx, 10, 10, 2, '#fff0fb', 4);
  });
  paint(scene, 'rb-bolt-splinter', 28, 16, (ctx) => {
    shape(ctx, () => poly(ctx, 14, 8, 1, [[9, 0], [0, -4], [-9, 0], [0, 4]]), CRYSTAL_DARK, CRYSTAL, 10);
  });
}
