import Phaser from 'phaser';

// The one baked texture: a soft round glow behind each lit lantern. Everything else is drawn with
// Graphics in src/art/lowpoly.ts.

/** A soft round glow, brightest in the middle, laid behind lit lanterns. */
export function bakeGlow(scene: Phaser.Scene) {
  const r = 64;
  const g = scene.add.graphics();
  for (let i = 16; i > 0; i--) g.fillStyle(0xffc860, 0.05).fillCircle(r, r, (r * i) / 16);
  if (scene.textures.exists('glow')) scene.textures.remove('glow');
  g.generateTexture('glow', r * 2, r * 2);
  g.destroy();
}
