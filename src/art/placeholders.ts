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
    bake(scene, plantTexture('sage', stage), 40, 40, (g) => {
      const r = 6 + stage * 5;
      g.fillStyle(0x5d8f4a).fillCircle(20, 40 - r, r);
      g.fillStyle(0x7fae6a).fillCircle(20 - r / 2, 40 - r * 1.2, r * 0.6);
      if (stage === 2) {
        g.fillStyle(0xb48ad8);
        for (const [x, y] of [[12, 12], [26, 9], [20, 18], [30, 20]]) g.fillCircle(x, y, 3);
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

  for (const [id, def] of Object.entries(ITEMS) as [ItemId, (typeof ITEMS)[ItemId]][]) {
    bake(scene, itemTexture(id), 16, 16, (g) => {
      g.fillStyle(def.color);
      if (def.kind === 'plant') {
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
