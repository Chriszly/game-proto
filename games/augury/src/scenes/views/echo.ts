import { ECHO_PASS, echoAnswer, echoScore, isSame, type EchoState } from '../../game/puzzles/echo';
import { t } from '../../i18n';
import { drawGlyph } from '../glyphs';
import { C } from '../theme';
import type { PuzzleView } from './types';

export const echoView: PuzzleView<EchoState> = {
  draw(ctx) {
    const { p, s, r } = ctx;
    const g = p.g;
    const cx = r.x + r.w / 2;
    const cw = 120;
    const ch = 170;
    const top = r.y + 6;
    const step = Math.min(s.step, s.seq.length - 1);
    // The card on show, with a thin bar for the time it stays up.
    p.frame(cx - cw / 2, top, cw, ch, { fill: C.deep, alpha: 1 });
    if (!s.done) drawGlyph(g, s.seq[step], cx, top + ch / 2, 70);
    g.fillStyle(C.cyan, 0.8).fillRect(cx - cw / 2, top + ch + 4, cw * (1 - s.ms / s.stepMs), 3);
    // The steps as dots: answered right (cyan), wrong (rose), still to come (dim).
    const dotsY = top + ch + 22;
    const n = s.seq.length;
    for (let i = 0; i < n; i++) {
      const dx = cx + (i - (n - 1) / 2) * 16;
      const past = i < s.step || s.done;
      const asked = i >= s.back;
      const right = (s.answers[i] ?? false) === isSame(s, i);
      if (i === s.step && !s.done) g.lineStyle(2, C.goldBright, 1).strokeCircle(dx, dotsY, 6);
      g.fillStyle(!past ? C.line : !asked ? C.gold : right ? C.cyan : C.rose, 1).fillCircle(dx, dotsY, 4);
    }
    const asking = !s.done && s.step >= s.back;
    const answered = asking && s.answers[s.step] !== null;
    p.text(r.x + 20, r.y + 30, s.step < s.back && !s.done ? t('echoRemember') : t('echoAsk', { n: s.back }), { size: 15, color: C.goldText, ox: 0, wrap: (r.w - cw) / 2 - 40, align: 'left' });
    const { right, asked } = echoScore(s);
    const need = Math.ceil(ECHO_PASS * (n - s.back));
    p.text(r.x + 20, r.y + 110, t('echoScore', { right, asked, need, of: n - s.back }), { size: 13, color: C.inkDim, ox: 0, wrap: (r.w - cw) / 2 - 40, align: 'left' });
    const by = r.y + r.h - 26;
    p.button('echo-same', cx - 90, by, 160, 44, t('echoSame'), () => ctx.act((st) => echoAnswer(st, true)), { enabled: asking && !answered, accent: true, size: 17 });
    p.button('echo-diff', cx + 90, by, 160, 44, t('echoDiff'), () => ctx.act((st) => echoAnswer(st, false)), { enabled: asking && !answered, size: 17 });
    if (answered) p.text(cx + cw / 2 + 20, top + ch / 2, s.answers[s.step] ? t('echoSaidSame') : t('echoSaidDiff'), { size: 13, color: C.cyanText, ox: 0 });
  },
};
