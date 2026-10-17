import { translator } from '../../../shared/i18n';
import type { ItemId, PotionId } from './game/items';
import en from './i18n/en';
import enUS from './i18n/en-US';
import de from './i18n/de';

const translate = translator({ en, 'en-US': enUS, de });

/**
 * Where a text's `{coin}` goes: an em space, which `coined` (`ui/coins.ts`) covers with the painted
 * gold coin. Amounts show as a number and the coin, with no currency name in any language.
 */
export const COIN = '\u2003';

/** Apothecary's texts in the hub's language (`shared/i18n.ts`); the sources are in `i18n/en.ts`. */
export const t: typeof translate = (key, vars = {}) => translate(key, { coin: COIN, ...vars });

/** A key of Apothecary's texts. */
export type TextKey = keyof typeof en;

/** An item's name: its texts are keyed by its id. */
export const itemName = (id: ItemId) => t(id);

/** `n` of a potion, such as "3 Healing Draughts". */
export const potionCount = (potion: PotionId, n: number) => t(`${potion}Count`, { n });
