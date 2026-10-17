import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/**
 * Palisade's texts whose US English spelling differs from the British source in `en.ts`: none so
 * far. A new text spelled differently in US English (colour, armour, centre) goes here.
 */
const enUS: Partial<Translation<typeof en>> = {};

export default enUS;
