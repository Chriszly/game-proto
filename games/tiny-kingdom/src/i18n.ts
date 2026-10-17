import { translator } from '../../../shared/i18n';
import en from './i18n/en';
import enUS from './i18n/en-US';
import de from './i18n/de';

/** Tiny Kingdom's texts in the hub's language (`shared/i18n.ts`); the sources are in `i18n/en.ts`. */
export const t = translator({ en, 'en-US': enUS, de });

/** A key of Tiny Kingdom's texts. */
export type TextKey = keyof typeof en;

/**
 * A lake's or wood's name in the hub's language. `namedPlaces` in `game/decree.ts` names each one
 * from where it lies and an ending (Eastmere, Northwood); that English name is its id.
 */
export function placeName(id: string) {
  const m = /^(North|South|East|West|Mid)(mere|pool|tarn|water|wood|grove|holt|shaw)$/.exec(id);
  if (!m) return id;
  const end = (m[2][0].toUpperCase() + m[2].slice(1)) as Capitalize<string>;
  return t(`dir${m[1]}` as TextKey) + t(`end${end}` as TextKey);
}
