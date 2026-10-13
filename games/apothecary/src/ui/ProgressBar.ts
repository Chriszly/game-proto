import Phaser from 'phaser';

export class ProgressBar {
  private bar: Phaser.GameObjects.Graphics;
  /** How many pixels the bar was last drawn filled, or null when hidden, so an unchanged bar isn't redrawn. */
  private drawn: number | null | undefined;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private width: number,
    private color: number,
    depth: number,
  ) {
    this.bar = scene.add.graphics().setDepth(depth);
  }

  /** Draws the bar at `fraction` full, or hides it when `fraction` is null. */
  set(fraction: number | null) {
    const filled = fraction === null ? null : Math.round((this.width - 2) * Phaser.Math.Clamp(fraction, 0, 1));
    if (filled === this.drawn) return;
    this.drawn = filled;
    this.bar.clear();
    if (filled === null) return;
    const left = this.x - this.width / 2;
    this.bar.fillStyle(0x1d1418, 0.9).fillRect(left, this.y, this.width, 6);
    this.bar.fillStyle(0x3a2818).fillRect(left + 1, this.y + 1, this.width - 2, 4);
    this.bar.fillStyle(this.color).fillRect(left + 1, this.y + 1, filled, 4);
    // A lighter top edge, like the shine on the pixel art.
    this.bar.fillStyle(0xffffff, 0.35).fillRect(left + 1, this.y + 1, filled, 1);
  }
}
