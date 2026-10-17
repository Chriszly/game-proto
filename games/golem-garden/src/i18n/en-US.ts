import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Golem Garden's texts whose US English spelling differs from the British source in `en.ts`. */
const enUS: Partial<Translation<typeof en>> = {
  barbBlurb: 'deeper pricks, pierce armor',
};

export default enUS;
