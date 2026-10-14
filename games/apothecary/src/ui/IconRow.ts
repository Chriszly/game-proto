import Phaser from 'phaser';
import { itemTexture } from '../art/items';
import { fit } from '../art/paint';
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
    private scale = 1,
  ) {}

  /** Moves the row's middle across to `x`, from the next `set` on. */
  setX(x: number) {
    this.x = x;
  }

  set(items: readonly ItemId[]) {
    while (this.icons.length < items.length) {
      this.icons.push(fit(this.scene.add.image(0, 0, itemTexture(items[0])).setDepth(this.depth), this.scale));
    }
    const left = this.x - ((items.length - 1) * this.spacing) / 2;
    this.icons.forEach((icon, i) => {
      icon.setVisible(i < items.length);
      if (i < items.length) icon.setTexture(itemTexture(items[i])).setPosition(left + i * this.spacing, this.y);
    });
  }
}
