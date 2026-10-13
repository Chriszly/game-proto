import Phaser from 'phaser';
import { BUTTON, FONT } from '../scenes/layout';

/** A mossy button with a caption, lit while the pointer is over it. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void) {
  const bg = scene.add.rectangle(0, 0, BUTTON.w, BUTTON.h, 0x3d5a2a).setStrokeStyle(3, 0xc9a040);
  const text = scene.add.text(0, 0, caption, { fontFamily: FONT, fontSize: '18px', color: '#f3e9d2' }).setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(0x5a8a3c))
    .on('pointerout', () => bg.setFillStyle(0x3d5a2a))
    .on('pointerdown', onClick);
  return button;
}
