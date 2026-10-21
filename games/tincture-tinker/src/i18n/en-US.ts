import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** TinctureTinker's texts whose US English spelling differs from the British source in `en.ts`. */
const enUS: Partial<Translation<typeof en>> = {
  captionMould: 'Mold creeps to a neighbor after every move unless a match touches it, which scrubs it off',
  captionRichBlockersMould: 'A rich order: {share}% more coins for {blockers} more jars and resin and one more mold patch',
  captionPickRichBlockersMould: 'A rich order pays {share}% more, for {blockers} more jars and resin and one more mold patch',
};

export default enUS;
