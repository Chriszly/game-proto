import Phaser from 'phaser';
import { GLASS, GRASS, HILL, HONEY, INK, PETAL, SKY, STEM, WAX, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// The meadow: sky, hills and grass, the hive box the comb sits in, the flowers the bees visit, and
// the honey jars. Art pixels are 4 screen pixels, the flowers and jars 3.

const PX = 4;

export function bakeScenery(scene: Phaser.Scene) {
  bakeBackground(scene);
  bakeHive(scene);
  PETAL.forEach((color, i) => bakeFlower(scene, i, color));
  bakeJar(scene);
}

function bakeBackground(scene: Phaser.Scene) {
  const w = 240;
  const h = 135;
  const c = new PixelCanvas(w, h);
  const rand = seeded(5);
  // A sky in soft bands, a few clouds, then two rows of hills.
  c.rect(0, 0, w, 30, SKY.top).rect(0, 30, w, 18, SKY.mid).rect(0, 48, w, 24, SKY.low);
  for (const [x, y, len] of [[150, 18, 22], [196, 30, 16], [40, 16, 18], [120, 40, 12]]) {
    c.ellipse(x, y, len, 6, SKY.cloud).ellipse(x + len / 4, y - 3, len / 2, 6, SKY.cloud);
  }
  for (let x = 0; x < w; x++) {
    c.rect(x, Math.round(60 + 4 * Math.sin(x / 17)), 1, 20, HILL.far);
    c.rect(x, Math.round(67 + 3 * Math.sin(x / 11 + 2)), 1, 20, HILL.near);
  }
  // Grass, with tufts.
  c.rect(0, 72, w, h - 72, GRASS.mid);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rand() * w);
    const y = 73 + Math.floor(rand() * (h - 74));
    c.rect(x, y, 1, 2, rand() < 0.5 ? GRASS.dark : GRASS.light);
  }
  // The board the buttons sit on, under the meadow.
  c.rect(132, 73, 106, 54, INK);
  c.rect(133, 74, 104, 52, WOOD.mid);
  for (let y = 74; y < 126; y += 7) c.rect(133, y, 104, 1, WOOD.dark);
  // The shelf for the honey jars, under the hive.
  c.rect(14, 118, 89, 3, WOOD.light).rect(14, 118, 89, 1, WOOD.shine).rect(14, 121, 89, 1, WOOD.dark);
  c.rect(20, 121, 3, 5, WOOD.dark).rect(94, 121, 3, 5, WOOD.dark);
  c.bake(scene, 'background', PX);
}

/** The hive box: a roof, a timber frame open at the front onto the comb, and the entrance. */
function bakeHive(scene: Phaser.Scene) {
  const w = 92;
  const h = 80;
  const c = new PixelCanvas(w, h);
  // Roof, overhanging the box.
  c.rect(0, 2, w, 7, WOOD.dark).rect(1, 3, w - 2, 5, WOOD.light).rect(1, 3, w - 2, 1, WOOD.shine);
  c.rect(6, 0, w - 12, 2, WOOD.mid);
  // The box, in planks.
  c.rect(2, 9, w - 4, 67, WOOD.mid);
  for (let y = 12; y < 76; y += 6) c.rect(2, y, w - 4, 1, WOOD.dark);
  // The open front, dark with old wax, where the comb is drawn.
  c.rect(4, 11, w - 8, 58, WAX.dark);
  c.frame(4, 11, w - 8, 58, WOOD.dark);
  // The entrance slit and its landing board.
  c.rect(34, 71, 24, 3, INK);
  c.rect(14, 76, 64, 3, WOOD.light).rect(14, 76, 64, 1, WOOD.shine);
  c.rect(2, 9, w - 4, 1, WOOD.shine);
  c.outline(INK);
  c.bake(scene, 'hive', PX);
}

/** A flower on a stem: a ring of round petals and a golden middle, so it never reads as a cross. */
function bakeFlower(scene: Phaser.Scene, i: number, color: number) {
  const c = new PixelCanvas(15, 30);
  c.rect(7, 8, 1, 22, STEM);
  c.ellipse(8, 18, 5, 3, STEM).ellipse(2, 22, 5, 3, STEM);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + (i % 2) * 0.5;
    c.ellipse(Math.round(5.5 + 4 * Math.cos(a)), Math.round(4 + 4 * Math.sin(a)), 4, 4, color);
  }
  c.ellipse(5, 4, 5, 5, HONEY.light).px(6, 5, HONEY.dark);
  c.outline(INK);
  c.bake(scene, `flower-${i}`, 3);
}

function bakeJar(scene: Phaser.Scene) {
  const c = new PixelCanvas(9, 11);
  c.rect(1, 0, 7, 2, WOOD.mid).rect(1, 0, 7, 1, WOOD.light);
  c.rect(0, 2, 9, 9, GLASS);
  c.rect(1, 4, 7, 6, HONEY.mid).rect(1, 4, 7, 1, HONEY.light).rect(2, 5, 1, 3, HONEY.shine);
  c.rect(3, 6, 3, 2, WAX.shine);
  c.outline(INK);
  c.bake(scene, 'jar', 3);
}
