import Phaser from 'phaser';
import { cardIcon } from '../art/icons';
import { CARD_FRAME, cardFrame } from '../art/cardFrames';
import { GOLD, INK } from '../art/palette';
import { card, describe, kindOf, type CardId } from '../game/cards';
import { FONT, HAND } from '../scenes/layout';

/**
 * A card face: a painted parchment with its cost on a gold seal in the corner, its name on a
 * header (crimson for an attack, blue for a skill), its picture and its rules. `bg` is the dark
 * edge behind it, the part that takes taps.
 */
export function makeCard(scene: Phaser.Scene, id: CardId, x: number, y: number, scale = 1) {
  const c = card(id);
  const { w, h } = HAND;
  const top = -h / 2 + 3;
  const bg = scene.add.rectangle(0, 0, w, h, INK).setStrokeStyle(3, INK);
  const face = scene.add.image(0, 0, cardFrame(kindOf(id))).setScale(0.5);
  const iconY = top + CARD_FRAME.art.y + CARD_FRAME.art.h / 2;
  const icon = scene.add.image(0, iconY, cardIcon(c.icon));
  const name = scene.add
    .text(0, top + CARD_FRAME.header.y + CARD_FRAME.header.h / 2, c.name, { fontFamily: FONT, fontSize: '15px', color: '#f6ead0', fontStyle: 'bold' })
    .setOrigin(0.5);
  const text = scene.add
    .text(0, top + CARD_FRAME.art.y + CARD_FRAME.art.h + 6, describe(id), { fontFamily: FONT, fontSize: '13px', color: '#2a1c14', align: 'center', wordWrap: { width: w - 20 } })
    .setOrigin(0.5, 0);
  const gem = scene.add.circle(-w / 2 + 8, -h / 2 + 8, 15, GOLD.mid).setStrokeStyle(3, INK);
  const shine = scene.add.circle(-w / 2 + 4, -h / 2 + 4, 6, GOLD.shine, 0.7);
  const cost = scene.add
    .text(-w / 2 + 8, -h / 2 + 8, String(c.cost), { fontFamily: FONT, fontSize: '19px', color: '#1a1216', fontStyle: 'bold' })
    .setOrigin(0.5);
  const view = scene.add.container(x, y, [bg, face, icon, name, text, gem, shine, cost]).setScale(scale);
  return { view, bg };
}
