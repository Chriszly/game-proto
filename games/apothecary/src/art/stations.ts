import Phaser from 'phaser';
import { INK, WASH, both, ellPts, hatch, ink, paint, rectPts, reseed, rr, shadow, wash, type Ctx, type Pt } from './paint';

// The refining table, the cauldron and the store counter, painted in ink and watercolour. Each is
// kept to the size the layout expects, since each station's lower part is its collision box.

/** A plank-topped workbench with a mortar and pestle and a bundle of herbs. 88x52 as shown. */
function drawTable(c: Ctx) {
  shadow(c, 48, 47, 40, 5, 0.18);
  for (const lx of [6, 76]) both(c, rectPts(lx, 36, 6, 13, 1), WASH.woodDeep, { layers: 2 }, { w: 1 });
  both(c, rectPts(2, 6, 84, 28, 3), WASH.wood, { layers: 3, bloom: 2, cx: 30, cy: 12 }, { w: 1.3 });
  for (const y of [13, 20, 27]) ink(c, [[5, y], [83, y]], { closed: false, w: 0.5, alpha: 0.4 });
  both(c, rectPts(2, 32, 84, 6, 1.5), WASH.woodDark, { layers: 2 }, { w: 1.1 });
  hatch(c, rectPts(2, 32, 84, 6), { gap: 2.5, alpha: 0.3, w: 0.5 });
  // Mortar, with a pestle leaning in it.
  both(c, ellPts(22, 19, 10, 8, 20), '#9aa2aa', { layers: 2 }, { w: 1.1 });
  wash(c, ellPts(22, 17, 6, 4, 16), '#3a3f45', { layers: 2, edge: 0 });
  ink(c, [[23, 17], [32, 4]], { closed: false, w: 2.8, wob: 0.1 });
  // A bundle of herbs on the board.
  c.save();
  c.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    c.strokeStyle = i % 2 ? '#5c9a3c' : '#77b04c';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(48 + i * 5, 26);
    c.quadraticCurveTo(55 + i * 4, 14, 62 + i * 4, 17);
    c.stroke();
    c.strokeStyle = INK;
    c.lineWidth = 0.5;
    c.stroke();
  }
  c.restore();
  both(c, ellPts(76, 21, 3.5, 3, 12), '#efe6cc', { layers: 1 }, { w: 0.7 });
}

/** An iron pot of green brew on a log fire; three frames of flames and bubbles. 72x60 as shown. */
function drawCauldron(c: Ctx, frame: number) {
  const x = 36;
  // Warm light on the ground from the fire.
  const glow = c.createRadialGradient(x, 50, 0, x, 50, 34);
  glow.addColorStop(0, 'rgba(255,170,70,0.35)');
  glow.addColorStop(1, 'rgba(255,170,70,0)');
  c.fillStyle = glow;
  c.fillRect(0, 16, 72, 44);
  // Logs and flames.
  both(c, rectPts(x - 18, 52, 36, 5, 2), WASH.woodDark, { layers: 2 }, { w: 1 });
  const flick = [[0, 2, 1], [2, 0, 2], [1, 1, 0]][frame];
  const flames: [number, number, string][] = [[-10, 13 + flick[0], WASH.flame], [9, 12 + flick[1], WASH.flame], [0, 17 + flick[2], WASH.flameLight], [-2, 9 + flick[0], WASH.flameCore]];
  for (const [dx, h, col] of flames) {
    const pts: Pt[] = [[x + dx - 6, 54], [x + dx - 3.5, 54 - h * 0.5], [x + dx + (frame - 1) * 0.8, 54 - h], [x + dx + 3.5, 54 - h * 0.5], [x + dx + 6, 54]];
    wash(c, pts, col, { layers: 2, spread: 0.5, edge: 0 });
    ink(c, pts, { w: 0.7, alpha: 0.6 });
  }
  // Legs.
  ink(c, [[x - 16, 38], [x - 22, 52]], { closed: false, w: 2.2 });
  ink(c, [[x + 16, 38], [x + 22, 52]], { closed: false, w: 2.2 });
  // The pot's belly, hatched on its shaded side.
  const belly: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI;
    belly.push([x + Math.cos(a) * 29, 19 + Math.sin(a) * 27]);
  }
  wash(c, belly, WASH.iron, { layers: 4, alpha: 1 });
  hatch(c, belly.map(([a, b]) => [a + 7, b] as Pt), { gap: 2.4, alpha: 0.5, col: '#000', w: 0.5 });
  ink(c, belly, { w: 1.4 });
  // A highlight down the lit side.
  ink(c, [[x - 22, 24], [x - 20, 34], [x - 15, 41]], { closed: false, w: 1.2, col: '#8a90a0', alpha: 0.7 });
  // Rim and brew.
  both(c, ellPts(x, 18, 31, 10, 30), WASH.ironRim, { layers: 2 }, { w: 1.3 });
  both(c, ellPts(x, 18, 24, 6.8, 30), WASH.brew, { layers: 3 }, { w: 0.9 });
  reseed(31 + frame * 7);
  c.save();
  c.strokeStyle = INK;
  c.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(x + rr(-15, 15), 18 + rr(-3, 2.5), rr(1.5, 3.2), 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  // Curls of steam.
  for (const dx of [-8, 6]) {
    const pts: Pt[] = [];
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      pts.push([x + dx + Math.sin(t * 7 + frame * 1.4) * 4 * (1 - t * 0.4), 11 - t * 11]);
    }
    ink(c, pts, { closed: false, w: 0.8, alpha: 0.45 });
  }
}

/** A long shop counter: a scrubbed top over panelled front, brass scales at one end and a candle at the other. 200x44 as shown. */
function drawCounter(c: Ctx) {
  shadow(c, 104, 41, 96, 4, 0.18);
  both(c, rectPts(3, 12, 194, 28, 2), '#a86e3e', { layers: 3 }, { w: 1.3 });
  hatch(c, rectPts(3, 12, 194, 28), { gap: 3, alpha: 0.18, w: 0.5 });
  for (let i = 0; i < 7; i++) ink(c, rectPts(9 + i * 27, 18, 22, 17, 1.5), { w: 0.8, alpha: 0.7 });
  both(c, rectPts(1, 7, 198, 9, 3), '#d9a46a', { layers: 3, bloom: 3, cx: 60, cy: 9 }, { w: 1.3 });
  // Brass scales.
  ink(c, [[18, 9], [18, -1 + 4]], { closed: false, w: 1.2 });
  ink(c, [[9, 4], [27, 4]], { closed: false, w: 1.2 });
  for (const sx of [9, 27]) both(c, ellPts(sx, 8, 5, 1.8, 12), '#e0b04a', { layers: 1 }, { w: 0.8 });
  // A candle on a dish, with a warm glow.
  const g = c.createRadialGradient(186, 4, 0, 186, 4, 22);
  g.addColorStop(0, 'rgba(255,200,90,0.45)');
  g.addColorStop(1, 'rgba(255,200,90,0)');
  c.fillStyle = g;
  c.fillRect(160, 0, 40, 30);
  both(c, ellPts(186, 10, 5, 1.8, 12), '#9a7a50', { layers: 1 }, { w: 0.7 });
  both(c, rectPts(184, 0.5, 4, 9), '#fff6e0', { layers: 1 }, { w: 0.7 });
}

/** A wooden pallet, slats on blocks, seen from the front. 36x16 as shown. */
function drawPallet(c: Ctx) {
  both(c, rectPts(2, 2, 32, 9, 1.5), '#b07a46', { layers: 2 }, { w: 1 });
  ink(c, [[3, 6.5], [33, 6.5]], { closed: false, w: 0.6, alpha: 0.6 });
  for (const bx of [3, 15.5, 28]) both(c, rectPts(bx, 10.5, 5, 4), WASH.woodDeep, { layers: 1 }, { w: 0.8 });
}

/** The study's writing desk: an open book of recipes, an inkwell and quill, and a candle. 64x50 as shown. */
function drawStudy(c: Ctx) {
  shadow(c, 32, 46, 28, 4, 0.18);
  for (const lx of [6, 52]) both(c, rectPts(lx, 30, 6, 16, 1), WASH.woodDeep, { layers: 2 }, { w: 1 });
  both(c, rectPts(2, 14, 60, 18, 3), WASH.wood, { layers: 3, bloom: 2, cx: 20, cy: 18 }, { w: 1.3 });
  both(c, rectPts(2, 29, 60, 5, 1.5), WASH.woodDark, { layers: 2 }, { w: 1.1 });
  // The open book, its pages ruled with lines of recipes.
  both(c, [[12, 12], [31, 15], [31, 27], [12, 24]], '#f3ead2', { layers: 1 }, { w: 0.9 });
  both(c, [[31, 15], [50, 12], [50, 24], [31, 27]], '#efe4c8', { layers: 1 }, { w: 0.9 });
  for (let i = 0; i < 3; i++) {
    ink(c, [[15, 16 + i * 3], [28, 18.5 + i * 3]], { closed: false, w: 0.5, alpha: 0.5 });
    ink(c, [[34, 18.5 + i * 3], [47, 16 + i * 3]], { closed: false, w: 0.5, alpha: 0.5 });
  }
  // Inkwell and quill.
  both(c, ellPts(55, 16, 3.5, 3, 12), '#2a2a3a', { layers: 1 }, { w: 0.8 });
  ink(c, [[55, 15], [60, 2]], { closed: false, w: 1.2 });
  both(c, [[59, 1], [62, 4], [58, 9], [57, 6]], '#f4f0e6', { layers: 1 }, { w: 0.6 });
  // A candle with a warm glow.
  const g = c.createRadialGradient(8, 6, 0, 8, 6, 16);
  g.addColorStop(0, 'rgba(255,200,90,0.45)');
  g.addColorStop(1, 'rgba(255,200,90,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 26, 24);
  both(c, ellPts(8, 13, 4, 1.6, 12), '#9a7a50', { layers: 1 }, { w: 0.7 });
  both(c, rectPts(6.5, 4, 3, 9), '#fff6e0', { layers: 1 }, { w: 0.7 });
}

/** A shop shelf for one potion: two boards between side posts, the potions stood on them. 40x46 as shown. */
function drawShelf(c: Ctx) {
  shadow(c, 20, 43, 18, 3, 0.16);
  for (const px of [2, 34]) both(c, rectPts(px, 2, 4, 42, 1), WASH.woodDark, { layers: 2 }, { w: 1 });
  for (const by of [18, 38]) both(c, rectPts(1, by, 38, 4, 1), WASH.wood, { layers: 2 }, { w: 1 });
  both(c, rectPts(1, 1, 38, 3, 1), WASH.wood, { layers: 2 }, { w: 1 });
}

export function bakeStations(scene: Phaser.Scene) {
  paint(scene, 'study', 64, 50, drawStudy, 3);
  paint(scene, 'shelf', 40, 46, drawShelf, 3);
  paint(scene, 'pallet', 36, 16, drawPallet, 3);
  paint(scene, 'table', 88, 52, drawTable, 3);
  for (const frame of [0, 1, 2]) paint(scene, frame === 0 ? 'cauldron' : `cauldron-${frame}`, 72, 60, (c) => drawCauldron(c, frame), 3, 404);
  scene.anims.create({
    key: 'cauldron-boil',
    frames: [{ key: 'cauldron' }, { key: 'cauldron-1' }, { key: 'cauldron-2' }],
    frameRate: 5,
    repeat: -1,
  });
  paint(scene, 'counter', 200, 44, drawCounter, 2);
}
