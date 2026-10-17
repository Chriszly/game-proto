// Names for the champions: each class is played by one character, the same in every match, like
// Hald Oathstone, the Warden. The names and their stories live with the classes in `CHAMPIONS`.

import { CHAMPIONS } from './data';

/** The champion's short name for labels, notices and the portrait: "Hald" for Hald Oathstone. */
export const shortName = (full: string) => CHAMPIONS.find((c) => c.hero === full)?.short ?? full.split(' ')[0];
