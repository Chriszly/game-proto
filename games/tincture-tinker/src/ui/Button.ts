import Phaser from 'phaser';
import { renderScale } from '../../../../shared/scaling';
import { shown } from '../art/nouveau';
import { SERIF } from '../scenes/layout';

/** A bottle-green cartouche button with a cream italic caption; it sinks a little while held. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void) {
  const bg = shown(scene.add.image(0, 0, 'button'));
  const text = scene.add
    .text(0, -2, caption, { fontFamily: SERIF, fontSize: '19px', fontStyle: 'italic bold', color: '#f1e6c8', resolution: Math.max(2, renderScale) })
    .setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setAlpha(0.9))
    .on('pointerout', () => bg.setAlpha(1))
    .on('pointerdown', onClick);
  return button;
}
