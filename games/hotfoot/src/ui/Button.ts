import Phaser from 'phaser';
import { BUTTON, FONT } from '../scenes/layout';

/** A wooden button with a caption, lit while the pointer is over it. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void, width = BUTTON.w) {
  const bg = scene.add.rectangle(0, 0, width, BUTTON.h, 0x5c3a21).setStrokeStyle(3, 0xc9a040);
  const text = scene.add.text(0, 0, caption, { fontFamily: FONT, fontSize: '18px', color: '#f3e9d2' }).setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(0x8a5a32))
    .on('pointerout', () => bg.setFillStyle(0x5c3a21))
    .on('pointerdown', onClick);
  return button;
}
