import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Space Wars' texts whose US English spelling differs from the British source in `en.ts`. */
const enUS: Partial<Translation<typeof en>> = {};

export default enUS;
