import Phaser from 'phaser';

// Placeholder art drawn with simple shapes. Swap for real sprites later; keys stay the same.

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}


export function bakePlaceholders(scene: Phaser.Scene) {
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
}
