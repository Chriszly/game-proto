import Phaser from 'phaser';
import { ITEMS as ITEM_DEFS, type ItemId } from '../game/items';
import { coinIcon, itemIcon, paint } from './paint';

// Item icons, 16x16 as shown, painted at four times that so they stay crisp in the top bar, and the coin.

export const itemTexture = (id: ItemId) => `item-${id}`;

const ITEMS = Object.keys(ITEM_DEFS) as ItemId[];

export function bakeItems(scene: Phaser.Scene) {
  for (const id of ITEMS) paint(scene, itemTexture(id), 16, 16, (c) => itemIcon(c, id, 8, 8.5, 15), 4);
  paint(scene, 'coin', 12, 12, (c) => coinIcon(c, 6, 6, 5.2), 4);
}
