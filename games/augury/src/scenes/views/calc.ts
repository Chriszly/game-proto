import { cageMet, calcEnter, calcSelect, clashes, type CalcState } from '../../game/puzzles/calc';
import { C } from '../theme';
import { numberPad } from './pad';
import { fitGrid, type PuzzleView } from './types';

const SIGN = { '+': '+', '-': '−', x: '×', '/': '÷', '=': '' } as const;

export const calcView: PuzzleView<CalcState> = {
  draw(ctx) {
    const { p, s, r } = ctx;
    const g = p.g;
    const n = s.size;
    const padX = numberPad(p, r, n, (v) => ctx.act((st) => calcEnter(st, v)), s.selected >= 0);
    const { cell, x, y } = fitGrid({ ...r, w: padX - r.x - 16 }, n, n, 52);
    const bad = clashes(s.values, n);
    for (let k = 0; k < n * n; k++) {
      const cx = x + (k % n) * cell;
      const cy = y + Math.floor(k / n) * cell;
      const cage = s.cages[s.cageOf[k]];
      const met = cageMet(cage, s.values);
      g.fillStyle(k === s.selected ? 0x2a2a6a : met ? 0x16243a : C.deep, 1).fillRect(cx, cy, cell, cell);
      g.lineStyle(1, C.line, 1).strokeRect(cx, cy, cell, cell);
      if (k === Math.min(...cage.cells)) {
        p.text(cx + 4, cy + 3, `${cage.target}${SIGN[cage.op]}`, { size: Math.max(10, Math.round(cell * 0.24)), color: met ? C.cyanText : C.goldText, ox: 0, oy: 0 });
      }
      if (s.values[k]) p.text(cx + cell / 2, cy + cell / 2 + 4, String(s.values[k]), { size: Math.round(cell * 0.48), color: bad.has(k) ? C.roseText : C.ink });
      p.hit(`cell-${k}`, cx, cy, cell, cell, () => {
        calcSelect(s, k);
        ctx.tap();
        ctx.redraw();
      });
    }
    // Thick gold walls between cages.
    g.lineStyle(3, C.gold, 1);
    for (let k = 0; k < n * n; k++) {
      const cx = x + (k % n) * cell;
      const cy = y + Math.floor(k / n) * cell;
      if (k % n < n - 1 && s.cageOf[k] !== s.cageOf[k + 1]) g.lineBetween(cx + cell, cy, cx + cell, cy + cell);
      if (k + n < n * n && s.cageOf[k] !== s.cageOf[k + n]) g.lineBetween(cx, cy + cell, cx + cell, cy + cell);
    }
    g.strokeRect(x, y, n * cell, n * cell);
  },
};
