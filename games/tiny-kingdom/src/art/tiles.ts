import Phaser from 'phaser';
import { PixelCanvas, seeded } from './pixelArt';

// The land and building tiles, 32x32 art pixels baked at 2x into the board's 64px cells. Each
// building also gets a small icon for its button.

const SIZE = 32;
const SCALE = 2;

const C = {
  grass: 0x5f9e3c,
  grassLight: 0x76b64a,
  grassDark: 0x4a8430,
  water: 0x3a7bc8,
  waterLight: 0x6aa6e8,
  waterDeep: 0x2c5f9e,
  shore: 0xd8c78a,
  pine: 0x2f6b34,
  pineLight: 0x3f8a42,
  trunk: 0x6b4423,
  soil: 0x8a5a32,
  soilDark: 0x6b4423,
  wheat: 0xe8c45a,
  wheatLight: 0xf6e08a,
  wall: 0xe8d3a8,
  wallShade: 0xc9b083,
  roof: 0xb5452f,
  roofDark: 0x8a3020,
  door: 0x5c3a21,
  window: 0xf3c64e,
  stone: 0x9a9a9a,
  stoneLight: 0xbdbdbd,
  stoneDark: 0x6e6e6e,
  flag: 0x3a7bc8,
  outline: 0x1a1216,
};

function grass(seed: number) {
  const c = new PixelCanvas(SIZE, SIZE).rect(0, 0, SIZE, SIZE, C.grass);
  const rnd = seeded(seed);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd() * SIZE);
    const y = Math.floor(rnd() * SIZE);
    c.px(x, y, rnd() < 0.5 ? C.grassLight : C.grassDark);
    if (rnd() < 0.4) c.px(x, y - 1, C.grassLight);
  }
  return c;
}

function lake() {
  const c = grass(7);
  c.rect(0, 0, SIZE, SIZE, C.shore);
  c.rect(1, 1, SIZE - 2, SIZE - 2, C.water);
  c.rect(3, 3, SIZE - 6, SIZE - 6, C.waterDeep);
  c.rect(5, 5, SIZE - 10, SIZE - 10, C.water);
  for (const [x, y] of [[8, 9], [18, 14], [11, 21], [21, 24]]) c.rect(x, y, 4, 1, C.waterLight).px(x + 1, y - 1, C.waterLight);
  return c;
}

function pine(c: PixelCanvas, x: number, y: number, h: number) {
  // A stacked triangle tree with its trunk's foot at (x, y).
  c.rect(x - 1, y - 3, 2, 3, C.trunk);
  for (let j = 0; j < h; j++) {
    const half = 1 + Math.floor(j * 0.45);
    const color = j % 3 === 0 ? C.pineLight : C.pine;
    c.rect(x - half, y - 3 - h + j, half * 2, 1, color);
  }
}

function forest() {
  const c = grass(11);
  pine(c, 9, 15, 12);
  pine(c, 23, 13, 11);
  pine(c, 15, 28, 13);
  pine(c, 27, 29, 10);
  pine(c, 5, 30, 9);
  return c;
}

function farm() {
  const c = grass(13);
  c.rect(2, 3, 28, 26, C.soil);
  c.frame(2, 3, 28, 26, C.soilDark);
  for (let y = 6; y < 27; y += 4) {
    c.rect(4, y, 24, 2, C.wheat);
    for (let x = 5; x < 28; x += 3) c.px(x, y - 1, C.wheatLight);
  }
  return c;
}

function house() {
  const c = grass(17);
  // Walls, roof, door and a lit window.
  c.rect(7, 15, 18, 13, C.wall);
  c.rect(7, 25, 18, 3, C.wallShade);
  for (let j = 0; j < 10; j++) c.rect(5 + j, 15 - j, 22 - 2 * j, 1, j < 2 ? C.roofDark : C.roof);
  c.rect(14, 20, 4, 8, C.door);
  c.rect(9, 18, 3, 3, C.window).rect(20, 18, 3, 3, C.window);
  c.rect(21, 4, 3, 6, C.stoneDark);
  return c;
}

function tower() {
  const c = grass(19);
  // A stone keep with battlements and a banner.
  c.rect(9, 9, 14, 21, C.stone);
  c.rect(9, 9, 3, 21, C.stoneLight);
  c.rect(20, 9, 3, 21, C.stoneDark);
  for (let x = 8; x < 24; x += 4) c.rect(x, 5, 3, 4, C.stone);
  c.rect(8, 8, 16, 2, C.stoneDark);
  for (const [x, y] of [[13, 14], [17, 20], [12, 24]]) c.rect(x, y, 3, 1, C.stoneDark);
  c.rect(14, 24, 4, 6, C.door);
  c.rect(15, 13, 2, 4, C.outline);
  c.rect(15, 0, 1, 6, C.outline);
  c.rect(16, 0, 6, 4, C.flag);
  return c;
}

export const TILE_ART: Record<string, () => PixelCanvas> = {
  grass: () => grass(3),
  lake,
  forest,
  farm,
  house,
  tower,
};

export function bakeTiles(scene: Phaser.Scene) {
  for (const [key, draw] of Object.entries(TILE_ART)) draw().bake(scene, `tile-${key}`, SCALE);
}
