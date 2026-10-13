import Phaser from 'phaser';
import { BEAR, CLOTH, HAT, INK, PARCHMENT, WOOD } from './palette';
import { PixelCanvas } from './pixelArt';

/** Where the surveyor's feet are in the texture, as a fraction of its height. */
export const SURVEYOR_FEET = 17 / 18;

/**
 * The surveyor: the hub's orange bear in a green explorer's hat, with a rolled chart under one arm.
 * Baked as `surveyor` (standing) and `surveyor-step` (mid-stride, for walking).
 */
export function bakeSurveyor(scene: Phaser.Scene) {
  for (const step of [false, true]) {
    const c = new PixelCanvas(16, 18);
    // Legs.
    c.rect(5, 14, 2, 3, BEAR.dark).rect(9, 14, 2, 3, BEAR.dark);
    if (step) c.rect(5, 14, 2, 2, BEAR.dark).clear(5, 16).clear(6, 16).rect(4, 16, 2, 1, BEAR.dark);
    // Body with a satchel strap.
    c.ellipse(3, 8, 10, 8, BEAR.mid);
    c.ellipse(5, 10, 6, 5, BEAR.light);
    c.line(4, 9, 11, 14, WOOD.mid);
    // The rolled chart under the right arm.
    c.rect(11, 10, 4, 2, PARCHMENT.light).px(14, 10, PARCHMENT.dark).px(14, 11, PARCHMENT.dark);
    // Head, ears and face.
    c.ellipse(2, 1, 4, 4, BEAR.mid).ellipse(10, 1, 4, 4, BEAR.mid);
    c.px(3, 2, BEAR.light).px(12, 2, BEAR.light);
    c.ellipse(3, 2, 10, 8, BEAR.mid);
    c.px(5, 5, INK).px(10, 5, INK);
    c.ellipse(6, 6, 4, 3, BEAR.muzzle);
    c.px(7, 6, BEAR.nose).px(8, 6, BEAR.nose);
    // The explorer's hat: a wide brim and a rounded crown with a band.
    c.rect(2, 2, 12, 1, HAT.dark);
    c.ellipse(4, -1, 8, 6, HAT.mid);
    c.rect(4, 1, 8, 1, CLOTH.mid);
    c.px(6, 0, HAT.light).px(7, 0, HAT.light);
    c.outline(INK);
    c.bake(scene, step ? 'surveyor-step' : 'surveyor', 2);
  }
}
