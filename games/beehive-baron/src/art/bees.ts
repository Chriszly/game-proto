import Phaser from 'phaser';
import { BEE, INK } from './palette';
import { bakePixelArt } from './pixelArt';

// The honeybee, in two frames of beating wings, facing right. Art pixels are 3 screen pixels.

const BODY = [
  '..........',
  '..........',
  '.kyykyykk.',
  'kyykyykyyke',
  'kyykyykyykk',
  '.kyykyykk.',
  '..k..k....',
];
const WINGS_UP = ['...ww.ww..', '..wwwwwww.'];
const WINGS_DOWN = ['..........', '...wwwww..'];

export function bakeBees(scene: Phaser.Scene) {
  const palette = { y: BEE.yellow, k: BEE.black, w: BEE.wing, e: BEE.eye };
  [WINGS_UP, WINGS_DOWN].forEach((wings, frame) => {
    const rows = [...wings, ...BODY.slice(2)];
    // Wings lie over the body where they overlap.
    if (frame === 1) rows[2] = '.kywwwwkk.';
    bakePixelArt(scene, `bee-${frame}`, rows, palette, 3, INK);
  });
}
