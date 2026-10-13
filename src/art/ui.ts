import Phaser from 'phaser';
import { GOLD, INK, WOOD } from './palette';
import { PixelCanvas } from './pixelArt';

// Interface pieces: the top bar, the hand slots and the wooden signs behind place names.

const SCALE = 2;

/** Dark planks with a brass-studded trim along the bottom, tiled across the top bar. 32x44 on screen. */
function bakeHudBar(scene: Phaser.Scene) {
  const c = new PixelCanvas(16, 22);
  c.rect(0, 0, 16, 22, 0x2a1c14);
  for (const y of [0, 7, 14]) c.rect(0, y, 16, 1, 0x3a2818);
  c.rect(11, 1, 1, 6, 0x1b120c).rect(4, 8, 1, 6, 0x1b120c).rect(13, 15, 1, 4, 0x1b120c);
  c.rect(0, 19, 16, 2, WOOD.mid).rect(0, 19, 16, 1, WOOD.light).rect(0, 21, 16, 1, INK);
  c.px(7, 20, GOLD.light);
  c.bake(scene, 'hud-bar', SCALE);
}

/** A recessed wooden slot with brass corners, for one carried item. 32x32 on screen. */
function bakeSlot(scene: Phaser.Scene) {
  const c = new PixelCanvas(16, 16);
  c.rect(0, 0, 16, 16, WOOD.mid);
  c.rect(0, 0, 16, 1, WOOD.shine).rect(0, 0, 1, 16, WOOD.light);
  c.rect(2, 2, 12, 12, 0x1b120c);
  c.rect(3, 3, 11, 11, 0x2a1c14);
  for (const [x, y] of [[0, 0], [15, 0], [0, 15], [15, 15]]) c.px(x, y, GOLD.mid);
  c.frame(0, 0, 16, 16, INK);
  for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) c.px(x, y, GOLD.light);
  c.bake(scene, 'slot', SCALE);
}

/**
 * Returns the key of a hanging wooden sign at least `minWidth` screen pixels wide, baking it the
 * first time that width is asked for.
 */
export function signTexture(scene: Phaser.Scene, minWidth: number) {
  const w = Math.ceil(minWidth / SCALE / 4) * 4;
  const key = `sign-${w}`;
  if (scene.textures.exists(key)) return key;
  const c = new PixelCanvas(w, 10);
  c.rect(0, 0, w, 10, WOOD.light);
  c.rect(0, 0, w, 1, WOOD.shine);
  c.rect(0, 9, w, 1, WOOD.dark);
  c.rect(0, 5, w, 1, WOOD.mid);
  c.px(1, 2, WOOD.dark).px(w - 2, 2, WOOD.dark).px(1, 7, WOOD.dark).px(w - 2, 7, WOOD.dark);
  c.frame(0, 0, w, 10, INK);
  c.bake(scene, key, SCALE);
  return key;
}

export function bakeUi(scene: Phaser.Scene) {
  bakeHudBar(scene);
  bakeSlot(scene);
}
