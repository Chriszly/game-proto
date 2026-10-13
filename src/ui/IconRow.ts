import Phaser from 'phaser';
import { itemTexture } from '../art/placeholders';
import type { ItemId } from '../game/items';

/** A horizontal row of item icons, centred on (x, y), that reuses its images as the list changes. */
export class IconRow {
  private icons: Phaser.GameObjects.Image[] = [];

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    private depth: number,
    private spacing = 16,
  ) {}

  set(items: readonly ItemId[]) {
    while (this.icons.length < items.length) {
      this.icons.push(this.scene.add.image(0, 0, itemTexture(items[0])).setDepth(this.depth));
    }
    const left = this.x - ((items.length - 1) * this.spacing) / 2;
    this.icons.forEach((icon, i) => {
      icon.setVisible(i < items.length);
      if (i < items.length) icon.setTexture(itemTexture(items[i])).setPosition(left + i * this.spacing, this.y);
    });
  }

  moveTo(x: number, y: number, depth: number) {
    this.x = x;
    this.y = y;
    this.depth = depth;
    for (const icon of this.icons) icon.setDepth(depth);
  }
}
