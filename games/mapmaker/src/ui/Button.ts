import Phaser from 'phaser';
import { BUTTON, FONT } from '../scenes/layout';

/** A wooden button with a caption, lit while the pointer is over it, dimmed while disabled. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  caption: string,
  onClick: () => void,
  size: { w: number; h: number } = BUTTON,
  enabled = true,
) {
  const bg = scene.add.rectangle(0, 0, size.w, size.h, enabled ? 0x5c3a21 : 0x4a4038).setStrokeStyle(3, enabled ? 0xc9a040 : 0x7a6a50);
  const text = scene.add
    .text(0, 0, caption, { fontFamily: FONT, fontSize: size.h < 38 ? '15px' : '18px', color: enabled ? '#f3e9d2' : '#a89a80' })
    .setOrigin(0.5);
  const button = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: enabled });
  if (enabled) {
    bg.on('pointerover', () => bg.setFillStyle(0x8a5a32))
      .on('pointerout', () => bg.setFillStyle(0x5c3a21))
      .on('pointerdown', onClick);
  }
  return button;
}
