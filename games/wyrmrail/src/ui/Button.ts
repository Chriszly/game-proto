import Phaser from 'phaser';
import { FONT } from '../scenes/layout';

/** A wooden button with a caption, lit while the pointer is over it. `setLit` marks it as on. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, caption: string, onClick: () => void) {
  const bg = scene.add.rectangle(0, 0, w, h, 0x5c3a21).setStrokeStyle(3, 0xc9a040);
  const text = scene.add.text(0, 0, caption, { fontFamily: FONT, fontSize: '15px', color: '#f3e9d2', align: 'center' }).setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);
  let hover = false;
  let lit = false;
  let enabled = true;
  const paint = () => {
    bg.setFillStyle(lit ? 0x8f6a24 : hover && enabled ? 0x8a5a32 : 0x5c3a21);
    container.setAlpha(enabled ? 1 : 0.55);
  };
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => ((hover = true), paint()))
    .on('pointerout', () => ((hover = false), paint()))
    .on('pointerdown', onClick);
  return {
    container,
    setCaption: (s: string) => text.text !== s && text.setText(s),
    setLit: (on: boolean) => on !== lit && ((lit = on), paint()),
    setEnabled: (on: boolean) => on !== enabled && ((enabled = on), paint()),
  };
}
