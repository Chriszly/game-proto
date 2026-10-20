import { endAt, joined, linkEnd, linkMove, linkStart, pathAt, type LinkState } from '../../game/puzzles/link';
import { trace } from '../glyphs';
import { C, PALETTE } from '../theme';
import { fitGrid, type PuzzleView, type ViewCtx } from './types';

function geometry({ s, r }: ViewCtx<LinkState>) {
  return fitGrid(r, s.size, s.size, 52);
}

function cellAt(ctx: ViewCtx<LinkState>, x: number, y: number) {
  const { cell, x: gx, y: gy } = geometry(ctx);
  const c = Math.floor((x - gx) / cell);
  const r = Math.floor((y - gy) / cell);
  const n = ctx.s.size;
  return r >= 0 && c >= 0 && r < n && c < n ? r * n + c : -1;
}

export const linkView: PuzzleView<LinkState> = {
  draw(ctx) {
    const { p, s } = ctx;
    const g = p.g;
    const n = s.size;
    const { cell, x, y } = geometry(ctx);
    const mid = (k: number) => ({ x: x + (k % n) * cell + cell / 2, y: y + Math.floor(k / n) * cell + cell / 2 });
    g.fillStyle(C.deep, 1).fillRect(x, y, n * cell, n * cell);
    for (let k = 0; k < n * n; k++) {
      const owner = pathAt(s, k);
      if (owner >= 0) g.fillStyle(PALETTE[owner % PALETTE.length], 0.16).fillRect(x + (k % n) * cell, y + Math.floor(k / n) * cell, cell, cell);
      p.hit(`cell-${k}`, x + (k % n) * cell, y + Math.floor(k / n) * cell, cell, cell);
    }
    for (let i = 0; i <= n; i++) {
      g.lineStyle(1, C.line, 1).lineBetween(x + i * cell, y, x + i * cell, y + n * cell).lineBetween(x, y + i * cell, x + n * cell, y + i * cell);
    }
    s.paths.forEach((path, k) => {
      if (path.length < 2) return;
      g.lineStyle(Math.max(4, cell * 0.28), PALETTE[k % PALETTE.length], joined(s, k) ? 1 : 0.75).beginPath();
      path.forEach((c, i) => (i ? g.lineTo(mid(c).x, mid(c).y) : g.moveTo(mid(c).x, mid(c).y)));
      g.strokePath();
      for (const c of path) g.fillStyle(PALETTE[k % PALETTE.length], 1).fillCircle(mid(c).x, mid(c).y, Math.max(2, cell * 0.14));
    });
    s.ends.forEach((pair, k) => {
      for (const c of pair) {
        const m = mid(c);
        const color = PALETTE[k % PALETTE.length];
        g.fillStyle(color, 1).fillCircle(m.x, m.y, cell * 0.32);
        g.lineStyle(2, joined(s, k) ? 0xffffff : C.deep, joined(s, k) ? 0.9 : 0.6).strokeCircle(m.x, m.y, cell * 0.32);
        // A four-pointed star on each end.
        const r = cell * 0.2;
        trace(g, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: m.x + Math.cos((i * Math.PI) / 4 - Math.PI / 2) * (i % 2 ? r * 0.35 : r), y: m.y + Math.sin((i * Math.PI) / 4 - Math.PI / 2) * (i % 2 ? r * 0.35 : r) }))).fillStyle(C.deep, 0.85).fillPath();
      }
    });
    p.g.lineStyle(1.5, C.gold, 1).strokeRect(x - 1, y - 1, n * cell + 2, n * cell + 2);
  },
  down(ctx, x, y) {
    const cell = cellAt(ctx, x, y);
    if (cell < 0) return;
    if (endAt(ctx.s, cell) < 0 && pathAt(ctx.s, cell) < 0) return;
    ctx.act((s) => linkStart(s, cell));
    ctx.redraw();
  },
  move(ctx, x, y) {
    if (ctx.s.drawing < 0) return;
    const cell = cellAt(ctx, x, y);
    if (cell >= 0) ctx.act((s) => linkMove(s, cell));
  },
  up(ctx) {
    linkEnd(ctx.s);
  },
};
