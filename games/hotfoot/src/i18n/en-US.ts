import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Hotfoot's texts whose US English spelling differs from the British source in `en.ts`. */
const enUS: Partial<Translation<typeof en>> = {
  armoury: 'Armory',
  armouryTitle: 'The Armory',
};

export default enUS;
