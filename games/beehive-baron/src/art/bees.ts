import Phaser from 'phaser';
import { CARD } from './palette';
import { addTexture, circ, cut, rect, sketch, trace } from './paper';

// The paper honeybee, facing right, in two frames: wings raised and wings swept down.

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
