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

  /** Changes how wide the bar is, keeping its middle, from the next `set` on. */
  resize(width: number) {
    if (width === this.width) return;
    this.width = width;
    this.drawn = undefined;
  }

  /** Draws the bar at `fraction` full, or hides it when `fraction` is null. */
  set(fraction: number | null) {
    const filled = fraction === null ? null : Math.round((this.width - 2) * Phaser.Math.Clamp(fraction, 0, 1));
    if (filled === this.drawn) return;
    this.drawn = filled;
    this.bar.clear();
    if (filled === null) return;
    const left = this.x - this.width / 2;
    // A cream track inked round, filled with a wash of the bar's colour.
    this.bar.fillStyle(0xfaf4e4, 0.95).fillRoundedRect(left, this.y, this.width, 6, 3);
    if (filled > 0) this.bar.fillStyle(this.color, 0.95).fillRoundedRect(left + 1, this.y + 1, Math.max(filled, 4), 4, 2);
    this.bar.lineStyle(1, 0x2a1d14, 0.9).strokeRoundedRect(left, this.y, this.width, 6, 3);
  }
}
