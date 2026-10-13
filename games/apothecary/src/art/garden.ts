import Phaser from 'phaser';
import type { PlantId } from '../game/items';
import { GOLD, INK, LEAF, ROOT, SOIL, VIOLET, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// Garden beds and the plants growing in them. All drawn at 2x: one art pixel is two screen pixels.

const SCALE = 2;
/** Plants get a softer outline than ink, so a full bed doesn't turn into a dark tangle. */
const LEAF_OUTLINE = 0x1e3418;
const STALK_OUTLINE = 0x5a3c14;

export const plantTexture = (plant: PlantId, stage: number) => `plant-${plant}-${stage}`;

/** A raised bed: tilled furrows inside a plank edging. 56x44 on screen. */
function bakePlot(scene: Phaser.Scene) {
  const c = new PixelCanvas(28, 22);
  const rand = seeded(7);
  c.rect(0, 0, 28, 22, WOOD.mid);
  c.rect(0, 0, 28, 1, WOOD.shine).rect(0, 1, 28, 1, WOOD.light);
  c.rect(0, 20, 28, 2, WOOD.dark);
  c.rect(2, 2, 24, 18, SOIL.mid);
  for (let y = 4; y < 20; y += 4) {
    c.rect(2, y, 24, 1, SOIL.dark);
    c.rect(2, y - 1, 24, 1, SOIL.light);
  }
  for (let i = 0; i < 14; i++) c.px(2 + Math.floor(rand() * 24), 2 + Math.floor(rand() * 18), rand() < 0.5 ? SOIL.shine : SOIL.dark);
  // Nail heads at the corners of the edging.
  for (const [x, y] of [[1, 1], [26, 1], [1, 19], [26, 19]]) c.px(x, y, WOOD.dark);
  c.frame(0, 0, 28, 22, INK);
  for (const [x, y] of [[0, 0], [27, 0], [0, 21], [27, 21]]) c.clear(x, y);
  c.bake(scene, 'plot', SCALE);
}

/** Six stalks across the bed: green shoots, then tall green stalks, then golden ears. 48x44 on screen. */
function bakeWheat(scene: Phaser.Scene, stage: number) {
  const c = new PixelCanvas(24, 22);
  const heights = [3, 11, 17][stage];
  for (let i = 0; i < 6; i++) {
    const x = 2 + i * 4;
    const h = heights - (i % 2) * (stage === 0 ? 1 : 2);
    const top = 22 - h;
    if (stage === 0) {
      c.rect(x, top, 1, h, LEAF.light).px(x + 1, top + 1, LEAF.mid).px(x - 1, top + 1, LEAF.shine);
      continue;
    }
    const ripe = stage === 2;
    c.rect(x, top, 1, h, ripe ? GOLD.mid : LEAF.mid);
    c.px(x + 1, top + 5, ripe ? GOLD.dark : LEAF.light).px(x - 1, top + 8, ripe ? GOLD.dark : LEAF.dark);
    c.px(x + 1, top + 6, ripe ? GOLD.mid : LEAF.light);
    if (ripe) {
      // Ear of grain, nodding to the right.
      c.rect(x, top - 1, 2, 5, GOLD.light);
      c.px(x, top - 1, GOLD.shine).px(x, top + 1, GOLD.shine).px(x + 1, top, GOLD.mid).px(x + 1, top + 2, GOLD.mid);
      c.px(x + 2, top - 2, GOLD.shine).px(x - 1, top - 2, GOLD.light);
    } else {
      c.px(x, top, LEAF.shine);
    }
  }
  c.outline(stage === 2 ? STALK_OUTLINE : LEAF_OUTLINE);
  c.bake(scene, plantTexture('wheat', stage), SCALE);
}

/** A leafy rosette that grows, flowers, and finally shows the root's face poking out. 40x40 on screen. */
function bakeMandrake(scene: Phaser.Scene, stage: number) {
  const c = new PixelCanvas(20, 20);
  const leaf = (x0: number, y0: number, x1: number, y1: number) => {
    c.line(x0, y0, x1, y1, LEAF.mid);
    c.line(x0 + 1, y0, x1 + 1, y1, LEAF.light);
    c.px(x1, y1, LEAF.shine);
  };
  if (stage === 0) {
    leaf(9, 19, 7, 15);
    leaf(10, 19, 12, 15);
  } else {
    const h = stage === 1 ? 8 : 11;
    leaf(9, 19, 4, 19 - h + 3);
    leaf(10, 19, 15, 19 - h + 3);
    leaf(9, 19, 7, 19 - h);
    leaf(10, 19, 12, 19 - h);
    leaf(9, 19, 1, 16);
    leaf(10, 19, 17, 16);
    c.rect(9, 19 - h, 2, h, LEAF.dark);
  }
  if (stage === 2) {
    // Purple flowers on top, and the root's head with its face showing through the soil.
    for (const [x, y] of [[9, 6], [5, 9], [14, 9]]) {
      c.rect(x, y, 2, 2, VIOLET.light).px(x, y, VIOLET.shine).px(x + 1, y + 1, VIOLET.mid);
    }
    c.ellipse(6, 14, 8, 7, ROOT.mid);
    c.rect(7, 15, 6, 3, ROOT.light);
    c.px(7, 15, ROOT.shine);
    c.px(8, 16, ROOT.dark).px(11, 16, ROOT.dark).px(9, 18, ROOT.dark).px(10, 18, ROOT.dark);
    c.rect(4, 19, 12, 1, SOIL.dark);
  }
  c.outline(LEAF_OUTLINE);
  c.bake(scene, plantTexture('mandrake', stage), SCALE);
}

export function bakeGarden(scene: Phaser.Scene) {
  bakePlot(scene);
  for (const stage of [0, 1, 2]) {
    bakeWheat(scene, stage);
    bakeMandrake(scene, stage);
  }
}
