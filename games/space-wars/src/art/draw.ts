import Phaser from 'phaser';
import type { Poly } from '../game/factions';

/** Draws a flat neon outline: a faint glow under a bright line, filled with a dim tint of the colour. */
export function drawShape(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  rotation: number,
  shape: Poly,
  scale: number,
  color: number,
  accent: number,
  alpha: number,
) {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const pts = shape.map(([px, py]) => new Phaser.Math.Vector2(x + (px * c - py * s) * scale, y + (px * s + py * c) * scale));
  g.fillStyle(color, 0.18 * alpha);
  g.fillPoints(pts, true);
  g.lineStyle(4, color, 0.3 * alpha);
  g.strokePoints(pts, true);
  g.lineStyle(1.5, accent, alpha);
  g.strokePoints(pts, true);
}

/** A dome or core at the centre of a building, drawn in the faction's accent colour. */
export function drawDome(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, accent: number, alpha: number) {
  g.fillStyle(accent, 0.35 * alpha);
  g.fillCircle(x, y, r);
  g.lineStyle(1.5, accent, alpha);
  g.strokeCircle(x, y, r);
}

/** A small bar over an entity showing its hit points, drawn only once it is hurt. */
export function drawHealth(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, ratio: number) {
  g.fillStyle(0x000000, 0.6);
  g.fillRect(x - width / 2, y, width, 3);
  g.fillStyle(ratio > 0.5 ? 0x7dffb0 : 0xffb347, 1);
  g.fillRect(x - width / 2, y, width * Math.max(0, ratio), 3);
}
