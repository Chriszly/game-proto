import Phaser from 'phaser';

// Placeholder art drawn with simple shapes. Swap for real sprites later; keys stay the same.

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}


export function bakePlaceholders(scene: Phaser.Scene) {
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
