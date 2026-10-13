import Phaser from 'phaser';
import type { Terrain } from '../game/terrain';
import { FOG, GOLD, GRASS, HILL, INK, LEAF, ROOF, SAND, SEA, STONE, WALL, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

/** Art pixels per tile side; each is baked at SCALE screen pixels, so a tile is 40px. */
const N = 20;
const SCALE = 2;
/** How many fog tiles there are to vary the parchment, baked as `fog-<n>`. */
export const FOG_VARIANTS = 4;
/** Sea frames the water swaps between, baked as `tile-sea` and `tile-sea-1`. */
export const SEA_FRAMES = 2;

/**
 * Bakes every map tile: `tile-<terrain>` for each terrain (plus the second sea frame), the
 * parchment fog `fog-<n>`, and `landmark-hint`, the compass's mark on a fogged landmark.
 */
export function bakeTiles(scene: Phaser.Scene) {
  const painters: Record<Terrain, (c: PixelCanvas, r: () => number) => void> = {
    sea: (c, r) => sea(c, r, 0),
    beach,
    grass,
    forest,
    hills,
    mountain,
    village,
    ruins,
    port,
  };
  for (const [terrain, paint] of Object.entries(painters)) {
    const c = new PixelCanvas(N, N);
    paint(c, seeded(terrain.length * 977 + terrain.charCodeAt(0)));
    c.bake(scene, `tile-${terrain}`, SCALE);
  }
  for (let f = 1; f < SEA_FRAMES; f++) {
    const c = new PixelCanvas(N, N);
    sea(c, seeded(3), f);
    c.bake(scene, `tile-sea-${f}`, SCALE);
  }
  for (let v = 0; v < FOG_VARIANTS; v++) {
    const c = new PixelCanvas(N, N);
    fog(c, seeded(101 + v * 31), v);
    c.bake(scene, `fog-${v}`, SCALE);
  }
  const hint = new PixelCanvas(9, 9);
  star(hint, 4, 4);
  hint.outline(INK);
  hint.bake(scene, 'landmark-hint', SCALE);
}

/** Fills the tile with `base`, sprinkled with `specks` of the other colours. */
function speckle(c: PixelCanvas, r: () => number, base: number, specks: number[], count: number) {
  c.rect(0, 0, N, N, base);
  for (let i = 0; i < count; i++) c.px(r() * N, r() * N, specks[Math.floor(r() * specks.length)]);
}

function sea(c: PixelCanvas, r: () => number, frame: number) {
  speckle(c, r, SEA.mid, [SEA.deep], 18);
  // Short wave crests, shifted a little in the second frame.
  for (const [x, y] of [[2, 3], [11, 6], [5, 11], [14, 14], [3, 17]]) {
    const sx = (x + frame * 2) % (N - 4);
    c.rect(sx, y, 3, 1, SEA.light).px(sx + 1, y - 1, SEA.foam);
  }
}

function beach(c: PixelCanvas, r: () => number) {
  speckle(c, r, SAND.mid, [SAND.dark, SAND.light], 40);
  c.px(6, 14, 0xf4f0e8).px(7, 14, 0xe8a0a0).px(14, 5, 0xf4f0e8);
}

function grassBase(c: PixelCanvas, r: () => number) {
  speckle(c, r, GRASS.mid, [GRASS.dark, GRASS.light], 36);
}

function grass(c: PixelCanvas, r: () => number) {
  grassBase(c, r);
  for (const [x, y] of [[4, 5], [13, 4], [8, 12], [15, 15], [3, 16]]) {
    c.px(x, y, GRASS.shine).px(x - 1, y + 1, GRASS.light).px(x + 1, y + 1, GRASS.light);
  }
  c.px(10, 7, 0xf0e070).px(5, 10, 0xf4f0e8).px(16, 10, 0xf0e070);
}

function tree(c: PixelCanvas, x: number, y: number) {
  c.rect(x, y + 4, 1, 3, WOOD.dark);
  c.ellipse(x - 3, y - 2, 7, 7, LEAF.dark);
  c.ellipse(x - 2, y - 2, 5, 5, LEAF.mid);
  c.px(x - 1, y - 1, LEAF.light).px(x, y - 1, LEAF.light);
}

function forest(c: PixelCanvas, r: () => number) {
  grassBase(c, r);
  for (const [x, y] of [[5, 4], [14, 3], [10, 9], [4, 13], [15, 13]]) tree(c, x, y);
}

function mound(c: PixelCanvas, x: number, y: number, w: number, h: number) {
  c.ellipse(x, y, w, h, HILL.dark);
  c.ellipse(x, y - 1, w - 1, h - 1, HILL.mid);
  c.ellipse(x + 1, y, Math.floor(w / 2), Math.floor(h / 2), HILL.light);
}

function hills(c: PixelCanvas, r: () => number) {
  grassBase(c, r);
  mound(c, 1, 3, 11, 8);
  mound(c, 8, 10, 11, 8);
}

function mountain(c: PixelCanvas, r: () => number) {
  grassBase(c, r);
  // One peak: a stone triangle, lit on the left, capped with snow.
  for (let row = 0; row < 15; row++) {
    const half = Math.floor(row * 0.62);
    const y = 3 + row;
    c.rect(10 - half, y, half, 1, STONE.light);
    c.rect(10, y, half + 1, 1, STONE.mid);
    if (row > 9) c.px(10 + half, y, STONE.dark);
  }
  for (let row = 0; row < 5; row++) {
    const half = Math.floor(row * 0.62);
    c.rect(10 - half, 3 + row, half * 2 + 1, 1, STONE.snow);
  }
  c.px(8, 8, STONE.snow).px(12, 8, STONE.snow).px(10, 8, STONE.snow);
}

function house(c: PixelCanvas, x: number, y: number) {
  c.rect(x, y, 7, 5, WALL.mid).rect(x, y + 4, 7, 1, WALL.dark);
  c.rect(x + 3, y + 2, 2, 3, WOOD.mid);
  c.px(x + 1, y + 1, SEA.light);
  for (let row = 0; row < 4; row++) c.rect(x - 1 + row, y - 1 - row, 9 - row * 2, 1, row === 0 ? ROOF.dark : ROOF.mid);
  c.px(x + 3, y - 4, ROOF.light);
}

function village(c: PixelCanvas, r: () => number) {
  grassBase(c, r);
  c.rect(0, 15, N, 2, SAND.mid).rect(9, 0, 2, 15, SAND.mid);
  house(c, 2, 6);
  house(c, 12, 10);
  house(c, 3, 13);
}

function column(c: PixelCanvas, x: number, y: number, h: number) {
  c.rect(x, y, 3, h, STONE.light).rect(x + 2, y, 1, h, STONE.mid);
  c.rect(x - 1, y + h, 5, 1, STONE.dark);
}

function ruins(c: PixelCanvas, r: () => number) {
  grassBase(c, r);
  c.rect(2, 16, 16, 2, STONE.mid);
  column(c, 3, 6, 10);
  column(c, 9, 10, 6);
  column(c, 15, 4, 12);
  c.rect(2, 4, 8, 2, STONE.light).rect(2, 5, 8, 1, STONE.mid);
  c.px(7, 13, LEAF.light).px(8, 12, LEAF.light).px(12, 16, LEAF.mid);
  c.px(11, 15, STONE.light).px(12, 15, STONE.mid);
}

function port(c: PixelCanvas, r: () => number) {
  speckle(c, r, SAND.mid, [SAND.dark, SAND.light], 24);
  c.rect(0, 12, N, 8, SEA.mid).rect(0, 12, N, 1, SEA.light);
  // A pier into the water, and a little sloop moored beside it.
  c.rect(8, 5, 4, 15, WOOD.light);
  for (let y = 6; y < N; y += 2) c.rect(8, y, 4, 1, WOOD.mid);
  c.rect(7, 13, 1, 2, WOOD.dark).rect(12, 13, 1, 2, WOOD.dark).rect(7, 17, 1, 2, WOOD.dark).rect(12, 17, 1, 2, WOOD.dark);
  c.rect(14, 16, 5, 2, WOOD.mid).rect(15, 18, 3, 1, WOOD.dark);
  c.rect(16, 9, 1, 7, WOOD.dark);
  for (let row = 0; row < 5; row++) c.rect(17, 10 + row, 1 + Math.floor(row / 2), 1, 0xf1e8d0);
  // A crate and a flag on the shore.
  c.rect(2, 7, 3, 3, WOOD.mid).frame(2, 7, 3, 3, WOOD.dark);
  c.rect(4, 1, 1, 6, WOOD.dark).rect(5, 1, 3, 2, GOLD.mid);
}

function fog(c: PixelCanvas, r: () => number, variant: number) {
  speckle(c, r, FOG.mid, [FOG.light, FOG.dark], 26);
  // A puff of cloud, in a different place on each variant.
  const puffs = [
    [[2, 4, 9, 5], [8, 2, 8, 6]],
    [[5, 11, 10, 6], [11, 9, 7, 5]],
    [[1, 13, 8, 5], [12, 3, 7, 5]],
    [[9, 12, 9, 5], [3, 2, 8, 5]],
  ][variant % 4];
  for (const [x, y, w, h] of puffs) {
    c.ellipse(x, y, w, h, FOG.light);
    c.ellipse(x + 1, y, w - 3, h - 2, FOG.shine);
  }
  // Faint grid lines, so the fog still reads as squares to survey.
  c.rect(0, N - 1, N, 1, FOG.dark, 0.6).rect(N - 1, 0, 1, N, FOG.dark, 0.6);
}

/** A small gold star, the compass's mark on a landmark still under fog. */
function star(c: PixelCanvas, x: number, y: number) {
  c.rect(x - 1, y - 1, 3, 3, GOLD.light);
  c.px(x, y - 3, GOLD.mid).px(x, y - 2, GOLD.light).px(x, y + 2, GOLD.light).px(x, y + 3, GOLD.mid);
  c.px(x - 3, y, GOLD.mid).px(x - 2, y, GOLD.light).px(x + 2, y, GOLD.light).px(x + 3, y, GOLD.mid);
  c.px(x, y, GOLD.shine);
}
