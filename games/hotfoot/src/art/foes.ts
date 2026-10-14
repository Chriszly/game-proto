import Phaser from 'phaser';
import { BAT, GOBLIN, GOLD, INK, IRON, WOOD } from './palette';
import { PixelCanvas } from './pixelArt';

// The things that move on the course: a goblin with a club, walking towards the knight, and a bat
// flapping in at head height. Both face left, towards the knight; GameScene flips a goblin walking
// the other way. Each has two frames.

const S = 2;

/** A goblin, 14x18 art pixels: `goblin-0` and `goblin-1` are the two steps of its walk. */
function goblin(scene: Phaser.Scene) {
  for (const frame of [0, 1]) {
    const c = new PixelCanvas(14, 18);
    // Legs and feet.
    if (frame === 0) c.rect(6, 13, 2, 4, GOBLIN.dark).rect(9, 13, 2, 4, GOBLIN.dark);
    else c.line(6, 13, 4, 16, GOBLIN.dark).line(7, 13, 5, 16, GOBLIN.dark).line(9, 13, 11, 16, GOBLIN.dark).line(10, 13, 12, 16, GOBLIN.dark);
    const feet = frame === 0 ? [5, 9] : [3, 11];
    for (const x of feet) c.rect(x, 17, 3, 1, WOOD.dark);
    // A ragged tunic and belt.
    c.rect(5, 8, 7, 6, WOOD.mid).rect(5, 8, 1, 6, WOOD.light).px(6, 13, WOOD.dark).px(9, 13, WOOD.dark);
    c.rect(5, 11, 7, 1, WOOD.dark).px(8, 11, GOLD.mid);
    // Head with long ears, a big nose and yellow eyes, looking left.
    c.ellipse(4, 1, 8, 7, GOBLIN.mid).rect(5, 1, 5, 1, GOBLIN.light);
    c.line(4, 3, 1, 1, GOBLIN.mid).px(2, 2, GOBLIN.light).line(11, 3, 13, 1, GOBLIN.dark);
    c.rect(3, 4, 2, 2, GOBLIN.mid).px(3, 5, GOBLIN.dark);
    c.px(5, 3, GOLD.light).px(7, 3, GOLD.light).px(5, 4, INK).px(7, 4, INK);
    c.rect(5, 6, 3, 1, GOBLIN.dark).px(6, 6, IRON.shine);
    // An arm raising a club in front.
    const clubY = frame === 0 ? 4 : 5;
    c.line(5, 9, 3, 10, GOBLIN.mid).rect(1, clubY, 2, 7, WOOD.light).rect(0, clubY, 4, 3, WOOD.mid).px(0, clubY, IRON.light);
    c.outline(INK);
    c.bake(scene, `goblin-${frame}`, S);
  }
}

/** A bat, 20x11 art pixels: `bat-0` with its wings up and `bat-1` with them down. */
function bat(scene: Phaser.Scene) {
  for (const frame of [0, 1]) {
    const c = new PixelCanvas(20, 11);
    const tip = frame === 0 ? 0 : 10;
    for (const side of [-1, 1]) {
      const root = side < 0 ? 8 : 11;
      for (let i = 0; i <= 8; i++) {
        const x = root + side * i;
        // The wing's leading edge runs out to the tip; its trailing edge is scalloped.
        const edge = Math.round(4 + ((tip - 4) * i) / 8);
        const back = tip === 0 ? Math.min(6, edge + 2 + (i % 3 === 1 ? 1 : 0)) : Math.max(4, edge - 3);
        c.line(x, Math.min(edge, back), x, Math.max(edge, back), BAT.mid).px(x, edge, BAT.light);
      }
    }
    c.ellipse(7, 2, 6, 7, BAT.dark).px(8, 1, BAT.dark).px(11, 1, BAT.dark).px(8, 0, BAT.mid).px(11, 0, BAT.mid);
    c.px(8, 4, GOLD.light).px(11, 4, GOLD.light).px(9, 6, IRON.shine).px(10, 6, IRON.shine);
    c.outline(INK);
    c.bake(scene, `bat-${frame}`, S);
  }
}

export function bakeFoes(scene: Phaser.Scene) {
  goblin(scene);
  bat(scene);
}
