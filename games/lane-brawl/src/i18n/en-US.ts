import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Lane Brawl's texts whose US English spelling differs from the British source in `en.ts`. */
const enUS: Partial<Translation<typeof en>> = {
  itemCloth: 'Cloth Armor',
  statArmour: '+{n} armor',
};

export default enUS;
