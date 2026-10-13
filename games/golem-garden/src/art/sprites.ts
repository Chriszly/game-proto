import Phaser from 'phaser';
import { PixelCanvas, seeded } from './pixelArt';

// Every texture, drawn in code on small PixelCanvases and baked at 2x at startup: the soil, path
// and Heartwood tiles (32x32 art pixels, one 64px cell), the sprout and the two golems, the pests,
// the thrown stone and moss, and the HUD icons.

const SCALE = 2;
const CELL = 32;

export const C = {
  soil: 0x6b4a2c,
  soilLight: 0x81603a,
  soilDark: 0x553820,
  grass: 0x5f9e3c,
  grassLight: 0x7cbd4f,
  grassDark: 0x467f2c,
  path: 0xc9a46a,
  pathLight: 0xdcbd85,
  pathDark: 0xa98450,
  bark: 0x6b4423,
  barkDark: 0x4a2c16,
  leaf: 0x3f8a42,
  leafLight: 0x64b450,
  leafDark: 0x2c6430,
  bloom: 0xf3c64e,
  stone: 0x9a978f,
  stoneLight: 0xbfbbb0,
  stoneDark: 0x6b6862,
  moss: 0x5f9e3c,
  mossLight: 0x8cc85a,
  mossDark: 0x3c6e2a,
  eye: 0x8ff0ff,
  sprout: 0x7cbd4f,
  beetle: 0x3b3a6e,
  beetleLight: 0x6a68b0,
  slug: 0xc9a040,
  slugLight: 0xe8c86a,
  crow: 0x2a2630,
  crowLight: 0x4a4458,
  beak: 0xe8a33a,
  sap: 0xf0a43a,
  sapLight: 0xffd27a,
  outline: 0x1a1216,
  white: 0xffffff,
};

/** Tilled soil with tufts of grass, where seeds go. */
function soil(seed: number) {
  const c = new PixelCanvas(CELL, CELL).rect(0, 0, CELL, CELL, C.grass);
  const rnd = seeded(seed);
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rnd() * CELL);
    const y = Math.floor(rnd() * CELL);
    c.px(x, y, rnd() < 0.5 ? C.grassLight : C.grassDark);
    if (rnd() < 0.4) c.px(x, y - 1, C.grassLight);
  }
  // A small bed of tilled soil in the middle, with furrows.
  c.rect(7, 9, 18, 14, C.soilDark).rect(8, 10, 16, 12, C.soil);
  for (const y of [12, 16, 20]) c.rect(9, y, 14, 1, C.soilLight);
  return c;
}

function path(seed: number) {
  const c = new PixelCanvas(CELL, CELL).rect(0, 0, CELL, CELL, C.path);
  const rnd = seeded(seed);
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(rnd() * CELL);
    const y = Math.floor(rnd() * CELL);
    c.px(x, y, rnd() < 0.5 ? C.pathLight : C.pathDark);
    if (rnd() < 0.3) c.px(x + 1, y, C.pathDark);
  }
  return c;
}

/** The Heartwood: a great old tree on the path's end, with golden blooms. */
function heart() {
  const c = path(5);
  c.ellipse(4, 25, 24, 6, C.pathDark);
  c.rect(13, 16, 6, 12, C.bark).rect(11, 26, 10, 2, C.bark).rect(14, 18, 1, 8, C.barkDark);
  c.ellipse(3, 2, 26, 18, C.leafDark);
  c.ellipse(4, 2, 24, 16, C.leaf);
  c.ellipse(8, 3, 12, 8, C.leafLight);
  for (const [x, y] of [[8, 8], [20, 6], [14, 12], [24, 12], [6, 13]]) c.rect(x, y, 2, 2, C.bloom);
  return c;
}

/** A seed just planted, growing into a golem: a little sprout in a mound. */
function sprout() {
  const c = new PixelCanvas(16, 16);
  c.ellipse(2, 10, 12, 6, C.soilDark).ellipse(3, 10, 10, 4, C.soil);
  c.rect(7, 4, 2, 8, C.leafDark);
  c.ellipse(2, 3, 6, 4, C.sprout).ellipse(8, 1, 6, 4, C.sprout);
  c.px(4, 4, C.leafLight).px(10, 2, C.leafLight);
  return c;
}

/** A golem of mossy stone: `body`, `light` and `dark` colour it, `extra` adds its own touch. */
function golem(body: number, light: number, dark: number, extra: (c: PixelCanvas) => void) {
  const c = new PixelCanvas(24, 28);
  // Legs and feet.
  c.rect(6, 21, 5, 6, dark).rect(13, 21, 5, 6, dark).rect(5, 26, 6, 2, dark).rect(13, 26, 6, 2, dark);
  // Arms hanging low, with big fists.
  c.rect(1, 10, 4, 10, dark).rect(19, 10, 4, 10, dark).rect(0, 18, 6, 5, body).rect(18, 18, 6, 5, body);
  // Body and head.
  c.rect(4, 9, 16, 14, body).rect(5, 10, 14, 3, light);
  c.rect(7, 2, 10, 8, body).rect(8, 2, 8, 2, light);
  // Glowing eyes and cracks.
  c.rect(9, 5, 2, 2, C.eye).rect(13, 5, 2, 2, C.eye);
  c.px(8, 15, dark).px(9, 16, dark).px(9, 17, dark).px(15, 14, dark).px(16, 15, dark);
  extra(c);
  return c.outline(C.outline);
}

function pebbleGolem() {
  return golem(C.stone, C.stoneLight, C.stoneDark, (c) => {
    // A tuft of moss on its head and shoulder.
    c.rect(8, 1, 6, 2, C.moss).px(10, 0, C.mossLight).rect(4, 9, 4, 2, C.moss);
  });
}

function mossGolem() {
  return golem(C.moss, C.mossLight, C.mossDark, (c) => {
    // Stone shoulders and a flower on its head.
    c.rect(3, 9, 5, 3, C.stoneLight).rect(16, 9, 5, 3, C.stoneLight);
    c.rect(11, 0, 2, 2, C.bloom).px(10, 1, C.white).px(13, 1, C.white);
  });
}

function beetle() {
  const c = new PixelCanvas(14, 10);
  c.ellipse(1, 1, 10, 8, C.beetle).rect(5, 1, 1, 7, C.outline).px(3, 2, C.beetleLight).px(7, 2, C.beetleLight);
  c.rect(10, 3, 3, 4, C.outline).px(13, 2, C.outline).px(13, 7, C.outline);
  c.px(2, 9, C.outline).px(5, 9, C.outline).px(8, 9, C.outline);
  return c;
}

function slug() {
  const c = new PixelCanvas(18, 10);
  c.ellipse(0, 4, 16, 6, C.slug).rect(1, 5, 12, 1, C.slugLight);
  c.ellipse(9, 0, 8, 7, C.slugLight).ellipse(10, 1, 6, 5, C.slug);
  c.rect(15, 0, 1, 4, C.slug).px(15, 0, C.outline).rect(17, 1, 1, 4, C.slug).px(17, 1, C.outline);
  return c.outline(C.outline);
}

function crow() {
  const c = new PixelCanvas(16, 12);
  c.ellipse(2, 4, 11, 6, C.crow).ellipse(9, 1, 6, 6, C.crow);
  c.rect(4, 2, 6, 3, C.crowLight).rect(15, 3, 1, 2, C.beak).px(14, 3, C.beak).px(12, 2, C.white);
  c.rect(5, 10, 1, 2, C.beak).rect(9, 10, 1, 2, C.beak);
  return c;
}

function stone() {
  return new PixelCanvas(5, 5).ellipse(0, 0, 5, 5, C.stoneDark).rect(1, 1, 2, 2, C.stoneLight);
}

function mossClump() {
  return new PixelCanvas(5, 5).ellipse(0, 0, 5, 5, C.mossDark).rect(1, 1, 2, 2, C.mossLight);
}

/** A drop of sap, the garden's currency. */
function sapDrop() {
  const c = new PixelCanvas(9, 12);
  c.rect(4, 0, 1, 2, C.sap).rect(3, 2, 3, 2, C.sap).ellipse(0, 3, 9, 9, C.sap).rect(2, 5, 2, 3, C.sapLight);
  return c.outline(C.outline);
}

/** A leaf, for the Heartwood's health. */
function leafIcon() {
  const c = new PixelCanvas(12, 12);
  c.ellipse(1, 1, 10, 10, C.leaf).ellipse(2, 2, 5, 5, C.leafLight);
  c.line(2, 9, 9, 2, C.leafDark).rect(0, 10, 2, 2, C.bark);
  return c.outline(C.outline);
}

export const ART: Record<string, () => PixelCanvas> = {
  'cell-soil-0': () => soil(3),
  'cell-soil-1': () => soil(17),
  'cell-soil-2': () => soil(29),
  'cell-path': () => path(11),
  'cell-heart': heart,
  sprout,
  'golem-pebble': pebbleGolem,
  'golem-moss': mossGolem,
  'pest-beetle': beetle,
  'pest-slug': slug,
  'pest-crow': crow,
  'shot-pebble': stone,
  'shot-moss': mossClump,
  sap: sapDrop,
  leaf: leafIcon,
};

export function bakeSprites(scene: Phaser.Scene) {
  for (const [key, draw] of Object.entries(ART)) draw().bake(scene, key, SCALE);
}
