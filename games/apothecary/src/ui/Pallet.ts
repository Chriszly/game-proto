import Phaser from 'phaser';
import { itemTexture } from '../art/items';
import { INK } from '../art/palette';
import { ITEMS, type ItemId } from '../game/items';
import { PALLET_BASE, PALLET_SIZE } from '../game/state';

/** Each item on a pallet is drawn as a flat crate: its width, the height of its front, and of its top. */
const CRATE_W = 15;
const CRATE_FRONT = 4;
const CRATE_TOP = 3;
/** Height of the pallet's deck above the ground. */
const DECK = 14;

const shade = (color: number, by: number) => {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(c.red * by, c.green * by, c.blue * by);
};

/**
 * A pallet of one kind of goods, standing with its bottom edge centred on (x, y). Items are stacked
 * as crates in the item's colour, two wide and two deep, ten layers high, so the stack shows how
 * much is there; the item's icon sits on top. An empty pallet shows the icon faintly so it is clear
 * what goes on it.
 */
export class Pallet {
  private crates: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Image;
  /** How many items the pallet shows, read by the playthrough test. */
  count = 0;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    readonly item: ItemId,
  ) {
    scene.add.image(x, y, 'pallet').setOrigin(0.5, 1).setDepth(y);
    this.crates = scene.add.graphics().setDepth(y + 0.01);
    this.icon = scene.add.image(x, y - DECK - 8, itemTexture(item)).setAlpha(0.4).setDepth(y + 0.02);
  }

  set(count: number) {
    count = Math.min(count, PALLET_SIZE);
    if (count === this.count) return;
    this.count = count;
    const g = this.crates.clear();
    const color = ITEMS[this.item].color;
    const front = shade(color, 0.7);
    const deck = this.y - DECK;
    // Back row first, then the front row, layer by layer, so each crate covers those behind and below.
    for (let n = 0; n < count; n++) {
      const layer = Math.floor(n / PALLET_BASE);
      const slot = n % PALLET_BASE;
      const back = slot < 2;
      const left = this.x - CRATE_W + (slot % 2) * CRATE_W;
      const bottom = deck - layer * CRATE_FRONT - (back ? CRATE_TOP : 0);
      const top = bottom - CRATE_FRONT - CRATE_TOP;
      g.fillStyle(INK).fillRect(left, top, CRATE_W, CRATE_FRONT + CRATE_TOP + 1);
      g.fillStyle(color).fillRect(left + 1, top + 1, CRATE_W - 2, CRATE_TOP);
      g.fillStyle(front).fillRect(left + 1, top + 1 + CRATE_TOP, CRATE_W - 2, CRATE_FRONT - 1);
    }
    const layers = Math.ceil(count / PALLET_BASE);
    const stackTop = deck - layers * CRATE_FRONT - (count > 0 ? CRATE_TOP * 2 : 0);
    this.icon.setY(stackTop - 6).setAlpha(count > 0 ? 1 : 0.4);
  }
}
