import Phaser from 'phaser';
import { FONT } from '../scenes/layout';

/** A clay button with a pressed caption, a little lighter while the pointer is over it. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void) {
  const bg = scene.add.image(0, 0, 'btn');
  const text = scene.add
    .text(0, 0, caption, { fontFamily: FONT, fontStyle: 'bold', fontSize: '20px', color: '#4a2a08' })
    .setOrigin(0.5)
    .setShadow(1, 1, 'rgba(255,240,210,0.4)', 0);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => button.setScale(1.04))
    .on('pointerout', () => button.setScale(1))
    .on('pointerdown', onClick);
  return button;
}
