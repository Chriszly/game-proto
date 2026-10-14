import Phaser from 'phaser';
import { BUTTON, FONT } from '../scenes/layout';

/** A beech plaque button with a caption, lighter while the pointer is over it. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void) {
  const key = `plaque-${BUTTON.w}x${BUTTON.h}`;
  const bg = scene.add.image(0, 0, key);
  const text = scene.add.text(0, -1, caption, { fontFamily: FONT, fontStyle: '800', fontSize: '18px', color: '#3a2414' }).setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setTexture(`${key}-sel`))
    .on('pointerout', () => bg.setTexture(key))
    .on('pointerdown', onClick);
  return button;
}
