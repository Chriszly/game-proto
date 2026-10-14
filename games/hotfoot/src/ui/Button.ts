import Phaser from 'phaser';
import { bakeButton } from '../art/hud';
import { C } from '../art/ink';
import { BUTTON, FONT } from '../scenes/layout';

/** A lapis button ruled in gold with a vellum caption, turned madder while the pointer is over it. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void, width = BUTTON.w) {
  const key = `button-${width}`;
  if (!scene.textures.exists(key)) bakeButton(scene, key, width, BUTTON.h);
  const bg = scene.add.image(0, 0, key);
  const text = scene.add.text(0, 0, caption, { fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: C.goldPale }).setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setTexture(`${key}-over`))
    .on('pointerout', () => bg.setTexture(key))
    .on('pointerdown', onClick);
  return button;
}
