import Phaser from 'phaser';
import { cardIcon } from '../art/icons';
import { CARD, GOLD, INK } from '../art/palette';
import { card, describe, kindOf, type CardId } from '../game/cards';
import { FONT, HAND } from '../scenes/layout';

/**
 * A card face: its cost in the corner, name, picture and rules, framed red for an attack and blue
 * for a skill. `bg` is the part that takes taps.
 */
export function makeCard(scene: Phaser.Scene, id: CardId, x: number, y: number, scale = 1) {
  const c = card(id);
  const colors = CARD[kindOf(id)];
  const { w, h } = HAND;
  const bg = scene.add.rectangle(0, 0, w, h, colors.frame).setStrokeStyle(3, INK);
  const face = scene.add.rectangle(0, 0, w - 12, h - 12, colors.face);
  const art = scene.add.rectangle(0, -h / 2 + 64, w - 24, 60, INK, 0.45);
  const icon = scene.add.image(0, -h / 2 + 64, cardIcon(c.icon));
  const name = scene.add
    .text(0, -h / 2 + 22, c.name, { fontFamily: FONT, fontSize: '14px', color: '#f3e9d2', fontStyle: 'bold' })
    .setOrigin(0.5);
  const text = scene.add
    .text(0, -h / 2 + 102, describe(id), { fontFamily: FONT, fontSize: '12px', color: '#f1e3c6', align: 'center', wordWrap: { width: w - 20 } })
    .setOrigin(0.5, 0);
  const gem = scene.add.circle(-w / 2 + 8, -h / 2 + 8, 14, GOLD.mid).setStrokeStyle(3, INK);
  const cost = scene.add
    .text(-w / 2 + 8, -h / 2 + 8, String(c.cost), { fontFamily: FONT, fontSize: '18px', color: '#1a1216', fontStyle: 'bold' })
    .setOrigin(0.5);
  const view = scene.add.container(x, y, [bg, face, art, icon, name, text, gem, cost]).setScale(scale);
  return { view, bg };
}
