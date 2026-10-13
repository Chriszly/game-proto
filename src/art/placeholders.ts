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
}
