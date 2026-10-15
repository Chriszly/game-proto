import Phaser from 'phaser';
import { itemTexture } from '../art/items';
import { INK, SERIF, fit } from '../art/paint';
import { cardTexture } from '../art/ui';
import { ITEMS, PLANTS, RECIPES, REFINE, type ItemId } from '../game/items';
import { potionPrice, type GameState } from '../game/state';
import { viewSize } from '../../../../shared/scaling';

const ROW = 30;
const WIDTH = 360;
const TEXT = { fontFamily: SERIF, fontSize: '13px', color: INK };

/**
 * A panel over the middle of the screen listing what each station makes from what: the refining
 * table's plants and the cauldron's recipes with what a potion sells for. It is built from the
 * recipe tables, so new plants and potions show up on their own. The next tap closes it: on the panel
 * itself here, so it doesn't reach the world behind, and anywhere else in the scene's tap handler.
 */
export class RecipeBook {
  private panel: Phaser.GameObjects.Container;
  private prices: { text: Phaser.GameObjects.Text; potion: (typeof RECIPES)[number]['out'] }[] = [];
  /** One line per recipe, such as `Wheat Flour + Wheat Flour = Healing Draught`, read by the playthrough test. */
  readonly lines: string[] = [];

  constructor(scene: Phaser.Scene, depth: number) {
    const { width, height } = viewSize(scene);
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 0;

    const heading = (label: string) => {
      parts.push(scene.add.text(0, y, label, { ...TEXT, fontSize: '15px', fontStyle: 'bold', color: '#7a4a10' }).setOrigin(0.5, 0));
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
        parts.push(fit(scene.add.image(x + 8, cy, itemTexture(item)), 1.5));
        x += 28;
      });
      parts.push(scene.add.text(x, cy, '=', TEXT).setOrigin(0.5));
      parts.push(fit(scene.add.image(x + 22, cy, itemTexture(out)), 1.5));
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
      const text = scene.add.text(WIDTH / 2 - 20, cy, '', { ...TEXT, fontStyle: 'bold', color: '#7a4a10' }).setOrigin(1, 0.5);
      parts.push(text);
      this.prices.push({ text, potion: recipe.out });
    }
    y += 6;
    parts.push(scene.add.text(0, y, 'Tap to close', { ...TEXT, fontSize: '12px', fontStyle: 'italic', color: '#6a5440' }).setOrigin(0.5, 0));
    y += 18;

    const h = y + 28;
    const bg = fit(scene.add.image(0, h / 2 - 14, cardTexture(scene, 'panel', WIDTH, h)))
      .setInteractive()
      .on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
        e.stopPropagation();
        this.toggle(false);
      });
    this.panel = scene.add
      .container(width / 2, (height - h) / 2 + 14, [bg, ...parts])
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
