// Every level-up offers three of these. Most have several ranks; follow-ups only show up once the
// upgrade they improve has been picked. Adding an upgrade is an entry here plus its effect in
// `stats` (state.ts).

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
  name: string;
  /** What one more rank does. */
  text: string;
  maxRank: number;
  icon: Icon;
  /** Only offered once this upgrade has a rank. */
  requires?: UpgradeId;
  /** Only offered when fewer than three others are left, to fill the empty cards (see `FILLERS`). */
  filler?: boolean;
}

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  swift: { name: 'Swift Draw', text: 'Shoot 20% faster', maxRank: 5, icon: 'bow' },
  sharp: { name: 'Steel Tips', text: 'Arrows deal 25% more damage', maxRank: 5, icon: 'tip' },
  volley: { name: 'Volley', text: 'One more arrow per shot, at another foe', maxRank: 3, icon: 'volley' },
  pierce: { name: 'Bodkin Points', text: 'Arrows fly on through one more foe', maxRank: 3, icon: 'pierce' },
  crit: { name: 'Keen Eye', text: '10% more chance of a double-damage hit', maxRank: 3, icon: 'eye' },
  fire: { name: 'Fire Arrows', text: 'Arrows set foes ablaze, burning them for 3s', maxRank: 1, icon: 'fire' },
  wildfire: { name: 'Wildfire', text: 'Burning deals 50% more damage', maxRank: 3, icon: 'fire', requires: 'fire' },
  frost: { name: 'Frost Arrows', text: 'Arrows chill foes, slowing them by 35%', maxRank: 1, icon: 'frost' },
  deepFreeze: { name: 'Deep Freeze', text: 'Chill slows 10% more and lasts longer', maxRank: 3, icon: 'frost', requires: 'frost' },
  shatter: { name: 'Shatter', text: 'Arrows deal 20% more damage to chilled foes', maxRank: 3, icon: 'shatter', requires: 'frost' },
  blast: { name: 'Blasting Powder', text: 'Arrows burst on impact, hurting foes nearby', maxRank: 1, icon: 'blast' },
  bigBlast: { name: 'Black Powder', text: 'Bursts are wider and hit harder', maxRank: 3, icon: 'blast', requires: 'blast' },
  fireball: { name: 'Tome of Fire', text: 'Hurl a fireball every 3s that explodes', maxRank: 1, icon: 'fireball' },
  pyromancy: { name: 'Pyromancy', text: 'Fireballs come 15% sooner and hit 40% harder', maxRank: 3, icon: 'fireball', requires: 'fireball' },
  storm: { name: 'Storm Staff', text: 'Call lightning every 3.5s that leaps between 3 foes', maxRank: 1, icon: 'storm' },
  forked: { name: 'Forked Lightning', text: 'Lightning leaps to one more foe and hits 25% harder', maxRank: 3, icon: 'storm', requires: 'storm' },
  timber: { name: 'Stout Timber', text: 'The barricade gets 25% more health and is repaired', maxRank: 5, icon: 'barricade' },
  lore: { name: 'Battle Lore', text: 'Gain 20% more experience', maxRank: 3, icon: 'book' },
  finisher: { name: 'Finishing Shot', text: 'Arrows hit foes below 15% more health twice as hard', maxRank: 3, icon: 'finisher' },
  slayer: { name: 'Giant Slayer', text: 'Arrows and Arrow Rain deal 30% more damage to bosses', maxRank: 3, icon: 'slayer' },
  cloudburst: { name: 'Cloudburst', text: 'Arrow Rain hits 25% harder over a 15% wider ring', maxRank: 3, icon: 'cloudburst' },
  barbs: { name: 'Barbed Caltrops', text: 'Caltrops prick 50% harder and slow foes 10% more', maxRank: 3, icon: 'barbs' },
  stakes: { name: 'Spiked Stakes', text: 'Foes hacking at the barricade take 6 damage a second', maxRank: 3, icon: 'stakes' },
  bounty: { name: 'Bounty Hunter', text: 'Every kill pays 1 more coin', maxRank: 3, icon: 'bounty' },
  drill: { name: 'Drill Sergeant', text: 'Hired guards attack 20% faster', maxRank: 3, icon: 'drill' },
  mend: { name: 'Mend the Barricade', text: 'Repair half of the barricade', maxRank: Infinity, icon: 'mend', filler: true },
  purse: { name: 'War Chest', text: 'Gain 25 coins to hire guards with', maxRank: Infinity, icon: 'purse', filler: true },
  wind: { name: 'Second Wind', text: 'Charge Arrow Rain and Caltrops at once', maxRank: Infinity, icon: 'wind', filler: true },
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
