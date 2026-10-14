import Phaser from 'phaser';
import { INK, both, ink, paint, pathOf, rectPts, type Ctx } from './paint';

// Floor markers: an inked tile washed in its marker's colour, with a white symbol. 44x44 as shown.

/** Marker colours, one per kind of marker. */
export const MARKER = { drop: '#6fb85e', pickUp: '#e9be48', work: '#6aa6dc', upgrade: '#a77fd8' };

type Symbol = 'drop' | 'pickUp' | 'work' | 'upgrade';

function symbol(c: Ctx, kind: Symbol) {
  const x = 22, y = 21;
  c.save();
  c.fillStyle = '#fffaf0';
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (kind === 'work') {
    // Mortar and pestle: stand here to work.
    c.lineWidth = 3.6;
    c.beginPath();
    c.moveTo(x + 2, y - 3);
    c.lineTo(x + 8, y - 11);
    c.stroke();
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(x - 10, y - 2);
    c.lineTo(x + 10, y - 2);
    c.quadraticCurveTo(x + 8, y + 9, x, y + 9);
    c.quadraticCurveTo(x - 8, y + 9, x - 10, y - 2);
    c.closePath();
    c.fill();
    c.stroke();
  } else {
    // An arrow: down to drop things off, up to pick them up or to pay towards an upgrade.
    const d = kind === 'drop' ? 1 : -1;
    pathOf(c, [[x - 4, y - 9 * d], [x + 4, y - 9 * d], [x + 4, y], [x + 9, y], [x, y + 9 * d], [x - 9, y], [x - 4, y]]);
    c.fill();
    c.stroke();
  }
  c.restore();
}

function drawPad(c: Ctx, color: string, kind: Symbol) {
  // Its shadow, down and right, then the tile.
  c.save();
  c.fillStyle = 'rgba(42,29,20,0.2)';
  pathOf(c, rectPts(5, 6, 36, 36, 6));
  c.fill();
  c.restore();
  both(c, rectPts(3, 3, 36, 36, 6), color, { layers: 3, spread: 0.8, bloom: 2, cx: 14, cy: 12 }, { w: 1.3 });
  ink(c, rectPts(6, 6, 30, 30, 4), { w: 0.5, alpha: 0.35 });
  symbol(c, kind);
}

export function bakeMarkers(scene: Phaser.Scene) {
  paint(scene, 'pad-in', 44, 44, (c) => drawPad(c, MARKER.drop, 'drop'), 3);
  paint(scene, 'pad-out', 44, 44, (c) => drawPad(c, MARKER.pickUp, 'pickUp'), 3);
  paint(scene, 'pad-work', 44, 44, (c) => drawPad(c, MARKER.work, 'work'), 3);
  paint(scene, 'pad-up', 44, 44, (c) => drawPad(c, MARKER.upgrade, 'upgrade'), 3);
}
