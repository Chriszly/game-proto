// Forced march: a hero who has beaten a road's boss can start a run at the next road's first wave
// with a stake of coins instead of what the skipped waves would have paid, and no relic from their
// chests. A new hero, who has beaten no boss, starts on wave 1.

export interface MarchStart {
  /** The wave the run starts on. */
  wave: number;
  /** Coins the run starts with. */
  coins: number;
}

export const MARCH_STARTS: MarchStart[] = [
  { wave: 1, coins: 0 },
  { wave: 11, coins: 120 },
  { wave: 21, coins: 300 },
];

/** Whether a hero with this best wave may start on `wave`: the boss before it beaten (wave 10 for 11, wave 20 for 21). */
export const canMarch = (bestWave: number, wave: number) => bestWave >= wave - 1;

/** The coins a run starting on `wave` begins with. */
export const marchCoins = (wave: number) => MARCH_STARTS.find((m) => m.wave === wave)?.coins ?? 0;
