// Every card in the game. A card costs energy and does some of: damage to the foe in front (or to
// every foe), a number of times; block; drawing cards; energy; healing; and statuses on the foe in
// front (or on every foe). Each card can be tempered once at a campfire, which makes it better:
// its id gets a '+' and its `up` fields replace the plain ones.

export type Icon =
  | 'sword'
  | 'shield'
  | 'axe'
  | 'twin'
  | 'boot'
  | 'bolt'
  | 'heart'
  | 'hammer'
  | 'whirl'
  | 'fire'
  | 'fang'
  | 'shieldBash'
  | 'cut'
  | 'crack'
  | 'dart'
  | 'cloud'
  | 'horn';

/** What a card does; `up` is what tempering changes. */
interface Effects {
  cost: number;
  damage?: number;
  /** How many times the damage is dealt; 1 if not given. */
  hits?: number;
  /** Damage and statuses go to every foe instead of only the one in front. */
  all?: boolean;
  block?: number;
  draw?: number;
  energy?: number;
  heal?: number;
  /** Statuses put on the foe in front (or every foe, with `all`). */
  weak?: number;
  vulnerable?: number;
  poison?: number;
}

export interface Card extends Effects {
  name: string;
  icon: Icon;
  /** Common cards are offered after a fight; rare ones in treasure rooms and by elites. Starter cards neither. */
  rarity: 'starter' | 'common' | 'rare';
  /** The fields a tempered copy changes. */
  up: Partial<Effects>;
}

export const CARDS = {
  strike: { name: 'Strike', cost: 1, icon: 'sword', rarity: 'starter', damage: 6, up: { damage: 9 } },
  defend: { name: 'Defend', cost: 1, icon: 'shield', rarity: 'starter', block: 5, up: { block: 8 } },
  bash: { name: 'Bash', cost: 2, icon: 'hammer', rarity: 'starter', damage: 10, up: { damage: 14 } },
  cleave: { name: 'Cleave', cost: 1, icon: 'axe', rarity: 'common', damage: 7, all: true, up: { damage: 10 } },
  twinStrike: { name: 'Twin Strike', cost: 1, icon: 'twin', rarity: 'common', damage: 4, hits: 2, up: { damage: 6 } },
  ironWall: { name: 'Iron Wall', cost: 2, icon: 'shield', rarity: 'common', block: 13, up: { block: 18 } },
  scout: { name: 'Scout Ahead', cost: 0, icon: 'boot', rarity: 'common', draw: 2, up: { draw: 3 } },
  shieldBash: { name: 'Shield Bash', cost: 1, icon: 'shieldBash', rarity: 'common', damage: 5, block: 5, up: { damage: 7, block: 7 } },
  heavyBlow: { name: 'Heavy Blow', cost: 2, icon: 'hammer', rarity: 'common', damage: 16, up: { damage: 22 } },
  bandage: { name: 'Bandage', cost: 1, icon: 'heart', rarity: 'common', heal: 4, draw: 1, up: { heal: 7 } },
  secondWind: { name: 'Second Wind', cost: 0, icon: 'bolt', rarity: 'common', energy: 1, draw: 1, up: { energy: 2 } },
  hamstring: { name: 'Hamstring', cost: 1, icon: 'cut', rarity: 'common', damage: 5, weak: 2, up: { damage: 7, weak: 3 } },
  sunder: { name: 'Sunder', cost: 1, icon: 'crack', rarity: 'common', damage: 4, vulnerable: 2, up: { damage: 6, vulnerable: 3 } },
  poisonDart: { name: 'Poison Dart', cost: 1, icon: 'dart', rarity: 'common', damage: 3, poison: 4, up: { poison: 6 } },
  whirlwind: { name: 'Whirlwind', cost: 2, icon: 'whirl', rarity: 'rare', damage: 6, hits: 2, all: true, up: { damage: 8 } },
  fireball: { name: 'Fireball', cost: 2, icon: 'fire', rarity: 'rare', damage: 15, all: true, up: { damage: 20 } },
  vampBite: { name: 'Leech', cost: 2, icon: 'fang', rarity: 'rare', damage: 12, heal: 6, up: { damage: 15, heal: 8 } },
  fortress: { name: 'Fortress', cost: 1, icon: 'shield', rarity: 'rare', block: 12, draw: 1, up: { cost: 0 } },
  toxicCloud: { name: 'Toxic Cloud', cost: 2, icon: 'cloud', rarity: 'rare', poison: 5, all: true, up: { poison: 8 } },
  warCry: { name: 'War Cry', cost: 1, icon: 'horn', rarity: 'rare', weak: 2, vulnerable: 2, all: true, up: { cost: 0 } },
} satisfies Record<string, Card>;

export type BaseId = keyof typeof CARDS;
/** A card in a deck: its base id, with a '+' once tempered. */
export type CardId = BaseId | `${BaseId}+`;

export const isTempered = (id: CardId) => id.endsWith('+');
export const baseOf = (id: CardId) => (isTempered(id) ? id.slice(0, -1) : id) as BaseId;
export const tempered = (id: CardId): CardId => (isTempered(id) ? id : `${baseOf(id)}+`);

/** The card's rules; a tempered copy has its `up` fields applied and a '+' on its name. */
export const card = (id: CardId): Card => {
  const base: Card = CARDS[baseOf(id)];
  return isTempered(id) ? { ...base, ...base.up, name: `${base.name}+` } : base;
};

/** Every run starts with this deck of ten. */
export const STARTER_DECK: CardId[] = ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'bash'];

export const COMMON = (Object.keys(CARDS) as BaseId[]).filter((id) => card(id).rarity === 'common');
export const RARE = (Object.keys(CARDS) as BaseId[]).filter((id) => card(id).rarity === 'rare');

/** The card's rules as a line of text for its face. */
export function describe(id: CardId) {
  const c = card(id);
  const parts: string[] = [];
  const to = c.all ? ' to all foes' : '';
  if (c.damage) parts.push(`Deal ${c.damage}${c.hits ? ` x${c.hits}` : ''}${to}.`);
  const statuses = [c.weak && `${c.weak} Weak`, c.vulnerable && `${c.vulnerable} Vulnerable`, c.poison && `${c.poison} Poison`].filter(Boolean);
  if (statuses.length) parts.push(`Apply ${statuses.join(' and ')}${c.damage ? '' : to}.`);
  if (c.block) parts.push(`Gain ${c.block} block.`);
  if (c.heal) parts.push(`Heal ${c.heal}.`);
  if (c.energy) parts.push(`Gain ${c.energy} energy.`);
  if (c.draw) parts.push(`Draw ${c.draw}.`);
  return parts.join(' ');
}

/** What kind of card it is, for the colour of its frame. */
export const kindOf = (id: CardId) => (card(id).damage ? 'attack' : 'skill');
