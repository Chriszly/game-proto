import Phaser from 'phaser';
import { itemTexture } from '../art/items';
import { INK, WOOD } from '../art/palette';
import { ITEMS, PLANTS, RECIPES, REFINE, type ItemId } from '../game/items';
import { potionPrice, type GameState } from '../game/state';

const ROW = 30;
const WIDTH = 360;
const TEXT = { fontFamily: 'monospace', fontSize: '12px', color: '#f3e9d2' };

/**
 * A panel over the middle of the screen listing what each station makes from what: the refining
 * table's plants and the cauldron's recipes with what a potion sells for. It is built from the
 * recipe tables, so new plants and potions show up on their own. The scene closes it on the next tap.
 */
export class RecipeBook {
  private panel: Phaser.GameObjects.Container;
  private prices: { text: Phaser.GameObjects.Text; potion: (typeof RECIPES)[number]['out'] }[] = [];
  /** One line per recipe, such as `Wheat Flour + Wheat Flour = Healing Draught`, read by the playthrough test. */
  readonly lines: string[] = [];

  constructor(scene: Phaser.Scene, depth: number) {
    const { width, height } = scene.scale;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 0;

    const heading = (label: string) => {
      parts.push(scene.add.text(0, y, label, { ...TEXT, fontSize: '14px', color: '#e6c766' }).setOrigin(0.5, 0));
      y += 24;
    };
    // Ingredient icons joined with "+", an "=", then the product's icon and name.
    const row = (inputs: ItemId[], out: ItemId) => {
      const cy = y + ROW / 2;
      let x = -WIDTH / 2 + 24;
      inputs.forEach((item, i) => {
        if (i > 0) {
          parts.push(scene.add.text(x - 4, cy, '+', TEXT).setOrigin(0.5));
          x += 8;
        }
        parts.push(scene.add.image(x + 8, cy, itemTexture(item)).setScale(1.5));
        x += 28;
      });
      parts.push(scene.add.text(x, cy, '=', TEXT).setOrigin(0.5));
      parts.push(scene.add.image(x + 22, cy, itemTexture(out)).setScale(1.5));
      parts.push(scene.add.text(x + 40, cy, ITEMS[out].name, TEXT).setOrigin(0, 0.5));
      this.lines.push(`${inputs.map((i) => ITEMS[i].name).join(' + ')} = ${ITEMS[out].name}`);
      y += ROW;
      return cy;
    };

    heading('Refining table');
    for (const plant of PLANTS) row([plant], REFINE[plant].out);
    y += 8;
    heading('Cauldron');
    for (const recipe of RECIPES) {
      const cy = row(recipe.inputs, recipe.out);
      const text = scene.add.text(WIDTH / 2 - 20, cy, '', { ...TEXT, color: '#e6c766' }).setOrigin(1, 0.5);
      parts.push(text);
      this.prices.push({ text, potion: recipe.out });
    }
    y += 6;
    parts.push(scene.add.text(0, y, 'Tap to close', { ...TEXT, fontSize: '11px', color: '#bfae8e' }).setOrigin(0.5, 0));
    y += 18;

    const h = y + 28;
    const bg = scene.add.rectangle(0, h / 2 - 14, WIDTH, h, WOOD.dark).setStrokeStyle(3, INK);
    const inner = scene.add.rectangle(0, h / 2 - 14, WIDTH - 10, h - 10).setStrokeStyle(1, WOOD.light);
    this.panel = scene.add
      .container(width / 2, (height - h) / 2 + 14, [bg, inner, ...parts])
      .setDepth(depth)
      .setScrollFactor(0, 0, true)
      .setVisible(false);
  }

  get visible() {
    return this.panel.visible;
  }

  toggle(open = !this.panel.visible) {
    this.panel.setVisible(open);
  }

  /** Shows what each potion sells for now, with the guild's price upgrade. */
  update(state: GameState) {
    if (!this.panel.visible) return;
    for (const { text, potion } of this.prices) text.setText(`${potionPrice(state, potion)}c`);
  }
}
