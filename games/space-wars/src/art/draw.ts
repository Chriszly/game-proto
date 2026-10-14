import Phaser from 'phaser';
import { INK } from './palette';

/** A small pill over an entity showing its hit points, drawn only once it is hurt. */
export function drawHealth(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, ratio: number) {
  g.fillStyle(INK.chocolate, 0.85);
  g.fillRoundedRect(x - width / 2 - 1, y - 1, width + 2, 5, 2.5);
  g.fillStyle(ratio > 0.5 ? 0x7ee07a : 0xf2a33d, 1);
  g.fillRoundedRect(x - width / 2, y, Math.max(2, width * Math.max(0, ratio)), 3, 1.5);
}

/** A progress pill under a building going up, in the faction's colour. */
export function drawProgress(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, ratio: number, color: number) {
  g.fillStyle(INK.chocolate, 0.85);
  g.fillRoundedRect(x - width / 2 - 1, y - 1, width + 2, 6, 3);
  g.fillStyle(color, 1);
  g.fillRoundedRect(x - width / 2, y, Math.max(3, width * Math.min(1, ratio)), 4, 2);
}

/** A dashed circle, the selection mark of the cover's diagrams. */
export function dashedCircle(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, dashes: number, color: number, alpha: number, width = 1.5) {
  g.lineStyle(width, color, alpha);
  const step = (Math.PI * 2) / dashes;
  for (let k = 0; k < dashes; k++) {
    g.beginPath();
    g.arc(x, y, r, k * step, k * step + step * 0.6);
    g.strokePath();
  }
}

/** An arc from the top, clockwise, covering `ratio` of the circle (a capture ring). */
export function progressArc(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, ratio: number, color: number, width: number) {
  if (ratio <= 0) return;
  g.lineStyle(width, color, 1);
  g.beginPath();
  g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ratio));
  g.strokePath();
}

/** Bands of the cover's stripes across the screen: tangerine, mustard and cream. */
export function stripes(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
  const band = h / 3;
  g.fillStyle(INK.tangerine, 1);
  g.fillRect(x, y, w, band);
  g.fillStyle(INK.mustard, 1);
  g.fillRect(x, y + band, w, band);
  g.fillStyle(INK.cream, 1);
  g.fillRect(x, y + band * 2, w, band);
}
