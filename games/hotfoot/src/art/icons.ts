import Phaser from 'phaser';
import type { BoonId } from '../game/boons';
import { C, bezant, circle, gold, heartPath, hl, oval, paint, poly, type Ctx } from './ink';

// Small paintings for the boon cards (64x64, in page units of 128 scaled by half) and the hearts in
// the top band, in the same flat colours and ink as the world. Healing is a green cross, never red.

type Draw = (ctx: Ctx) => void;

const heart: Draw = (ctx) => {
  heartPath(ctx, 64, 66, 92);
  ctx.fillStyle = C.verm;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  hl(ctx, [[34, 48], [46, 36]], 5);
};

const ICONS: Record<BoonId, Draw> = {
  heart,
  boots: (ctx) => {
    // A boot with a gold wing at its heel.
    poly(ctx, [[46, 18], [76, 18], [76, 78], [104, 92], [104, 110], [40, 110], [40, 78]], C.wood, 4);
    hl(ctx, [[52, 24], [52, 84]], 3);
    poly(ctx, [[40, 96], [104, 96], [104, 110], [40, 110]], C.woodDark, 4);
    for (const [i, y] of [[0, 34], [1, 50], [2, 66]] as const) poly(ctx, [[46, y], [12 + i * 6, y - 18], [8 + i * 8, y - 4], [46, y + 12]], gold(ctx, 8, y - 18, 46, y + 12), 3);
  },
  double: (ctx) => {
    // Two lapis chevrons pointing up: a leap and a leap again.
    for (const y of [20, 62]) poly(ctx, [[64, y], [104, y + 34], [86, y + 44], [64, y + 26], [42, y + 44], [24, y + 34]], C.lapis, 4);
    hl(ctx, [[34, 52], [62, 28]], 3);
  },
  aegis: (ctx) => {
    // A lapis shield with a gold cross and a gold rim.
    const pts: [number, number][] = [[22, 20], [106, 20], [106, 62], [64, 112], [22, 62]];
    poly(ctx, pts, gold(ctx, 20, 20, 108, 112), 4);
    poly(ctx, [[30, 28], [98, 28], [98, 60], [64, 100], [30, 60]], C.lapis, 3);
    poly(ctx, [[58, 34], [70, 34], [70, 52], [88, 52], [88, 62], [70, 62], [70, 90], [58, 90], [58, 62], [40, 62], [40, 52], [58, 52]], gold(ctx, 40, 34, 88, 90), 2.5);
  },
  magnet: (ctx) => {
    // A horseshoe lodestone with silver tips, drawing in a coin.
    ctx.beginPath();
    ctx.arc(52, 70, 34, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.lineTo(80, 36);
    ctx.lineTo(80, 54);
    ctx.lineTo(52, 54);
    ctx.arc(52, 70, 16, Math.PI * 1.5, Math.PI * 0.5, true);
    ctx.lineTo(80, 86);
    ctx.lineTo(80, 104);
    ctx.closePath();
    ctx.fillStyle = C.madder;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    poly(ctx, [[80, 36], [94, 36], [94, 54], [80, 54]], C.silver, 3);
    poly(ctx, [[80, 86], [94, 86], [94, 104], [80, 104]], C.silver, 3);
    bezant(ctx, 112, 70, 12, 1, 3);
  },
  greed: (ctx) => {
    bezant(ctx, 46, 74, 30, 1, 4);
    bezant(ctx, 82, 50, 30, 1, 4);
  },
  greaves: (ctx) => {
    // A steel greave with a gold knee cop, oiled to a shine.
    poly(ctx, [[42, 20], [86, 20], [80, 100], [48, 100]], C.steel, 4);
    hl(ctx, [[50, 28], [54, 92]], 4);
    circle(ctx, 64, 28, 16, gold(ctx, 48, 12, 80, 44), 4);
    poly(ctx, [[40, 100], [92, 100], [104, 116], [40, 116]], C.iron, 4);
    oval(ctx, 98, 54, 8, 12, C.goldLight, 3);
  },
  cloak: (ctx) => {
    // A madder hooded cloak with a shadowed face and two pale eyes.
    poly(ctx, [[64, 10], [92, 30], [100, 70], [116, 116], [12, 116], [28, 70], [36, 30]], C.madder, 4);
    oval(ctx, 64, 44, 18, 20, C.ink, 0);
    circle(ctx, 57, 44, 3, C.frost, 0);
    circle(ctx, 71, 44, 3, C.frost, 0);
    hl(ctx, [[40, 40], [32, 108]], 3);
  },
  mend: (ctx) => {
    // A rolled linen bandage with a green cross.
    poly(ctx, [[14, 40], [102, 40], [102, 92], [14, 92]], C.vellumLight, 4);
    oval(ctx, 102, 66, 14, 26, C.vellumDark, 4);
    poly(ctx, [[50, 46], [66, 46], [66, 58], [78, 58], [78, 74], [66, 74], [66, 86], [50, 86], [50, 74], [38, 74], [38, 58], [50, 58]], C.heal, 3);
  },
};

export const iconTexture = (id: BoonId) => `icon-${id}`;

export function bakeIcons(scene: Phaser.Scene) {
  for (const [id, draw] of Object.entries(ICONS)) {
    paint(scene, `icon-${id}`, 64, 64, (ctx) => {
      ctx.scale(0.5, 0.5);
      draw(ctx);
    });
  }
  // The hearts in the top band: vermilion when full, bare vellum with hatching when lost.
  for (const full of [true, false]) {
    paint(scene, full ? 'heart-full' : 'heart-empty', 28, 26, (ctx) => {
      heartPath(ctx, 14, 13.5, 24);
      ctx.fillStyle = full ? C.verm : C.vellum;
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (full) {
        hl(ctx, [[7, 9], [10, 6]], 1.6);
      } else {
        ctx.save();
        heartPath(ctx, 14, 13.5, 24);
        ctx.clip();
        ctx.strokeStyle = 'rgba(43,27,18,0.35)';
        ctx.lineWidth = 0.8;
        for (let k = -3; k <= 3; k++) {
          ctx.beginPath();
          ctx.moveTo(14 + k * 4 - 4, 21);
          ctx.lineTo(14 + k * 4 + 4, 5);
          ctx.stroke();
        }
        ctx.restore();
      }
      heartPath(ctx, 14, 13.5, 24);
      ctx.strokeStyle = C.goldDot;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
  }
}
