// The goals: jars sold to reach, each unlocking a meadow on the far hill with a lasting benefit.
// They unlock in order; `GameState.meadows` counts how many are open. The benefits live in
// `carry` (Lavender Field), `jarPrice` (Sunflower Ridge) and `ripenTime` (Heather Moor) in state.ts.

import type { TextKey } from '../i18n';

export interface Meadow {
  /** Its name's text (`i18n/en.ts`). */
  name: TextKey;
  /** Jars sold, in all, that unlock it. */
  need: number;
  /** Its benefit, for the goal card and the unlock message. */
  blurb: TextKey;
}

export const MEADOWS: Meadow[] = [
  { name: 'lavenderField', need: 10, blurb: 'plusNectar' },
  { name: 'sunflowerRidge', need: 30, blurb: 'plusCoins' },
  { name: 'heatherMoor', need: 80, blurb: 'ripensFaster' },
];

/** Extra coins a jar once the Sunflower Ridge is open. */
export const SUNFLOWER_COINS = 5;
