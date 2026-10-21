import { CODE_LENGTH, codeAdd, codeBack, codeGuess, type CodeState } from '../../game/puzzles/code';
import { t } from '../../i18n';
import { drawGlyph } from '../glyphs';
import { C } from '../theme';
import type { PuzzleView } from './types';

export const codeView: PuzzleView<CodeState> = {
  draw(ctx) {
    const { p, s, r } = ctx;
    const g = p.g;
    const rowH = Math.min(36, Math.floor((r.h - 34) / s.maxGuesses));
    const slot = rowH - 6;
    const x0 = r.x + 52;
    // The places a hint has shown.
    p.text(x0 - 10, r.y + 12, t('codeKnown'), { size: 12, color: C.inkDim, ox: 1 });
    for (let i = 0; i < CODE_LENGTH; i++) {
      const cx = x0 + i * rowH + slot / 2;
      g.lineStyle(1, C.line, 1).strokeRect(cx - slot / 2, r.y + 12 - slot / 2, slot, slot);
      if (s.shown[i]) drawGlyph(g, s.code[i], cx, r.y + 12, slot * 0.7);
      else p.text(cx, r.y + 12, '?', { size: 14, color: C.inkDim });
    }
    for (let row = 0; row < s.maxGuesses; row++) {
      const cy = r.y + 34 + row * rowH + rowH / 2;
      const guess = s.guesses[row];
      const isDraft = row === s.guesses.length;
      const glyphs = guess?.glyphs ?? (isDraft ? s.draft : []);
      p.text(x0 - 10, cy, String(row + 1), { size: 12, color: isDraft ? C.cyanText : C.inkDim, ox: 1 });
      for (let i = 0; i < CODE_LENGTH; i++) {
        const cx = x0 + i * rowH + slot / 2;
        g.fillStyle(C.deep, 1).fillRect(cx - slot / 2, cy - slot / 2, slot, slot);
        g.lineStyle(isDraft ? 1.5 : 1, isDraft ? C.cyan : C.line, 1).strokeRect(cx - slot / 2, cy - slot / 2, slot, slot);
        if (glyphs[i] !== undefined) drawGlyph(g, glyphs[i], cx, cy, slot * 0.7);
      }
      if (guess) {
        // Filled pegs for the right place, rings for the right glyph elsewhere.
        const px = x0 + CODE_LENGTH * rowH + 10;
        for (let k = 0; k < guess.exact + guess.near; k++) {
          const pcx = px + k * 13;
          if (k < guess.exact) g.fillStyle(C.cyan, 1).fillCircle(pcx, cy, 4.5);
          else g.lineStyle(1.5, C.goldBright, 1).strokeCircle(pcx, cy, 4.5);
        }
        if (!guess.exact && !guess.near) p.text(px, cy, '–', { size: 14, color: C.inkDim, ox: 0 });
      }
    }
    // The glyph keys, Back and Guess.
    const kx = r.x + r.w - 230;
    const key = 62;
    for (let id = 0; id < s.glyphs; id++) {
      const cx = kx + (id % 3) * (key + 10) + key / 2;
      const cy = r.y + 30 + Math.floor(id / 3) * (key + 10) + key / 2;
      p.frame(cx - key / 2, cy - key / 2, key, key, { fill: C.key, alpha: 1, inner: false });
      drawGlyph(g, id, cx, cy, key * 0.55);
      p.hit(`glyph-${id}`, cx - key / 2, cy - key / 2, key, key, () => ctx.act((st) => codeAdd(st, id)));
    }
    const by = r.y + 30 + 2 * (key + 10) + 30;
    p.button('code-back', kx + 50, by, 100, 40, t('codeBack'), () => ctx.act((st) => codeBack(st)), { enabled: s.draft.length > 0 });
    p.button('code-guess', kx + 165, by, 110, 40, t('codeGuess'), () => ctx.act((st) => codeGuess(st)), { enabled: s.draft.length === CODE_LENGTH, accent: true });
    p.text(kx + 108, by + 44, t('codeLegend'), { size: 12, color: C.inkDim, wrap: 230 });
    p.text(kx + 108, by + 76, t('codeLeft', { n: s.maxGuesses - s.guesses.length }), { size: 13, color: C.goldText });
  },
};
