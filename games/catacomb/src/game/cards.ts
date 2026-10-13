// Every card in the game. A card costs energy and does some of: damage to the foe in front (or to
// every foe), a number of times; block; drawing cards; energy; healing.

export type Icon = 'sword' | 'shield' | 'axe' | 'twin' | 'boot' | 'bolt' | 'heart' | 'hammer' | 'whirl' | 'fire' | 'fang' | 'shieldBash';

export interface Card {
  name: string;
  cost: number;
  icon: Icon;
  /** Common cards are offered after a fight; rare ones in treasure rooms. Starter cards neither. */
  rarity: 'starter' | 'common' | 'rare';
  damage?: number;
  /** How many times the damage is dealt; 1 if not given. */
  hits?: number;
  /** Damage goes to every foe instead of only the one in front. */
  all?: boolean;
  block?: number;
  draw?: number;
  energy?: number;
  heal?: number;
}

export const CARDS = {
  strike: { name: 'Strike', cost: 1, icon: 'sword', rarity: 'starter', damage: 6 },
  defend: { name: 'Defend', cost: 1, icon: 'shield', rarity: 'starter', block: 5 },
  bash: { name: 'Bash', cost: 2, icon: 'hammer', rarity: 'starter', damage: 10 },
  cleave: { name: 'Cleave', cost: 1, icon: 'axe', rarity: 'common', damage: 7, all: true },
  twinStrike: { name: 'Twin Strike', cost: 1, icon: 'twin', rarity: 'common', damage: 4, hits: 2 },
  ironWall: { name: 'Iron Wall', cost: 2, icon: 'shield', rarity: 'common', block: 13 },
  scout: { name: 'Scout Ahead', cost: 0, icon: 'boot', rarity: 'common', draw: 2 },
  shieldBash: { name: 'Shield Bash', cost: 1, icon: 'shieldBash', rarity: 'common', damage: 5, block: 5 },
  heavyBlow: { name: 'Heavy Blow', cost: 2, icon: 'hammer', rarity: 'common', damage: 16 },
  bandage: { name: 'Bandage', cost: 1, icon: 'heart', rarity: 'common', heal: 4, draw: 1 },
  secondWind: { name: 'Second Wind', cost: 0, icon: 'bolt', rarity: 'common', energy: 1, draw: 1 },
  whirlwind: { name: 'Whirlwind', cost: 2, icon: 'whirl', rarity: 'rare', damage: 6, hits: 2, all: true },
  fireball: { name: 'Fireball', cost: 2, icon: 'fire', rarity: 'rare', damage: 15, all: true },
  vampBite: { name: 'Leech', cost: 2, icon: 'fang', rarity: 'rare', damage: 12, heal: 6 },
  fortress: { name: 'Fortress', cost: 1, icon: 'shield', rarity: 'rare', block: 12, draw: 1 },
} satisfies Record<string, Card>;

export type CardId = keyof typeof CARDS;

export const card = (id: CardId): Card => CARDS[id];

/** Every run starts with this deck of ten. */
export const STARTER_DECK: CardId[] = ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'bash'];

export const COMMON = (Object.keys(CARDS) as CardId[]).filter((id) => card(id).rarity === 'common');
export const RARE = (Object.keys(CARDS) as CardId[]).filter((id) => card(id).rarity === 'rare');

/** The card's rules as a line of text for its face. */
export function describe(id: CardId) {
  const c = card(id);
  const parts: string[] = [];
  if (c.damage) parts.push(`Deal ${c.damage}${c.hits ? ` x${c.hits}` : ''}${c.all ? ' to all foes' : ''}.`);
  if (c.block) parts.push(`Gain ${c.block} block.`);
  if (c.heal) parts.push(`Heal ${c.heal}.`);
  if (c.energy) parts.push(`Gain ${c.energy} energy.`);
  if (c.draw) parts.push(`Draw ${c.draw}.`);
  return parts.join(' ');
}

/** What kind of card it is, for the colour of its frame. */
export const kindOf = (id: CardId) => (card(id).damage ? 'attack' : 'skill');
