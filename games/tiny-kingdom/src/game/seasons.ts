import type { TextKey } from '../i18n';
import type { Structure } from './tiles';

// Seasons: each round has one, in turn from spring, and its rule makes some buildings score
// double. "Double" is paid when the building is placed: its worth at that moment is added again as
// a bonus, so a new season never changes what the board already scores.

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export interface SeasonInfo {
  name: TextKey;
  /** The season's rule in a sentence, for the round banner. */
  rule: TextKey;
  /** The rule in a few words, for the panel's season strip. */
  short: TextKey;
  /** The buildings that score double when placed in this season. */
  double: readonly Structure[];
  /** The strip's colour, as a number for Phaser's Graphics. */
  color: number;
}

/** Each season's texts (keys of `i18n/en.ts`, shown with `t`), doubled buildings and colour. */
export const SEASON_INFO: Record<Season, SeasonInfo> = {
  spring: { name: 'springName', rule: 'springRule', short: 'springShort', double: ['market', 'harbor'], color: 0x5fae4c },
  summer: { name: 'summerName', rule: 'summerRule', short: 'summerShort', double: ['farm'], color: 0xe0a32a },
  autumn: { name: 'autumnName', rule: 'autumnRule', short: 'autumnShort', double: ['house', 'lumber'], color: 0xc0632e },
  winter: { name: 'winterName', rule: 'winterRule', short: 'winterShort', double: ['tower', 'windmill'], color: 0x5d7fb0 },
};

/** The season of round `round`: spring, summer, autumn, winter, then spring again. */
export const seasonFor = (round: number): Season => SEASONS[(round - 1) % SEASONS.length];

/** The season's bonus for placing `kind` where it is worth `worth`: that worth again if the season doubles it. */
export const seasonBonus = (season: Season, kind: Structure, worth: number) => (SEASON_INFO[season].double.includes(kind) ? Math.max(0, worth) : 0);
