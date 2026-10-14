import Phaser from 'phaser';
import { C, circle, oval, paint, poly, type Ctx } from './ink';

// The things that move on the course, as marginal grotesques: a green goblin with a pot belly and a
// spiked club, and a bestiary bat with ribbed wings. Both face left, towards the knight; GameScene
// flips a goblin walking the other way. Each has two frames, painted in page units and scaled down.

/** The goblin's texture: 48x54 px, centred on its feet at (24, 51). */
export const GOBLIN_ART = { w: 48, h: 54, feetY: 51 };
const GS = 0.46;

/** A goblin: `goblin-0` and `goblin-1` are the two steps of its walk. */
function goblin(scene: Phaser.Scene) {
  for (const frame of [0, 1]) {
    paint(scene, `goblin-${frame}`, GOBLIN_ART.w, GOBLIN_ART.h, (ctx) => {
      ctx.translate(GOBLIN_ART.w / 2, GOBLIN_ART.feetY);
      ctx.scale(GS, GS);
      draw(ctx, frame);
    });
  }
  function draw(ctx: Ctx, frame: number) {
    const stride = frame ? 6 : -6;
    poly(ctx, [[-14 - stride, 0], [-8, -24], [-1, -24], [-4 - stride, 0]], '#4f7a2e', 2.5);
    poly(ctx, [[3 + stride, 0], [3, -24], [10, -24], [16 + stride, 0]], '#4f7a2e', 2.5);
    oval(ctx, 0, -36, 18, 16, '#c47a3a');
    ctx.strokeStyle = 'rgba(43,27,18,0.6)';
    ctx.lineWidth = 1.5;
    for (const dx of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.moveTo(dx, -48);
      ctx.lineTo(dx + 2, -24);
      ctx.stroke();
    }
    oval(ctx, -4, -62, 16, 14, '#7ab04a', 2.5, -0.2);
    poly(ctx, [[-16, -66], [-40, -80], [-18, -56]], '#8cc25a', 2.5);
    poly(ctx, [[8, -68], [26, -82], [12, -58]], '#6a9a3e', 2.5);
    poly(ctx, [[-18, -62], [-30, -56], [-18, -54]], '#8cc25a', 2);
    circle(ctx, -10, -66, 4, '#fff8e0', 1.5);
    circle(ctx, -11, -66, 1.8, C.ink, 0);
    poly(ctx, [[-16, -52], [-6, -52], [-11, -47]], '#fff8e0', 1.5);
    // The club, raised over its shoulder, bobbing with the step.
    const lift = frame ? 4 : 0;
    poly(ctx, [[10, -40], [16, -42], [30, -84 + lift], [23, -86 + lift]], C.wood, 2.5);
    oval(ctx, 28, -90 + lift, 11, 13, C.wood, 2.5, 0.3);
    for (const [a, b] of [[20, -98], [37, -92], [34, -80]]) poly(ctx, [[a - 3, b + 3 + lift], [a + 5, b - 3 + lift], [a + 2, b + 5 + lift]], C.silver, 1.5);
  }
}

/** The bat's texture: 76x40 px, centred on its body. */
export const BAT_ART = { w: 76, h: 40 };
const BS = 0.45;

/** A bat: `bat-0` with its wings up and `bat-1` with them down. */
function bat(scene: Phaser.Scene) {
  for (const frame of [0, 1]) {
    paint(scene, `bat-${frame}`, BAT_ART.w, BAT_ART.h, (ctx) => {
      ctx.translate(BAT_ART.w / 2, BAT_ART.h / 2 + 2);
      ctx.scale(BS, BS);
      const flip = frame ? -1 : 1;
      const wing = (s: number) => {
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.quadraticCurveTo(s * 30, -34 * flip, s * 78, -12 * flip - (frame ? 14 : 0));
        for (let k = 0; k < 3; k++) {
          const x0 = s * (78 - k * 22);
          const x1 = s * (56 - k * 22);
          ctx.quadraticCurveTo((x0 + x1) / 2, (2 + k * 2) * flip + (frame ? 8 : 0), x1, (14 - k * 2) * (frame ? 0.6 : 1));
        }
        ctx.lineTo(0, 10);
        ctx.closePath();
        ctx.fillStyle = '#5a4a6a';
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.lineWidth = 1.5;
        for (const k of [0, 1, 2]) {
          ctx.beginPath();
          ctx.moveTo(s * 10, -6);
          ctx.lineTo(s * (56 - k * 22 + 22), (8 - k * 4 - (k === 0 ? 18 : 0)) * flip);
          ctx.stroke();
        }
      };
      wing(-1);
      wing(1);
      oval(ctx, 0, 2, 15, 14, '#6a5a7a');
      poly(ctx, [[-11, -6], [-7, -24], [-2, -8]], '#6a5a7a', 2);
      poly(ctx, [[2, -8], [7, -24], [11, -6]], '#6a5a7a', 2);
      circle(ctx, -6, 0, 3, C.goldLight, 1.2);
      circle(ctx, 5, 0, 3, C.goldLight, 1.2);
      poly(ctx, [[-5, 8], [-3, 13], [-1, 8]], '#fff8e0', 1);
      poly(ctx, [[1, 8], [3, 13], [5, 8]], '#fff8e0', 1);
    });
  }
}

export function bakeFoes(scene: Phaser.Scene) {
  goblin(scene);
  bat(scene);
}
