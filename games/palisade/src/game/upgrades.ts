// Every level-up offers three of these. Most have several ranks; follow-ups only show up once the
// upgrade they improve has been picked. Adding an upgrade is an entry here plus its effect in
// `stats` (state.ts). Names and texts are keys of `i18n/en.ts`, shown with `t`.

import type { TextKey } from '../i18n';

export type UpgradeId =
  | 'swift'
  | 'sharp'
  | 'volley'
  | 'pierce'
  | 'crit'
  | 'fire'
  | 'wildfire'
  | 'frost'
  | 'deepFreeze'
  | 'shatter'
  | 'blast'
  | 'bigBlast'
  | 'fireball'
  | 'pyromancy'
  | 'storm'
  | 'forked'
  | 'timber'
  | 'lore'
  | 'finisher'
  | 'slayer'
  | 'cloudburst'
  | 'barbs'
  | 'stakes'
  | 'bounty'
  | 'drill'
  | 'mend'
  | 'purse'
  | 'wind';

export type Icon =
  | 'bow'
  | 'tip'
  | 'volley'
  | 'pierce'
  | 'eye'
  | 'fire'
  | 'frost'
  | 'blast'
  | 'fireball'
  | 'storm'
  | 'barricade'
  | 'book'
  | 'shatter'
  | 'finisher'
  | 'slayer'
  | 'cloudburst'
  | 'barbs'
  | 'stakes'
  | 'bounty'
  | 'drill'
  | 'mend'
  | 'purse'
  | 'wind';

export interface Upgrade {
  name: TextKey;
  /** What one more rank does. */
  text: TextKey;
  maxRank: number;
  icon: Icon;
  /** Only offered once this upgrade has a rank. */
  requires?: UpgradeId;
  /** Only offered when fewer than three others are left, to fill the empty cards (see `FILLERS`). */
  filler?: boolean;
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  swift: { name: 'swiftName', text: 'swiftText', maxRank: 5, icon: 'bow' },
  sharp: { name: 'sharpName', text: 'sharpText', maxRank: 5, icon: 'tip' },
  volley: { name: 'volleyName', text: 'volleyText', maxRank: 3, icon: 'volley' },
  pierce: { name: 'pierceName', text: 'pierceText', maxRank: 3, icon: 'pierce' },
  crit: { name: 'critName', text: 'critText', maxRank: 3, icon: 'eye' },
  fire: { name: 'fireName', text: 'fireText', maxRank: 1, icon: 'fire' },
  wildfire: { name: 'wildfireName', text: 'wildfireText', maxRank: 3, icon: 'fire', requires: 'fire' },
  frost: { name: 'frostName', text: 'frostText', maxRank: 1, icon: 'frost' },
  deepFreeze: { name: 'deepFreezeName', text: 'deepFreezeText', maxRank: 3, icon: 'frost', requires: 'frost' },
  shatter: { name: 'shatterName', text: 'shatterText', maxRank: 3, icon: 'shatter', requires: 'frost' },
  blast: { name: 'blastName', text: 'blastText', maxRank: 1, icon: 'blast' },
  bigBlast: { name: 'bigBlastName', text: 'bigBlastText', maxRank: 3, icon: 'blast', requires: 'blast' },
  fireball: { name: 'fireballName', text: 'fireballText', maxRank: 1, icon: 'fireball' },
  pyromancy: { name: 'pyromancyName', text: 'pyromancyText', maxRank: 3, icon: 'fireball', requires: 'fireball' },
  storm: { name: 'stormName', text: 'stormText', maxRank: 1, icon: 'storm' },
  forked: { name: 'forkedName', text: 'forkedText', maxRank: 3, icon: 'storm', requires: 'storm' },
  timber: { name: 'timberName', text: 'timberText', maxRank: 5, icon: 'barricade' },
  lore: { name: 'loreName', text: 'loreText', maxRank: 3, icon: 'book' },
  finisher: { name: 'finisherName', text: 'finisherText', maxRank: 3, icon: 'finisher' },
  slayer: { name: 'slayerName', text: 'slayerText', maxRank: 3, icon: 'slayer' },
  cloudburst: { name: 'cloudburstName', text: 'cloudburstText', maxRank: 3, icon: 'cloudburst' },
  barbs: { name: 'barbsName', text: 'barbsText', maxRank: 3, icon: 'barbs' },
  stakes: { name: 'stakesName', text: 'stakesText', maxRank: 3, icon: 'stakes' },
  bounty: { name: 'bountyName', text: 'bountyText', maxRank: 3, icon: 'bounty' },
  drill: { name: 'drillName', text: 'drillText', maxRank: 3, icon: 'drill' },
  mend: { name: 'mendName', text: 'mendText', maxRank: Infinity, icon: 'mend', filler: true },
  purse: { name: 'purseName', text: 'purseText', maxRank: Infinity, icon: 'purse', filler: true },
  wind: { name: 'windName', text: 'windText', maxRank: Infinity, icon: 'wind', filler: true },
};

/** The fillers: Mend fills the one empty card with two upgrades left, War Chest and Second Wind the two with one left. */
export const FILLERS: UpgradeId[] = ['mend', 'purse', 'wind'];
/**
 * The base skills: once every other skill is learned, each level-up offers these three again, with
 * no cap on their ranks, so the hero keeps growing with the waves.
 */
export const BASE_SKILLS: UpgradeId[] = ['swift', 'sharp', 'timber'];
/** Coins a War Chest gives. */
export const PURSE_COINS = 25;

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

/**
 * The skill book's order, one theme a row of four: the bow, harder hits, fire, chill and slow,
 * powder and lightning, the barricade and guards, then experience and the fillers. Only the book
 * reads it; `UPGRADE_IDS` keeps the table's order, which the level-up's random picks depend on.
 */
export const BOOK_ORDER: UpgradeId[] = [
  'swift', 'sharp', 'volley', 'pierce',
  'crit', 'finisher', 'slayer', 'cloudburst',
  'fire', 'wildfire', 'fireball', 'pyromancy',
  'frost', 'deepFreeze', 'shatter', 'barbs',
  'blast', 'bigBlast', 'storm', 'forked',
  'timber', 'stakes', 'drill', 'bounty',
  'lore', 'mend', 'purse', 'wind',
];
