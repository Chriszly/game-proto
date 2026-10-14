import Phaser from 'phaser';
import { itemTexture } from '../art/items';
import { fit } from '../art/paint';
import type { ItemId } from '../game/items';

const ICON_SCALE = 1.25;
/** Vertical distance between stacked items; less than the icon height so they rest on each other. */
const STEP = 13;

/** Carried items piled on the doctor's back, bottom item first, on whichever side faces away. */
export class BackStack {
  private icons: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene) {}

  update(carrier: Phaser.GameObjects.Sprite, items: readonly ItemId[]) {
    while (this.icons.length < items.length) {
      this.icons.push(fit(this.scene.add.image(0, 0, itemTexture(items[0])), ICON_SCALE));
    }
    // The sprite faces right unflipped, so its back is on the left.
    const backX = carrier.x + (carrier.flipX ? 22 : -22);
    this.icons.forEach((icon, i) => {
      icon.setVisible(i < items.length);
      if (i >= items.length) return;
      icon
        .setTexture(itemTexture(items[i]))
        .setPosition(backX, carrier.y + 14 - i * STEP)
        // Just behind the doctor, so the cloak overlaps the pile like a pack.
        .setDepth(carrier.depth - 0.5);
    });
  }
}
