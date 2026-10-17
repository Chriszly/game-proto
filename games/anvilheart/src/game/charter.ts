// What a charter brings besides more swords: an edict, chosen from two when the charter is founded,
// that changes its rules, and the guild perks that guild stars can be spent on for good. Names and
// blurbs are keys of `i18n/en.ts`, shown with `t`.
import type { TextKey } from '../i18n';

export type Edict = 'shortage' | 'tournament' | 'gemrush';

export interface EdictRule {
  name: TextKey;
  /** What it does, for the chooser's second line, and in short for the plaque. */
  blurb: TextKey;
  short: TextKey;
  /** The forge's heat-up time, times this. */
  forge: number;
  /** Every order's price, times this; plain (ungemmed) orders also times `plainPay`. */
  pay: number;
  plainPay: number;
  /** How often adventurers come (the gap between them, divided by this), and their patience, times `patience`. */
  visitors: number;
  patience: number;
  /** The forge's gem chance, times this. */
  gems: number;
}

const PLAIN: Omit<EdictRule, 'name' | 'blurb' | 'short'> = { forge: 1, pay: 1, plainPay: 1, visitors: 1, patience: 1, gems: 1 };

export const EDICTS: Record<Edict, EdictRule> = {
  shortage: { ...PLAIN, name: 'shortageName', blurb: 'shortageBlurb', short: 'shortageShort', forge: 1.5, pay: 1.25 },
  tournament: { ...PLAIN, name: 'tournamentName', blurb: 'tournamentBlurb', short: 'tournamentShort', visitors: 2, patience: 0.67 },
  gemrush: { ...PLAIN, name: 'gemrushName', blurb: 'gemrushBlurb', short: 'gemrushShort', gems: 3, plainPay: 0.75 },
};
export const EDICT_IDS = Object.keys(EDICTS) as Edict[];

/** The two edicts a charter (1 for the second smithy) offers, turning round the three in order. */
export const edictsFor = (charter: number): [Edict, Edict] => {
  const k = (charter - 1) % EDICT_IDS.length;
  return [EDICT_IDS[k], EDICT_IDS[(k + 1) % EDICT_IDS.length]];
};

/** The rule in force: the chosen edict's, or none. */
export const edictRule = (edict: Edict | null) => (edict ? EDICTS[edict] : PLAIN);

export type Perk = 'barrel' | 'rust' | 'desk';

export interface PerkRule {
  name: TextKey;
  blurb: TextKey;
  /** Guild stars it costs; spent stars no longer raise prices. */
  stars: number;
}

export const PERKS: Record<Perk, PerkRule> = {
  barrel: { name: 'guildBarrelName', blurb: 'guildBarrelBlurb', stars: 1 },
  rust: { name: 'rustName', blurb: 'rustBlurb', stars: 2 },
  desk: { name: 'deskName', blurb: 'deskBlurb', stars: 3 },
};
export const PERK_IDS = Object.keys(PERKS) as Perk[];

export const noPerks = (): Record<Perk, boolean> => ({ barrel: false, rust: false, desk: false });
/** Guild stars spent on perks. */
export const spentStars = (perks: Record<Perk, boolean>) => PERK_IDS.reduce((n, id) => n + (perks[id] ? PERKS[id].stars : 0), 0);
