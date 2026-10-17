import Phaser from 'phaser';
import { BUTTON, FONT } from '../scenes/layout';
import { renderScale } from '../../../../shared/scaling';
import { INK, INK_LIT, OFF, OFF_TEXT, ON_INK, hex } from '../art/paint';

/**
 * A flat ink button with a bold caption (white by day, dark at night), lit while the pointer is over
 * it and greyed while disabled. The caption sits left of centre when `align` is 'left' (to leave room
 * for a tag).
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  caption: string,
  onClick: () => void,
  size: { w: number; h: number } = BUTTON,
  enabled = true,
  align: 'center' | 'left' = 'center',
) {
  const bg = scene.add.rectangle(0, 0, size.w, size.h, hex(enabled ? INK : OFF));
  const text = scene.add
    .text(align === 'left' ? -size.w / 2 + 15 : 0, 0, caption, {
      fontFamily: FONT,
      fontStyle: '800',
      fontSize: size.h < 38 ? '13px' : '16px',
      color: enabled ? ON_INK : OFF_TEXT,
      resolution: Math.max(2, renderScale),
    })
    .setOrigin(align === 'left' ? 0 : 0.5, 0.5);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: enabled });
  if (enabled) {
    bg.on('pointerover', () => bg.setFillStyle(hex(INK_LIT)))
      .on('pointerout', () => bg.setFillStyle(hex(INK)))
      .on('pointerdown', onClick);
  }
  return button;
}
