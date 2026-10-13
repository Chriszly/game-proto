import Phaser from 'phaser';
import { BREW, CLOTH, FIRE, GOLD, INK, IRON, LEAF, STONE, WOOD } from './palette';
import { PixelCanvas, seeded } from './pixelArt';

// The refining table, the cauldron and the store counter. Drawn at 2x and kept to the sizes the
// layout expects, since each station's lower part is its collision box.

const SCALE = 2;

/** A plank-topped workbench with a mortar and pestle and a bundle of herbs on a board. 88x52 on screen. */
function bakeTable(scene: Phaser.Scene) {
  const c = new PixelCanvas(44, 26);
  // Legs and a crossbar behind the apron.
  c.rect(3, 19, 4, 6, WOOD.dark).rect(37, 19, 4, 6, WOOD.dark).rect(4, 19, 1, 6, WOOD.mid).rect(38, 19, 1, 6, WOOD.mid);
  c.rect(7, 21, 30, 2, WOOD.dark);
  // Top, with plank seams.
  c.rect(1, 4, 42, 10, WOOD.light);
  c.rect(1, 4, 42, 1, WOOD.shine);
  c.rect(1, 7, 42, 1, WOOD.mid).rect(1, 10, 42, 1, WOOD.mid);
  c.px(12, 5, WOOD.mid).px(28, 8, WOOD.mid).px(20, 11, WOOD.mid).px(35, 12, WOOD.shine).px(16, 9, WOOD.shine);
  // Apron.
  c.rect(1, 14, 42, 6, WOOD.mid);
  c.rect(1, 14, 42, 1, WOOD.dark);
  c.rect(1, 19, 42, 1, WOOD.dark);
  for (const x of [11, 22, 33]) c.rect(x, 15, 1, 4, WOOD.dark);
  // Mortar with a pestle.
  c.ellipse(3, 3, 9, 7, STONE.mid);
  c.ellipse(3, 3, 9, 3, STONE.light);
  c.ellipse(4, 4, 7, 2, STONE.dark);
  c.rect(4, 8, 7, 1, STONE.dark);
  c.line(9, 0, 7, 4, WOOD.shine);
  c.px(9, 0, CLOTH.mid);
  // Cutting board with a tied bundle of herbs.
  c.rect(31, 5, 10, 7, WOOD.shine);
  c.rect(31, 11, 10, 1, WOOD.mid);
  c.line(32, 9, 39, 6, LEAF.mid).line(32, 8, 39, 5, LEAF.light).line(33, 10, 39, 8, LEAF.dark);
  c.px(39, 5, LEAF.shine).px(40, 7, LEAF.shine);
  c.rect(34, 7, 1, 3, CLOTH.dark);
  c.outline(INK);
  c.bake(scene, 'table', SCALE);
}

/** An iron pot of green brew over a log fire; three frames of bubbles and flames. 72x60 on screen. */
function bakeCauldron(scene: Phaser.Scene, frame: number) {
  const c = new PixelCanvas(36, 30);
  const rand = seeded(11 + frame * 17);
  // Logs under the pot.
  c.rect(6, 26, 24, 3, WOOD.mid).rect(6, 26, 24, 1, WOOD.light).px(6, 27, WOOD.dark).px(29, 27, WOOD.dark);
  // Stubby legs.
  c.rect(8, 21, 3, 5, IRON.dark).rect(25, 21, 3, 5, IRON.dark);
  // Pot body: a dark bowl with a highlight on the left.
  c.ellipse(2, 5, 32, 18, IRON.mid);
  c.ellipse(4, 13, 28, 9, IRON.dark);
  c.rect(6, 10, 1, 7, IRON.light).rect(7, 8, 1, 3, IRON.light).px(6, 9, IRON.shine);
  // Flames licking up around the bottom of the pot.
  const flame = (x: number, h: number) => {
    c.rect(x, 26 - h, 3, h, FIRE.dark);
    c.rect(x + 1, 26 - h + 1, 1, h - 1, FIRE.mid);
    c.px(x + 1, 26 - h, FIRE.light);
  };
  flame(12, 4 + (frame % 2));
  flame(16, 5 - (frame % 2));
  flame(21, 4 + ((frame + 1) % 2));
  // Rim and brew.
  c.ellipse(1, 4, 34, 8, IRON.light);
  c.ellipse(1, 4, 34, 2, IRON.shine);
  c.ellipse(4, 6, 28, 5, BREW.mid);
  c.ellipse(6, 6, 18, 2, BREW.light);
  for (let i = 0; i < 3; i++) {
    const x = 8 + Math.floor(rand() * 20);
    c.px(x, 7, BREW.shine).px(x + 1, 6, BREW.light);
  }
  c.outline(INK);
  // Steam, drawn after the outline so it floats free.
  const sx = 12 + frame * 5;
  c.px(sx, 2 - (frame % 2), BREW.shine, 0.7).px(sx + 1, 1, BREW.shine, 0.5).px(sx + 8, 0, BREW.shine, 0.5);
  c.bake(scene, frame === 0 ? 'cauldron' : `cauldron-${frame}`, SCALE);
}

/** A long shop counter with panelled front, brass scales at one end and a candle at the other. 200x44 on screen. */
function bakeCounter(scene: Phaser.Scene) {
  const c = new PixelCanvas(100, 22);
  const rand = seeded(5);
  // Top.
  c.rect(0, 2, 100, 8, WOOD.light);
  c.rect(0, 2, 100, 1, WOOD.shine);
  c.rect(0, 6, 100, 1, WOOD.mid);
  for (let i = 0; i < 10; i++) c.px(Math.floor(rand() * 100), 3 + Math.floor(rand() * 6), rand() < 0.5 ? WOOD.mid : WOOD.shine);
  c.rect(0, 9, 100, 1, WOOD.shine);
  // Front, in raised panels.
  c.rect(0, 10, 100, 12, WOOD.mid);
  c.rect(0, 10, 100, 1, WOOD.dark).rect(0, 21, 100, 1, WOOD.dark);
  for (let x = 3; x < 96; x += 16) {
    c.rect(x, 12, 13, 8, WOOD.dark);
    c.rect(x + 1, 13, 11, 6, WOOD.mid);
    c.rect(x + 1, 13, 11, 1, WOOD.light);
  }
  // Brass scales.
  c.rect(7, 1, 1, 7, GOLD.dark);
  c.rect(3, 1, 9, 1, GOLD.mid);
  c.rect(2, 3, 3, 1, GOLD.light).rect(10, 3, 3, 1, GOLD.light);
  c.rect(5, 7, 5, 1, GOLD.dark);
  // Candle on a dish.
  c.rect(90, 7, 6, 1, STONE.light);
  c.rect(92, 2, 2, 5, CLOTH.light);
  c.px(92, 1, FIRE.mid).px(93, 0, FIRE.light).px(92, 0, FIRE.light, 0.6);
  c.outline(INK);
  c.bake(scene, 'counter', SCALE);
}

/** A wooden pallet seen from the front: a slatted deck on three blocks. 36x16 on screen. */
function bakePallet(scene: Phaser.Scene) {
  const c = new PixelCanvas(18, 8);
  // Deck boards, with a gap between each.
  c.rect(1, 1, 16, 3, WOOD.light);
  for (const x of [1, 6, 11]) c.rect(x, 1, 5, 1, WOOD.shine);
  for (const x of [5, 10, 15]) c.rect(x, 1, 1, 3, WOOD.mid);
  c.rect(1, 3, 16, 1, WOOD.mid);
  // Blocks under the deck, on a bottom board.
  for (const x of [1, 8, 14]) c.rect(x, 4, 3, 2, WOOD.dark);
  c.rect(1, 6, 16, 1, WOOD.mid);
  c.outline(INK);
  c.bake(scene, 'pallet', SCALE);
}

export function bakeStations(scene: Phaser.Scene) {
  bakePallet(scene);
  bakeTable(scene);
  for (const frame of [0, 1, 2]) bakeCauldron(scene, frame);
  scene.anims.create({
    key: 'cauldron-boil',
    frames: [{ key: 'cauldron' }, { key: 'cauldron-1' }, { key: 'cauldron-2' }],
    frameRate: 5,
    repeat: -1,
  });
  bakeCounter(scene);
}
