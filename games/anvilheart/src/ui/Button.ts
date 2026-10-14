import Phaser from 'phaser';
import { buttonTexture, type ButtonState, type ButtonStyle } from '../art/ui';
import { FONT } from '../scenes/layout';

/**
 * A leaded-glass button with a caption: lit while the pointer is over it, dimmed when disabled.
 * Fires on `pointerdown`. Its textures are baked by `bakeUi` for its style and size.
 */
export class Button {
  readonly root: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Image;
  private text: Phaser.GameObjects.Text;
  private enabled = true;
  private over = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private style: ButtonStyle,
    caption: string,
    onClick: () => void,
    /** How far right of the centre the caption sits, to leave room for an emblem. */
    textX = 0,
  ) {
    this.bg = scene.add.image(0, 0, buttonTexture(style, 'on'));
    this.text = scene.add
      .text(textX, 0, caption, {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '18px',
        color: '#fff1d0',
        align: 'center',
        stroke: '#17131c',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.root = scene.add.container(x, y, [this.bg, this.text]);
    this.bg
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => ((this.over = true), this.paint()))
      .on('pointerout', () => ((this.over = false), this.paint()))
      .on('pointerdown', () => this.enabled && onClick());
  }

  set(caption: string, enabled: boolean, fontSize = 18) {
    if (this.text.text !== caption) this.text.setText(caption);
    if (this.text.style.fontSize !== `${fontSize}px`) this.text.setFontSize(fontSize);
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.paint();
    }
    return this;
  }

  private paint() {
    const state: ButtonState = !this.enabled ? 'off' : this.over ? 'over' : 'on';
    this.bg.setTexture(buttonTexture(this.style, state));
    this.text.setColor(this.enabled ? '#fff1d0' : '#a89cb8');
  }
}
