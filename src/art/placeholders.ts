import Phaser from 'phaser';
import { ITEMS, type ItemId, type PlantId } from '../game/items';

// Placeholder art drawn with simple shapes. Swap for real sprites later; keys stay the same.

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export const plantTexture = (plant: PlantId, stage: number) => `plant-${plant}-${stage}`;
export const itemTexture = (id: ItemId) => `item-${id}`;

export function bakePlaceholders(scene: Phaser.Scene) {
  bake(scene, 'plot', 56, 44, (g) => {
    g.fillStyle(0x4a3222).fillRoundedRect(0, 0, 56, 44, 6);
    g.fillStyle(0x3a2618);
    for (let y = 8; y < 44; y += 10) g.fillRect(4, y, 48, 3);
  });

  // Three growth stages per plant: sprout, growing, ripe.
  for (const stage of [0, 1, 2]) {
    bake(scene, plantTexture('wheat', stage), 48, 44, (g) => {
      // A row of stalks: short green shoots, then taller green, then golden with grain heads.
      const h = [8, 22, 34][stage];
      const stalk = stage === 2 ? 0xc9a040 : 0x6f9a3e;
      for (let i = 0; i < 6; i++) {
        const x = 5 + i * 7.5;
        const top = 44 - h + (i % 2) * 3;
        g.fillStyle(stalk).fillRect(x, top, 2, 44 - top);
        if (stage === 2) {
          g.fillStyle(ITEMS.wheat.color);
          for (let k = 0; k < 4; k++) g.fillEllipse(x + (k % 2 ? 2.5 : -0.5), top + 2 + k * 2.5, 3, 4);
        }
      }
    });
    bake(scene, plantTexture('mandrake', stage), 40, 40, (g) => {
      const h = 8 + stage * 7;
      g.fillStyle(0x3f7a35);
      g.fillTriangle(20, 40 - h - 8, 12, 40, 20, 34);
      g.fillTriangle(20, 40 - h - 8, 28, 40, 20, 34);
      g.fillTriangle(8, 40 - h, 20, 38, 16, 40);
      g.fillTriangle(32, 40 - h, 20, 38, 24, 40);
      if (stage === 2) g.fillStyle(ITEMS.mandrake.color).fillEllipse(20, 36, 18, 10);
    });
  }

  bake(scene, 'table', 88, 52, (g) => {
    g.fillStyle(0x6b4a2c).fillRect(0, 8, 88, 36);
    g.fillStyle(0x8a6239).fillRect(0, 4, 88, 8);
    g.fillStyle(0x4a321d).fillRect(4, 44, 8, 8).fillRect(76, 44, 8, 8);
    g.fillStyle(0x9a9a92).fillCircle(26, 22, 12); // mortar
    g.fillStyle(0x6d6d66).fillCircle(26, 22, 7);
    g.fillStyle(0xd8cfa8).fillRect(50, 14, 28, 18); // drying cloth
  });

  bake(scene, 'cauldron', 72, 60, (g) => {
    g.fillStyle(0x7a3b16).fillTriangle(10, 60, 36, 40, 62, 60); // fire
    g.fillStyle(0x1e1c20).fillEllipse(36, 34, 68, 44);
    g.fillStyle(0x2f2c33).fillEllipse(36, 18, 60, 18);
    g.fillStyle(0x58a35a).fillEllipse(36, 19, 48, 11);
  });

  bake(scene, 'counter', 200, 44, (g) => {
    g.fillStyle(0x5a3d22).fillRect(0, 10, 200, 34);
    g.fillStyle(0x8a6239).fillRect(0, 0, 200, 14);
    g.fillStyle(0x6b4a2c);
    for (let x = 10; x < 200; x += 38) g.fillRect(x, 16, 4, 26);
  });

  // Body and head are separate so only the clothes get tinted per customer.
  bake(scene, 'customer', 22, 34, (g) => {
    g.fillStyle(0xffffff).fillRect(3, 12, 16, 22);
  });
  bake(scene, 'customer-head', 22, 34, (g) => {
    g.fillStyle(0xe8c49a).fillCircle(11, 8, 7);
  });

  // Floor markers: drop-off (arrow down), pick-up (arrow up), upgrade (coin) and work spot (pestle).
  const pad = (key: string, color: number, symbol: (g: Phaser.GameObjects.Graphics) => void) =>
    bake(scene, key, 44, 44, (g) => {
      g.fillStyle(color, 0.25).fillRoundedRect(0, 0, 44, 44, 6);
      g.lineStyle(3, color, 0.9).strokeRoundedRect(2, 2, 40, 40, 6);
      g.fillStyle(color, 0.9);
      symbol(g);
    });
  pad('pad-in', 0x6fbf73, (g) => g.fillRect(19, 10, 6, 12).fillTriangle(12, 22, 32, 22, 22, 34));
  pad('pad-out', 0xe0b84a, (g) => g.fillRect(19, 22, 6, 12).fillTriangle(12, 22, 32, 22, 22, 10));
  pad('pad-up', 0xb48ad8, (g) => {
    g.fillStyle(0xe0b84a).fillCircle(22, 24, 9);
    g.fillStyle(0xb48ad8).fillTriangle(15, 13, 29, 13, 22, 5);
  });
  pad('pad-work', 0x5aa0d8, (g) => {
    // Pestle: a handle leaning into a bowl.
    g.fillRect(24, 8, 5, 18);
    g.fillRect(11, 26, 22, 8);
  });
  bake(scene, 'coin', 12, 12, (g) => {
    g.fillStyle(0xb8862f).fillCircle(6, 6, 6);
    g.fillStyle(0xe8c25a).fillCircle(6, 6, 4);
  });

  for (const [id, def] of Object.entries(ITEMS) as [ItemId, (typeof ITEMS)[ItemId]][]) {
    bake(scene, itemTexture(id), 16, 16, (g) => {
      g.fillStyle(def.color);
      if (id === 'wheat') {
        // Sheaf: stalks tied in the middle with grain heads on top.
        g.fillStyle(0xc9a040).fillRect(4, 6, 2, 10).fillRect(7, 5, 2, 11).fillRect(10, 6, 2, 10);
        g.fillStyle(def.color).fillEllipse(5, 4, 4, 7).fillEllipse(8, 3, 4, 7).fillEllipse(11, 4, 4, 7);
        g.fillStyle(0x8a6239).fillRect(3, 10, 10, 2);
      } else if (def.kind === 'plant') {
        g.fillEllipse(8, 9, 10, 13);
        g.fillStyle(0x3f7a35).fillRect(7, 1, 2, 5);
      } else if (def.kind === 'refined') {
        g.fillStyle(0xd8cfa8).fillRect(1, 9, 14, 6); // little paper sack
        g.fillStyle(def.color).fillTriangle(3, 10, 8, 2, 13, 10);
      } else {
        g.fillStyle(0xcfd8e0).fillRect(6, 1, 4, 5); // neck
        g.fillStyle(def.color).fillCircle(8, 10, 6);
        g.fillStyle(0xffffff, 0.6).fillCircle(6, 8, 2);
      }
    });
  }
}
