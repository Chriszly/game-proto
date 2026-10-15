// The boons offered at each checkpoint: two at a time, one to keep for the rest of the run.
// Their effects are worked out in `stats` in state.ts. Cursed boons are a gift with a price, and
// from the second checkpoint one may take the place of the second card.

export type BoonId =
  | 'heart'
  | 'boots'
  | 'double'
  | 'aegis'
  | 'magnet'
  | 'greed'
  | 'greaves'
  | 'cloak'
  | 'mend'
  | 'gilt'
  | 'glass'
  | 'oath';

export interface Boon {
  name: string;
  text: string;
  /** How many times it can be taken in a run. */
  maxRank: number;
  /** Offered only to fill the pair once fewer than two other boons are left. */
  filler?: boolean;
  /** A cursed boon: it trades something away, and is never for sale in the shop. */
  cursed?: boolean;
}

export const BOONS: Record<BoonId, Boon> = {
  heart: { name: 'Hearty Ale', text: 'One more heart, and one heart back', maxRank: 3 },
  boots: { name: 'Winged Boots', text: 'Jump 12% higher', maxRank: 3 },
  double: { name: 'Second Leap', text: 'Jump again once in the air', maxRank: 1 },
  aegis: { name: 'Aegis', text: 'Shrug off the first hit after each checkpoint', maxRank: 2 },
  magnet: { name: 'Lodestone', text: 'Coins fly to you from further off', maxRank: 3 },
  greed: { name: 'Golden Greed', text: 'Each coin is worth one more', maxRank: 3 },
  greaves: { name: 'Oiled Greaves', text: 'Slides last 30% longer', maxRank: 2 },
  cloak: { name: 'Shadow Cloak', text: 'Stay unhurt 50% longer after a hit', maxRank: 2 },
  mend: { name: 'Field Dressing', text: 'Two hearts back', maxRank: Infinity, filler: true },
  gilt: { name: 'Cursed Gold', text: 'Coins are worth double, but one heart less', maxRank: 1, cursed: true },
  glass: { name: 'Glass Greaves', text: 'Slides last 60% longer, but you stay unhurt half as long', maxRank: 1, cursed: true },
  oath: { name: 'Iron Oath', text: 'Shrug off two more hits after each checkpoint, but jump 15% lower', maxRank: 1, cursed: true },
};

export const BOON_IDS = Object.keys(BOONS) as BoonId[];

/** Whether the coin shop can sell this boon: never Field Dressing or a cursed boon. */
export const forSale = (id: BoonId) => !BOONS[id].filler && !BOONS[id].cursed;

/** Cursed boons: from this stage's checkpoint on, one takes the second card this often. */
export const CURSE = { from: 2, chance: 0.5 };
