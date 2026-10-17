import { translator } from '../../../shared/i18n';
import en from './i18n/en';
import enUS from './i18n/en-US';
import de from './i18n/de';

/** Mapmaker's texts in the hub's language (`shared/i18n.ts`); the sources are in `i18n/en.ts`. */
export const t = translator({ en, 'en-US': enUS, de });

/** A key of Mapmaker's texts. */
export type TextKey = keyof typeof en;

/** Coins as the game prints them: 12c, or 12 M in German. */
export const coins = (n: number) => t('coins', { n });
