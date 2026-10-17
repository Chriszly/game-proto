// What a charter brings besides more swords: an edict, chosen from two when the charter is founded,
// that changes its rules, and the guild perks that guild stars can be spent on for good.

export type Edict = 'shortage' | 'tournament' | 'gemrush';

export interface EdictRule {
  name: string;
  /** What it does, for the chooser's second line, and in short for the plaque. */
  blurb: string;
  short: string;
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
  shortage: { ...PLAIN, name: 'Iron shortage', blurb: 'the forge is half again as slow, every sale pays 25% more', short: 'slow forge, +25% on sales', forge: 1.5, pay: 1.25 },
  tournament: { ...PLAIN, name: 'Tournament season', blurb: 'twice the adventurers, with a third less patience', short: '2x visitors, less patience', visitors: 2, patience: 0.67 },
  gemrush: { ...PLAIN, name: 'Gem rush', blurb: 'three times the gems, but plain orders pay 25% less', short: '3x gems, plain orders -25%', gems: 3, plainPay: 0.75 },
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
  name: string;
  blurb: string;
  /** Guild stars it costs; spent stars no longer raise prices. */
  stars: number;
}

export const PERKS: Record<Perk, PerkRule> = {
  barrel: { name: 'Guild barrel', blurb: 'every smithy starts with the quench barrel', stars: 1 },
  rust: { name: 'Oiled anvils', blurb: 'swords take twice as long to rust', stars: 2 },
  desk: { name: 'Fourth desk', blurb: 'room for four adventurers at the counter', stars: 3 },
};
export const PERK_IDS = Object.keys(PERKS) as Perk[];

export const noPerks = (): Record<Perk, boolean> => ({ barrel: false, rust: false, desk: false });
/** Guild stars spent on perks. */
export const spentStars = (perks: Record<Perk, boolean>) => PERK_IDS.reduce((n, id) => n + (perks[id] ? PERKS[id].stars : 0), 0);
