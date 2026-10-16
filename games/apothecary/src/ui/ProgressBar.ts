import Phaser from 'phaser';

export class ProgressBar {
  private bar: Phaser.GameObjects.Graphics;
  /** How many pixels the bar was last drawn filled, or null when hidden, so an unchanged bar isn't redrawn. */
  private drawn: number | null | undefined;
  /** Where a golden end zone of the track starts, as a share of the bar, and its colour; the fill turns that colour inside it. */
  private zone: { from: number; color: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private width: number,
    private color: number,
    depth: number,
    /** How tall the bar is, track included; the fill sits 1px inside it. */
    private readonly height = 6,
  ) {
    this.bar = scene.add.graphics().setDepth(depth);
  }

  /** Changes how wide the bar is, keeping its middle, from the next `set` on. */
  resize(width: number) {
    if (width === this.width) return;
    this.width = width;
    this.drawn = undefined;
  }

  /** Marks the end of the track from `from` on, washed in `color`, which the fill takes on once it gets there. */
  setZone(from: number, color: number) {
    this.zone = { from, color };
    this.drawn = undefined;
    return this;
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
    this.bar.fillStyle(0xe6dcc4, 0.95).fillRoundedRect(left, this.y, this.width, this.height, this.height / 2);
    const zone = this.zone;
    const zoneX = zone ? Math.round((this.width - 2) * zone.from) : Infinity;
    if (zone) this.bar.fillStyle(zone.color, 0.35).fillRect(left + 1 + zoneX, this.y + 1, this.width - 2 - zoneX, this.height - 2);
    const color = zone && filled >= zoneX ? zone.color : this.color;
    if (filled > 0) this.bar.fillStyle(color, 0.95).fillRoundedRect(left + 1, this.y + 1, Math.max(filled, this.height - 2), this.height - 2, (this.height - 2) / 2);
    this.bar.lineStyle(1, 0x2a1d14, 0.9).strokeRoundedRect(left, this.y, this.width, this.height, this.height / 2);
  }
}
