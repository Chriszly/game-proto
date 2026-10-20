import { lineDone, nonoTap, type NonoState } from '../../game/puzzles/nonogram';
import { C } from '../theme';
import { fitGrid, type PuzzleView, type ViewCtx } from './types';

const CLUE_W = 15;
const CLUE_H = 15;

function geometry({ s, r }: ViewCtx<NonoState>) {
  const rowW = Math.max(...s.rowClues.map((c) => c.length)) * CLUE_W + 10;
  const colH = Math.max(...s.colClues.map((c) => c.length)) * CLUE_H + 8;
  const grid = fitGrid({ x: r.x + rowW, y: r.y + colH, w: r.w - 2 * rowW, h: r.h - colH }, s.size, s.size, 40);
  return { ...grid, rowW, colH };
}

export const nonogramView: PuzzleView<NonoState> = {
  draw(ctx) {
    const { p, s } = ctx;
    const { cell, x, y } = geometry(ctx);
    const g = p.g;
    const n = s.size;
    g.fillStyle(C.deep, 1).fillRect(x, y, cell * n, cell * n);
    for (let i = 0; i < n; i++) {
      const rowOk = lineDone(s, i);
      const colOk = lineDone(s, n + i);
      s.rowClues[i].forEach((v, k, all) =>
        p.text(x - 8 - (all.length - 1 - k) * CLUE_W, y + i * cell + cell / 2, String(v), { size: 14, color: rowOk ? C.cyanText : C.goldText, ox: 1, bold: true }),
      );
      s.colClues[i].forEach((v, k, all) =>
        p.text(x + i * cell + cell / 2, y - 6 - (all.length - 1 - k) * CLUE_H, String(v), { size: 14, color: colOk ? C.cyanText : C.goldText, oy: 1, bold: true }),
      );
    }
    for (let k = 0; k < n * n; k++) {
      const cx = x + (k % n) * cell;
      const cy = y + Math.floor(k / n) * cell;
      const v = s.cells[k];
      if (v === 1) g.fillStyle(C.gold, 1).fillRect(cx + 2, cy + 2, cell - 4, cell - 4);
      if (v === 2) g.fillStyle(C.line, 1).fillCircle(cx + cell / 2, cy + cell / 2, Math.max(2, cell / 10));
      p.hit(`cell-${k}`, cx, cy, cell, cell, () => ctx.act((st) => nonoTap(st, k)));
    }
    // Thin lines between cells, a brighter one every five.
    for (let i = 0; i <= n; i++) {
      const bright = i % 5 === 0 || i === n;
      g.lineStyle(bright ? 1.5 : 1, bright ? C.gold : C.line, bright ? 0.8 : 1);
      g.lineBetween(x + i * cell, y, x + i * cell, y + n * cell).lineBetween(x, y + i * cell, x + n * cell, y + i * cell);
    }
  },
};
