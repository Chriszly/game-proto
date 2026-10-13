import Phaser from 'phaser';
import { FIRE, INK, IRON, STONE, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// The smithy: a stone wall over a plank floor, the furnace, and the anvils the swords sit on.
// Art pixels are 4 screen pixels.

const PX = 4;

export function bakeScenery(scene: Phaser.Scene) {
  bakeBackground(scene);
  bakeFurnace(scene, 0);
  bakeFurnace(scene, 1);
  bakeAnvil(scene);
}

function bakeBackground(scene: Phaser.Scene) {
  const w = 240;
  const h = 135;
  const c = new PixelCanvas(w, h);
  const rand = seeded(7);
  // Stone wall, in staggered courses of bricks.
  c.rect(0, 0, w, h, STONE.dark);
  for (let row = 0; row * 6 < h; row++) {
    const y = row * 6;
    for (let x = row % 2 ? -5 : 0; x < w; x += 10) {
      const tone = rand() < 0.3 ? STONE.light : STONE.mid;
      c.rect(x + 1, y + 1, 9, 5, tone);
      c.rect(x + 1, y + 1, 9, 1, rand() < 0.5 ? STONE.shine : tone);
    }
  }
  // Plank floor along the bottom.
  c.rect(0, 118, w, 17, WOOD.mid);
  for (let y = 118; y < h; y += 4) c.rect(0, y, w, 1, WOOD.dark);
  for (let i = 0; i < 30; i++) c.rect(Math.floor(rand() * w), 119 + Math.floor(rand() * 4) * 4, 1, 3, WOOD.dark);
  // The counter on the right, where adventurers come to buy.
  c.rect(166, 10, 74, 125, WOOD.dark);
  c.rect(168, 10, 72, 125, WOOD.mid);
  for (let x = 168; x < w; x += 8) c.rect(x, 10, 1, 125, WOOD.dark);
  // A dark mat of slate under the anvils.
  c.rect(62, 13, 104, 104, INK);
  c.rect(63, 14, 102, 102, IRON.dark);
  c.bake(scene, 'background', PX);
}

/** The furnace, in two frames of flickering fire. */
function bakeFurnace(scene: Phaser.Scene, frame: number) {
  const c = new PixelCanvas(40, 46);
  // Chimney and body.
  c.rect(14, 0, 12, 10, STONE.mid).rect(14, 0, 12, 1, STONE.shine);
  c.rect(2, 10, 36, 36, STONE.mid);
  for (let y = 12; y < 46; y += 5) for (let x = (y / 5) % 2 ? 2 : 6; x < 38; x += 8) c.rect(x, y, 7, 4, STONE.light);
  c.rect(0, 9, 40, 3, IRON.light).rect(0, 9, 40, 1, IRON.shine);
  // The arched mouth, glowing inside.
  c.rect(10, 24, 20, 18, INK);
  c.ellipse(10, 18, 20, 14, INK);
  c.rect(11, 25, 18, 17, FIRE.dark);
  c.ellipse(11, 19, 18, 12, FIRE.dark);
  const rand = seeded(11 + frame * 5);
  for (let i = 0; i < 9; i++) {
    const x = 12 + Math.floor(rand() * 14);
    const top = 24 + Math.floor(rand() * 8);
    c.rect(x, top, 2, 42 - top, FIRE.mid);
    c.rect(x, top + 3, 1, 39 - top, FIRE.light);
  }
  c.rect(11, 39, 18, 3, FIRE.white);
  c.outline(INK);
  c.bake(scene, `furnace-${frame}`, PX);
}

function bakeAnvil(scene: Phaser.Scene) {
  const c = new PixelCanvas(22, 11);
  c.rect(0, 0, 18, 3, IRON.light).rect(0, 0, 18, 1, IRON.shine);
  c.rect(18, 0, 4, 2, IRON.light);
  c.rect(5, 3, 10, 3, IRON.mid);
  c.rect(3, 6, 14, 5, IRON.mid).rect(3, 6, 14, 1, IRON.light);
  c.outline(INK);
  c.bake(scene, 'anvil', PX);
}
