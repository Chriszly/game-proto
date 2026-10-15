import Phaser from 'phaser';
import { renderScale } from '../../../../shared/scaling';
import { BUTTON, FONT } from '../scenes/layout';

const CREAM = 0xf6ecd2;
const LIT = 0xe8c98a;
const INK = 0x2b2118;

/** A cream chart-label button ruled in ink, with an ochre wash while the pointer is over it. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, caption: string, onClick: () => void, w = BUTTON.w, h = BUTTON.h) {
  const bg = scene.add.rectangle(0, 0, w, h, CREAM).setStrokeStyle(2, INK);
  const rule = scene.add.rectangle(0, 0, w - 8, h - 8).setStrokeStyle(1, INK, 0.5);
  const text = scene.add
    .text(0, 0, caption, { fontFamily: FONT, fontSize: '19px', fontStyle: 'bold italic', color: '#2b2118', resolution: Math.max(2, renderScale) })
    .setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, rule, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(LIT))
    .on('pointerout', () => bg.setFillStyle(CREAM))
    .on('pointerdown', onClick);
  return { button, bg, text };
}
