// The goals: jars sold to reach, each unlocking a meadow on the far hill with a lasting benefit.
// They unlock in order; `GameState.meadows` counts how many are open. The benefits live in
// `carry` (Lavender Field), `jarPrice` (Sunflower Ridge) and `ripenTime` (Heather Moor) in state.ts.

export interface Meadow {
  name: string;
  /** Jars sold, in all, that unlock it. */
  need: number;
  /** Its benefit, for the goal card and the unlock message. */
  blurb: string;
}

export const MEADOWS: Meadow[] = [
  { name: 'Lavender Field', need: 10, blurb: '+1 nectar a trip' },
  { name: 'Sunflower Ridge', need: 30, blurb: '+5 coins a jar' },
  { name: 'Heather Moor', need: 80, blurb: 'honey ripens twice as fast' },
];

/** Extra coins a jar once the Sunflower Ridge is open. */
export const SUNFLOWER_COINS = 5;
