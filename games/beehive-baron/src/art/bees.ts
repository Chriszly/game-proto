import Phaser from 'phaser';
import { CARD, WASP_CARD } from './palette';
import { addTexture, circ, cut, rect, sketch, trace } from './paper';

// The paper honeybee and the raiding wasp, both facing right, in two frames: wings raised and
// wings swept down.

/** The bee texture's size; its body's centre is at `cx`, `cy`. */
export const BEE_TEX = { w: 46, h: 40, cx: 20, cy: 25 };
/** The bee is drawn at this scale of the mockup's 2x sizes. */
const K = 0.38;

export function bakeBees(scene: Phaser.Scene) {
  const wings = [
    [[-6, -28, 14, 20], [12, -26, 12, 17]],
    [[-10, -16, 17, 9], [10, -15, 14, 8]],
  ];
  wings.forEach((pair, frame) => {
    const { canvas, ctx } = sketch(BEE_TEX.w, BEE_TEX.h);
    ctx.translate(BEE_TEX.cx, BEE_TEX.cy);
    ctx.scale(K, K);
    cut(ctx, circ(pair[0][0], pair[0][1], pair[0][2], pair[0][3], 20), 'rgba(255,255,255,0.92)', { depth: 4, shadow: 0.2, wob: 1.5 });
    cut(ctx, circ(pair[1][0], pair[1][1], pair[1][2], pair[1][3], 20), 'rgba(235,248,255,0.92)', { depth: 4, shadow: 0.2, wob: 1.5 });
    const body = cut(ctx, circ(0, 0, 30, 19, 30), CARD.bee, { depth: 5, wob: 1.5 });
    for (const sx of [-12, 4]) {
      ctx.save();
      trace(ctx, body);
      ctx.clip();
      cut(ctx, rect(sx, -22, 9, 44), CARD.beeDark, { depth: 0, wob: 1.5 });
      ctx.restore();
    }
    cut(ctx, [[-29, -3], [-42, 1], [-29, 5]], CARD.beeDark, { depth: 2, wob: 0 });
    cut(ctx, circ(34, -1, 12, 12, 18), CARD.beeDark, { depth: 3, wob: 1.5 });
    cut(ctx, circ(38, -4, 3.5, 3.5, 10), '#ffffff', { depth: 0, wob: 0 });
    addTexture(scene, `bee-${frame}`, canvas);
  });
}

/** The wasp texture's size; its waist is at `cx`, `cy`. */
export const WASP_TEX = { w: 60, h: 42, cx: 30, cy: 26 };

/** The wasp: a striped, pointed abdomen behind a narrow waist, a dark thorax, a yellow head and smoky wings. */
export function bakeWasps(scene: Phaser.Scene) {
  const wings = [
    [[-4, -26, 16, 7, -0.5], [8, -24, 14, 6, -0.3]],
    [[-8, -12, 17, 5, -0.15], [6, -12, 15, 5, 0]],
  ];
  wings.forEach((pair, frame) => {
    const { canvas, ctx } = sketch(WASP_TEX.w, WASP_TEX.h);
    ctx.translate(WASP_TEX.cx, WASP_TEX.cy);
    ctx.scale(K, K);
    for (const [x, y, rx, ry, a] of pair) {
      const wing = circ(0, 0, rx * 1.6, ry * 1.6, 20).map(([u, v]): [number, number] => [x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a)]);
      cut(ctx, wing, WASP_CARD.wing, { depth: 4, shadow: 0.2, wob: 1.5 });
    }
    const abdomen = cut(ctx, [...circ(-26, 3, 26, 15, 30).filter(([x]) => x > -44), [-50, 6], [-44, 10]], WASP_CARD.body, { depth: 5, wob: 1.2 });
    for (const sx of [-40, -28, -16]) {
      ctx.save();
      trace(ctx, abdomen);
      ctx.clip();
      cut(ctx, rect(sx, -16, 6, 36), WASP_CARD.dark, { depth: 0, wob: 1.2 });
      ctx.restore();
    }
    cut(ctx, [[-54, 6], [-62, 8], [-54, 10]], WASP_CARD.dark, { depth: 2, wob: 0 });
    cut(ctx, circ(10, -1, 15, 12, 24), WASP_CARD.dark, { depth: 4, wob: 1.2 });
    cut(ctx, circ(8, -6, 5, 3, 12), WASP_CARD.body, { depth: 0, wob: 0 });
    cut(ctx, circ(34, -2, 12, 12, 20), WASP_CARD.body, { depth: 3, wob: 1.2 });
    cut(ctx, circ(38, -5, 6, 7, 14), WASP_CARD.dark, { depth: 0, wob: 0 });
    ctx.save();
    ctx.strokeStyle = WASP_CARD.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, -12);
    ctx.quadraticCurveTo(46, -26, 56, -28);
    ctx.stroke();
    ctx.restore();
    addTexture(scene, `wasp-${frame}`, canvas);
  });
}
