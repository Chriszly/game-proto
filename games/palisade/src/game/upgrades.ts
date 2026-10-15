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
  | 'blast'
  | 'bigBlast'
  | 'fireball'
  | 'pyromancy'
  | 'storm'
  | 'forked'
  | 'timber'
  | 'lore'
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
  blast: { name: 'Blasting Powder', text: 'Arrows burst on impact, hurting foes nearby', maxRank: 1, icon: 'blast' },
  bigBlast: { name: 'Black Powder', text: 'Bursts are wider and hit harder', maxRank: 3, icon: 'blast', requires: 'blast' },
  fireball: { name: 'Tome of Fire', text: 'Hurl a fireball every 3s that explodes', maxRank: 1, icon: 'fireball' },
  pyromancy: { name: 'Pyromancy', text: 'Fireballs come 15% sooner and hit 40% harder', maxRank: 3, icon: 'fireball', requires: 'fireball' },
  storm: { name: 'Storm Staff', text: 'Call lightning every 3.5s that leaps between 3 foes', maxRank: 1, icon: 'storm' },
  forked: { name: 'Forked Lightning', text: 'Lightning leaps to one more foe and hits 25% harder', maxRank: 3, icon: 'storm', requires: 'storm' },
  timber: { name: 'Stout Timber', text: 'The barricade gets 25% more health and is repaired', maxRank: 5, icon: 'barricade' },
  lore: { name: 'Battle Lore', text: 'Gain 20% more experience', maxRank: 3, icon: 'book' },
  mend: { name: 'Mend the Barricade', text: 'Repair half of the barricade', maxRank: Infinity, icon: 'mend', filler: true },
  purse: { name: 'War Chest', text: 'Gain 25 coins to hire guards with', maxRank: Infinity, icon: 'purse', filler: true },
  wind: { name: 'Second Wind', text: 'Charge Arrow Rain and Caltrops at once', maxRank: Infinity, icon: 'wind', filler: true },
};

/** The fillers, in the order they fill the empty cards once fewer than three upgrades are left. */
export const FILLERS: UpgradeId[] = ['mend', 'purse', 'wind'];
/** Coins a War Chest gives. */
export const PURSE_COINS = 25;

export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
