import Phaser from 'phaser';
import type { Terrain } from '../game/terrain';
import type { UpgradeId } from '../game/upgrades';
import { TINT } from './map';
import { BLUE, BROWN, GOLD, GOLD_DARK, INK, MAGENTA, SHEET, TREE, bake, circle, poly, rrect, star, type Ctx } from './paint';

/** Upgrade icons: clean line symbols in ink with a magenta mark, 24 px, baked as `icon-<id>`. */
const UPGRADE_ICONS: Record<UpgradeId, (ctx: Ctx) => void> = {
  // A provisions crate.
  provisions: (ctx) => {
    ctx.fillStyle = '#efe3c4';
    ctx.fillRect(4, 7, 16, 13);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 7, 16, 13);
    ctx.beginPath();
    ctx.moveTo(4, 7);
    ctx.lineTo(20, 20);
    ctx.moveTo(4, 12);
    ctx.lineTo(20, 12);
    ctx.stroke();
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(9, 3, 6, 4);
  },
  // A spyglass, drawn out.
  spyglass: (ctx) => {
    ctx.save();
    ctx.translate(12, 12);
    ctx.rotate(-0.6);
    ctx.fillStyle = INK;
    ctx.fillRect(-10, -2, 8, 4);
    ctx.fillStyle = '#5b6670';
    ctx.fillRect(-3, -3, 7, 6);
    ctx.fillStyle = INK;
    ctx.fillRect(4, -4, 6, 8);
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(9, -3, 2, 6);
    ctx.restore();
  },
  // An ink bottle and a drafting pen.
  ink: (ctx) => {
    rrect(ctx, 5, 10, 11, 10, 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = '#5b6670';
    ctx.fillRect(8, 7, 5, 3);
    ctx.strokeStyle = MAGENTA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 14);
    ctx.lineTo(20, 4);
    ctx.stroke();
  },
  // A lodestone compass: a gold rose in a ring.
  compass: (ctx) => {
    circle(ctx, 12, 12, 9, SHEET, INK, 1.5);
    star(ctx, 12, 12, 7.5, 2, 4, GOLD, GOLD_DARK, 0.8);
    circle(ctx, 12, 12, 1.2, INK);
  },
};

/** A tile's flat tint with its map symbol, for chart rows and the commission. */
function swatch(ctx: Ctx, t: Terrain) {
  ctx.fillStyle = t === 'village' || t === 'port' || t === 'ruins' ? '#dcebc8' : TINT[t];
  ctx.fillRect(0, 0, 16, 16);
  ctx.strokeStyle = 'rgba(29,35,41,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, 15, 15);
  if (t === 'forest') {
    for (const [x, y] of [[5, 5], [11, 6], [6, 11], [11, 11]]) {
      circle(ctx, x, y, 2.4, 'rgba(255,255,255,0.4)', TREE, 0.9);
    }
  } else if (t === 'hills') {
    ctx.strokeStyle = BROWN;
    ctx.lineWidth = 1;
    for (const r of [2.5, 5]) {
      ctx.beginPath();
      ctx.ellipse(8, 9, r * 1.3, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (t === 'mountain') {
    poly(ctx, [[8, 3], [13, 12], [3, 12]], INK);
  } else if (t === 'village') {
    ctx.fillStyle = INK;
    ctx.fillRect(3, 4, 4, 3);
    ctx.fillRect(9, 3, 4, 4);
    ctx.fillRect(4, 9, 5, 3);
    ctx.fillRect(10, 10, 3, 3);
  } else if (t === 'ruins') {
    ctx.strokeStyle = INK;
    ctx.setLineDash([2, 1.5]);
    ctx.strokeRect(3, 4, 10, 8);
    ctx.setLineDash([]);
    circle(ctx, 6, 7, 1.2, INK);
    circle(ctx, 10, 9, 1.2, INK);
  } else if (t === 'beach') {
    ctx.fillStyle = 'rgba(160,120,60,0.7)';
    for (const [x, y] of [[3, 4], [8, 3], [12, 6], [5, 9], [10, 11], [4, 13], [13, 13]]) ctx.fillRect(x, y, 1.2, 1.2);
  } else if (t === 'sea') {
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1;
    for (const y of [6, 11]) {
      ctx.beginPath();
      ctx.moveTo(3, y);
      ctx.quadraticCurveTo(5.5, y - 2, 8, y);
      ctx.quadraticCurveTo(10.5, y + 2, 13, y);
      ctx.stroke();
    }
  } else if (t === 'port') {
    ctx.fillStyle = INK;
    ctx.fillRect(7, 2, 2, 12);
  }
}

export function bakeIcons(scene: Phaser.Scene) {
  for (const [id, draw] of Object.entries(UPGRADE_ICONS)) bake(scene, `icon-${id}`, 24, 24, draw);
  for (const t of Object.keys(TINT) as Terrain[]) bake(scene, `swatch-${t}`, 16, 16, (ctx) => swatch(ctx, t));
  // The Lodestone Compass's mark for a landmark under the fog: a gold rose in a thin ring.
  bake(scene, 'landmark-hint', 26, 26, (ctx) => {
    circle(ctx, 13, 13, 11, null, '#c08a1e', 0.8);
    star(ctx, 13, 13, 9, 2.5, 4, GOLD, GOLD_DARK, 0.8);
  });
  // The sheet's mark: a survey station in a ring.
  bake(scene, 'logo', 22, 22, (ctx) => {
    circle(ctx, 11, 11, 9.5, null, MAGENTA, 1.6);
    poly(ctx, [[11, 4], [17, 14.5], [5, 14.5]], null, MAGENTA, 1.6);
  });
  // An atlas: a bound book with a station on its cover.
  for (const filled of [true, false]) {
    bake(scene, filled ? 'atlas' : 'atlas-empty', 16, 16, (ctx) => {
      const c = filled ? INK : '#b9c0c6';
      ctx.fillStyle = c;
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = filled ? SHEET : '#eef0f1';
      ctx.fillRect(4, 12, 10, 1.5);
      ctx.fillStyle = filled ? MAGENTA : '#d6dadd';
      ctx.fillRect(2, 2, 2, 12);
      poly(ctx, [[9, 4.5], [12, 9.5], [6, 9.5]], null, SHEET, 1);
    });
  }
}
