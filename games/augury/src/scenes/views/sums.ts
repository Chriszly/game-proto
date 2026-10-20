import { sumsClashes, sumsEnter, sumsSelect, type SumsState } from '../../game/puzzles/sums';
import { C } from '../theme';
import { numberPad } from './pad';
import { fitGrid, type PuzzleView } from './types';

export const sumsView: PuzzleView<SumsState> = {
  draw(ctx) {
    const { p, s, r } = ctx;
    const g = p.g;
    const n = s.size;
    const padX = numberPad(p, r, 9, (v) => ctx.act((st) => sumsEnter(st, v)), s.selected >= 0);
    const { cell, x, y } = fitGrid({ ...r, w: padX - r.x - 16 }, n, n, 50);
    const bad = sumsClashes(s);
    const small = Math.max(10, Math.round(cell * 0.26));
    for (let k = 0; k < n * n; k++) {
      const cx = x + (k % n) * cell;
      const cy = y + Math.floor(k / n) * cell;
      if (s.open[k]) {
        g.fillStyle(k === s.selected ? 0x2a2a6a : C.deep, 1).fillRect(cx, cy, cell, cell);
        g.lineStyle(1, C.line, 1).strokeRect(cx, cy, cell, cell);
        if (s.values[k]) p.text(cx + cell / 2, cy + cell / 2 + 2, String(s.values[k]), { size: Math.round(cell * 0.5), color: bad.has(k) ? C.roseText : C.ink });
        p.hit(`cell-${k}`, cx, cy, cell, cell, () => {
          sumsSelect(s, k);
          ctx.tap();
          ctx.redraw();
        });
        continue;
      }
      // A clue cell: the sum across in its top right, the sum down in its bottom left.
      g.fillStyle(0x2a1f4c, 1).fillRect(cx, cy, cell, cell);
      g.lineStyle(1, C.gold, 0.6).strokeRect(cx, cy, cell, cell);
      const across = s.across[k];
      const down = s.down[k];
      if (across || down) g.lineStyle(1, C.gold, 0.6).lineBetween(cx, cy, cx + cell, cy + cell);
      if (across) p.text(cx + cell - 4, cy + 3, String(across), { size: small, color: C.goldText, ox: 1, oy: 0 });
      if (down) p.text(cx + 4, cy + cell - 2, String(down), { size: small, color: C.goldText, ox: 0, oy: 1 });
    }
  },
};
