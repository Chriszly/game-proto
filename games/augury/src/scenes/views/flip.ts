import { flipTap, type FlipState } from '../../game/puzzles/flip';
import { t } from '../../i18n';
import { C } from '../theme';
import { fitGrid, type PuzzleView } from './types';

export const flipView: PuzzleView<FlipState> = {
  draw(ctx) {
    const { p, s, r } = ctx;
    const n = s.size;
    const { cell, x, y } = fitGrid({ ...r, w: r.w - 140 }, n, n, 64);
    const g = p.g;
    for (let k = 0; k < n * n; k++) {
      const cx = x + (k % n) * cell + cell / 2;
      const cy = y + Math.floor(k / n) * cell + cell / 2;
      const rad = cell * 0.4;
      if (s.lit[k]) {
        g.fillStyle(C.goldBright, 0.18).fillCircle(cx, cy, rad + 5);
        g.fillStyle(C.gold, 1).fillCircle(cx, cy, rad);
        g.fillStyle(C.goldBright, 1).fillCircle(cx - rad * 0.25, cy - rad * 0.25, rad * 0.35);
      } else g.fillStyle(C.deep, 1).fillCircle(cx, cy, rad);
      g.lineStyle(1.5, s.lit[k] ? C.goldBright : C.line, 1).strokeCircle(cx, cy, rad);
      p.hit(`cell-${k}`, cx - cell / 2, cy - cell / 2, cell, cell, () => ctx.act((st) => flipTap(st, k)));
    }
    const sx = r.x + r.w - 70;
    p.text(sx, r.y + r.h / 2 - 40, String(s.lit.filter(Boolean).length), { size: 38, color: C.goldText });
    p.text(sx, r.y + r.h / 2 - 10, t('flipLit'), { size: 13, color: C.inkDim });
    p.text(sx, r.y + r.h / 2 + 34, String(s.taps), { size: 38, color: C.goldText });
    p.text(sx, r.y + r.h / 2 + 64, t('flipTaps'), { size: 13, color: C.inkDim });
  },
};
