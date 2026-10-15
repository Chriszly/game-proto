import Phaser from 'phaser';
import { C, circle, gold, hl, oval, paint, poly, type Ctx } from './ink';

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

/** The Gatekeeper's texture: 100x104 px, centred on its feet at (50, 100). Its helm is 86 px up, where a stomp lands (`BOSS.h`). */
export const GATE_ART = { w: 100, h: 104, feetY: 100 };
const SKIN = '#9aa87a';

/**
 * The Gatekeeper, a great ogre in a pot helm and a madder tabard with the gate's gold key at its
 * belt: `gate-ready` with an axe raised over its shoulder, `gate-throw` with its arm flung forward,
 * and `gate-tired` slumped and panting.
 */
function gatekeeper(scene: Phaser.Scene) {
  for (const pose of ['ready', 'throw', 'tired'] as const) {
    paint(scene, `gate-${pose}`, GATE_ART.w, GATE_ART.h, (ctx) => {
      ctx.translate(GATE_ART.w / 2, GATE_ART.feetY);
      ctx.scale(0.43, 0.43);
      draw(ctx, pose);
    });
  }
  function arm(ctx: Ctx, from: [number, number], to: [number, number]) {
    const [x0, y0] = from;
    const [x1, y1] = to;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = ((y1 - y0) / len) * 11;
    const ny = (-(x1 - x0) / len) * 11;
    poly(ctx, [[x0 + nx, y0 + ny], [x1 + nx * 0.8, y1 + ny * 0.8], [x1 - nx * 0.8, y1 - ny * 0.8], [x0 - nx, y0 - ny]], SKIN, 2.5);
    circle(ctx, x1, y1, 11, SKIN, 2.5);
  }
  function axe(ctx: Ctx, x: number, y: number) {
    poly(ctx, [[x - 3, y + 26], [x + 3, y + 26], [x + 3, y - 30], [x - 3, y - 30]], C.wood, 2.5);
    poly(ctx, [[x - 3, y - 30], [x - 26, y - 44], [x - 22, y - 20], [x - 3, y - 18]], C.steel, 2.5);
    hl(ctx, [[x - 20, y - 38], [x - 18, y - 24]], 2);
  }
  function draw(ctx: Ctx, pose: 'ready' | 'throw' | 'tired') {
    const tired = pose === 'tired';
    const droop = tired ? 12 : 0;
    // The back arm, behind the body: raised with an axe, or hanging.
    if (pose === 'ready') {
      arm(ctx, [36, -128], [64, -178]);
      axe(ctx, 64, -178);
    } else arm(ctx, [38, -124], [54, -66 + droop / 2]);
    // Legs in iron greaves and heavy boots.
    poly(ctx, [[-38, -8], [-34, -62], [-8, -62], [-12, -8]], C.iron, 2.5);
    poly(ctx, [[12, -8], [8, -62], [34, -62], [38, -8]], C.iron, 2.5);
    hl(ctx, [[-30, -54], [-32, -14]], 2);
    oval(ctx, -28, -6, 22, 10, C.woodDark);
    oval(ctx, 26, -6, 22, 10, C.woodDark);
    // The belly in a madder tabard, hemmed in gold.
    oval(ctx, 0, -104 + droop / 2, 58, 52, C.madder, 3);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -104 + droop / 2, 58, 52, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 4;
    for (const x of [-30, 30]) {
      ctx.beginPath();
      ctx.moveTo(x, -170);
      ctx.lineTo(x, -40);
      ctx.stroke();
    }
    ctx.restore();
    hl(ctx, [[-44, -126 + droop], [-50, -96 + droop]], 2.5);
    // The belt, its gold buckle, and the gate's key hanging from it.
    poly(ctx, [[-56, -84 + droop / 2], [56, -84 + droop / 2], [54, -70 + droop / 2], [-54, -70 + droop / 2]], C.woodDark, 2.5);
    poly(ctx, [[-10, -88 + droop / 2], [8, -88 + droop / 2], [8, -66 + droop / 2], [-10, -66 + droop / 2]], gold(ctx, -10, -88, 8, -66), 2);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(32, -70 + droop / 2);
    ctx.lineTo(32, -30);
    ctx.lineTo(42, -30);
    ctx.moveTo(32, -40);
    ctx.lineTo(40, -40);
    ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    circle(ctx, 32, -62 + droop / 2, 7, null, 0);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    // The front arm: hanging, or flung forward after a throw.
    if (pose === 'throw') arm(ctx, [-40, -132], [-100, -138]);
    else arm(ctx, [-42, -126 + droop / 2], [-62, -66 + droop]);
    // The head: a green ogre with tusks, under a steel pot helm with a gold rim and crest.
    const hy = -160 + droop;
    oval(ctx, -10, hy, 36, 30, SKIN, 3);
    poly(ctx, [[-40, hy + 8], [-36, hy + 30], [14, hy + 30], [18, hy + 8]], SKIN, 2.5);
    if (tired) {
      oval(ctx, -26, hy + 30, 7, 10, C.rose, 2);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.5;
      for (const x of [-30, -8]) {
        ctx.beginPath();
        ctx.arc(x, hy - 2, 6, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
      for (const [x, y] of [[20, hy - 24], [28, hy - 8]] as const) oval(ctx, x, y, 3.5, 6, C.frost, 1.5);
    } else {
      circle(ctx, -30, hy - 2, 5, C.goldLight, 2);
      circle(ctx, -8, hy - 2, 5, C.goldLight, 2);
      circle(ctx, -31, hy - 2, 2, C.ink, 0);
      circle(ctx, -9, hy - 2, 2, C.ink, 0);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-40, hy - 12);
      ctx.lineTo(-18, hy - 7);
      ctx.lineTo(2, hy - 12);
      ctx.stroke();
    }
    poly(ctx, [[-34, hy + 18], [-30, hy + 6], [-26, hy + 18]], '#fff8e0', 1.5);
    poly(ctx, [[-2, hy + 18], [2, hy + 6], [6, hy + 18]], '#fff8e0', 1.5);
    ctx.beginPath();
    ctx.moveTo(-50, hy - 10);
    ctx.bezierCurveTo(-48, hy - 50, 30, hy - 50, 30, hy - 10);
    ctx.closePath();
    ctx.fillStyle = C.steel;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    hl(ctx, [[-38, hy - 18], [-28, hy - 36]], 2.5);
    poly(ctx, [[-54, hy - 14], [34, hy - 14], [34, hy - 6], [-54, hy - 6]], gold(ctx, -54, hy - 14, 34, hy - 6), 2);
    poly(ctx, [[-14, hy - 40], [-10, hy - 58], [-6, hy - 40]], gold(ctx, -14, hy - 58, -6, hy - 40), 2);
  }
}

/** A barrel the Gatekeeper rolls down the road, seen end on so its roll shows: 28x28 px, centred. */
function barrel(scene: Phaser.Scene) {
  paint(scene, 'barrel', 28, 28, (ctx) => {
    ctx.scale(0.5, 0.5);
    circle(ctx, 28, 28, 25, C.wood, 3);
    circle(ctx, 28, 28, 18, null, 0);
    ctx.strokeStyle = C.iron;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(28 + Math.cos(a) * 16, 28 + Math.sin(a) * 16);
      ctx.lineTo(28 - Math.cos(a) * 16, 28 - Math.sin(a) * 16);
      ctx.stroke();
    }
    circle(ctx, 28, 28, 5, C.iron, 2);
    hl(ctx, [[12, 18], [18, 10]], 2.5);
  });
}

/** An axe the Gatekeeper throws at head height: 32x32 px, centred, spun as it flies. */
function thrownAxe(scene: Phaser.Scene) {
  paint(scene, 'axe', 32, 32, (ctx) => {
    ctx.scale(0.5, 0.5);
    poly(ctx, [[30, 56], [36, 56], [36, 10], [30, 10]], C.wood, 2.5);
    poly(ctx, [[36, 12], [58, 4], [60, 32], [36, 26]], C.steel, 2.5);
    hl(ctx, [[52, 10], [54, 26]], 2);
    poly(ctx, [[30, 14], [16, 10], [20, 22], [30, 22]], C.iron, 2);
  });
}

export function bakeFoes(scene: Phaser.Scene) {
  goblin(scene);
  bat(scene);
  gatekeeper(scene);
  barrel(scene);
  thrownAxe(scene);
}
