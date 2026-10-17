import { translator } from '../../../shared/i18n';
import en from './i18n/en';
import de from './i18n/de';

/**
 * Lanternkeep's texts in the hub's language (`shared/i18n.ts`); the sources are in `i18n/en.ts`.
 * US English spells all of them the British way, so it has no file of its own.
 */
export const t = translator({ en, de });

/** A key of Lanternkeep's texts. */
export type TextKey = keyof typeof en;
