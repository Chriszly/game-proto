import Phaser from 'phaser';
import { GOLD, SLATE } from '../art/palette';
import { FONT } from '../scenes/layout';

// The slate-and-gold look shared by the HUD, the buttons, the cards and the books: chamfered
// panels with a lighter upper bevel and a gold edge, and bold system-font text.

/** The corners of a w x h rectangle at (x, y) with its corners cut off by c. */
export const chamferPts = (x: number, y: number, w: number, h: number, c: number) =>
  [
    [x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c],
  ].map(([px, py]) => new Phaser.Math.Vector2(px, py));

export interface PanelStyle {
  /** Corner cut. */
  c?: number;
  fill?: number;
  alpha?: number;
  /** The edge colour and width; 0 width for none. */
  edge?: number;
  lw?: number;
}

/** A chamfered slate panel with a lit upper bevel and a gold edge. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, o: PanelStyle = {}) {
  const c = o.c ?? Math.min(10, h / 3);
  g.fillStyle(o.fill ?? SLATE.mid, o.alpha ?? 0.94).fillPoints(chamferPts(x, y, w, h, c), true);
  // The upper bevel catches the light from the top left.
  const bevel = [
    new Phaser.Math.Vector2(x + c, y),
    new Phaser.Math.Vector2(x + w - c, y),
    new Phaser.Math.Vector2(x + w - c - h * 0.3, y + h * 0.45),
    new Phaser.Math.Vector2(x + c + h * 0.3, y + h * 0.45),
  ];
  g.fillStyle(0xffffff, 0.05).fillPoints(bevel, true);
  if ((o.lw ?? 2) > 0) g.lineStyle(o.lw ?? 2, o.edge ?? GOLD.mid, 1).strokePoints(chamferPts(x, y, w, h, c), true);
}

/** Bold text in the HUD's system font, with an optional dark outline. */
export const textStyle = (size: number, color: string, stroke = 0): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  fontStyle: 'bold',
  color,
  stroke: '#141820',
  strokeThickness: stroke,
});

/** A slate button with a gold edge, lit while the pointer is over it. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, caption: string, onClick: () => void) {
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    drawPanel(g, -w / 2, -h / 2, w, h, { fill: hover ? 0x4a4260 : SLATE.light, alpha: 1, edge: hover ? GOLD.light : GOLD.mid, lw: 2.5 });
  };
  draw(false);
  const text = scene.add.text(0, 0, caption, textStyle(Math.round(h * 0.42), '#ffe7a0')).setOrigin(0.5);
  const hit = scene.add.zone(0, 0, w, h);
  hit
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => draw(true))
    .on('pointerout', () => draw(false))
    .on('pointerdown', onClick);
  return scene.add.container(x, y, [g, text, hit]);
}
