import Phaser from 'phaser';
import type { PlantId } from '../game/items';
import { INK, WASH, both, ellPts, hatch, ink, paint, rectPts, rr, shadow, wash, type Ctx, type Pt } from './paint';

// Garden beds and the plants growing in them, in ink and watercolour.

export const plantTexture = (plant: PlantId, stage: number) => `plant-${plant}-${stage}`;

/** A raised bed: dark tilled furrows inside a plank edging. 56x44 as shown. */
function drawPlot(c: Ctx) {
  shadow(c, 31, 40, 25, 4, 0.16);
  both(c, rectPts(2, 2, 52, 38, 4), WASH.wood, { layers: 2 }, { w: 1.2 });
  both(c, rectPts(6, 6, 44, 30, 2), '#8a6040', { layers: 3 }, { w: 0.9 });
  for (let y = 11; y < 36; y += 6) {
    ink(c, [[8, y], [48, y]], { closed: false, w: 0.6, alpha: 0.55 });
  }
  hatch(c, rectPts(6, 6, 44, 6), { gap: 2.5, alpha: 0.3, w: 0.5 });
  c.save();
  for (let i = 0; i < 18; i++) {
    c.fillStyle = 'rgba(42,29,20,0.35)';
    c.beginPath();
    c.arc(rr(8, 48), rr(8, 34), rr(0.4, 0.9), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** Six stalks across the bed: green shoots, then tall green stalks, then golden ears. 48x44 as shown. */
function drawWheat(c: Ctx, stage: number) {
  const height = [7, 22, 34][stage];
  const ripe = stage === 2;
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 7.6 + rr(-1, 1);
    const h = height - (i % 2) * (stage === 0 ? 2 : 4);
    const top = 43 - h;
    const lean = rr(-2, 2) + 1.5;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = ripe ? '#c9a040' : '#77b04c';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x, 43);
    c.quadraticCurveTo(x, top + h * 0.4, x + lean, top + 4);
    c.stroke();
    c.strokeStyle = INK;
    c.lineWidth = 0.45;
    c.globalAlpha = 0.7;
    c.stroke();
    c.restore();
    if (stage > 0) {
      // A leaf off each stalk.
      const leaf: Pt[] = [[x, top + h * 0.6], [x + 5, top + h * 0.45], [x + 1, top + h * 0.52]];
      both(c, leaf, ripe ? '#b7a040' : '#77b04c', { layers: 1, edge: 0 }, { w: 0.5 });
    }
    if (ripe) {
      // An ear of grain, nodding a little.
      both(c, ellPts(x + lean, top + 3, 2.6, 5.5, 14), '#e6c04a', { layers: 2, edge: 0 }, { w: 0.7 });
      for (let k = -1; k <= 1; k++) ink(c, [[x + lean - 2, top + 3 + k * 2.5], [x + lean + 2, top + 2 + k * 2.5]], { closed: false, w: 0.4, alpha: 0.6 });
    } else {
      both(c, ellPts(x + lean, top + 3, 1.6, 3, 10), '#8cc35a', { layers: 1, edge: 0 }, { w: 0.5 });
    }
  }
}

/** A leafy rosette that grows, flowers, and finally shows the root's face poking out. 40x40 as shown. */
function drawMandrake(c: Ctx, stage: number) {
  const x = 20, y = 39;
  const size = [7, 13, 16][stage];
  if (stage === 2) {
    // The root's grumpy face, peeking out of the soil.
    both(c, ellPts(x, y - 4, 8, 5.5, 18), '#b07a4a', { layers: 2 }, { w: 1 });
    c.fillStyle = INK;
    c.fillRect(x - 4, y - 6, 1.6, 1.6);
    c.fillRect(x + 2.4, y - 6, 1.6, 1.6);
    c.fillRect(x - 1.5, y - 2.5, 3, 0.9);
  }
  const leaves = stage === 0 ? [-0.4, 0.4] : [-1.1, -0.55, 0, 0.55, 1.1];
  for (const a of leaves) {
    const tipX = x + Math.sin(a) * size, tipY = y - 6 - Math.cos(a) * size;
    const nx = Math.cos(a) * 3.2, ny = Math.sin(a) * 3.2;
    const mid = [(x + tipX) / 2, (y - 6 + tipY) / 2];
    const leaf: Pt[] = [[x, y - 6], [mid[0] + nx, mid[1] + ny], [tipX, tipY], [mid[0] - nx, mid[1] - ny]];
    both(c, leaf, a < 0 ? '#5c9a3c' : '#77b04c', { layers: 2, edge: 0 }, { w: 0.7 });
    ink(c, [[x, y - 6], [tipX, tipY]], { closed: false, w: 0.4, alpha: 0.5 });
  }
  if (stage >= 1) {
    // Small violet flowers among the leaves.
    for (const [dx, dy] of [[-5, -18], [6, -16], [0, -21]].slice(0, stage === 1 ? 1 : 3)) {
      wash(c, ellPts(x + dx, y + dy, 2.2, 2.2, 10), '#8a7ad8', { layers: 1, edge: 0 });
      ink(c, ellPts(x + dx, y + dy, 2.2, 2.2, 10), { w: 0.5 });
    }
  }
}

/**
 * A shade-loving bush: a few dark leaves, then violet star flowers, and once ripe glossy black-violet
 * berries hanging in clusters. 40x40 as shown.
 */
function drawNightshade(c: Ctx, stage: number) {
  const x = 20, y = 39;
  const size = [8, 14, 17][stage];
  const leaves = stage === 0 ? [-0.5, 0.5] : [-1.2, -0.6, 0, 0.6, 1.2];
  for (const a of leaves) {
    const tipX = x + Math.sin(a) * size, tipY = y - 4 - Math.cos(a) * size;
    const nx = Math.cos(a) * 3.6, ny = Math.sin(a) * 3.6;
    const mid = [(x + tipX) / 2, (y - 4 + tipY) / 2];
    const leaf: Pt[] = [[x, y - 4], [mid[0] + nx, mid[1] + ny], [tipX, tipY], [mid[0] - nx, mid[1] - ny]];
    both(c, leaf, a < 0 ? '#3f7a34' : '#4f8a3a', { layers: 2, edge: 0 }, { w: 0.7 });
    ink(c, [[x, y - 4], [tipX, tipY]], { closed: false, w: 0.4, alpha: 0.5 });
  }
  if (stage === 1) {
    // Star flowers, violet with yellow hearts.
    for (const [dx, dy] of [[-6, -15], [5, -18]]) {
      wash(c, ellPts(x + dx, y + dy, 2.6, 2.6, 5), '#9a7ad8', { layers: 1, edge: 0 });
      ink(c, ellPts(x + dx, y + dy, 2.6, 2.6, 5), { w: 0.5 });
      c.fillStyle = '#e8c04a';
      c.fillRect(x + dx - 0.6, y + dy - 0.6, 1.2, 1.2);
    }
  }
  if (stage === 2) {
    for (const [dx, dy] of [[-7, -12], [-4, -9], [-9, -8], [6, -15], [9, -11], [4, -11], [0, -20], [2, -17]]) {
      both(c, ellPts(x + dx, y + dy, 2.3, 2.3, 10), '#3a2050', { layers: 2, edge: 0 }, { w: 0.5 });
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.fillRect(x + dx - 1, y + dy - 1, 0.9, 0.9);
    }
  }
}

export function bakeGarden(scene: Phaser.Scene) {
  paint(scene, 'plot', 56, 44, drawPlot, 2);
  for (const stage of [0, 1, 2]) {
    paint(scene, plantTexture('wheat', stage), 48, 44, (c) => drawWheat(c, stage), 3, 51);
    paint(scene, plantTexture('mandrake', stage), 40, 40, (c) => drawMandrake(c, stage), 3, 61);
    paint(scene, plantTexture('nightshade', stage), 40, 40, (c) => drawNightshade(c, stage), 3, 71);
  }
}
