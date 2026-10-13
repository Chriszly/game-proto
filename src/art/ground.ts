import Phaser from 'phaser';
import { GRASS, INK, SOIL, STONE, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// Ground tiles and borders, drawn at 2x and laid out as tile sprites by the game scene.

const SCALE = 2;

/** Grass with darker and lighter blades scattered over it. 64x64 on screen. */
function bakeGrass(scene: Phaser.Scene, key: string, base: number, dark: number, light: number, seed: number, flowers = 0) {
  const c = new PixelCanvas(32, 32);
  const rand = seeded(seed);
  c.rect(0, 0, 32, 32, base);
  for (let i = 0; i < 70; i++) c.px(rand() * 32, rand() * 32, rand() < 0.6 ? dark : light);
  // Small tufts: a blade leaning each way.
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(rand() * 30) + 1;
    const y = Math.floor(rand() * 30) + 1;
    c.px(x, y, light).px(x - 1, y + 1, dark).px(x + 1, y + 1, light);
  }
  for (let i = 0; i < flowers; i++) {
    const x = Math.floor(rand() * 32);
    const y = Math.floor(rand() * 32);
    c.px(x, y, rand() < 0.5 ? 0xf1e8d0 : 0xe6c766);
  }
  c.bake(scene, key, SCALE);
}

/** Packed earth with pebbles, for the workshop yard and the path to the shop. 64x64 on screen. */
function bakeDirt(scene: Phaser.Scene) {
  const c = new PixelCanvas(32, 32);
  const rand = seeded(23);
  c.rect(0, 0, 32, 32, SOIL.light);
  for (let i = 0; i < 80; i++) c.px(rand() * 32, rand() * 32, rand() < 0.5 ? SOIL.mid : SOIL.shine);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rand() * 31);
    const y = Math.floor(rand() * 31);
    c.px(x, y, SOIL.shine).px(x + 1, y, STONE.mid).px(x, y + 1, SOIL.dark);
  }
  c.bake(scene, 'tile-dirt', SCALE);
}

/** Floorboards in staggered lengths. 64x64 on screen. */
function bakePlanks(scene: Phaser.Scene) {
  const c = new PixelCanvas(32, 32);
  const rand = seeded(31);
  c.rect(0, 0, 32, 32, WOOD.mid);
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    c.rect(0, y, 32, 1, WOOD.light);
    c.rect(0, y + 7, 32, 1, WOOD.dark);
    // Board ends, staggered from row to row.
    const end = (row * 11 + 5) % 32;
    c.rect(end, y, 1, 8, WOOD.dark).px(end + 1, y + 1, WOOD.light);
    c.px(end + 3, y + 3, WOOD.dark).px(end - 3, y + 3, WOOD.dark);
    for (let i = 0; i < 6; i++) c.px(rand() * 32, y + 2 + Math.floor(rand() * 4), rand() < 0.5 ? WOOD.dark : WOOD.light);
  }
  c.bake(scene, 'tile-planks', SCALE);
}

/** Two courses of stone blocks for the shop walls, so a 16-pixel strip shows whole blocks. 16x16 on screen. */
function bakeWall(scene: Phaser.Scene) {
  const c = new PixelCanvas(8, 8);
  c.rect(0, 0, 8, 8, STONE.dark);
  const block = (x: number, y: number, w: number) => {
    c.rect(x, y, w, 3, STONE.mid);
    c.rect(x, y, w, 1, STONE.light);
  };
  block(0, 0, 3);
  block(4, 0, 4);
  block(0, 4, 1);
  block(2, 4, 5);
  c.px(5, 1, STONE.shine);
  c.bake(scene, 'tile-wall', SCALE);
}

/** A run of picket fence with two rails, for the top and bottom of a garden. 32x32 on screen. */
function bakeFence(scene: Phaser.Scene) {
  const h = new PixelCanvas(16, 16);
  h.rect(0, 5, 16, 2, WOOD.light).rect(0, 7, 16, 1, WOOD.dark);
  h.rect(0, 10, 16, 2, WOOD.light).rect(0, 12, 16, 1, WOOD.dark);
  h.rect(6, 2, 4, 13, WOOD.shine).rect(9, 2, 1, 13, WOOD.mid).px(6, 2, WOOD.light).px(9, 2, WOOD.light);
  h.rect(6, 14, 4, 1, WOOD.dark);
  h.frame(5, 1, 6, 15, INK);
  h.bake(scene, 'fence-h', SCALE);

  // Seen end-on down the sides: posts with a rail running between them.
  const v = new PixelCanvas(16, 16);
  v.rect(6, 0, 4, 16, WOOD.light).rect(9, 0, 1, 16, WOOD.mid).rect(6, 0, 1, 16, WOOD.shine);
  v.rect(5, 2, 6, 5, WOOD.shine).rect(5, 6, 6, 1, WOOD.dark).frame(4, 1, 8, 7, INK);
  v.bake(scene, 'fence-v', SCALE);
}

export function bakeGround(scene: Phaser.Scene) {
  bakeGrass(scene, 'tile-grass', GRASS.mid, GRASS.dark, GRASS.light, 3);
  bakeGrass(scene, 'tile-meadow', GRASS.light, GRASS.mid, GRASS.shine, 9, 5);
  bakeDirt(scene);
  bakePlanks(scene);
  bakeWall(scene);
  bakeFence(scene);
}
