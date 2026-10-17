import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Apothecary's texts whose US English spelling differs from the British source in `en.ts`. */
const enUS: Partial<Translation<typeof en>> = {
  vigourTonic: 'Vigor Tonic',
  fineVigourTonic: 'Fine Vigor Tonic',
  vigourTonicCount: { one: '{n} Vigor Tonic', other: '{n} Vigor Tonics' },
};

export default enUS;
