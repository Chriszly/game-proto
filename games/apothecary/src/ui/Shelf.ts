import Phaser from 'phaser';
import { itemTexture } from '../art/items';
import { INK, SERIF, TEXT_HALO, fit } from '../art/paint';
import { FINE, type PotionId, type SellableId } from '../game/items';

/** How many bottles stand on each of a shelf's two boards, and where the boards are, up from its bottom edge. */
const PER_BOARD = 3;
const BOARDS = [8, 28];
/** Bottles are shown smaller than the 16px icon, so three fit along a board. */
const BOTTLE_SCALE = 0.75;

/**
 * A shop shelf for one potion, standing with its bottom edge centred on (x, y): up to six bottles of
 * it on two boards, fine ones first, with how many there are in all above the shelf once that is
 * more than it shows. An empty shelf shows the potion faintly on its lower board, so it is clear
 * what goes there.
 */
export class Shelf {
  private image: Phaser.GameObjects.Image;
  private bottles: Phaser.GameObjects.Image[];
  private total: Phaser.GameObjects.Text;
  /** How many potions of its kind the shelf holds, fine ones included; read by the playthrough test. */
  count = 0;
  private shown = '';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly item: PotionId,
  ) {
    this.image = fit(scene.add.image(x, y, 'shelf').setOrigin(0.5, 1).setDepth(y));
    this.bottles = Array.from({ length: PER_BOARD * BOARDS.length }, () => fit(scene.add.image(0, 0, itemTexture(item)), BOTTLE_SCALE).setDepth(y + 0.01));
    this.total = scene.add
      .text(x, y - 46, '', { fontFamily: SERIF, fontSize: '10px', fontStyle: 'bold', color: INK, stroke: TEXT_HALO, strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(y + 0.02);
    this.moveTo(x, y);
  }

  /** Moves the shelf, when one more learned potion makes room along the row for its own. */
  moveTo(x: number, y: number) {
    this.image.setPosition(x, y).setDepth(y);
    this.total.setPosition(x, y - 46).setDepth(y + 0.02);
    this.bottles.forEach((bottle, i) => {
      const board = BOARDS[Math.floor(i / PER_BOARD)];
      bottle.setPosition(x + ((i % PER_BOARD) - 1) * 11, y - board - 6).setDepth(y + 0.01);
    });
  }

  setVisible(visible: boolean) {
    this.image.setVisible(visible);
    this.total.setVisible(visible);
    for (const bottle of this.bottles) bottle.setVisible(visible);
    // Shown again, the bottles are laid out afresh on the next `set`.
    this.shown = '';
  }

  /** Shows what of this potion stands on the shop's shelf: the plain and fine ones among `shelf`. */
  set(shelf: readonly SellableId[]) {
    const fine = shelf.filter((p) => p === FINE[this.item]).length;
    const plain = shelf.filter((p) => p === this.item).length;
    this.count = fine + plain;
    const key = `${fine}:${plain}`;
    if (key === this.shown) return;
    this.shown = key;
    this.bottles.forEach((bottle, i) => {
      const empty = this.count === 0 && i === 0;
      bottle
        .setVisible(i < this.count || empty)
        .setTexture(itemTexture(i < fine ? FINE[this.item] : this.item))
        .setAlpha(empty ? 0.35 : 1);
    });
    this.total.setText(this.count > this.bottles.length ? `${this.count}` : '');
  }
}
