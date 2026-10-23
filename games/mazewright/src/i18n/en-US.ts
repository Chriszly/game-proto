import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Only the texts spelled differently in US English. */
const enUS: Partial<Translation<typeof en>> = {
  puffballText: 'Poison that spreads and goes through armor',
  new_weevil: 'New: weevils wear armor, so each hit does less',
};

export default enUS;
