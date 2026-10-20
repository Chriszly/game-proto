import { blockAt, KEY_ROW, slideRange, unjamMove, UNJAM_SIZE, type UnjamState } from '../../game/puzzles/unjam';
import { t } from '../../i18n';
import { C } from '../theme';
import { fitGrid, type PuzzleView, type ViewCtx } from './types';

const N = UNJAM_SIZE;

/** A drag in progress: the block, where the pointer went down and where the block would land. */
let drag: { k: number; x: number; y: number; to: number; moved: boolean } | null = null;
/** The block picked by a tap, which a tap on a free cell in its line then slides there. */
let picked = -1;

function geometry({ r }: ViewCtx<UnjamState>) {
  return fitGrid({ ...r, w: r.w - 140 }, N, N, 50);
}

function cellAt(ctx: ViewCtx<UnjamState>, x: number, y: number) {
  const { cell, x: gx, y: gy } = geometry(ctx);
  const c = Math.floor((x - gx) / cell);
  const r = Math.floor((y - gy) / cell);
  return r >= 0 && c >= 0 && r < N && c < N ? { r, c } : null;
}

export const unjamView: PuzzleView<UnjamState> = {
  draw(ctx) {
    const { p, s, r } = ctx;
    const g = p.g;
    const { cell, x, y } = geometry(ctx);
    p.frame(x - 8, y - 8, N * cell + 16, N * cell + 16, { fill: C.deep, alpha: 1 });
    // The gap in the right wall the key block leaves by.
    g.fillStyle(C.cyan, 1).fillRect(x + N * cell + 6, y + KEY_ROW * cell + 8, 6, cell - 16);
    for (let k = 0; k < N * N; k++) {
      const cx = x + (k % N) * cell;
      const cy = y + Math.floor(k / N) * cell;
      g.lineStyle(1, C.line, 0.6).strokeRect(cx + 2, cy + 2, cell - 4, cell - 4);
      p.hit(`cell-${k}`, cx, cy, cell, cell);
    }
    s.blocks.forEach((b, k) => {
      const at = drag?.k === k ? drag.to : b.across ? b.c : b.r;
      const bx = x + (b.across ? at : b.c) * cell + 4;
      const by = y + (b.across ? b.r : at) * cell + 4;
      const w = (b.across ? b.len : 1) * cell - 8;
      const h = (b.across ? 1 : b.len) * cell - 8;
      const key = k === 0;
      g.fillStyle(key ? C.gold : 0x2f2160, 1).fillRoundedRect(bx, by, w, h, 8);
      g.lineStyle(k === picked ? 3 : 1.5, k === picked ? C.cyan : key ? C.goldBright : C.gold, 1).strokeRoundedRect(bx, by, w, h, 8);
      if (key) p.text(bx + w / 2, by + h / 2, '✦', { size: 22, color: '#2c1f52' });
      p.hit(`block-${k}`, bx, by, w, h);
    });
    const sx = r.x + r.w - 70;
    p.text(sx, r.y + r.h / 2 - 30, String(s.moves), { size: 38, color: C.goldText });
    p.text(sx, r.y + r.h / 2, t('unjamMoves'), { size: 13, color: C.inkDim });
    p.text(sx, r.y + r.h / 2 + 34, t('unjamPar', { n: s.par }), { size: 13, color: C.inkDim });
  },
  down(ctx, x, y) {
    const at = cellAt(ctx, x, y);
    if (!at) return;
    const k = blockAt(ctx.s, at.r, at.c);
    if (k >= 0) {
      const b = ctx.s.blocks[k];
      drag = { k, x, y, to: b.across ? b.c : b.r, moved: false };
      return;
    }
    // A free cell in line with the picked block: slide the block over it.
    const b = ctx.s.blocks[picked];
    if (!b || (b.across ? at.r !== b.r : at.c !== b.c)) return;
    const start = b.across ? b.c : b.r;
    const target = b.across ? at.c : at.r;
    const to = target > start ? target - b.len + 1 : target;
    ctx.act((s) => unjamMove(s, picked, to));
  },
  move(ctx, x, y) {
    if (!drag) return;
    const { cell } = geometry(ctx);
    const b = ctx.s.blocks[drag.k];
    const delta = Math.round(((b.across ? x - drag.x : y - drag.y) / cell));
    const { lo, hi } = slideRange(ctx.s.blocks, drag.k);
    const to = Math.max(lo, Math.min(hi, (b.across ? b.c : b.r) + delta));
    if (to !== drag.to || Math.abs(b.across ? x - drag.x : y - drag.y) > cell / 3) drag.moved = true;
    if (to !== drag.to) {
      drag.to = to;
      ctx.redraw();
    }
  },
  up(ctx) {
    if (!drag) return;
    const { k, to, moved } = drag;
    drag = null;
    if (!moved) {
      picked = picked === k ? -1 : k;
      ctx.tap();
      ctx.redraw();
      return;
    }
    ctx.act((s) => unjamMove(s, k, to));
    ctx.redraw();
  },
};

/** Forgets a drag or pick from an earlier puzzle. */
export function resetUnjam() {
  drag = null;
  picked = -1;
}
