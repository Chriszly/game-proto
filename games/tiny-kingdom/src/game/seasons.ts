import type { Structure } from './tiles';

// Seasons: each round has one, in turn from spring, and its rule makes some buildings score
// double. "Double" is paid when the building is placed: its worth at that moment is added again as
// a bonus, so a new season never changes what the board already scores.

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export interface SeasonInfo {
  name: string;
  /** The season's rule in a sentence, for the round banner. */
  rule: string;
  /** The rule in a few words, for the panel's season strip. */
  short: string;
  /** The buildings that score double when placed in this season. */
  double: readonly Structure[];
  /** The strip's colour, as a number for Phaser's Graphics. */
  color: number;
}

export const SEASON_INFO: Record<Season, SeasonInfo> = {
  spring: { name: 'Spring fair', rule: 'Markets and harbors score double', short: 'markets, harbors x2', double: ['market', 'harbor'], color: 0x5fae4c },
  summer: { name: 'Harvest festival', rule: 'Farms score double', short: 'farms x2', double: ['farm'], color: 0xe0a32a },
  autumn: { name: 'Timber season', rule: 'Houses and lumber camps score double', short: 'houses, camps x2', double: ['house', 'lumber'], color: 0xc0632e },
  winter: { name: 'Winter watch', rule: 'Towers and windmills score double', short: 'towers, mills x2', double: ['tower', 'windmill'], color: 0x5d7fb0 },
};

/** The season of round `round`: spring, summer, autumn, winter, then spring again. */
export const seasonFor = (round: number): Season => SEASONS[(round - 1) % SEASONS.length];

/** The season's bonus for placing `kind` where it is worth `worth`: that worth again if the season doubles it. */
export const seasonBonus = (season: Season, kind: Structure, worth: number) => (SEASON_INFO[season].double.includes(kind) ? Math.max(0, worth) : 0);
