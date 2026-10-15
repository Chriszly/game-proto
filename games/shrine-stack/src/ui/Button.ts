import Phaser from 'phaser';
import { BUTTON, FONT } from '../scenes/layout';

/**
 * A stone button with a caption centred on (x, y), lit while the pointer is over it. It returns
 * its parts rather than a container, which Phaser stops hitting once the camera has scrolled.
 */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void) {
  const bg = scene.add.rectangle(x, y, BUTTON.w, BUTTON.h, 0x4a3a6a).setStrokeStyle(3, 0xf3c64e);
  const text = scene.add.text(x, y, caption, { fontFamily: FONT, fontSize: '18px', color: '#f3e9d2' }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(0x6a5a9a))
    .on('pointerout', () => bg.setFillStyle(0x4a3a6a))
    .on('pointerdown', onClick);
  return [bg, text];
}
