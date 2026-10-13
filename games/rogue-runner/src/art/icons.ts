import Phaser from 'phaser';
import type { BoonId } from '../game/boons';
import { CLOTH, FROST, GOLD, INK, IRON, RED, TABARD, WOOD } from './palette';
import { PixelCanvas } from './pixelArt';

// Small pictures for the boon cards and the hearts in the top bar, drawn on a 16x16 grid.

type Draw = (c: PixelCanvas) => void;

const heart: Draw = (c) => {
  c.ellipse(1, 2, 7, 7, RED.mid).ellipse(7, 2, 7, 7, RED.mid);
  for (let y = 6; y < 14; y++) c.rect(1 + (y - 6), y, 13 - 2 * (y - 6), 1, RED.mid);
  c.rect(3, 4, 2, 2, RED.shine);
};

const ICONS: Record<BoonId | 'heart-empty', Draw> = {
  heart,
  'heart-empty': (c) => {
    heart(c);
    c.ellipse(3, 4, 4, 4, 0x2a1d1e).ellipse(9, 4, 4, 4, 0x2a1d1e);
    for (let y = 7; y < 12; y++) c.rect(3 + (y - 7), y, 9 - 2 * (y - 7), 1, 0x2a1d1e);
  },
  boots: (c) => {
    c.rect(4, 4, 5, 8, WOOD.mid).rect(4, 11, 9, 3, WOOD.mid).rect(4, 4, 5, 1, WOOD.light).rect(4, 13, 9, 1, WOOD.dark);
    c.line(9, 6, 14, 3, CLOTH.light).line(9, 7, 15, 5, CLOTH.mid).line(9, 8, 14, 8, CLOTH.light);
  },
  double: (c) => {
    for (const y of [2, 8]) {
      for (let i = 0; i < 4; i++) c.rect(8 - i, y + i, 2 * i + 1, 1, FROST.light);
      c.rect(7, y + 4, 3, 2, FROST.mid);
    }
  },
  aegis: (c) => {
    c.rect(3, 2, 10, 7, TABARD.mid);
    for (let y = 9; y < 15; y++) c.rect(3 + Math.floor((y - 8) * 0.8), y, 10 - 2 * Math.floor((y - 8) * 0.8), 1, TABARD.mid);
    c.rect(7, 4, 2, 8, GOLD.mid).rect(5, 6, 6, 2, GOLD.light).rect(3, 2, 10, 1, TABARD.light);
  },
  magnet: (c) => {
    c.rect(3, 3, 3, 9, RED.mid).rect(10, 3, 3, 9, RED.mid).rect(3, 11, 10, 3, RED.mid);
    c.rect(3, 2, 3, 2, IRON.light).rect(10, 2, 3, 2, IRON.light).rect(4, 12, 8, 1, RED.light);
  },
  greed: (c) => {
    c.ellipse(1, 4, 10, 10, GOLD.mid).ellipse(2, 5, 8, 8, GOLD.light).rect(5, 7, 2, 4, GOLD.dark);
    c.ellipse(6, 1, 9, 9, GOLD.mid).ellipse(7, 2, 7, 7, GOLD.light).rect(10, 4, 1, 3, GOLD.dark).px(8, 3, GOLD.shine);
  },
  greaves: (c) => {
    c.rect(5, 1, 6, 10, IRON.mid).rect(5, 1, 2, 10, IRON.light).rect(4, 11, 9, 3, WOOD.dark);
    c.ellipse(11, 7, 4, 5, 0xc9a040).px(12, 8, GOLD.shine);
  },
  cloak: (c) => {
    c.rect(5, 1, 6, 4, 0x3a2c58);
    for (let y = 5; y < 15; y++) c.rect(5 - Math.floor((y - 5) / 2), y, 6 + 2 * Math.floor((y - 5) / 2), 1, 0x3a2c58);
    c.rect(6, 2, 4, 3, INK).px(7, 3, FROST.light).px(9, 3, FROST.light).line(5, 6, 2, 14, 0x5a4a88);
  },
  mend: (c) => {
    c.rect(2, 5, 12, 6, CLOTH.light).rect(2, 5, 12, 1, CLOTH.mid).rect(2, 10, 12, 1, CLOTH.dark);
    c.rect(7, 6, 2, 4, RED.mid).rect(6, 7, 4, 2, RED.mid);
  },
};

export const iconTexture = (id: BoonId | 'heart-empty') => `icon-${id}`;

export function bakeIcons(scene: Phaser.Scene) {
  for (const [id, draw] of Object.entries(ICONS)) {
    const c = new PixelCanvas(18, 18);
    const inner = new PixelCanvas(16, 16);
    draw(inner);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const color = inner.get(x, y);
      if (color !== null) c.px(x + 1, y + 1, color);
    }
    c.outline(INK);
    c.bake(scene, `icon-${id}`, 4);
    c.bake(scene, `icon-${id}-small`, 2);
  }
}
