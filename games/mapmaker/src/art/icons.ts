import Phaser from 'phaser';
import type { UpgradeId } from '../game/upgrades';
import { GOLD, INK, PARCHMENT, ROOF, SEA, STONE, WOOD, CLOTH } from './palette';
import { PixelCanvas } from './pixelArt';

type IconId = 'coin' | 'supplies' | 'chart' | UpgradeId;

/** Each icon on a 12x12 grid, outlined in ink and baked as `icon-<id>` at 2x. */
const ICONS: Record<IconId, (c: PixelCanvas) => void> = {
  coin: (c) => {
    c.ellipse(1, 1, 10, 10, GOLD.dark).ellipse(1, 1, 9, 9, GOLD.mid).ellipse(3, 3, 5, 5, GOLD.light);
    c.rect(5, 4, 2, 4, GOLD.dark);
  },
  // A sack of ship's biscuit.
  supplies: (c) => {
    c.ellipse(1, 3, 10, 9, CLOTH.dark).ellipse(2, 3, 8, 8, CLOTH.mid);
    c.rect(4, 1, 4, 3, CLOTH.mid).rect(4, 3, 4, 1, WOOD.mid);
    c.ellipse(4, 6, 4, 3, PARCHMENT.dark).px(5, 7, WOOD.light);
  },
  chart: (c) => {
    c.rect(1, 2, 10, 8, PARCHMENT.light).rect(1, 2, 1, 8, PARCHMENT.dark).rect(10, 2, 1, 8, PARCHMENT.dark);
    c.ellipse(3, 4, 5, 4, SEA.light).px(5, 5, 0x5a8f3a).px(4, 5, 0x5a8f3a);
    c.px(8, 7, WOOD.mid).px(7, 8, WOOD.mid).px(9, 6, WOOD.mid);
  },
  provisions: (c) => {
    c.rect(2, 3, 8, 7, WOOD.mid).rect(2, 5, 8, 1, WOOD.dark).rect(2, 8, 8, 1, WOOD.dark);
    c.rect(3, 3, 1, 7, WOOD.light);
    c.ellipse(2, 1, 8, 3, WOOD.light);
  },
  spyglass: (c) => {
    c.line(1, 10, 9, 2, GOLD.dark).line(2, 10, 10, 2, GOLD.mid).line(2, 9, 9, 3, GOLD.light);
    c.rect(8, 1, 3, 3, GOLD.mid).px(10, 1, SEA.light);
    c.rect(3, 7, 2, 2, WOOD.mid);
  },
  ink: (c) => {
    c.rect(3, 5, 6, 6, STONE.dark).rect(4, 5, 4, 1, STONE.light).rect(4, 3, 4, 2, STONE.mid);
    c.line(6, 4, 10, 0, CLOTH.light).line(7, 4, 11, 0, CLOTH.mid);
  },
  compass: (c) => {
    c.ellipse(1, 1, 10, 10, WOOD.mid).ellipse(2, 2, 8, 8, PARCHMENT.light);
    c.rect(6, 3, 1, 3, ROOF.mid).rect(5, 6, 1, 3, STONE.dark).px(5, 5, GOLD.mid).px(6, 6, GOLD.mid);
  },
};

export function bakeIcons(scene: Phaser.Scene) {
  for (const [id, draw] of Object.entries(ICONS)) {
    const c = new PixelCanvas(12, 12);
    draw(c);
    c.outline(INK);
    c.bake(scene, `icon-${id}`, 2);
  }
}
