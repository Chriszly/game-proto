import Phaser from 'phaser';
import { FONT } from '../scenes/layout';

/** A wooden button with a caption, lit while the pointer is over it and greyed out when disabled. */
export class Button {
  readonly root: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private enabled = true;
  private over = false;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, caption: string, onClick: () => void) {
    this.bg = scene.add.rectangle(0, 0, w, h, 0x5c3a21).setStrokeStyle(3, 0xc9a040);
    this.text = scene.add
      .text(0, 0, caption, { fontFamily: FONT, fontSize: '18px', color: '#f3e9d2', align: 'center' })
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
    this.text.setFontSize(fontSize);
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.paint();
    }
    return this;
  }

  private paint() {
    this.bg.setFillStyle(!this.enabled ? 0x3b2a20 : this.over ? 0x8a5a32 : 0x5c3a21);
    this.bg.setStrokeStyle(3, this.enabled ? 0xc9a040 : 0x6a5a40);
    this.text.setColor(this.enabled ? '#f3e9d2' : '#bcac8c');
  }
}
