import Phaser from 'phaser';
import { INK, MUZZLE, SKIN, bake, circle, rrect } from './paint';

/** The texture's size in game pixels, and the point it stands on (a little left of its feet, under the bear and tripod together). */
const SIZE = { w: 36, h: 47 };
export const SURVEYOR_ORIGIN = { x: 19 / SIZE.w, y: 42 / SIZE.h };

/**
 * The surveyor: the hub's orange bear, flat and outlined, in a pith helmet behind a theodolite on its
 * tripod. Baked as `surveyor` (standing) and `surveyor-step` (one foot up, for walking).
 */
export function bakeSurveyor(scene: Phaser.Scene) {
  for (const step of [false, true]) {
    bake(scene, step ? 'surveyor-step' : 'surveyor', SIZE.w, SIZE.h, (ctx) => {
      // Drawn in half-pixels with the feet at (32, 84).
      ctx.scale(0.5, 0.5);
      const x = 32;
      const y = 84;
      const bob = step ? -2 : 0;
      // Shadow.
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 2, 26, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.restore();
      // The tripod and the theodolite on it.
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 26, y - 30);
      ctx.lineTo(x + 16, y + 2);
      ctx.moveTo(x + 26, y - 30);
      ctx.lineTo(x + 36, y + 2);
      ctx.moveTo(x + 26, y - 30);
      ctx.lineTo(x + 27, y + 4);
      ctx.stroke();
      rrect(ctx, x + 18, y - 44, 18, 14, 3);
      ctx.fillStyle = '#f2c14a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillRect(x + 10, y - 41, 10, 6);
      ctx.translate(0, bob);
      // Feet, then the body in a pale survey coat.
      ctx.fillStyle = '#c96400';
      ctx.fillRect(x - 13, y - 6 - (step ? 4 : 0) - bob, 8, 8);
      ctx.fillRect(x - 1, y - 6 - bob, 8, 8);
      rrect(ctx, x - 16, y - 34, 26, 30, 10);
      ctx.fillStyle = '#e9e1c6';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Head, ears and face.
      circle(ctx, x - 16, y - 66, 7, SKIN, INK, 2.5);
      circle(ctx, x + 6, y - 66, 7, SKIN, INK, 2.5);
      circle(ctx, x - 5, y - 52, 17, SKIN, INK, 2.5);
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 46, 8, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = MUZZLE;
      ctx.fill();
      circle(ctx, x - 5, y - 49, 2.4, '#311300');
      circle(ctx, x - 11, y - 56, 2.2, '#311300');
      circle(ctx, x + 1, y - 56, 2.2, '#311300');
      // The pith helmet.
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 66, 24, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#6e8040';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 5, y - 67, 14, Math.PI, 0);
      ctx.fillStyle = '#93a65a';
      ctx.fill();
      ctx.stroke();
    });
  }
}
