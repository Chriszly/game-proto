import Phaser from 'phaser';
import { BUTTON, FONT } from '../scenes/layout';

/** A stone button with a caption, lit while the pointer is over it. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void) {
  const bg = scene.add.rectangle(0, 0, BUTTON.w, BUTTON.h, 0x4a3a6a).setStrokeStyle(3, 0xf3c64e);
  const text = scene.add.text(0, 0, caption, { fontFamily: FONT, fontSize: '18px', color: '#f3e9d2' }).setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(0x6a5a9a))
    .on('pointerout', () => bg.setFillStyle(0x4a3a6a))
    .on('pointerdown', onClick);
  return button;
}
