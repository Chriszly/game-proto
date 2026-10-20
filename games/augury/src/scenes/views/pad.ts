import { t } from '../../i18n';
import type { Painter, Rect } from '../painter';

/** A number pad of keys 1 to `max` and Clear, three across at the right of the board's area. */
export function numberPad(p: Painter, r: Rect, max: number, enter: (n: number) => void, enabled: boolean) {
  const w = 58;
  const h = max > 6 ? 46 : 52;
  const gap = 8;
  const x0 = r.x + r.w - 3 * w - 2 * gap;
  const rows = Math.ceil((max + 1) / 3);
  const y0 = r.y + (r.h - rows * h - (rows - 1) * gap) / 2;
  for (let n = 1; n <= max + 1; n++) {
    const k = n - 1;
    const cx = x0 + (k % 3) * (w + gap) + w / 2;
    const cy = y0 + Math.floor(k / 3) * (h + gap) + h / 2;
    const clear = n === max + 1;
    p.button(clear ? 'key-0' : `key-${n}`, cx, cy, w, h, clear ? t('clear') : String(n), () => enter(clear ? 0 : n), { enabled, size: clear ? 13 : 22 });
  }
  return x0;
}
