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
  | 'horn'
  | 'knife'
  | 'rage'
  | 'thorns'
  | 'veil'
  | 'bulwark'
  | 'skull'
  | 'rust'
  | 'doubt';

/** A power that stays in play for the rest of the fight. */
export type PowerKind = 'rage' | 'thorns' | 'splash' | 'bulwark';
/** A curse: an unplayable card that clogs the hand (Rust), hurts when drawn (Wound) or makes the first card of a turn dearer (Doubt). */
export type CurseKind = 'rust' | 'wound' | 'doubt';

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
  /** A power card: played, it stays in play and does this for the rest of the fight. */
  power?: PowerKind;
  /** A curse card: it can't be played; `curse` says what it does instead. */
  curse?: CurseKind;
}

export interface Card extends Effects {
  name: string;
  icon: Icon;
  /** Common cards are offered after a fight; rare ones in treasure rooms and by elites. Starter and curse cards neither. */
  rarity: 'starter' | 'common' | 'rare' | 'curse';
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
  // The Hunter's starters.
  venomKnife: { name: 'Venom Knife', cost: 1, icon: 'knife', rarity: 'starter', damage: 4, poison: 2, up: { damage: 6, poison: 3 } },
  dodge: { name: 'Dodge', cost: 1, icon: 'boot', rarity: 'starter', block: 4, draw: 1, up: { block: 6 } },
  // Powers: played once, they stay in play for the rest of the fight.
  bulwark: { name: 'Bulwark', cost: 1, icon: 'bulwark', rarity: 'common', power: 'bulwark', up: { cost: 0 } },
  thorns: { name: 'Thorns', cost: 1, icon: 'thorns', rarity: 'common', power: 'thorns', up: { cost: 0 } },
  battleRage: { name: 'Battle Rage', cost: 1, icon: 'rage', rarity: 'rare', power: 'rage', up: { cost: 0 } },
  venomVeil: { name: 'Venom Veil', cost: 1, icon: 'veil', rarity: 'rare', power: 'splash', up: { cost: 0 } },
  // Curses: they can't be played, and only leave the deck when burnt or removed.
  rust: { name: 'Rust', cost: 0, icon: 'rust', rarity: 'curse', curse: 'rust', up: {} },
  wound: { name: 'Wound', cost: 0, icon: 'skull', rarity: 'curse', curse: 'wound', up: {} },
  doubt: { name: 'Doubt', cost: 0, icon: 'doubt', rarity: 'curse', curse: 'doubt', up: {} },
} satisfies Record<string, Card>;

/** What each power does every turn (Bulwark, Battle Rage) or whenever it applies (Thorns, Venom Veil). */
export const POWER_BLOCK = 3;
export const POWER_STRENGTH = 1;
export const THORNS = 3;
/** What a Wound costs when drawn (it never kills), and how much dearer Doubt makes the first card of a turn. */
export const WOUND_HURT = 2;
export const DOUBT_COST = 1;

const POWER_TEXT: Record<PowerKind, string> = {
  bulwark: `Power. Gain ${POWER_BLOCK} block at the start of each turn.`,
  thorns: `Power. Deal ${THORNS} back to any foe that hits you.`,
  rage: `Power. Gain ${POWER_STRENGTH} Strength at the start of each turn.`,
  splash: 'Power. Poison on one foe splashes half onto the rest.',
};

const CURSE_TEXT: Record<CurseKind, string> = {
  rust: 'Curse. Unplayable. It only clogs your hand.',
  wound: `Curse. Unplayable. Lose ${WOUND_HURT} health when drawn.`,
  doubt: `Curse. Unplayable. First card each turn costs ${DOUBT_COST} more.`,
};

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

/** The Knight's starting deck of ten. */
export const STARTER_DECK: CardId[] = ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'bash'];
/** The Hunter's starting deck of ten: fewer shields, poison knives and dodges. */
export const HUNTER_DECK: CardId[] = ['strike', 'strike', 'strike', 'venomKnife', 'venomKnife', 'venomKnife', 'dodge', 'dodge', 'dodge', 'defend'];

export const COMMON = (Object.keys(CARDS) as BaseId[]).filter((id) => card(id).rarity === 'common');
export const RARE = (Object.keys(CARDS) as BaseId[]).filter((id) => card(id).rarity === 'rare');

/** The card's rules as a line of text for its face. */
export function describe(id: CardId) {
  const c = card(id);
  if (c.power) return POWER_TEXT[c.power];
  if (c.curse) return CURSE_TEXT[c.curse];
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

export type CardKind = 'attack' | 'skill' | 'power' | 'curse';

/** What kind of card it is, for the colour of its frame. */
export const kindOf = (id: CardId): CardKind => {
  const c = card(id);
  return c.curse ? 'curse' : c.power ? 'power' : c.damage ? 'attack' : 'skill';
};
export const isCurse = (id: CardId) => !!card(id).curse;
