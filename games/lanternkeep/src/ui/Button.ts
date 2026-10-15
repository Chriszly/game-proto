import Phaser from 'phaser';
import { PAD, RES } from '../art/puppet';
import { BUTTON, FONT } from '../scenes/layout';

/** A carved black card button with a glowing amber rim and a caption, brighter under the pointer. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void) {
  const bg = scene.add.image(-BUTTON.w / 2 - PAD, -BUTTON.h / 2 - PAD, 'btn').setOrigin(0).setScale(1 / RES);
  const text = scene.add
    .text(0, 0, caption, { fontFamily: FONT, fontSize: '19px', fontStyle: 'bold', color: '#ffd08a' })
    .setOrigin(0.5)
    .setShadow(0, 0, 'rgba(255,150,70,0.8)', 6, false, true);
  const hit = scene.add.zone(0, 0, BUTTON.w, BUTTON.h).setInteractive({ useHandCursor: true });
  hit
    .on('pointerover', () => bg.setTexture('btn-hover'))
    .on('pointerout', () => bg.setTexture('btn'))
    .on('pointerdown', onClick);
  return scene.add.container(x, y, [bg, text, hit]);
}
