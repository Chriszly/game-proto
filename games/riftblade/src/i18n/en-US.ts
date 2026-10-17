import type { Translation } from '../../../../shared/i18n';
import type en from './en';

/** Riftblade's texts whose US English spelling differs from the British source in `en.ts`. */
const enUS: Partial<Translation<typeof en>> = {
  armourName: 'Plate Armor',
  vharnBlurb: 'Throws his blade, which flies out and back. Very tough and armored, but slow.',
  lifeSupportBlurb: 'Armor plates that regrow; rage when nearly down.',
  breakerBlurb: 'Hits strip armor: elites and bosses take more damage.',
  hollowRebirthText: 'Armored and slow: +60 health, -30% damage taken, double slash damage',
};

export default enUS;
