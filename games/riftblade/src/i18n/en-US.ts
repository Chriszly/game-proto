import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Riftblade's texts whose US English spelling differs from the British source in `en.ts`. */
const enUS: Partial<Translation<typeof en>> = {
  armourName: 'Plate Armor',
};

export default enUS;
